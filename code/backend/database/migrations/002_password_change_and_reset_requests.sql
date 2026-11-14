SET @has_must_change_password = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'must_change_password'
);

SET @add_must_change_password = IF(
    @has_must_change_password = 0,
    'ALTER TABLE `users` ADD COLUMN `must_change_password` BOOLEAN NOT NULL DEFAULT FALSE',
    'SELECT 1'
);
PREPARE add_must_change_password_stmt FROM @add_must_change_password;
EXECUTE add_must_change_password_stmt;
DEALLOCATE PREPARE add_must_change_password_stmt;

CREATE TABLE IF NOT EXISTS `password_reset_requests` (
    `user_id` INT PRIMARY KEY,
    `requested_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_password_reset_requests_user`
        FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
);
