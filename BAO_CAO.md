# BÁO CÁO BÀI THI GIỮA KỲ – LẬP TRÌNH ĐA NỀN TẢNG

**Đề tài:** Xây dựng ứng dụng nhập, hiển thị, sửa, xóa người dùng ở phân hệ admin
**Công nghệ:** React Native (Expo), Node.js/Express, MongoDB
**Sinh viên:** ............................  **MSSV:** ...............  **Lớp:** ...............

- Link GitHub source code: ..........................................
- Link video demo: ..........................................

---

## 1. Giới thiệu
Ứng dụng cho phép quản trị viên đăng nhập, xem danh sách, thêm, sửa, xóa người dùng.
Một mã nguồn React Native chạy được trên **trình duyệt web** (react-native-web) và **điện thoại Android/iOS** (Expo Go).

Cơ sở dữ liệu MongoDB, database `quanlynguoidung`, collection `users`, chỉ gồm các trường:

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| email | String (unique) | Email đăng nhập |
| matkhau | String | Mật khẩu đã mã hóa bcrypt |
| hoten | String | Họ và tên |
| hinhanh | String | Ảnh đại diện: chuỗi base64 `data:image/jpeg;base64,...` (hoặc link http) |

(`_id` là khóa chính do MongoDB tự sinh. Schema đã tắt `versionKey` và `timestamps` nên không phát sinh thêm trường nào khác.)

## 2. Kiến trúc
```
[React Native App: Web / Android / iOS]  --HTTP (fetch, JWT)-->  [Express API :5000]  --Mongoose-->  [MongoDB Atlas (cloud)]
```

## 3. Các bước thực hiện

### Bước 1: Cài đặt môi trường
- Cài Node.js LTS, Visual Studio Code.
- Tạo tài khoản MongoDB Atlas, tạo cluster M0 (Free), tạo database user, mở Network Access 0.0.0.0/0, lấy chuỗi kết nối tại Connect > Drivers.
- Kiểm tra: `node -v`, `npm -v`

> 📷 *Chèn ảnh: kết quả `node -v`, `npm -v`*

### Bước 2: Tạo backend
```bash
mkdir backend && cd backend
npm init -y
npm install express mongoose cors bcryptjs jsonwebtoken dotenv
npm install -D nodemon
```
Thư viện dùng:
- `express`: tạo REST API
- `mongoose`: kết nối, định nghĩa schema MongoDB
- `cors`: cho phép app web gọi API khác cổng
- `bcryptjs`: mã hóa mật khẩu
- `jsonwebtoken`: tạo token đăng nhập (JWT)
- `dotenv`: đọc cấu hình `.env`

File `.env`:
```
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
JWT_SECRET=doi_chuoi_bi_mat_nay
ADMIN_EMAILS=admin@gmail.com
```

Schema (`models/User.js`): chỉ 4 trường email, matkhau, hoten, hinhanh, kèm `{ versionKey: false, timestamps: false }`.

Chạy:
```bash
npm run seed   # tạo dữ liệu mẫu
npm start
```
> 📷 *Chèn ảnh: terminal "Đã kết nối MongoDB", "Server chạy tại http://localhost:5000"*

### Bước 3: Tạo app React Native (Expo)
```bash
npx create-expo-app@latest app --template blank
cd app
npx expo install react-dom react-native-web @expo/metro-runtime   # chạy trên web
npx expo install expo-image-picker expo-image-manipulator expo-constants expo-font   # chọn/chụp, thu nhỏ ảnh, font biểu tượng
npx expo install expo-document-picker expo-file-system @react-native-async-storage/async-storage   # nhập file, lưu giao diện sáng/tối
```
Các màn hình:
- `LoginScreen`: đăng nhập bằng email + mật khẩu
- `UserListScreen`: danh sách, tìm kiếm, sắp xếp, phân trang, xóa, xuất JSON
- `UserFormScreen`: thêm/sửa, chọn ảnh từ thư viện hoặc chụp bằng camera
- `UserDetailScreen`: xem chi tiết người dùng
- `DashboardScreen`: trang Tổng quan, thống kê và biểu đồ

Chạy:
```bash
npm run web      # trình duyệt
npx expo start   # quét QR bằng Expo Go
```

### Bước 4: Chạy trên nền tảng Web (Yêu cầu 1)
> 📷 *Chèn ảnh: màn hình đăng nhập (web)*
> 📷 *Chèn ảnh: danh sách người dùng (web)*
> 📷 *Chèn ảnh: form thêm người dùng, chọn ảnh (web)*
> 📷 *Chèn ảnh: chi tiết người dùng hiển thị email, matkhau, hoten, hinhanh (web)*

### Bước 5: Đăng nhập, sửa, xóa, chức năng nâng cao (Yêu cầu 2)
- Đăng nhập dùng JWT, sai mật khẩu báo lỗi
- Phân quyền: admin xác định bằng `ADMIN_EMAILS` trong `.env` (không thêm trường vào DB). Admin toàn quyền; người dùng thường chỉ xem/sửa hồ sơ của mình, đổi mật khẩu phải nhập mật khẩu cũ. Server chặn API quản trị với người không phải admin (HTTP 403)
- Sửa thông tin, đổi ảnh, đổi mật khẩu (để trống thì giữ nguyên mật khẩu cũ)
- Xóa có hộp thoại xác nhận, không cho xóa tài khoản đang đăng nhập
- Nâng cao: tìm kiếm theo tên/email, sắp xếp A→Z / Z→A / mới nhất, phân trang, xuất file JSON,
  mã hóa mật khẩu bcrypt, kiểm tra email hợp lệ và không trùng, mật khẩu tối thiểu 6 ký tự, nhập lại mật khẩu
- **Trang Tổng quan** (admin): thẻ số liệu (tổng người dùng, có/chưa có ảnh, mới trong 7 ngày), biểu đồ người dùng theo tên miền email,
  biểu đồ số người đăng ký 7 ngày gần đây (rê chuột/chạm vào cột để xem chi tiết), danh sách 5 người mới nhất.
  Số liệu tính bằng aggregation của MongoDB lúc chạy; ngày tạo lấy từ `_id` nên không cần thêm trường `createdAt`.
- **Nhập hàng loạt từ file JSON/CSV**: chọn file bằng `expo-document-picker`, đọc nội dung, hỏi xác nhận rồi gửi lên API `/api/users/import`.
  Server kiểm tra từng bản ghi, bỏ qua bản ghi lỗi và trả về danh sách lỗi để hiển thị. File `users.json` xuất từ app nhập lại được.
- **Giao diện sáng/tối**: mặc định theo hệ điều hành, có nút đổi ở sidebar (web) và thanh tiêu đề (điện thoại); lựa chọn lưu trên máy bằng AsyncStorage.

> 📷 *Chèn ảnh: đăng nhập sai, tìm kiếm, sửa, hộp thoại xóa*
> 📷 *Chèn ảnh: trang Tổng quan (web và điện thoại)*
> 📷 *Chèn ảnh: hộp thoại nhập file và kết quả nhập (thêm được / bỏ qua)*
> 📷 *Chèn ảnh: cùng một màn hình ở giao diện sáng và giao diện tối*

### Bước 6: Nhập hình ảnh và hiển thị trên di động (Yêu cầu 3)
- Dùng `expo-image-picker`: chọn ảnh từ thư viện hoặc chụp ảnh, cắt vuông, thu nhỏ còn 400px bằng `expo-image-manipulator`, chuyển sang chuỗi base64 và lưu thẳng vào trường `hinhanh`.

> 📷 *Chèn ảnh: chạy trên điện thoại – danh sách, chọn ảnh, chi tiết người dùng*

### Bước 7: Cơ sở dữ liệu
> 📷 *Chèn ảnh: MongoDB Atlas > Browse Collections – database `quanlynguoidung`, collection `users` với 4 trường*

Xuất file CSDL: `npm run export` → `database/users.json` (hoặc Compass → Export Data → JSON).

## 4. API
| Method | URL | Mô tả |
|---|---|---|
| POST | /api/auth/login | Đăng nhập |
| GET | /api/users | Danh sách (q, sort, order, page, limit) |
| GET | /api/users/:id | Chi tiết |
| POST | /api/users | Thêm |
| PUT | /api/users/:id | Sửa |
| DELETE | /api/users/:id | Xóa |
| GET | /api/users/export | Xuất JSON |
| GET | /api/users/stats | Thống kê cho trang Tổng quan |
| POST | /api/users/import | Nhập hàng loạt từ file JSON/CSV |
| GET | /api/auth/me | Hồ sơ của tôi |
| PUT | /api/auth/me | Tự sửa hồ sơ |

## 5. Kết luận
Ứng dụng đáp ứng đủ yêu cầu: CRUD người dùng với 4 trường email, matkhau, hoten, hinhanh trên MongoDB.
Cùng một mã nguồn chạy được trên web và di động, có đăng nhập và các chức năng nâng cao.
