const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth, isAdminEmail } = require('../middleware/auth');
const { checkImage } = require('../utils/validate');

// isAdmin KHÔNG lưu trong DB, chỉ tính từ ADMIN_EMAILS và trả kèm cho app
const withRole = (user) => ({ ...user.toPublic(), isAdmin: isAdminEmail(user.email) });

// POST /api/auth/login  { email, matkhau }
router.post('/login', async (req, res) => {
  try {
    const { email, matkhau } = req.body || {};
    if (!email || !matkhau) return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu' });

    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user) return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });

    const ok = await bcrypt.compare(matkhau, user.matkhau);
    if (!ok) return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: withRole(user) });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// GET /api/auth/me  -> hồ sơ của chính mình (mọi người dùng)
router.get('/me', auth, (req, res) => res.json(withRole(req.currentUser)));

// PUT /api/auth/me  { hoten, hinhanh, matkhaucu, matkhau }
// Người dùng tự sửa hồ sơ. Email không tự đổi được (chỉ admin đổi).
// Đổi mật khẩu phải nhập đúng mật khẩu hiện tại.
router.put('/me', auth, async (req, res) => {
  try {
    const user = req.currentUser;
    const { hoten, hinhanh, matkhau, matkhaucu } = req.body || {};

    if (hoten !== undefined) user.hoten = hoten;
    if (hinhanh !== undefined) {
      const imgErr = checkImage(hinhanh);
      if (imgErr) return res.status(400).json({ message: imgErr });
      user.hinhanh = hinhanh;
    }
    if (matkhau) {
      if (!matkhaucu || !(await bcrypt.compare(matkhaucu, user.matkhau)))
        return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng' });
      if (matkhau.length < 6) return res.status(400).json({ message: 'Mật khẩu mới tối thiểu 6 ký tự' });
      user.matkhau = await bcrypt.hash(matkhau, 10);
    }

    await user.save();
    res.json(withRole(user));
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

module.exports = router;
