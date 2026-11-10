require('dotenv').config();
const mongoose = require('mongoose');

// Kết nối MongoDB Atlas (hoặc local). Tên database cố định là "quanlynguoidung"
// kể cả khi chuỗi kết nối Atlas không ghi tên database.
module.exports = function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri || uri.includes('<')) {
    console.error('Chưa cấu hình MONGO_URI trong backend/.env');
    process.exit(1);
  }
  return mongoose.connect(uri, { dbName: process.env.DB_NAME || 'quanlynguoidung' });
};
