USE mini_shop;


-- 1 CUSTOMER_TYPES
INSERT INTO customer_types (type_name, discount_percent)
VALUES
('Rock', 0.00),
('Bronze', 5.00),
('Silver', 10.00),
('Gold', 15.00);

-- 2 CATEGORIES
INSERT INTO categories (category_name)
VALUES
('Coffee'),
('Tea'),
('Milk Tea'),
('Pastry'),
('Food'),
('Dessert');

-- 3 USERS
INSERT INTO users (username, password, role)
VALUES 
('havy', '12345', 'Admin');

-- 4 EMPLOYEES
INSERT INTO employees (name, phone, email, role, status)
VALUES
('Nguyen Ha Vy', '0901234567', 'havy@yums.com', 'Manager', 'Active'),
('Tran Minh Anh', '0912345678', 'minhanh@yums.com', 'Staff', 'Active'),
('Le Quang Huy', '0923456789', 'quanghuy@yums.com', 'Staff', 'On Leave'),
('Pham Thu Trang', '0934567890', 'thutrang@yums.com', 'Staff', 'Active'),
('Do Duc Anh', '0945678901', 'ducanh@yums.com', 'Staff', 'Inactive'),
('Nguyen Van An', '0901234567', 'an@example.com', 'Manager', 'Active'),
('Tran Thi Binh', '0912345678', 'binh@example.com', 'Staff', 'Active'),
('Le Van Cuong', '0923456789', 'cuong@example.com', 'Cashier', 'On Leave'),
('Pham Thi Dung', '0934567890', 'dung@example.com', 'Staff', 'Active'),
('Hoang Van Em', '0945678901', 'em@example.com', 'Cashier', 'Active'),
('Vu Thi Hoa', '0956789012', 'hoa@example.com', 'Staff', 'Inactive'),
('Dang Van Hung', '0967890123', 'hung@example.com', 'Cashier', 'Active'),
('Bui Thi Lan', '0978901234', 'lan@example.com', 'Staff', 'On Leave'),
('Do Van Minh', '0989012345', 'minh@example.com', 'Cashier', 'Inactive'),
('Nguyen Thi Nga', '0990123456', 'nga@example.com', 'Manager', 'On Leave'),
('Pham Van Long', '0903234567', 'long@yums.com', 'Cashier', 'Active'),
('Hoang Thi Mai', '0914345678', 'mai@yums.com', 'Staff', 'Active'),
('Vu Quoc Nam', '0925456789', 'nam@yums.com', 'Cashier', 'On Leave'),
('Dang Thi Phuong', '0936567890', 'phuong@yums.com', 'Staff', 'Inactive'),
('Bui Van Son', '0947678901', 'son@yums.com', 'Cashier', 'On Leave');

-- 5 CUSTOMERS 
INSERT INTO customers
(name, phone, email, total_spent, customer_type_id)
VALUES
('Nguyen Van An', '0981000001', 'an@gmail.com', 1250000, 3),
('Tran Thu Ha', '0981000002', 'ha@gmail.com', 680000, 2),
('Le Minh Duc', '0981000003', 'duc@gmail.com', 2500000, 4),
('Pham Ngoc Mai', '0981000004', 'mai@gmail.com', 320000, 2),
('Hoang Gia Bao', '0981000005', 'bao@gmail.com', 95000, 1),
('Vu Thanh Hoa', '0981000006', 'hoa@gmail.com', 1850000, 3),
('Do Minh Quan', '0981000007', 'quan@gmail.com', 150000, 1),
('Bui Khanh Linh', '0981000008', 'linh@gmail.com', 4200000, 4);

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
INSERT INTO inventory (product_id, quantity)
VALUES 
(1, 50), 
(2, 40),

(3, 3), 
(4, 5), 

(5, 20), 
(6, 10);

-- 8 ORDERS
INSERT INTO orders (employee_id, customer_id) 
VALUES 
(1, 1),
(2, 2),
(3, 5),
(4, 3);

-- 9 ORDER ITEMS
INSERT INTO order_items (`order_id`, `product_id`, `quantity`)
VALUES 
(1, 1, 45),
(2, 2, 1),
(2, 10, 4),
(3, 5, 2),
(4, 11, 1);




UPDATE `orders` SET `deliver_status` = 'delivered' WHERE `order_id` = 1;

SELECT * FROM inventory;
SELECT * FROM products;
SELECT * FROM orders;
SELECT * FROM order_items;
SELECT * FROM customers;
SELECT * FROM users;
SELECT * FROM employees;
