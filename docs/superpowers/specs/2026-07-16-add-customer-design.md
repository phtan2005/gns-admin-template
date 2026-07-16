# Bổ sung tính năng thêm khách hàng cho US02

## 1. Mục tiêu

Loại bỏ hoàn toàn dữ liệu khách hàng mẫu khỏi mô-đun quản lý nhóm khách hàng và cho phép người dùng tạo khách hàng thật ngay trong form tạo/chỉnh sửa nhóm. Khách hàng mới được lưu ở frontend, xuất hiện ngay trong danh sách lựa chọn và được tự động chọn vào nhóm đang thao tác.

## 2. Phạm vi

### Bao gồm

- Bỏ cơ chế tự khởi tạo tám khách hàng mẫu.
- Migration một lần để xoá dữ liệu mẫu đã tồn tại trong `localStorage` và gỡ mã mẫu khỏi các nhóm.
- Thêm nút **Thêm khách hàng** trong khu vực **Chọn khách hàng** của form nhóm.
- Modal tạo khách hàng gồm họ tên, email, số điện thoại, trạng thái và ảnh đại diện.
- Kiểm tra hợp lệ và duy nhất của email, số điện thoại.
- Chọn ảnh JPG/PNG tối đa 3 MB, resize tối đa 256×256 px trước khi lưu.
- Hiển thị khách hàng mới ngay trong picker và tự động chọn khách hàng đó.
- Empty state khi chưa có khách hàng.
- Kiểm thử store, migration, contract giao diện và luồng thêm khách hàng.

### Không bao gồm

- Backend hoặc API khách hàng.
- Trang quản lý khách hàng độc lập.
- Sửa hoặc xoá khách hàng khỏi kho khách hàng chung.
- Đồng bộ dữ liệu giữa trình duyệt hoặc thiết bị.
- Lưu file ảnh lên máy chủ.

## 3. Luồng giao diện

Trong `customer-group-form.html`, khu vực **Chọn khách hàng** có thêm nút **Thêm khách hàng**. Nút mở modal Bootstrap mà không điều hướng khỏi trang và không làm mất dữ liệu nhóm đang nhập.

Modal gồm:

- Họ và tên, bắt buộc.
- Email, bắt buộc.
- Số điện thoại, bắt buộc.
- Trạng thái: đang hoạt động hoặc ngừng hoạt động.
- Ảnh đại diện, không bắt buộc; chỉ nhận JPG hoặc PNG tối đa 3 MB.
- Nút huỷ và nút lưu khách hàng.

Khi lưu thành công:

1. Khách hàng được ghi vào `localStorage`.
2. Modal đóng và được reset.
3. Danh sách picker được render lại.
4. Khách hàng mới được tự động chọn vào nhóm hiện tại.
5. Bộ đếm số khách hàng đã chọn được cập nhật.
6. Hiển thị thông báo thành công bằng SweetAlert hoặc fallback trình duyệt.

Khi không có khách hàng, picker hiển thị **Chưa có khách hàng. Hãy thêm khách hàng mới.** Khi tìm kiếm không có kết quả nhưng kho khách hàng không rỗng, hiển thị **Không tìm thấy khách hàng phù hợp.**

## 4. Mô hình dữ liệu

Khách hàng mới được lưu trong khoá `gns_customers_v1` với cấu trúc:

```json
{
  "id": "customer-<unique-id>",
  "name": "Nguyễn Văn A",
  "email": "a@example.com",
  "phone": "0901 234 567",
  "status": "active",
  "avatar": "data:image/jpeg;base64,...",
  "createdAt": "2026-07-16T08:00:00.000Z",
  "updatedAt": "2026-07-16T08:00:00.000Z"
}
```

Nếu không chọn ảnh, `avatar` dùng đường dẫn ảnh mặc định hiện có của template.

Store bổ sung API:

```js
createCustomer({ name, email, phone, status, avatar })
```

API trả về khách hàng đã được chuẩn hoá và lưu thành công, hoặc ném lỗi tiếng Việt để controller hiển thị.

## 5. Quy tắc validation

- Họ tên phải còn ít nhất một ký tự sau khi trim.
- Email phải đúng định dạng cơ bản và duy nhất sau khi trim/lowercase.
- Số điện thoại phải có giá trị; kiểm tra trùng trên dạng chuẩn hoá chỉ gồm chữ số và dấu `+` đầu chuỗi.
- Trạng thái chỉ nhận `active` hoặc `inactive`.
- Ảnh chỉ nhận MIME `image/jpeg` hoặc `image/png`.
- File ảnh đầu vào không vượt quá 3 MB.
- Ảnh được resize giữ tỉ lệ để cả chiều rộng và chiều cao không vượt 256 px.
- Ảnh được xuất thành JPEG hoặc PNG data URL trước khi lưu.
- Nếu ghi `localStorage` thất bại do hết dung lượng hoặc hạn chế trình duyệt, thao tác không được báo thành công và hiển thị lỗi rõ ràng.

## 6. Migration dữ liệu mẫu

Store không còn seed `DEFAULT_CUSTOMERS`. Một migration có phiên bản chạy một lần khi store khởi tạo và ghi cờ `gns_customers_seed_removed_v2`:

- Nhận diện tám mã mẫu `customer-1` đến `customer-8`.
- Chỉ xoá các bản ghi có mã nằm trong danh sách mẫu; không xoá khách hàng có mã khác.
- Gỡ các mã mẫu khỏi `customerIds` của tất cả nhóm.
- Giữ nguyên mã nhóm, tên, mô tả, trạng thái, `createdAt`, `updatedAt` và chỉ cập nhật dữ liệu membership đã làm sạch.
- Ghi cờ migration có phiên bản để không chạy lại không cần thiết.
- Sau migration, kho khách hàng có thể là mảng rỗng và không tự tạo lại dữ liệu mẫu.

Migration phải xử lý an toàn JSON hỏng và bản ghi sai cấu trúc theo quy tắc store hiện có.

## 7. Xử lý ảnh

Controller form chịu trách nhiệm xử lý file ảnh trước khi gọi store:

1. Kiểm tra MIME và kích thước file tối đa 3 MB.
2. Đọc file bằng `FileReader`.
3. Decode bằng đối tượng `Image`.
4. Tính kích thước mới giữ tỉ lệ, tối đa 256×256 px.
5. Vẽ ảnh lên `canvas` và xuất data URL.
6. Hiển thị preview ảnh đã xử lý.

Nếu người dùng không chọn ảnh, controller truyền ảnh mặc định. Nếu đọc/decode/resize thất bại, modal giữ nguyên dữ liệu văn bản và hiển thị lỗi.

## 8. Thành phần mã nguồn

- Modify `assets/js/pages/customer-groups-store.js`: bỏ seed, thêm migration và `createCustomer`.
- Modify `assets/js/pages/customer-group-form.js`: quản lý modal, validation, resize ảnh, thêm khách hàng và refresh picker.
- Modify `customer-group-form.html`: nút thêm khách hàng và modal.
- Modify `tests/customer-groups-store.test.js`: kiểm thử no-seed, migration, validation và persistence.
- Modify `tests/customer-groups-pages.test.js`: contract cho nút/modal và script/asset references.
- Chỉ chỉnh `assets/css/custom.css` nếu Bootstrap hiện có chưa đủ cho preview hoặc responsive modal.

## 9. Xử lý lỗi

- Validation phía form đánh dấu trường không hợp lệ và giữ modal mở.
- Validation nghiệp vụ từ store được hiển thị bằng thông báo tiếng Việt.
- Email hoặc điện thoại trùng không tạo bản ghi mới.
- File ảnh sai MIME, vượt 3 MB hoặc decode thất bại không được ghi vào store.
- Lỗi quota/storage không làm modal đóng và không tự chọn khách hàng.
- Migration không được xoá nhóm hoặc khách hàng có mã ngoài danh sách seed.

## 10. Kiểm thử và tiêu chí nghiệm thu

### Kiểm thử tự động

- Store không tự seed khách hàng khi khoá chưa tồn tại.
- Migration xoá đúng tám mã mẫu và gỡ chúng khỏi nhóm.
- Migration giữ khách hàng thật và thông tin nhóm.
- Tạo khách hàng hợp lệ và đọc lại được sau reload.
- Từ chối tên trống, email sai, email trùng, điện thoại trùng và status sai.
- Chuẩn hoá email và số điện thoại đúng quy tắc.
- Page contract có nút thêm, modal và đủ trường bắt buộc.
- Toàn bộ test US02 cũ vẫn đạt.

### Kiểm thử giao diện

- Empty state hiển thị khi không có khách hàng.
- Mở/đóng modal không mất dữ liệu nhóm.
- Thêm khách hàng thành công làm modal đóng, picker cập nhật và khách hàng được chọn.
- Tìm kiếm sau khi thêm hoạt động đúng và không làm mất lựa chọn.
- JPG/PNG tối đa 3 MB được resize tối đa 256×256 px và preview đúng.
- File sai định dạng hoặc quá 3 MB hiển thị lỗi.
- Reload trang vẫn giữ khách hàng mới.
- Desktop và mobile không bị tràn giao diện.
- Các trang và local resources trả HTTP 200.

Tính năng hoàn thành khi không còn dữ liệu mẫu, người dùng có thể tạo khách hàng thật từ form nhóm và sử dụng ngay khách hàng đó trong nhóm mà không cần backend.
