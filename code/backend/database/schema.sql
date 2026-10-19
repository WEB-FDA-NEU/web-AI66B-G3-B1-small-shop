-- ==========================================
-- 2. STORED PROCEDURE HỖ TRỢ XỬ LÝ KHÁCH HÀNG
-- ==========================================
DELIMITER //

DROP PROCEDURE IF EXISTS `sp_update_customer_rank` //
CREATE PROCEDURE `sp_update_customer_rank`(IN p_customer_id INT)
BEGIN
    DECLARE v_total_spent DECIMAL(12,2) DEFAULT 0.00;
    DECLARE v_new_type_id INT;

    IF p_customer_id IS NOT NULL THEN
        -- 1. Tính tổng chi tiêu thực tế từ tất cả đơn đã 'delivered'
        SELECT IFNULL(SUM(total_amount), 0.00) INTO v_total_spent
        FROM `orders`
        WHERE `customer_id` = p_customer_id AND `deliver_status` = 'delivered';

        -- 2. Xác định hạng dựa trên tổng chi tiêu
        IF v_total_spent >= 10000000.00 THEN
            SELECT customer_type_id INTO v_new_type_id FROM customer_types WHERE type_name = 'Gold' LIMIT 1;
        ELSEIF v_total_spent >= 5000000.00 THEN
            SELECT customer_type_id INTO v_new_type_id FROM customer_types WHERE type_name = 'Silver' LIMIT 1;
        ELSEIF v_total_spent >= 2000000.00 THEN
            SELECT customer_type_id INTO v_new_type_id FROM customer_types WHERE type_name = 'Bronze' LIMIT 1;
        ELSE
            SELECT customer_type_id INTO v_new_type_id FROM customer_types WHERE type_name = 'Rock' LIMIT 1;
        END IF;

        -- 3. Cập nhật lại cho Khách hàng
        UPDATE `customers`
        SET `total_spent` = v_total_spent,
            `customer_type_id` = v_new_type_id
        WHERE `customer_id` = p_customer_id;
    END IF;
END //

DELIMITER ;


-- ==========================================
-- 3. TRIGGERS QUẢN LÝ KHO (INVENTORY & PRODUCTS)
-- ==========================================
DELIMITER //

-- Tự động gán Hạn sử dụng & Trạng thái kho khi Insert
DROP TRIGGER IF EXISTS `inventory_auto_status_insert` //
CREATE TRIGGER `inventory_auto_status_insert`
BEFORE INSERT ON `inventory`
FOR EACH ROW
BEGIN
    IF NEW.expiry_date IS NULL THEN
        SET NEW.expiry_date = DATE(DATE_ADD(IFNULL(NEW.stocked_at, CURRENT_DATE), INTERVAL 5 DAY));
    END IF;

    IF NEW.expiry_date < CURRENT_DATE THEN
        SET NEW.status = 'Expired';
    ELSEIF NEW.expiry_date <= DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY) THEN
        SET NEW.status = 'Near Expiration';
    ELSEIF NEW.quantity <= 5 AND NEW.quantity > 0 THEN
        SET NEW.status = 'Low Stock';
	ELSEIF NEW.quantity = 0 THEN
		SET NEW.status = 'Sold out';
    ELSE
        SET NEW.status = 'Available';
    END IF;
END //

-- Tự động cập nhật Trạng thái kho khi Update
DROP TRIGGER IF EXISTS `inventory_auto_status_update` //
CREATE TRIGGER `inventory_auto_status_update`
BEFORE UPDATE ON `inventory`
FOR EACH ROW
BEGIN
    IF NEW.expiry_date < CURRENT_DATE THEN
        SET NEW.status = 'Expired';
    ELSEIF NEW.expiry_date <= DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY) THEN
        SET NEW.status = 'Near Expiration';
    ELSEIF NEW.quantity <= 5 AND NEW.quantity > 0 THEN
        SET NEW.status = 'Low Stock';
	ELSEIF NEW.quantity = 0 THEN
		SET NEW.status = 'Sold out';
    ELSE
        SET NEW.status = 'Available';
    END IF;
END //

-- Cập nhật trạng thái is_available cho Bảng Products khi Kho thay đổi
DROP TRIGGER IF EXISTS `inventory_update_product_availability_insert` //
CREATE TRIGGER `inventory_update_product_availability_insert`
AFTER INSERT ON `inventory`
FOR EACH ROW
BEGIN
    DECLARE valid_stock_count INT;

    SELECT COUNT(*) INTO valid_stock_count
    FROM `inventory`
    WHERE `product_id` = NEW.product_id 
      AND `status` != 'Expired'
      AND `quantity` > 0;

    UPDATE `products` 
    SET `is_available` = (valid_stock_count > 0)
    WHERE `product_id` = NEW.product_id;
END //

DROP TRIGGER IF EXISTS `inventory_update_product_availability_update` //
CREATE TRIGGER `inventory_update_product_availability_update`
AFTER UPDATE ON `inventory`
FOR EACH ROW
BEGIN
    DECLARE valid_stock_count INT;

    SELECT COUNT(*) INTO valid_stock_count
    FROM `inventory`
    WHERE `product_id` = NEW.product_id 
      AND `status` != 'Expired'
      AND `quantity` > 0;

    UPDATE `products` 
    SET `is_available` = (valid_stock_count > 0)
    WHERE `product_id` = NEW.product_id;
END //

-- Trừ số lượng sản phẩm tương ứng trong bảng inventory (lấy lô đầu tiên đủ hàng)
DROP TRIGGER IF EXISTS `deduct_inventory` //
CREATE TRIGGER `deduct_inventory`
AFTER INSERT ON `order_items`
FOR EACH ROW
BEGIN
    UPDATE `inventory`
    SET `quantity` = `quantity` - NEW.quantity
    WHERE `product_id` = NEW.product_id 
      AND `quantity` >= NEW.quantity
      AND `status` != 'Expired'
    LIMIT 1;
END //

DELIMITER ;


-- ==========================================
-- 4. TRIGGERS QUẢN LÝ CHI TIẾT ĐƠN HÀNG (ORDER_ITEMS)
-- ==========================================
DELIMITER //

-- Kiểm tra còn hàng, tự gán giá và tính subtotal trước khi chèn order_items
DROP TRIGGER IF EXISTS `order_items_before_insert` //
CREATE TRIGGER `order_items_before_insert`
BEFORE INSERT ON `order_items`
FOR EACH ROW
BEGIN
    DECLARE product_status BOOLEAN;
    DECLARE current_price DECIMAL(12,2);

    SELECT `is_available`, `unit_price` 
    INTO product_status, current_price
    FROM `products` 
    WHERE `product_id` = NEW.product_id;

    IF product_status = FALSE THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Sản phẩm này hiện đang hết hàng, không thể tạo đơn!';
    END IF;

    IF NEW.unit_price IS NULL THEN
        SET NEW.unit_price = current_price;
    END IF;

    SET NEW.subtotal = NEW.quantity * NEW.unit_price;
END //

DROP TRIGGER IF EXISTS `order_items_before_update` //
CREATE TRIGGER `order_items_before_update`
BEFORE UPDATE ON `order_items`
FOR EACH ROW
BEGIN
    SET NEW.subtotal = NEW.quantity * NEW.unit_price;
END //

-- Tự động tính tổng tiền Đơn hàng & Chiết khấu khi thêm/sửa món
DROP TRIGGER IF EXISTS `recalculate_order_total_insert` //
CREATE TRIGGER `recalculate_order_total_insert`
AFTER INSERT ON `order_items`
FOR EACH ROW
BEGIN
    DECLARE v_discount_percent DECIMAL(5,2) DEFAULT 0.00;
    DECLARE v_subtotal_sum DECIMAL(12,2) DEFAULT 0.00;
    DECLARE v_discount_amount DECIMAL(12,2) DEFAULT 0.00;
    DECLARE v_customer_id INT;
    DECLARE v_deliver_status VARCHAR(30);
    
    SELECT o.customer_id, o.deliver_status, IFNULL(ct.discount_percent, 0.00) 
    INTO v_customer_id, v_deliver_status, v_discount_percent
    FROM `orders` o
    LEFT JOIN `customers` c ON o.customer_id = c.customer_id
    LEFT JOIN `customer_types` ct ON c.customer_type_id = ct.customer_type_id
    WHERE o.order_id = NEW.order_id;

    SELECT IFNULL(SUM(subtotal), 0.00) INTO v_subtotal_sum
    FROM `order_items`
    WHERE order_id = NEW.order_id;

    SET v_discount_amount = v_subtotal_sum * (v_discount_percent / 100.00);

    UPDATE `orders`
    SET `total_amount` = v_subtotal_sum - v_discount_amount,
        `discount_amount` = v_discount_amount
    WHERE `order_id` = NEW.order_id;

    -- Nếu đơn hàng đã ở trạng thái delivered, tính lại ngay chi tiêu và rank cho khách
    IF v_deliver_status = 'delivered' AND v_customer_id IS NOT NULL THEN
        CALL sp_update_customer_rank(v_customer_id);
    END IF;
END //

DELIMITER ;


-- ==========================================
-- 5. TRIGGERS QUẢN LÝ ĐƠN HÀNG (ORDERS & CUSTOMER RANK)
-- ==========================================
DELIMITER //

-- Kích hoạt cập nhật Rank khi Đơn hàng thay đổi trạng thái sang 'delivered'
DROP TRIGGER IF EXISTS `update_customer_spent_and_type` //
CREATE TRIGGER `update_customer_spent_and_type`
AFTER UPDATE ON `orders`
FOR EACH ROW
BEGIN
    -- Chỉ chạy khi trạng thái CHUYỂN SANG 'delivered'
    IF NEW.deliver_status = 'delivered' AND (OLD.deliver_status != 'delivered' OR OLD.deliver_status IS NULL) THEN
        IF NEW.customer_id IS NOT NULL THEN
            CALL sp_update_customer_rank(NEW.customer_id);
        END IF;
    END IF;
END //

DELIMITER ;
