# CLAUDE.md

Bài giữa kỳ môn **Lập trình đa nền tảng**: app quản lý người dùng (phân hệ admin).
App React Native (Expo SDK 58, React Native 0.88) chạy cả Web và Android/iOS. Backend Node.js/Express, dữ liệu trên MongoDB Atlas.
Người dùng giao tiếp bằng tiếng Việt, nên trả lời bằng tiếng Việt.

## Ràng buộc của đề (không được vi phạm)
- Collection `users` **chỉ có 4 trường**: `email`, `matkhau`, `hoten`, `hinhanh`. **Không thêm trường** (không `role`, `createdAt`, `__v`...).
  Schema [backend/models/User.js](backend/models/User.js) đặt `versionKey: false`, `timestamps: false`, `strict: true`. `_id` do MongoDB tự sinh, được chấp nhận.
- Phân quyền **không** lưu trong DB: admin là các email trong `ADMIN_EMAILS` ở `backend/.env`. `isAdmin` được tính lúc chạy và chỉ trả kèm trong API response.
- Phải nộp file CSDL: `npm run export` (trong `backend/`) ghi ra `database/users.json` (Extended JSON, import lại được bằng `mongoimport --jsonArray`).
- `BAO_CAO.md` là khung báo cáo nộp bài. Khi thêm hoặc đổi tính năng, cập nhật cả `README.md` và `BAO_CAO.md`.

## Chạy dự án
Luôn chạy qua `npm` scripts, không gọi thẳng `node server.js` hay `npx expo start` (xem mục Mạng công ty).
```
cd backend && npm start      # API http://localhost:5000
cd app && npm start          # Expo: w = web (http://localhost:8081), quét QR bằng Expo Go
cd backend && npm run seed   # XÓA toàn bộ users rồi tạo lại 4 user mẫu (mật khẩu 123456)
cd backend && npm run export # xuất database/users.json
```
- Tài khoản mẫu: `admin@gmail.com` (admin), `nguyenvana@gmail.com`, `tranthib@gmail.com`, `levanc@gmail.com`. Mật khẩu đều là `123456`.
- `npm run seed` xóa sạch dữ liệu thật trên Atlas, phải hỏi người dùng trước khi chạy.
- Không có test tự động. Kiểm tra bằng cách:
  - Build bundle: `node --use-system-ca node_modules/expo/bin/cli export --platform web --platform android --output-dir <thư mục tạm>`.
  - Gọi API bằng curl, trên một **cổng riêng** (vd. `PORT=5055`) để không đụng server người dùng đang chạy.
- Node cài ở `C:\Program Files\nodejs`. Terminal mở trước khi cài Node có thể không thấy `npm`; khi đó làm mới PATH hoặc khởi động lại VS Code.

## Mạng công ty (quan trọng)
Mạng kiểm tra HTTPS nên Node báo `self-signed certificate in certificate chain` (kết nối Atlas) hoặc `fetch failed` (Expo CLI).
Cách sửa: chạy Node với cờ `--use-system-ca` để tin chứng chỉ Windows. Cờ này đã có sẵn trong mọi script của cả hai `package.json`.
Với lệnh `npx expo install ...`, đặt `NODE_OPTIONS=--use-system-ca` trước khi chạy.
Tải file lớn (vd. MongoDB server) hay bị đứt, nên mới dùng Atlas thay cho MongoDB cài trên máy.

Lưu ý khi test bằng curl trong Git Bash: chuỗi tiếng Việt trong `-d` bị lỗi mã hóa (thành `Nguy?n`).
Muốn ghi dữ liệu có dấu thì dùng script Node, và kiểm tra lại dữ liệu sau khi test.

## Kiến trúc
**backend/**
- `db.js`: kết nối Mongo, `dbName` cố định `quanlynguoidung` (chuỗi Atlas thường không ghi tên DB).
- `middleware/auth.js`:
  - `auth`: xác thực JWT, nạp `req.currentUser` và `req.isAdmin`.
  - `requireAdmin`: trả 403 nếu không phải admin.
  - `isAdminEmail()`.
- `routes/auth.js`:
  - `POST /login`
  - `GET/PUT /me`: người dùng tự sửa hồ sơ; không đổi được email; đổi mật khẩu phải gửi `matkhaucu`.
- `routes/users.js`: CRUD, tìm kiếm (`q`), sắp xếp, phân trang, `/export`. Áp dụng `auth` và `requireAdmin` cho toàn bộ. Admin không được xóa chính mình hoặc đổi email của mình ra khỏi `ADMIN_EMAILS`.
  - `/stats`: aggregation `$facet`, ngày tạo suy ra từ `_id` (múi giờ +07:00), không lưu gì thêm.
  - `/import`: nhận `{ users: [...] }`, tối đa 500 bản ghi; `matkhau` là chuỗi bcrypt sẵn thì giữ nguyên, ngược lại thì hash. Trả `{ created, failed, errors[{row,email,message}] }`.
  - Route tĩnh (`/export`, `/stats`, `/import`) phải khai báo **trước** `/:id`.
- `utils/validate.js`: `checkImage`.
- Mật khẩu hash bằng bcryptjs. API trả về chuỗi hash, không bao giờ trả mật khẩu gốc.

**Ảnh (`hinhanh`)** lưu thẳng chuỗi base64 `data:image/jpeg;base64,...` trong DB, không có upload file hay thư mục `uploads`.
- App thu nhỏ ảnh về 400px bằng `expo-image-manipulator` trước khi gửi.
- Server chấp nhận chuỗi rỗng, base64 hoặc link `http(s)` (dữ liệu seed dùng link pravatar). JSON body giới hạn 10mb.

**app/**
- `App.js`: điều hướng bằng state, không dùng react-navigation.
  - Admin: các màn `list`, `form`, `detail`, `dashboard`.
  - Giữ chế độ sáng/tối (`ThemeContext`): mặc định theo `useColorScheme`, lựa chọn lưu AsyncStorage key `theme`. Cây màn hình có `key={mode}` nên đổi giao diện sẽ dựng lại màn hình.
  - Mọi người dùng: `me` (hồ sơ của tôi) và `meEdit`. Người không phải admin bị ép về `me`.
- `src/api.js`: `API_URL` tự dò. Web dùng `window.location.hostname`; Expo Go dùng `Constants.expoConfig.hostUri` (IP LAN của máy dev). Có thể đặt tay bằng `MANUAL_API_URL`.
- `src/ui.js`: design system dùng chung.
  - Màu ở `colors`, đổ bóng bằng `boxShadow`, biểu tượng Feather (`@expo/vector-icons`).
  - **Dark mode**: `colors` là object dùng chung, `applyTheme()` thay giá trị bên trong (bảng `LIGHT`/`DARK`). Vì vậy:
    - Mọi `StyleSheet.create` (và object style cấp module dùng `colors`) phải bọc `themed(() => StyleSheet.create({...}))`.
    - Không ghi cứng màu nền/viền như `'#fff'`, `'#f8fafc'`; dùng token (`colors.card`, `colors.subtle`, `colors.rowHover`, `colors.dangerBorder`...). Chữ trắng trên nền đậm thì giữ `'#fff'`.
    - Màn có form đang nhập thì truyền `mobileActions={null}` để ẩn nút đổi giao diện (đổi giao diện sẽ dựng lại màn hình, mất dữ liệu đang nhập).
  - `confirmAsync` nhận thêm `icon` và `tone: 'primary'` cho hộp thoại không phải xóa.
  - Các thành phần: `Button`, `IconButton`, `Field`, `Avatar`, `Card`, `Badge`, `Page`.
  - Toast và hộp thoại xác nhận qua `UIHost`: dùng `toast.success/error` và `confirmAsync`, **không dùng `Alert` hay `window.alert`**.
  - `Page` tự đổi bố cục: màn hình rộng từ 900px có sidebar, hẹp hơn có header kiểu mobile (`useIsWide`).
- `src/screens/`: `UserDetailScreen` và `UserFormScreen` có prop `self` cho chế độ hồ sơ cá nhân. `DashboardScreen` vẽ biểu đồ bằng `View` thuần (không dùng thư viện chart).
- `src/importFile.js`: `pickTextFile` (expo-document-picker; web đọc `asset.file`, native đọc bằng `File` của expo-file-system), `parseUsers` (JSON hoặc CSV `,`/`;`).

## Lưu ý đa nền tảng
- Style chỉ dành cho web (gradient `backgroundImage`) phải đi qua `gradient` trong `ui.js`, vốn là object rỗng trên native.
- Khoảng cách tai thỏ/thanh trạng thái lấy từ `Constants.statusBarHeight` (`STATUS_H`), không cố định số px.
- Font monospace dùng `Platform.select({ ios: 'Menlo', default: 'monospace' })`.
- Trạng thái `hovered` của `Pressable` chỉ có trên web.
- Nút "Chụp ảnh" chỉ hiện trên native. Xuất JSON trên web tải file về, trên native mở bảng chia sẻ (`Share`).
- Điện thoại phải cùng mạng với máy dev (gợi ý dùng hotspot điện thoại), vì Expo Go tải code từ cổng 8081 và app gọi API ở cổng 5000.

## Bảo mật
`backend/.env` chứa chuỗi kết nối Atlas có mật khẩu và đã được ignore trong git. **Không commit `.env`**; `.env.example` là file mẫu không chứa bí mật.
