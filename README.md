# Cổng Hub Gza

Trang tĩnh, không cần build. Dữ liệu thật nằm ở Supabase project `gza-hub`.

## Cấu trúc
```
gza-hub/
├── index.html            # khung trang: trang chủ, đăng nhập, admin
├── config.js             # địa chỉ + khoá công khai (anon) của Supabase
├── assets/css/style.css  # giao diện
├── assets/js/app.js      # logic: đọc/ghi Supabase, router, admin
├── vercel.json           # cho phép mở gza.vn/admin
└── README.md
```

## Đăng nhập admin
- Vào `/admin` hoặc bấm "Đăng nhập" trên header.
- Chỉ tài khoản có quyền `super_admin` trong bảng `admins` vào được (hiện là gzainfo77@gmail.com).
- Mật khẩu do Supabase Auth kiểm tra, KHÔNG nằm trong code.

## Đã chạy thật (lưu vào Supabase)
- Danh sách web trên trang chủ, thêm web, sửa thông tin web
- Cấu hình email CSKH / email gửi mã + lịch sử thay đổi
- Gói dịch vụ từng web (thêm, sửa, bật/tắt, xoá)
- Tài khoản nhận tiền (ngân hàng, MoMo, VNPay, ZaloPay)
- Token deploy và khoá cổng thanh toán: cất trong Supabase Vault, chỉ ghi được, không đọc lại được từ trình duyệt
- Phân quyền editor/viewer cho tài khoản đã tạo trong Supabase Auth

## Chưa nối (đang hiện số mẫu hoặc tạm khoá)
- Nút Deploy (cần hàm backend gọi API Vercel/Netlify)
- Lượt truy cập / Traffic (cần nối Umami)
- Hạn mức Supabase/Netlify/Vercel
- Khách hàng & thanh toán từ các web (cần mỗi web gửi dữ liệu về hub)
- Đồng bộ cấu hình xuống Firebase của từng web

## Deploy lên Vercel
vercel.com → Add New → Project → kéo thả thư mục `gza-hub`. Hoặc trong thư mục này: `npx vercel --prod`
