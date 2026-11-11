SET @employee_user_fk = (
    SELECT CONSTRAINT_NAME
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'employees'
      AND COLUMN_NAME = 'username'
      AND REFERENCED_TABLE_NAME = 'users'
      AND REFERENCED_COLUMN_NAME = 'username'
    LIMIT 1
);

SET @drop_employee_user_fk = IF(
    @employee_user_fk IS NULL,
    'SELECT 1',
    CONCAT(
        'ALTER TABLE `employees` DROP FOREIGN KEY `',
        REPLACE(@employee_user_fk, '`', '``'),
        '`'
    )
);
PREPARE drop_employee_user_fk_stmt FROM @drop_employee_user_fk;
EXECUTE drop_employee_user_fk_stmt;
DEALLOCATE PREPARE drop_employee_user_fk_stmt;

ALTER TABLE `employees`
    ADD CONSTRAINT `fk_employees_users_username`
    FOREIGN KEY (`username`) REFERENCES `users` (`username`)
    ON UPDATE CASCADE
    ON DELETE SET NULL;
