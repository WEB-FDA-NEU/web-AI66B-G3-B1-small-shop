-- 1 CUSTOMER_TYPES
INSERT INTO customer_types (type_name, discount_percent)
VALUES
('Rock', 0.00),
('Bronze', 5.00),
('Silver', 15.00),
('Gold', 30.00);

-- 2 CATEGORIES
INSERT INTO categories (category_name)
VALUES
('Coffee'),
('Tea'),
('Milk Tea'),
('Pastry'),
('Food'),
('Dessert');

-- 3 USER
-- mật khẩu là chú thích bên cạnh, created at t để trùng hoặc sau vài ngày so với created at ở bảng employees
INSERT INTO users(username, password, role, created_at)
VALUES
('havy', '$2b$12$GnRbPRHYkKdx.wTmol84f.zb205mUaGNWSvu50ZO0Y7MVu4gW.0lO', 'Admin', '2026-09-01 08:30:00'), -- 12345
('minhanh', '$2b$12$5m7wkDaLLs9oH2ymLxRHp.Gw1rL7TVOnNM3V3D1lGS0zmWw.rxcSG', 'Employee', '2026-09-02 09:15:00'), -- minhanh
('quanghuy', '$2b$12$Ys.i/f99eRkkji8Rs.bg/.xM6A.La4rSWRGpowlnZcIOEtDGw/vwS', 'Employee', '2026-09-06 14:00:00'), -- quanghuy
('thutrang', '$2b$12$wd79ID6ttO/eb0yt/vI0lO8dZlAIaw0eAUTwuKsSt38hvhSumYh.a', 'Employee', '2026-09-12 10:20:00'), -- thutrang
('ducanh', '$2b$12$QWelM1jh2v9qdLZalHn7du.ZermdBxMa3F42nbNGd/ZsevvRIqTz6', 'Employee', '2026-09-16 16:45:00'),	-- ducanh
('an_nv', 'mã_hoá', 'Manager', '2026-09-19 08:00:00'),
('binh_tt', 'mã_hoá', 'Employee', '2026-09-22 09:30:00'),
('cuong_lv', 'mã_hoá', 'Employee', '2026-09-27 10:00:00'),
('dung_pt', 'mã_hoá', 'Employee', '2026-10-02 11:15:00'),
('em_hv', 'mã_hoá', 'Employee', '2026-10-05 14:20:00'),
('hoa_vt', 'mã_hoá', 'Employee', '2026-10-11 08:45:00'),
('hung_dv', 'mã_hoá', 'Employee', '2026-10-14 09:00:00'),
('lan_bt', 'mã_hoá', 'Employee', '2026-10-20 15:30:00'),
('minh_dv', 'mã_hoá', 'Employee', '2026-10-23 10:10:00'),
('nga_nt', 'mã_hoá', 'Manager', '2026-10-28 13:40:00'),
('long_pv', 'mã_hoá', 'Employee', '2026-10-30 16:00:00'),
('mai_ht', 'mã_hoá', 'Employee', '2026-11-04 09:20:00'),
('nam_vq', 'mã_hoá', 'Employee', '2026-11-05 11:00:00'),
('phuong_dt', 'mã_hoá', 'Employee', '2026-11-08 14:15:00'),
('son_bv', 'mã_hoá', 'Employee', '2026-11-10 16:30:00');

-- 4 EMPLOYEES
INSERT INTO employees (name, username, phone, role, status, created_at)
VALUES
('Tran Minh Anh', 'minhanh', '0912345678', 'Staff', 'Active', '2026-09-02'),
('Le Quang Huy', 'quanghuy', '0923456789', 'Staff', 'On Leave', '2026-09-05'),
('Pham Thu Trang', 'thutrang', '0934567890', 'Staff', 'Active', '2026-09-10'),
('Do Duc Anh', 'ducanh', '0945678901', 'Staff', 'Inactive', '2026-09-15'),
('Nguyen Van An', 'an_nv', '0901234567', 'Manager', 'Active', '2026-09-18'),
('Tran Thi Binh', 'binh_tt', '0912345678', 'Staff', 'Active', '2026-09-22'),
('Le Van Cuong', 'cuong_lv', '0923456789', 'Cashier', 'On Leave', '2026-09-25'),
('Pham Thi Dung', 'dung_pt', '0934567890', 'Staff', 'Active', '2026-10-01'),
('Hoang Van Em', 'em_hv', '0945678901', 'Cashier', 'Active', '2026-10-05'),
('Vu Thi Hoa', 'hoa_vt', '0956789012', 'Staff', 'Inactive', '2026-10-09'),
('Dang Van Hung', 'hung_dv', '0967890123', 'Cashier', 'Active', '2026-10-14'),
('Bui Thi Lan', 'lan_bt', '0978901234', 'Staff', 'On Leave', '2026-10-18'),
('Do Van Minh', 'minh_dv', '0989012345', 'Cashier', 'Inactive', '2026-10-22'),
('Nguyen Thi Nga', 'nga_nt', '0990123456', 'Manager', 'On Leave', '2026-10-26'),
('Pham Van Long', 'long_pv', '0903234567', 'Cashier', 'Active', '2026-10-30'),
('Hoang Thi Mai', 'mai_ht', '0914345678', 'Staff', 'Active', '2026-11-02'),
('Vu Quoc Nam', 'nam_vq', '0925456789', 'Cashier', 'On Leave', '2026-11-05'),
('Dang Thi Phuong', 'phuong_dt', '0936567890', 'Staff', 'Inactive', '2026-11-07'),
('Bui Van Son', 'son_bv', '0947678901', 'Cashier', 'On Leave', '2026-11-09');

-- 5 CUSTOMERS 
INSERT INTO customers (name, phone, created_at)
VALUES
('Nguyen Van An', '0382384920', '2026-09-02'), 
('Tran Thu Ha', '0793451293', '2026-09-05'),    
('Le Minh Duc', '0898234192', '2026-09-10'), 
('Pham Ngoc Mai', '0355678231', '2026-09-14'), 
('Hoang Gia Bao', '0565123847', '2026-09-18'),  
('Vu Thanh Hoa', '0788765432', '2026-09-22'), 
('Do Minh Quan', '0323456781', '2026-09-26'), 
('Bui Khanh Linh', '0868123498', '2026-10-01'),
('Ngo Quynh Anh', '0345231876', '2026-10-05'),
('Duong Trung Hieu', '0766543210', '2026-10-10'),
('Phan Thi Kim Oanh', '0332145698', '2026-10-15'),
('Trinh Hoang Long', '0899123765', '2026-10-20'),
('Dao Thi Thanh', '0586543892', '2026-10-25'),
('Bui Dinh Tung', '0388761234', '2026-10-30'),
('Vuong Ngoc Lan', '0774321876', '2026-11-03'),
('Lai Van Nam', '0828765431', '2026-11-08');

-- 6 PRODUCTS
INSERT INTO products
(name, category_id, unit_price)
VALUES
('Espresso', 1, 35000),
('Americano', 1, 40000),
('Cappuccino', 1, 45000),
('Latte', 1, 45000),

('Green Tea', 2, 30000),
('Peach Tea', 2, 40000),
('Lemon Tea', 2, 35000),

('Classic Milk Tea', 3, 45000),
('Brown Sugar Milk Tea', 3, 50000),
('Matcha Milk Tea', 3, 50000),

('Croissant', 4, 35000),
('Chocolate Muffin', 4, 40000),
('Butter Cookie', 4, 25000),

('Chicken Sandwich', 5, 55000),
('Beef Sandwich', 5, 65000),

('Cheesecake', 6, 55000),
('Tiramisu', 6, 60000),
('Ice Cream', 6, 40000);

-- 7 INVENTORY
INSERT INTO inventory (product_id, quantity, stocked_at)
VALUES 
    -- Nhóm Cà phê (Product 1 - 4)
    (1, 7, CURRENT_DATE - INTERVAL 6 DAY),
    (1, 50, CURRENT_DATE - INTERVAL 2 DAY),
    (2, 40, CURRENT_DATE - INTERVAL 1 DAY),
    (3, 45, CURRENT_DATE),
    (3, 12, CURRENT_DATE - INTERVAL 5 DAY),
    (4, 60, CURRENT_DATE),

    -- Nhóm Trà (Product 5 - 7)
    (5, 30, CURRENT_DATE - INTERVAL 2 DAY),
    (5, 3, CURRENT_DATE - INTERVAL 7 DAY),
    (6, 25, CURRENT_DATE - INTERVAL 1 DAY),
    (7, 35, CURRENT_DATE),

    -- Nhóm Trà sữa (Product 8 - 10)
    (8, 20, CURRENT_DATE - INTERVAL 2 DAY),
    (8, 10, CURRENT_DATE - INTERVAL 4 DAY),
    (9, 25, CURRENT_DATE - INTERVAL 1 DAY),
    (10, 30, CURRENT_DATE),

    -- Nhóm Bánh mì / Bánh ngọt nhẹ (Product 11 - 13)
    (11, 8, CURRENT_DATE - INTERVAL 8 DAY),
    (11, 40, CURRENT_DATE - INTERVAL 2 DAY),
    (12, 4, CURRENT_DATE - INTERVAL 5 DAY),
    (12, 35, CURRENT_DATE - INTERVAL 1 DAY),
    (13, 50, CURRENT_DATE),

    -- Nhóm Sandwich mặn (Product 14 - 15)
    (14, 20, CURRENT_DATE - INTERVAL 1 DAY),
    (5, 2, CURRENT_DATE - INTERVAL 7 DAY),
    (15, 15, CURRENT_DATE),

    -- Nhóm Bánh ngọt tráng miệng & Kem (Product 16 - 18)
    (16, 25, CURRENT_DATE - INTERVAL 2 DAY),
    (16, 6, CURRENT_DATE - INTERVAL 5 DAY),
    (17, 20, CURRENT_DATE - INTERVAL 1 DAY),
    (18, 40, CURRENT_DATE);

-- 8 ORDERS
INSERT INTO orders (employee_id, customer_id, deliver_status, note, created_at)
VALUES
    -- Customer 1 | created_at: 2026-09-02 | total_spent: 250000
    (1, 1, 'delivered', 'Customer requested extra sweet.', '2026-09-05 09:30:12'),
    (2, 1, 'delivered', 'Quick service afternoon.', '2026-10-12 14:00:00'),

    -- Customer 2 | created_at: 2026-09-05 | total_spent: 180000
    (2, 2, 'delivered', 'Please use non-lactose milk.', '2026-09-10 10:15:40'),
    (3, 2, 'delivered', 'Extra napkin please.', '2026-10-22 16:10:00'),

    -- Customer 3 | created_at: 2026-09-10 | total_spent: 850000
    (3, 3, 'delivered', 'Morning coffee.', '2026-09-12 08:15:00'),
    (4, 3, 'delivered', 'Cool-served tea.', '2026-09-28 11:05:00'),
    (5, 3, 'delivered', 'Afternoon pastry.', '2026-10-15 15:20:00'),
    (6, 3, 'delivered', 'Early November coffee.', '2026-11-03 08:00:00'),

    -- Customer 4 | created_at: 2026-09-14 | total_spent: 95000
    (4, 4, 'delivered', 'Regular order.', '2026-09-20 14:20:15'),

    -- Customer 5 | created_at: 2026-09-18 | total_spent: 45000
    (5, 5, 'delivered', 'No ice, half sugar please.', '2026-09-25 08:50:22'),

    -- Customer 6 | created_at: 2026-09-22 | total_spent: 620000
    (6, 6, 'delivered', 'Pack takeaway in separate bags.', '2026-09-26 15:10:00'),
    (7, 6, 'delivered', 'Less sweet order.', '2026-10-18 09:40:00'),

    -- Customer 7 | created_at: 2026-09-26 | total_spent: 60000
    (7, 7, 'delivered', 'Urgent delivery order.', '2026-10-02 12:00:33'),

    -- Customer 8 | created_at: 2026-10-01 | total_spent: 1250000
    (8, 8, 'delivered', 'VIP order part 1', '2026-10-03 09:00:00'),
    (9, 8, 'delivered', 'VIP order part 2', '2026-10-14 13:20:00'),
    (10, 8, 'delivered', 'VIP order part 3', '2026-10-25 16:45:10'),
    (11, 8, 'delivered', 'VIP order part 4', '2026-11-04 11:15:00'),

    -- Customer 9 | created_at: 2026-10-05 | total_spent: 150000
    (9, 9, 'delivered', 'Regular order, quick service.', '2026-10-08 09:20:11'),
    (11, 9, 'delivered', 'Quick snack.', '2026-11-01 14:00:00'),

    -- Customer 10 | created_at: 2026-10-10 | total_spent: 410000
    (10, 10, 'delivered', 'Less ice.', '2026-10-12 13:10:00'),
    (11, 10, 'delivered', 'Extra topping.', '2026-10-20 10:00:00'),
    (12, 10, 'delivered', 'Evening treat.', '2026-11-02 19:15:00'),

    -- Customer 11 | created_at: 2026-10-15 | total_spent: 290000
    (11, 11, 'delivered', 'Extra topping.', '2026-10-18 10:05:00'),
    (13, 11, 'delivered', 'Quick lunch.', '2026-10-30 12:30:00'),

    -- Customer 12 | created_at: 2026-10-20 | total_spent: 980000
    (12, 12, 'delivered', 'First batch.', '2026-10-22 14:30:00'),
    (13, 12, 'delivered', 'Second batch.', '2026-10-29 09:15:00'),
    (14, 12, 'delivered', 'Final batch.', '2026-11-06 16:00:00'),

    -- Customer 13 | created_at: 2026-10-25 | total_spent: 80000
    (13, 13, 'delivered', 'Take away.', '2026-10-28 16:15:00'),

    -- Customer 14 | created_at: 2026-10-30 | total_spent: 530000
    (14, 14, 'delivered', 'Fast delivery 1.', '2026-11-01 09:00:00'),
    (15, 14, 'delivered', 'Fast delivery 2.', '2026-11-07 13:40:00'),

    -- Customer 15 | created_at: 2026-11-03 | total_spent: 1450000
    (15, 15, 'delivered', 'VIP order A', '2026-11-04 11:20:00'),
    (16, 15, 'delivered', 'VIP order B', '2026-11-06 15:10:00'),
    (17, 15, 'delivered', 'VIP order C', '2026-11-08 10:30:00'),

    -- Customer 16 | created_at: 2026-11-08 | total_spent: 35000
    (16, 16, 'delivered', 'Small order.', '2026-11-09 10:00:00');
    

-- 9 ORDER ITEMS
INSERT INTO order_items (order_id, product_id, quantity)
VALUES
    -- ================= Customer 1 (total_spent: 250,000) =================
    -- Order 1
    (1, 4, 2),   -- 2 x Latte
    (1, 12, 1),  -- 1 x Chocolate Muffin
    -- Order 2
    (2, 2, 1),   -- 1 x Americano
    (2, 13, 1),  -- 1 x Butter Cookie
    (2, 16, 1),  -- 1 x Cheesecake

    -- ================= Customer 2 (total_spent: 180,000) =================
    -- Order 3
    (3, 4, 2),   -- 2 x Latte
    -- Order 4
    (4, 9, 1),   -- 1 x Brown Sugar Milk Tea
    (4, 18, 1),  -- 1 x Ice Cream

    -- ================= Customer 3 (total_spent: 850,000) =================
    -- Order 5
    (5, 1, 2),   -- 2 x Espresso
    (5, 11, 4),  -- 4 x Croissant
    -- Order 6
    (6, 6, 2),   -- 2 x Peach Tea
    (6, 14, 1),  -- 1 x Chicken Sandwich
    (6, 17, 1),  -- 1 x Tiramisu
    -- Order 7
    (7, 3, 2),   -- 2 x Cappuccino
    (7, 15, 2),  -- 2 x Beef Sandwich
    -- Order 8
    (8, 10, 2),  -- 2 x Matcha Milk Tea
    (8, 12, 1),  -- 1 x Chocolate Muffin
    (8, 15, 1),  -- 1 x Beef Sandwich

    -- ================= Customer 4 (total_spent: 95,000) =================
    -- Order 9
    (9, 2, 1),   -- 1 x Americano
    (9, 16, 1),  -- 1 x Cheesecake

    -- ================= Customer 5 (total_spent: 45,000) =================
    -- Order 10
    (10, 3, 1),  -- 1 x Cappuccino

    -- ================= Customer 6 (total_spent: 620,000) =================
    -- Order 11
    (11, 8, 2),  -- 2 x Classic Milk Tea
    (11, 14, 4), -- 4 x Chicken Sandwich
    -- Order 12
    (12, 10, 2), -- 2 x Matcha Milk Tea
    (12, 16, 2), -- 2 x Cheesecake
    (12, 18, 2), -- 2 x Ice Cream

    -- ================= Customer 7 (total_spent: 60,000) =================
    -- Order 13
    (13, 17, 1), -- 1 x Tiramisu

    -- ================= Customer 8 (total_spent: 1,250,000) =================
    -- Order 14
    (14, 4, 2),  -- 2 x Latte
    (14, 15, 2), -- 2 x Beef Sandwich
    (14, 17, 1), -- 1 x Tiramisu
    (14, 18, 1), -- 1 x Ice Cream
    -- Order 15
    (15, 9, 3),  -- 3 x Brown Sugar Milk Tea
    (15, 11, 2), -- 2 x Croissant
    (15, 13, 1), -- 1 x Butter Cookie
    (15, 16, 1), -- 1 x Cheesecake
    -- Order 16
    (16, 2, 3),  -- 3 x Americano
    (16, 12, 2), -- 2 x Chocolate Muffin
    (16, 17, 2), -- 2 x Tiramisu
    -- Order 17
    (17, 10, 3), -- 3 x Matcha Milk Tea
    (17, 14, 2), -- 2 x Chicken Sandwich
    (17, 17, 1), -- 1 x Tiramisu

    -- ================= Customer 9 (total_spent: 150,000) =================
    -- Order 18
    (18, 2, 1),  -- 1 x Americano
    (18, 11, 1), -- 1 x Croissant
    -- Order 19
    (19, 7, 1),  -- 1 x Lemon Tea
    (19, 18, 1), -- 1 x Ice Cream

    -- ================= Customer 10 (total_spent: 410,000) =================
    -- Order 20
    (20, 1, 1),  -- 1 x Espresso
    (20, 12, 1), -- 1 x Chocolate Muffin
    (20, 17, 1), -- 1 x Tiramisu
    -- Order 21
    (21, 6, 2),  -- 2 x Peach Tea
    (21, 17, 1), -- 1 x Tiramisu
    -- Order 22
    (22, 3, 1),  -- 1 x Cappuccino
    (22, 5, 1),  -- 1 x Green Tea
    (22, 17, 1), -- 1 x Tiramisu

    -- ================= Customer 11 (total_spent: 290,000) =================
    -- Order 23
    (23, 8, 1),  -- 1 x Classic Milk Tea
    (23, 10, 2), -- 2 x Matcha Milk Tea
    -- Order 24
    (24, 6, 1),  -- 1 x Peach Tea
    (24, 9, 1),  -- 1 x Brown Sugar Milk Tea
    (24, 14, 1), -- 1 x Chicken Sandwich

    -- ================= Customer 12 (total_spent: 980,000) =================
    -- Order 25
    (25, 4, 3),  -- 3 x Latte
    (25, 15, 2), -- 2 x Beef Sandwich
    (25, 16, 1), -- 1 x Cheesecake
    -- Order 26
    (26, 9, 3),  -- 3 x Brown Sugar Milk Tea
    (26, 17, 3), -- 3 x Tiramisu
    -- Order 27
    (27, 2, 2),  -- 2 x Americano
    (27, 11, 2), -- 2 x Croissant
    (27, 14, 1), -- 1 x Chicken Sandwich
    (27, 17, 2), -- 2 x Tiramisu

    -- ================= Customer 13 (total_spent: 80,000) =================
    -- Order 28
    (28, 6, 2),  -- 2 x Peach Tea

    -- ================= Customer 14 (total_spent: 530,000) =================
    -- Order 29
    (29, 3, 3),  -- 3 x Cappuccino
    (29, 15, 2), -- 2 x Beef Sandwich
    -- Order 30
    (30, 10, 3), -- 3 x Matcha Milk Tea
    (30, 16, 1), -- 1 x Cheesecake
    (30, 18, 1), -- 1 x Ice Cream

    -- ================= Customer 15 (total_spent: 1,450,000) =================
    -- Order 31
    (31, 4, 4),  -- 4 x Latte
    (31, 15, 2), -- 2 x Beef Sandwich
    (31, 16, 2), -- 2 x Cheesecake
    (31, 18, 2), -- 2 x Ice Cream
    -- Order 32
    (32, 9, 3),  -- 3 x Brown Sugar Milk Tea
    (32, 10, 3), -- 3 x Matcha Milk Tea
    (32, 14, 1), -- 1 x Chicken Sandwich
    (32, 17, 2), -- 2 x Tiramisu
    -- Order 33
    (33, 2, 4),  -- 4 x Americano
    (33, 11, 3), -- 3 x Croissant
    (33, 17, 1), -- 1 x Tiramisu
    (33, 18, 4), -- 4 x Ice Cream

    -- ================= Customer 16 (total_spent: 35,000) =================
    -- Order 34
    (34, 1, 1);  -- 1 x Espresso

