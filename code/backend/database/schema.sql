DROP DATABASE IF EXISTS mini_shop;
CREATE DATABASE IF NOT EXISTS mini_shop;
USE mini_shop;

-- ==========================================
-- 1. TẠO CÁC BẢNG (TABLES)
-- ==========================================

CREATE TABLE `users` (
  `user_id` int PRIMARY KEY AUTO_INCREMENT,
  `username` varchar(50) UNIQUE NOT NULL,
  `password` varchar(255) UNIQUE NOT NULL, 
  `role` varchar(30) NOT NULL, -- Admin, Manager, Cashier, Staff
  `is_active` boolean NOT NULL DEFAULT TRUE,
  `employee_id` int,
  `created_at` datetime NOT NULL DEFAULT NOW()
);

CREATE TABLE `employees` (
  `employee_id` int PRIMARY KEY AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `phone` VARCHAR(20),
  `email` varchar(100),
  `role` varchar(30) NOT NULL, -- Manager, Cashier, Staff
  `status` varchar(20) NOT NULL,
  `created_at` date NOT NULL DEFAULT (CURRENT_DATE)
);

CREATE TABLE `customer_types` (
  `customer_type_id` int PRIMARY KEY AUTO_INCREMENT,
  `type_name` varchar(30) NOT NULL, 
  `discount_percent` decimal(5,2) NOT NULL DEFAULT 0
);

CREATE TABLE `customers` (
  `customer_id` int PRIMARY KEY AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `email` varchar(100),
  `total_spent` decimal(12,2) NOT NULL DEFAULT 0,
  `customer_type_id` int DEFAULT 1,
  `created_at` date 
);

CREATE TABLE `categories` (
  `category_id` int PRIMARY KEY AUTO_INCREMENT,
  `category_name` varchar(255)
);

CREATE TABLE `products` (
  `product_id` int PRIMARY KEY AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `category_id` int,
  `unit_price` decimal(12,2) NOT NULL,
  `is_available` boolean NOT NULL DEFAULT TRUE
);

CREATE TABLE `inventory` (
  `inventory_id` int PRIMARY KEY AUTO_INCREMENT,
  `product_id` int NOT NULL,
  `quantity` int NOT NULL DEFAULT 0,
  `stocked_at` date DEFAULT (CURRENT_DATE),
  `expiry_date` date,
  `status` varchar(20) NOT NULL DEFAULT 'Available'
);

CREATE TABLE `orders` (
  `order_id` int PRIMARY KEY AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `customer_id` int,
  `deliver_status` varchar(30) NOT NULL DEFAULT 'not_deliver',
  `total_amount` decimal(12,2) NOT NULL DEFAULT 0,
  `discount_amount` decimal(12,2) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT NOW()
);

CREATE TABLE `order_items` (
  `order_item_id` int PRIMARY KEY AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `product_id` int NOT NULL,
  `quantity` int NOT NULL,
  `unit_price` decimal(12,2) NOT NULL,
  `subtotal` decimal(12,2) NOT NULL
);

-- RÀNG BUỘC KHÓA NGOẠI (FOREIGN KEYS)
ALTER TABLE `users` ADD FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`);
ALTER TABLE `orders` ADD FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`);
ALTER TABLE `orders` ADD FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`);
ALTER TABLE `inventory` ADD FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`);
ALTER TABLE `order_items` ADD FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`);
ALTER TABLE `order_items` ADD FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`);
ALTER TABLE `customers` ADD FOREIGN KEY (`customer_type_id`) REFERENCES `customer_types` (`customer_type_id`);
ALTER TABLE `products` ADD FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`);


