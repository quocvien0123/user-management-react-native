const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Danh sách email admin lấy từ .env (ADMIN_EMAILS=a@gmail.com,b@gmail.com)
// -> phân quyền mà KHÔNG cần thêm trường "role" vào collection users
function isAdminEmail(email) {
  const list = (process.env.ADMIN_EMAILS || 'admin@gmail.com')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(String(email || '').toLowerCase());
}

// Bắt buộc đăng nhập: kiểm tra JWT, nạp người dùng hiện tại vào req.currentUser
async function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Chưa đăng nhập' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ message: 'Tài khoản không còn tồn tại, vui lòng đăng nhập lại' });
    req.user = { id: String(user._id), email: user.email };
    req.currentUser = user;
    req.isAdmin = isAdminEmail(user.email);
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Phiên đăng nhập hết hạn, vui lòng đăng nhập lại' });
  }
}

// Chỉ admin mới được đi tiếp
function requireAdmin(req, res, next) {
  if (!req.isAdmin) return res.status(403).json({ message: 'Bạn không có quyền quản trị' });
  next();
}

module.exports = { auth, requireAdmin, isAdminEmail };
