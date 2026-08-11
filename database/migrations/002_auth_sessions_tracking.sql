-- Idempotent authentication and behavior tracking migration.
SET @db = DATABASE();

SET @sql = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@db AND table_name='users' AND column_name='password_changed_at') = 0,
  'ALTER TABLE users ADD COLUMN password_changed_at DATETIME DEFAULT CURRENT_TIMESTAMP', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@db AND table_name='users' AND column_name='failed_login_attempts') = 0,
  'ALTER TABLE users ADD COLUMN failed_login_attempts INT NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@db AND table_name='users' AND column_name='locked_until') = 0,
  'ALTER TABLE users ADD COLUMN locked_until DATETIME DEFAULT NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

CREATE TABLE IF NOT EXISTS user_sessions (
    id CHAR(36) PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash CHAR(64) UNIQUE NOT NULL,
    user_agent VARCHAR(500),
    ip_address VARCHAR(45),
    expires_at DATETIME NOT NULL,
    revoked_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_sessions_user_active (user_id, revoked_at, expires_at),
    INDEX idx_sessions_expiry (expires_at)
);

SET @sql = IF((SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=@db AND table_name='activity_log' AND index_name='idx_activity_time_type') = 0,
  'ALTER TABLE activity_log ADD INDEX idx_activity_time_type (created_at, activity_type, user_id)', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
