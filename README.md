# Ứng dụng Quản lý người dùng (Admin) – React Native + MongoDB

Bài giữa kỳ môn **Lập trình đa nền tảng**. Ứng dụng React Native (Expo) chạy trên **Web** và **Android/iOS**.
Backend là Node.js/Express, dữ liệu lưu trong MongoDB.

Collection `users` **chỉ gồm 4 trường**: `email`, `matkhau`, `hoten`, `hinhanh`
(cộng thêm `_id`, khóa chính MongoDB tự sinh. Đã tắt `__v` và `createdAt/updatedAt`).

## Chức năng
| Yêu cầu | Đã làm |
|---|---|
| 1. Thêm, hiển thị email, matkhau, hoten, hinhanh trên web (8đ) | Form thêm mới, danh sách, trang chi tiết. Chạy bằng `npm run web` |
| 2. Đăng nhập, xóa, sửa, chức năng nâng cao (1.5đ) | Đăng nhập JWT, sửa, xóa (có hỏi xác nhận), **tìm kiếm**, **sắp xếp**, **phân trang**, **xuất JSON**, mã hóa mật khẩu **bcrypt**, kiểm tra dữ liệu (email hợp lệ/trùng, mật khẩu ≥ 6 ký tự, nhập lại mật khẩu), không cho xóa tài khoản đang đăng nhập, kéo để làm mới, **trang Tổng quan** (thống kê + biểu đồ), **nhập hàng loạt từ file JSON/CSV**, **giao diện sáng/tối** |
| 3. Nhập hình ảnh, hiển thị thông tin trên di động (0.5đ) | Chọn ảnh từ thư viện hoặc **chụp bằng camera** (expo-image-picker), thu nhỏ còn 400px, lưu **base64** vào trường `hinhanh` trên MongoDB Atlas |

## Cấu trúc
```
backend/            REST API (Express + Mongoose)
  models/User.js    Schema 4 trường
  routes/auth.js    POST /api/auth/login
  routes/users.js   CRUD /api/users (+ tìm kiếm, phân trang, export, stats, import)
  seed.js           Tạo dữ liệu mẫu
  export.js         Xuất CSDL ra database/users.json
app/                React Native (Expo)
  App.js            Điều hướng màn hình, giao diện sáng/tối
  src/api.js        Gọi API REST
  src/ui.js         Design system (màu sáng/tối, Button, Card, Page...)
  src/importFile.js Chọn file, đọc JSON/CSV để nhập hàng loạt
  src/screens/      Login, UserList, UserForm, UserDetail, Dashboard
database/users.json File CSDL để nộp (tạo bằng npm run export)
```

## Chức năng nâng cao thêm (không thêm trường vào DB)
- **Tổng quan** (admin): tổng người dùng, số người có/chưa có ảnh, số người mới trong 7 ngày, biểu đồ theo tên miền email,
  biểu đồ đăng ký 7 ngày gần đây, 5 người mới nhất. Ngày tạo lấy từ `_id` (ObjectId chứa sẵn thời điểm tạo), không cần trường `createdAt`.
- **Nhập file** (admin): chọn file `.json` hoặc `.csv` để thêm nhiều người dùng một lần (tối đa 500 bản ghi).
  - JSON: mảng `[{ "email", "matkhau", "hoten", "hinhanh" }]`. File `users.json` do app xuất ra nhập lại được, mật khẩu đã mã hóa bcrypt được giữ nguyên.
  - CSV: dòng đầu là tiêu đề `email,matkhau,hoten,hinhanh` (dấu phân cách `,` hoặc `;`, `hinhanh` có thể bỏ trống).
  - Bản ghi lỗi (email sai/đã tồn tại/trùng trong file, thiếu họ tên, mật khẩu < 6 ký tự) bị bỏ qua và liệt kê lại cho người dùng.
- **Giao diện sáng/tối**: mặc định theo hệ điều hành, bấm biểu tượng mặt trăng/mặt trời để đổi. Lựa chọn lưu trên máy (AsyncStorage/localStorage).

## Phân quyền (không thêm trường vào DB)
- Email admin khai báo trong `backend/.env`: `ADMIN_EMAILS=admin@gmail.com` (nhiều email cách nhau dấu phẩy).
- **Admin**: xem danh sách, thêm, sửa, xóa mọi người dùng, xuất JSON.
- **Người dùng thường**: đăng nhập chỉ thấy **Hồ sơ của tôi**, sửa được họ tên, ảnh, mật khẩu (phải nhập mật khẩu hiện tại). Không đổi được email, không xem/sửa/xóa người khác.
- Server kiểm tra quyền ở mọi API `/api/users` (trả 403 "Bạn không có quyền quản trị"), không chỉ ẩn nút trên giao diện.

## Cài đặt & chạy

### 0. Cài phần mềm
- Node.js LTS: https://nodejs.org (hoặc `winget install OpenJS.NodeJS.LTS`)
- Tài khoản MongoDB Atlas (miễn phí): https://www.mongodb.com/atlas, tạo cluster M0, Database Access (user), Network Access (0.0.0.0/0), Connect > Drivers để lấy chuỗi `mongodb+srv://...` dán vào `MONGO_URI` trong `backend/.env`
- Điện thoại: cài app **Expo Go** (CH Play / App Store).

### 1. Backend
```bash
cd backend
npm install            # express mongoose cors bcryptjs jsonwebtoken dotenv
npm run seed           # tạo dữ liệu mẫu (admin@gmail.com / 123456)
npm start              # http://localhost:5000
```

### 2. App
```bash
cd app
npm install
npx expo install --fix # đồng bộ phiên bản thư viện với Expo SDK
npm run web            # chạy trên trình duyệt (http://localhost:8081)
npx expo start         # quét QR bằng Expo Go để chạy trên điện thoại
```
> Điện thoại và máy tính phải **cùng mạng WiFi**. App tự lấy IP máy tính từ Expo.
> Nếu không kết nối được: mở `app/src/api.js`, điền `MANUAL_API_URL = 'http://<IP-máy-tính>:5000'`
> (xem IP bằng lệnh `ipconfig`), đồng thời cho phép Node.js qua Windows Firewall.
>
> Nếu Expo Go báo phiên bản SDK không tương thích: `npx expo install expo@latest` rồi `npx expo install --fix`.

### 3. Xuất file CSDL để nộp
```bash
cd backend
npm run export         # -> database/users.json
```
Hoặc trong MongoDB Compass: chọn `quanlynguoidung > users` → **Export Data** → **JSON**.
Import lại: `mongoimport --db quanlynguoidung --collection users --jsonArray --file database/users.json`

## Lỗi "self-signed certificate in certificate chain" / "fetch failed"
Xảy ra khi dùng mạng công ty/trường có kiểm tra HTTPS. Các script `npm start`, `npm run seed`, `npm run web`...
đã chạy Node với cờ `--use-system-ca` (Node ≥ 22.15) để tin chứng chỉ của Windows, nên chỉ cần dùng `npm ...`
thay vì gọi trực tiếp `node server.js` hay `npx expo start`.

## API
| Method | URL | Mô tả |
|---|---|---|
| POST | /api/auth/login | Đăng nhập `{ email, matkhau }` → token |
| GET | /api/users?q=&sort=&order=&page=&limit= | Danh sách + tìm kiếm + sắp xếp + phân trang |
| GET | /api/users/:id | Chi tiết |
| POST | /api/users | Thêm (JSON: email, matkhau, hoten, hinhanh base64) |
| PUT | /api/users/:id | Sửa (mật khẩu trống = giữ nguyên) |
| DELETE | /api/users/:id | Xóa |
| GET | /api/users/export | Xuất JSON |
| GET | /api/users/stats | Số liệu trang Tổng quan |
| POST | /api/users/import | Nhập hàng loạt `{ users: [...] }` → `{ created, failed, errors }` |
| GET | /api/auth/me | Hồ sơ của tôi (mọi người dùng) |
| PUT | /api/auth/me | Tự sửa hồ sơ `{ hoten, hinhanh, matkhaucu, matkhau }` |
