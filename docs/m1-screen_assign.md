#screen list
| # | Screens | Route | Access | Notes|
|---|---|---|---|---|
| 1 | Login | `/login` | E M A | Redirect theo role |
| 2 | Shop Registration | `/register` | Guest | |
| 3 | Home / Dashboard | `/` | E M | Nội dung khác theo role |
| 4 | Order List | `/orders` | E M | Employee chỉ thấy đơn của mình |
| 5 | Create / Edit Order | `/orders/new` · `/orders/{id}/edit` | E M | Employee chỉ create, không edit (BR-3) |
| 6 | Order Detail | `/orders/{id}` | E M | Chứa cả Confirm Payment + Export Bill dưới dạng trạng thái |
| 7 | Inventory List | `/inventory` | E M | Employee read-only |
| 8 | Product Form | `/inventory/new` · `/inventory/{id}` | M | Gộp add + edit + nhập thêm + huỷ hàng |
| 9 | Customer List | `/customers` | E M | |
| 10 | Customer Form | `/customers/new` | E M | Đăng ký hội viên |
| 11 | Customer Detail | `/customers/{id}` | M | Lịch sử chi tiêu + hạng |
| 12 | Employee List | `/employees` | M | |
| 13 | Employee Form | `/employees/new` · `/{id}/edit` | M | |
| 14 | KPI & Performance | `/employees/{id}/performance` | E M | Một component, hai route |
| 15 | Sales Dashboard | `/sales` | M | Doanh thu ngày/tuần/tháng, không cần export |
| 16 | 404 | `/404` | E M A | |
# screen assignee

| **screen number** | **description** | **assignee** |
|-------------- | ----------- | ------- |
|1, 2, 3, 16    | login, register, home, 404| Ha Vy |
|4, 5, 6        | order pages | Ngoc Mai |
|7, 8, 15       | inventory pages, sales dashboard | Phuong Oanh |
| 9, 10, 11     | customer pages | Phuong Thao|
| 12, 13, 14    | employee pages | Anh Duong |