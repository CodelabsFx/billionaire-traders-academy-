-- Migration: add role and is_admin to users table
SET @role_exists = (SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'role');
SET @sql = IF(@role_exists = 0, 'ALTER TABLE users ADD COLUMN role VARCHAR(50) NOT NULL DEFAULT ''user''', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @admin_exists = (SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'is_admin');
SET @sql = IF(@admin_exists = 0, 'ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT FALSE', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'users' AND index_name = 'idx_role');
SET @sql = IF(@index_exists = 0, 'ALTER TABLE users ADD INDEX idx_role (role)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
