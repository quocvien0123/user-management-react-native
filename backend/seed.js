// Tạo dữ liệu mẫu: npm run seed
const connectDB = require('./db');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const data = [
  { email: 'admin@gmail.com', matkhau: '123456', hoten: 'Quản trị viên', hinhanh: 'https://i.pravatar.cc/300?img=12' },
  { email: 'nguyenvana@gmail.com', matkhau: '123456', hoten: 'Nguyễn Văn A', hinhanh: 'https://i.pravatar.cc/300?img=3' },
  { email: 'tranthib@gmail.com', matkhau: '123456', hoten: 'Trần Thị B', hinhanh: 'https://i.pravatar.cc/300?img=5' },
  { email: 'levanc@gmail.com', matkhau: '123456', hoten: 'Lê Văn C', hinhanh: 'https://i.pravatar.cc/300?img=8' },
];

(async () => {
  await connectDB();
  await User.deleteMany({});
  for (const u of data) await User.create({ ...u, matkhau: await bcrypt.hash(u.matkhau, 10) });
  console.log(`Đã tạo ${data.length} người dùng. Đăng nhập: admin@gmail.com / 123456`);
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
