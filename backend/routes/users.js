const router = require('express').Router();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const { auth, requireAdmin, isAdminEmail } = require('../middleware/auth');
const { checkImage } = require('../utils/validate');

// Toàn bộ API quản lý người dùng: phải đăng nhập VÀ là admin
router.use(auth, requireAdmin);

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/users?q=&sort=hoten|email&order=asc|desc&page=1&limit=10
router.get('/', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const sortField = ['hoten', 'email'].includes(req.query.sort) ? req.query.sort : '_id';
    const order = req.query.order === 'asc' ? 1 : -1;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);

    const filter = q
      ? { $or: [{ email: new RegExp(escapeRegex(q), 'i') }, { hoten: new RegExp(escapeRegex(q), 'i') }] }
      : {};

    const [items, total] = await Promise.all([
      User.find(filter).sort({ [sortField]: order }).skip((page - 1) * limit).limit(limit),
      User.countDocuments(filter),
    ]);
    res.json({ items: items.map((u) => u.toPublic()), total, page, pages: Math.max(Math.ceil(total / limit), 1) });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// GET /api/users/export -> tải toàn bộ collection dạng JSON
router.get('/export', async (req, res) => {
  const users = await User.find().lean();
  res.setHeader('Content-Disposition', 'attachment; filename="users.json"');
  res.json(users);
});

// GET /api/users/stats -> số liệu cho trang Tổng quan (chỉ ĐỌC, tính lúc chạy, không lưu thêm gì vào DB)
// Ngày tạo lấy từ _id: ObjectId của MongoDB chứa sẵn thời điểm tạo bản ghi
const TZ_OFFSET_MS = 7 * 3600 * 1000; // giờ Việt Nam (UTC+7)
const DAYS = 7;
router.get('/stats', async (req, res) => {
  try {
    const local = new Date(Date.now() + TZ_OFFSET_MS);
    const startMs = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - (DAYS - 1)) - TZ_OFFSET_MS;
    const startId = mongoose.Types.ObjectId.createFromTime(Math.floor(startMs / 1000));

    const [r] = await User.aggregate([
      {
        $facet: {
          total: [{ $count: 'n' }],
          withImage: [{ $match: { hinhanh: { $nin: ['', null] } } }, { $count: 'n' }],
          domains: [
            { $group: { _id: { $arrayElemAt: [{ $split: ['$email', '@'] }, 1] }, count: { $sum: 1 } } },
            { $sort: { count: -1, _id: 1 } },
          ],
          daily: [
            { $match: { _id: { $gte: startId } } },
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: { $toDate: '$_id' }, timezone: '+07:00' } },
                count: { $sum: 1 },
              },
            },
          ],
          newest: [{ $sort: { _id: -1 } }, { $limit: 5 }, { $project: { email: 1, hoten: 1, hinhanh: 1 } }],
        },
      },
    ]);

    const total = r.total[0]?.n || 0;
    const withImage = r.withImage[0]?.n || 0;

    // Tối đa 5 tên miền, còn lại gộp vào "Khác"
    const top = r.domains.slice(0, 5).map((d) => ({ domain: d._id || '(không rõ)', count: d.count }));
    const rest = r.domains.slice(5).reduce((s, d) => s + d.count, 0);
    if (rest) top.push({ domain: 'Khác', count: rest });

    // Đủ 7 ngày, ngày không có ai đăng ký = 0
    const byDay = Object.fromEntries(r.daily.map((d) => [d._id, d.count]));
    const daily = Array.from({ length: DAYS }, (_, i) => {
      const date = new Date(startMs + TZ_OFFSET_MS + i * 86400000).toISOString().slice(0, 10);
      return { date, count: byDay[date] || 0 };
    });

    res.json({
      total,
      withImage,
      withoutImage: total - withImage,
      newLast7Days: daily.reduce((s, d) => s + d.count, 0),
      domains: top,
      daily,
      newest: r.newest.map((u) => ({ ...u, createdAt: u._id.getTimestamp() })),
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST /api/users/import  { users: [{ email, matkhau, hoten, hinhanh }, ...] }
// Thêm hàng loạt từ file JSON/CSV. Mỗi bản ghi vẫn chỉ có 4 trường.
// matkhau có thể là mật khẩu thường (sẽ được hash) hoặc chuỗi bcrypt sẵn (file xuất từ chính app này).
const EMAIL_RE = /^\S+@\S+\.\S+$/;
const BCRYPT_RE = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;
const MAX_IMPORT = 500;
router.post('/import', async (req, res) => {
  try {
    const rows = req.body?.users;
    if (!Array.isArray(rows)) return res.status(400).json({ message: 'Dữ liệu nhập không hợp lệ' });
    if (!rows.length) return res.status(400).json({ message: 'File không có bản ghi nào' });
    if (rows.length > MAX_IMPORT) return res.status(400).json({ message: `Tối đa ${MAX_IMPORT} bản ghi mỗi lần nhập` });

    const clean = rows.map((r) => ({
      email: String(r?.email ?? '').trim().toLowerCase(),
      hoten: String(r?.hoten ?? '').trim(),
      matkhau: String(r?.matkhau ?? ''),
      hinhanh: String(r?.hinhanh ?? '').trim(),
    }));
    const existing = new Set(
      (await User.find({ email: { $in: clean.map((r) => r.email) } }, { email: 1 }).lean()).map((u) => u.email)
    );

    const seen = new Set();
    const docs = [];
    const errors = [];
    clean.forEach((r, i) => {
      let message = null;
      if (!EMAIL_RE.test(r.email)) message = 'Email không hợp lệ';
      else if (existing.has(r.email)) message = 'Email đã tồn tại';
      else if (seen.has(r.email)) message = 'Email bị trùng trong file';
      else if (!r.hoten) message = 'Thiếu họ tên';
      else if (!BCRYPT_RE.test(r.matkhau) && r.matkhau.length < 6) message = 'Mật khẩu tối thiểu 6 ký tự';
      else message = checkImage(r.hinhanh);

      if (message) errors.push({ row: i + 1, email: r.email, message });
      else {
        seen.add(r.email);
        docs.push(r);
      }
    });

    await Promise.all(
      docs.map(async (d) => {
        if (!BCRYPT_RE.test(d.matkhau)) d.matkhau = await bcrypt.hash(d.matkhau, 10);
      })
    );
    if (docs.length) await User.insertMany(docs, { ordered: false });

    res.json({ created: docs.length, failed: errors.length, errors });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// GET /api/users/:id
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    res.json(user.toPublic());
  } catch (e) {
    res.status(400).json({ message: 'ID không hợp lệ' });
  }
});

// POST /api/users  { email, matkhau, hoten, hinhanh }
router.post('/', async (req, res) => {
  try {
    const { email, matkhau, hoten, hinhanh } = req.body || {};
    if (!matkhau || matkhau.length < 6) return res.status(400).json({ message: 'Mật khẩu tối thiểu 6 ký tự' });
    const imgErr = checkImage(hinhanh);
    if (imgErr) return res.status(400).json({ message: imgErr });

    const exists = await User.findOne({ email: (email || '').toLowerCase().trim() });
    if (exists) return res.status(409).json({ message: 'Email đã tồn tại' });

    const user = await User.create({
      email,
      hoten,
      matkhau: await bcrypt.hash(matkhau, 10),
      hinhanh: hinhanh || '',
    });
    res.status(201).json(user.toPublic());
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// PUT /api/users/:id  - mật khẩu để trống = giữ nguyên, hinhanh không gửi = giữ nguyên
router.put('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

    const { email, matkhau, hoten, hinhanh } = req.body || {};
    if (email && email.toLowerCase().trim() !== user.email) {
      if (String(user._id) === req.user.id && !isAdminEmail(email))
        return res.status(400).json({ message: 'Không thể đổi email của chính bạn (sẽ mất quyền admin)' });
      const exists = await User.findOne({ email: email.toLowerCase().trim() });
      if (exists) return res.status(409).json({ message: 'Email đã tồn tại' });
      user.email = email;
    }
    if (hoten !== undefined) user.hoten = hoten;
    if (matkhau) {
      if (matkhau.length < 6) return res.status(400).json({ message: 'Mật khẩu tối thiểu 6 ký tự' });
      user.matkhau = await bcrypt.hash(matkhau, 10);
    }
    if (hinhanh !== undefined) {
      const imgErr = checkImage(hinhanh);
      if (imgErr) return res.status(400).json({ message: imgErr });
      user.hinhanh = hinhanh;
    }

    await user.save();
    res.json(user.toPublic());
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
  try {
    if (req.params.id === String(req.user.id))
      return res.status(400).json({ message: 'Không thể xóa tài khoản đang đăng nhập' });
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    res.json({ message: 'Đã xóa người dùng' });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

module.exports = router;
