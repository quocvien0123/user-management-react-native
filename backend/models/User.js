const mongoose = require('mongoose');

// Collection "users" CHỈ gồm 4 trường theo đề: email, matkhau, hoten, hinhanh
// versionKey: false -> không sinh trường __v
// timestamps: false -> không sinh createdAt/updatedAt
const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email là bắt buộc'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Email không hợp lệ'],
    },
    matkhau: { type: String, required: [true, 'Mật khẩu là bắt buộc'] },
    hoten: { type: String, required: [true, 'Họ tên là bắt buộc'], trim: true },
    hinhanh: { type: String, default: '' },
  },
  { versionKey: false, timestamps: false, strict: true }
);

userSchema.methods.toPublic = function () {
  const o = this.toObject();
  return { _id: o._id, email: o.email, matkhau: o.matkhau, hoten: o.hoten, hinhanh: o.hinhanh };
};

module.exports = mongoose.model('User', userSchema, 'users');
