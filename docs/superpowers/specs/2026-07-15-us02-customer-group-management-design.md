# US02 – Quản lý nhóm khách hàng

## 1. Mục tiêu

Xây dựng mô-đun quản lý nhóm khách hàng ở phía frontend cho template quản trị hiện có. Người dùng có thể xem danh sách nhóm, tạo và chỉnh sửa nhóm, xem khách hàng thuộc một nhóm, đồng thời gỡ khách hàng khỏi nhóm mà không xoá khách hàng khỏi dữ liệu chung.

Mô-đun hoạt động độc lập với backend và lưu dữ liệu trong `localStorage` để dữ liệu vẫn còn sau khi tải lại trang.

## 2. Phạm vi

### Bao gồm

- Thêm mục **Quản lý nhóm khách hàng** vào sidebar trên toàn bộ template.
- Màn hình danh sách nhóm khách hàng.
- Màn hình dùng chung cho tạo mới và chỉnh sửa nhóm.
- Màn hình chi tiết nhóm và danh sách khách hàng trong nhóm.
- Tìm kiếm, lọc trạng thái và phân trang danh sách nhóm.
- Tìm kiếm và chọn nhiều khách hàng khi tạo hoặc sửa nhóm.
- Tìm kiếm thành viên và gỡ khách hàng khỏi nhóm.
- Lưu dữ liệu và trạng thái vào `localStorage`.
- Thông báo thành công, lỗi và xác nhận thao tác.
- Giao diện responsive theo phong cách hiện có của template.

### Không bao gồm

- Backend, API hoặc cơ sở dữ liệu máy chủ.
- Tạo, sửa hoặc xoá khách hàng trong danh sách khách hàng chung.
- Xoá toàn bộ nhóm khách hàng.
- Phân quyền hoặc xác thực người dùng.
- Đồng bộ dữ liệu giữa nhiều trình duyệt hoặc thiết bị.

## 3. Kiến trúc màn hình

### `customer-groups.html`

Màn hình danh sách nhóm khách hàng có các thành phần:

- Tiêu đề và breadcrumb.
- Nút **Tạo nhóm khách hàng**.
- Ô tìm kiếm theo tên hoặc mô tả.
- Bộ lọc trạng thái: tất cả, đang hoạt động, ngừng hoạt động.
- Bảng gồm tên nhóm, mô tả, số thành viên, trạng thái, ngày cập nhật và thao tác.
- Thao tác **Xem khách hàng** và **Chỉnh sửa**.
- Phân trang và trạng thái không có dữ liệu.

### `customer-group-form.html`

Trang form dùng chung cho hai chế độ:

- Không có `id` trên URL: tạo nhóm mới.
- Có `id` hợp lệ trên URL: chỉnh sửa nhóm hiện có.

Form gồm:

- Tên nhóm, bắt buộc.
- Mô tả, không bắt buộc.
- Trạng thái: đang hoạt động hoặc ngừng hoạt động.
- Danh sách khách hàng có ô tìm kiếm, checkbox chọn nhiều và bộ đếm số khách hàng đã chọn.
- Nút lưu và huỷ.

### `customer-group-details.html`

Màn hình chi tiết nhận mã nhóm qua tham số `id` trên URL và hiển thị:

- Tên, mô tả, trạng thái và tổng số thành viên.
- Bảng khách hàng gồm ảnh đại diện, tên, email, số điện thoại, trạng thái và thao tác.
- Ô tìm kiếm thành viên.
- Nút **Gỡ khỏi nhóm** trên từng dòng.
- Trạng thái không có thành viên.

## 4. Sidebar dùng chung

Template hiện tham chiếu `assets/js/app.js` từ các trang HTML nhưng file này không tồn tại trong repo. Sẽ bổ sung file này và dùng nó để chèn mục **Quản lý nhóm khách hàng** vào `#navbar-nav` khi trang được tải.

Mục menu dẫn đến `customer-groups.html` và được đánh dấu hoạt động trên cả ba màn hình của mô-đun. Cách này giúp menu xuất hiện trên toàn bộ template mà không phải sửa lặp lại gần 200 file HTML.

## 5. Mô hình dữ liệu

### Khách hàng

Dữ liệu khách hàng được khởi tạo lần đầu từ bộ dữ liệu mẫu và lưu ở khoá có phiên bản `gns_customers_v1`.

```json
{
  "id": "customer-1",
  "name": "Nguyễn Văn An",
  "email": "an@example.com",
  "phone": "0901234567",
  "status": "active",
  "avatar": "assets/images/users/32/avatar-2.jpg"
}
```

### Nhóm khách hàng

Danh sách nhóm được lưu ở khoá có phiên bản `gns_customer_groups_v1`.

```json
{
  "id": "group-<unique-id>",
  "name": "Khách hàng VIP",
  "description": "Nhóm khách hàng ưu tiên",
  "status": "active",
  "customerIds": ["customer-1", "customer-2"],
  "createdAt": "2026-07-15T08:00:00.000Z",
  "updatedAt": "2026-07-15T08:00:00.000Z"
}
```

## 6. Quy tắc nghiệp vụ

- Tên nhóm phải có ít nhất một ký tự sau khi loại bỏ khoảng trắng đầu và cuối.
- Tên nhóm không được trùng trong toàn bộ danh sách, không phân biệt chữ hoa, chữ thường và khoảng trắng đầu/cuối.
- Mô tả không bắt buộc.
- Trạng thái chỉ nhận `active` hoặc `inactive`.
- Một khách hàng có thể thuộc nhiều nhóm.
- Danh sách `customerIds` trong một nhóm không chứa mã trùng lặp.
- Gỡ khách hàng chỉ xoá mã khách hàng khỏi `customerIds` của nhóm hiện tại.
- Gỡ khách hàng không thay đổi kho khách hàng chung hoặc thành viên của nhóm khác.
- Mỗi thao tác tạo, sửa hoặc gỡ thành viên cập nhật `updatedAt`.
- Dữ liệu khách hàng mẫu chỉ được khởi tạo nếu khoá `gns_customers_v1` chưa tồn tại.

## 7. Luồng dữ liệu và xử lý lỗi

- Trang danh sách đọc các nhóm từ `localStorage`, sau đó áp dụng tìm kiếm, lọc và phân trang ở phía trình duyệt.
- Trang form đọc khách hàng từ `localStorage`; khi sửa, trang cũng đọc nhóm theo `id` và đánh dấu các khách hàng đã thuộc nhóm.
- Trang chi tiết kết hợp `customerIds` của nhóm với kho khách hàng chung để tạo danh sách thành viên.
- Nếu `id` bị thiếu ở trang chi tiết hoặc không tìm thấy nhóm, giao diện hiển thị thông báo và chuyển về danh sách.
- Nếu dữ liệu `localStorage` không phải JSON hợp lệ hoặc sai cấu trúc, lớp lưu trữ dùng giá trị an toàn và không để lỗi làm vỡ giao diện.
- SweetAlert được ưu tiên cho thông báo và xác nhận. Nếu thư viện không khả dụng, giao diện dùng `alert` hoặc `confirm` của trình duyệt.
- Khi không có kết quả tìm kiếm, không có nhóm hoặc không có thành viên, giao diện hiển thị trạng thái rỗng phù hợp.

## 8. Thành phần mã nguồn

- `assets/js/app.js`: chèn và đánh dấu mục sidebar dùng chung.
- `assets/js/pages/customer-groups-store.js`: lớp dữ liệu thuần JavaScript, quản lý seed, đọc, ghi, kiểm tra hợp lệ và các thao tác nhóm.
- `assets/js/pages/customer-groups-list.js`: điều khiển trang danh sách.
- `assets/js/pages/customer-group-form.js`: điều khiển form tạo và sửa.
- `assets/js/pages/customer-group-details.js`: điều khiển trang chi tiết và gỡ thành viên.
- Ba file HTML tương ứng với ba màn hình.
- `assets/css/custom.css`: chỉ bổ sung style nhỏ nếu các lớp Bootstrap sẵn có chưa đáp ứng; không thay đổi thiết kế chung của template.

Lớp lưu trữ không phụ thuộc DOM để có thể kiểm thử tự động độc lập. Các controller trang chỉ chịu trách nhiệm đọc input, gọi lớp lưu trữ và render giao diện.

## 9. Trải nghiệm người dùng

- Toàn bộ nhãn, thông báo và nút của mô-đun dùng tiếng Việt.
- Màu sắc, typography, card, table, badge và button theo hệ thống thiết kế hiện có.
- Các thao tác lưu hiển thị phản hồi thành công hoặc lỗi rõ ràng.
- Gỡ khách hàng luôn yêu cầu xác nhận và hiển thị tên khách hàng.
- Form giữ lựa chọn khách hàng khi người dùng tìm kiếm trong danh sách.
- Bảng và form sử dụng được trên desktop, tablet và mobile.
- Các nút có nhãn hoặc thuộc tính hỗ trợ để người dùng bàn phím và trình đọc màn hình hiểu được chức năng.

## 10. Kiểm thử và tiêu chí nghiệm thu

### Kiểm thử tự động

- Khởi tạo dữ liệu mẫu đúng một lần.
- Tạo nhóm hợp lệ và đọc lại được sau khi tải lại lớp lưu trữ.
- Từ chối tên trống và tên trùng không phân biệt hoa/thường.
- Sửa đúng thông tin và danh sách thành viên của nhóm.
- Một khách hàng có thể thuộc nhiều nhóm.
- Gỡ thành viên không xoá khách hàng chung hoặc ảnh hưởng nhóm khác.
- Xử lý mã nhóm không tồn tại.
- Xử lý dữ liệu lưu trữ lỗi mà không ném lỗi ngoài dự kiến.

### Kiểm thử giao diện

- Tìm kiếm, lọc và phân trang danh sách nhóm.
- Tạo mới, chỉnh sửa và tải lại trang vẫn giữ dữ liệu.
- Chọn nhiều khách hàng, tìm kiếm nhưng không làm mất lựa chọn.
- Xem danh sách thành viên và gỡ thành viên sau xác nhận.
- Huỷ xác nhận không thay đổi dữ liệu.
- Sidebar hiển thị trên trang cũ và đánh dấu đúng trên ba trang mô-đun.
- Thông báo và trạng thái rỗng hiển thị đúng.
- Kiểm tra trực quan ở kích thước desktop và mobile.

US02 hoàn thành khi toàn bộ luồng trên hoạt động không cần backend, dữ liệu tồn tại qua lần tải lại trang và các kiểm thử liên quan đều đạt.
