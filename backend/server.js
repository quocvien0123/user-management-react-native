const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDB = require('./db');

const app = express();
app.use(cors());
// Ảnh gửi lên dạng base64 nên tăng giới hạn kích thước body
app.use(express.json({ limit: '10mb' }));

app.get('/', (req, res) => res.json({ message: 'API Quản lý người dùng đang chạy' }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));

app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') return res.status(413).json({ message: 'Ảnh quá lớn' });
  res.status(400).json({ message: err.message || 'Có lỗi xảy ra' });
});

const PORT = process.env.PORT || 5000;
connectDB()
  .then(() => {
    console.log(`Đã kết nối MongoDB, database: ${mongoose.connection.name}`);
    // 0.0.0.0 để điện thoại cùng mạng WiFi truy cập được
    app.listen(PORT, '0.0.0.0', () => console.log(`Server chạy tại http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('Lỗi kết nối MongoDB:', err.message);
    process.exit(1);
  });
