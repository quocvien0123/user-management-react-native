// Xuất collection users ra file database/users.json để nộp bài: npm run export
const connectDB = require('./db');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const User = require('./models/User');

(async () => {
  await connectDB();
  const users = await User.find().lean();
  // Định dạng MongoDB Extended JSON -> import lại được bằng Compass hoặc mongoimport --jsonArray
  const out = users.map((u) => ({
    _id: { $oid: String(u._id) },
    email: u.email,
    matkhau: u.matkhau,
    hoten: u.hoten,
    hinhanh: u.hinhanh,
  }));
  const file = path.join(__dirname, '..', 'database', 'users.json');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(out, null, 2), 'utf8');
  console.log(`Đã xuất ${out.length} bản ghi -> ${file}`);
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
