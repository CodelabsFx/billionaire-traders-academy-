-- Billionaire Traders Academy Database Schema
-- MySQL Database Setup

-- Create database
CREATE DATABASE IF NOT EXISTS billionaire_traders_academy CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE billionaire_traders_academy;

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    password_changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    failed_login_attempts INT NOT NULL DEFAULT 0,
    locked_until DATETIME DEFAULT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    phone VARCHAR(20),
    country VARCHAR(100),
    country_code VARCHAR(5),
    date_of_birth DATE,
    profile_picture VARCHAR(255),
    account_type ENUM('free', 'basic', 'premium', 'pro') DEFAULT 'free',
    trading_experience ENUM('beginner', '1-3 years', '3-5 years', '5+ years'),
    preferred_strategy VARCHAR(100),
    risk_tolerance ENUM('conservative', 'moderate', 'aggressive'),
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    email_notifications BOOLEAN DEFAULT TRUE,
    course_reminders BOOLEAN DEFAULT TRUE,
    achievement_notifications BOOLEAN DEFAULT TRUE,
    community_notifications BOOLEAN DEFAULT FALSE,
    marketing_emails BOOLEAN DEFAULT FALSE,
    theme ENUM('light', 'dark', 'auto') DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login DATETIME,
    deleted_at DATETIME DEFAULT NULL,
    INDEX idx_email (email),
    INDEX idx_username (username),
    INDEX idx_account_type (account_type),
    INDEX idx_role (role),
    INDEX idx_created_at (created_at)
);

-- ============================================================
-- COURSES TABLE
-- ============================================================
CREATE TABLE courses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    long_description LONGTEXT,
    course_image VARCHAR(255),
    category VARCHAR(100),
    level ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'beginner',
    instructor_id INT,
    price DECIMAL(10, 2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    duration_hours DECIMAL(5, 2),
    total_lessons INT DEFAULT 0,
    total_students INT DEFAULT 0,
    rating DECIMAL(3, 2) DEFAULT 0,
    rating_count INT DEFAULT 0,
    is_published BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (instructor_id) REFERENCES users(id),
    INDEX idx_category (category),
    INDEX idx_level (level),
    INDEX idx_is_published (is_published),
    INDEX idx_slug (slug)
);

-- ============================================================
-- LESSONS TABLE
-- ============================================================
CREATE TABLE lessons (
    id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    content LONGTEXT,
    video_url VARCHAR(500),
    video_duration INT,
    lesson_order INT,
    module_number INT,
    resources_url VARCHAR(255),
    learning_objectives LONGTEXT,
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    INDEX idx_course_id (course_id),
    INDEX idx_lesson_order (lesson_order),
    UNIQUE KEY unique_course_lesson (course_id, slug)
);

-- ============================================================
-- QUIZZES TABLE
-- ============================================================
CREATE TABLE quizzes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    lesson_id INT NOT NULL,
    course_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    passing_score DECIMAL(5, 2) DEFAULT 70,
    total_questions INT DEFAULT 0,
    time_limit_minutes INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    INDEX idx_lesson_id (lesson_id),
    INDEX idx_course_id (course_id)
);

-- ============================================================
-- QUIZ QUESTIONS TABLE
-- ============================================================
CREATE TABLE quiz_questions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    quiz_id INT NOT NULL,
    question_text LONGTEXT NOT NULL,
    question_type ENUM('multiple_choice', 'true_false', 'short_answer') DEFAULT 'multiple_choice',
    question_order INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    INDEX idx_quiz_id (quiz_id)
);

-- ============================================================
-- QUIZ ANSWERS TABLE
-- ============================================================
CREATE TABLE quiz_answers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    question_id INT NOT NULL,
    answer_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE,
    explanation TEXT,
    answer_order INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (question_id) REFERENCES quiz_questions(id) ON DELETE CASCADE,
    INDEX idx_question_id (question_id)
);

-- ============================================================
-- ENROLLMENTS TABLE
-- ============================================================
CREATE TABLE enrollments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    course_id INT NOT NULL,
    status ENUM('active', 'completed', 'paused', 'dropped') DEFAULT 'active',
    progress_percentage DECIMAL(5, 2) DEFAULT 0,
    lessons_completed INT DEFAULT 0,
    certificates_earned INT DEFAULT 0,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_course (user_id, course_id),
    INDEX idx_user_id (user_id),
    INDEX idx_course_id (course_id),
    INDEX idx_status (status),
    INDEX idx_enrolled_at (enrolled_at)
);

-- ============================================================
-- LESSON PROGRESS TABLE
-- ============================================================
CREATE TABLE lesson_progress (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    lesson_id INT NOT NULL,
    course_id INT NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    time_spent_minutes INT DEFAULT 0,
    completed_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_lesson (user_id, lesson_id),
    INDEX idx_user_id (user_id),
    INDEX idx_lesson_id (lesson_id),
    INDEX idx_is_completed (is_completed)
);

-- ============================================================
-- QUIZ ATTEMPTS TABLE
-- ============================================================
CREATE TABLE quiz_attempts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    quiz_id INT NOT NULL,
    course_id INT NOT NULL,
    score DECIMAL(5, 2),
    percentage DECIMAL(5, 2),
    passed BOOLEAN DEFAULT FALSE,
    time_spent_minutes INT,
    attempt_number INT DEFAULT 1,
    started_at DATETIME,
    completed_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_quiz_id (quiz_id),
    INDEX idx_passed (passed)
);

-- ============================================================
-- QUIZ RESPONSES TABLE
-- ============================================================
CREATE TABLE quiz_responses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    attempt_id INT NOT NULL,
    question_id INT NOT NULL,
    selected_answer_id INT,
    is_correct BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (attempt_id) REFERENCES quiz_attempts(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES quiz_questions(id) ON DELETE CASCADE,
    FOREIGN KEY (selected_answer_id) REFERENCES quiz_answers(id) ON DELETE SET NULL,
    INDEX idx_attempt_id (attempt_id)
);

-- ============================================================
-- CERTIFICATES TABLE
-- ============================================================
CREATE TABLE certificates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    course_id INT NOT NULL,
    certificate_number VARCHAR(255) UNIQUE NOT NULL,
    issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expiry_date DATETIME,
    certificate_url VARCHAR(255),
    is_valid BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_course_id (course_id),
    INDEX idx_issued_at (issued_at)
);

-- ============================================================
-- BADGES TABLE
-- ============================================================
CREATE TABLE badges (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon_url VARCHAR(255),
    requirement_type ENUM('course_completion', 'perfect_score', 'streak', 'achievement') DEFAULT 'achievement',
    requirement_value INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_requirement_type (requirement_type)
);

-- ============================================================
-- USER BADGES TABLE
-- ============================================================
CREATE TABLE user_badges (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    badge_id INT NOT NULL,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_badge (user_id, badge_id),
    INDEX idx_user_id (user_id)
);

-- ============================================================
-- SUBSCRIPTIONS TABLE
-- ============================================================
CREATE TABLE subscriptions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    plan VARCHAR(50) NOT NULL,
    price DECIMAL(10, 2),
    currency VARCHAR(3) DEFAULT 'USD',
    billing_cycle ENUM('monthly', 'yearly') DEFAULT 'monthly',
    status ENUM('active', 'cancelled', 'expired', 'suspended') DEFAULT 'active',
    payment_method VARCHAR(50),
    auto_renew BOOLEAN DEFAULT TRUE,
    start_date DATETIME,
    renewal_date DATETIME,
    end_date DATETIME,
    cancelled_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status)
);

-- ============================================================
-- TRANSACTIONS TABLE
-- ============================================================
CREATE TABLE transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    subscription_id INT,
    transaction_type ENUM('subscription', 'course_purchase', 'refund') DEFAULT 'subscription',
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method VARCHAR(50),
    payment_gateway VARCHAR(50),
    gateway_transaction_id VARCHAR(255),
    status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- ============================================================
-- TRADING SIGNALS TABLE
-- ============================================================
CREATE TABLE trading_signals (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    description LONGTEXT,
    signal_type ENUM('buy', 'sell', 'hold') NOT NULL,
    asset_class VARCHAR(100),
    asset_symbol VARCHAR(50),
    entry_price DECIMAL(12, 5),
    target_price DECIMAL(12, 5),
    stop_loss DECIMAL(12, 5),
    risk_reward_ratio DECIMAL(5, 2),
    accuracy_rate DECIMAL(5, 2),
    provider_id INT,
    status ENUM('active', 'closed', 'archived') DEFAULT 'active',
    published_at DATETIME,
    closed_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_asset_symbol (asset_symbol),
    INDEX idx_status (status)
);

-- ============================================================
-- USER TRADING DATA TABLE
-- ============================================================
CREATE TABLE user_trading_data (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    account_balance DECIMAL(15, 2) DEFAULT 0,
    total_trades INT DEFAULT 0,
    winning_trades INT DEFAULT 0,
    losing_trades INT DEFAULT 0,
    win_rate DECIMAL(5, 2) DEFAULT 0,
    profit_loss DECIMAL(15, 2) DEFAULT 0,
    total_invested DECIMAL(15, 2) DEFAULT 0,
    average_trade_size DECIMAL(12, 2) DEFAULT 0,
    largest_win DECIMAL(12, 2) DEFAULT 0,
    largest_loss DECIMAL(12, 2) DEFAULT 0,
    risk_per_trade DECIMAL(5, 2) DEFAULT 0,
    trading_streak INT DEFAULT 0,
    last_trade_date DATETIME,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user (user_id)
);

-- ============================================================
-- ACTIVITY LOG TABLE
-- ============================================================
CREATE TABLE activity_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    activity_type VARCHAR(100) NOT NULL,
    description TEXT,
    related_entity VARCHAR(100),
    related_entity_id INT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_activity_type (activity_type),
    INDEX idx_created_at (created_at),
    INDEX idx_activity_time_type (created_at, activity_type, user_id)
);

-- ============================================================
-- AUTHENTICATED SESSIONS TABLE
-- ============================================================
CREATE TABLE user_sessions (
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

-- ============================================================
-- REVIEWS TABLE
-- ============================================================
CREATE TABLE reviews (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    course_id INT NOT NULL,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    review_text LONGTEXT,
    is_verified_purchase BOOLEAN DEFAULT TRUE,
    helpful_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    INDEX idx_course_id (course_id),
    INDEX idx_user_id (user_id),
    INDEX idx_rating (rating)
);

-- ============================================================
-- SUPPORT TICKETS TABLE
-- ============================================================
CREATE TABLE support_tickets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    subject VARCHAR(255) NOT NULL,
    description LONGTEXT NOT NULL,
    category VARCHAR(100),
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
    assigned_to INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_priority (priority)
);

-- ============================================================
-- SUPPORT TICKET MESSAGES TABLE
-- ============================================================
CREATE TABLE support_messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ticket_id INT NOT NULL,
    user_id INT NOT NULL,
    message TEXT NOT NULL,
    attachment_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_ticket_id (ticket_id)
);

-- ============================================================
-- NEWSLETTERS TABLE
-- ============================================================
CREATE TABLE newsletter_subscriptions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    unsubscribed_at DATETIME,
    INDEX idx_email (email),
    INDEX idx_is_active (is_active)
);

-- ============================================================
-- CREATE INDEXES FOR BETTER PERFORMANCE
-- ============================================================
ALTER TABLE users ADD FULLTEXT INDEX ft_name (first_name, last_name);
ALTER TABLE courses ADD FULLTEXT INDEX ft_title (title, description);
ALTER TABLE lessons ADD FULLTEXT INDEX ft_lesson_title (title, content);

-- ============================================================
-- Create some sample data
-- ============================================================

-- Sample badge data
INSERT INTO badges (name, description, icon_url, requirement_type, requirement_value) VALUES
('Quick Learner', 'Completed 5 courses in 30 days', '/images/badges/quick-learner.png', 'course_completion', 5),
('Perfect Score', '100% on a course quiz', '/images/badges/perfect-score.png', 'perfect_score', 100),
('7-Day Streak', 'Learned for 7 consecutive days', '/images/badges/streak.png', 'streak', 7),
('Trading Master', 'Completed all advanced courses', '/images/badges/trading-master.png', 'course_completion', 12),
('Community Star', 'Helped 10+ community members', '/images/badges/community-star.png', 'achievement', 10);

-- Sample course data
INSERT INTO courses (title, slug, description, category, level, price, currency, duration_hours, total_lessons, is_published, is_featured) VALUES
('Forex Fundamentals', 'forex-fundamentals', 'Learn the basics of forex trading', 'Forex', 'beginner', 49.99, 'USD', 6, 8, TRUE, TRUE),
('Gold Trading Mastery', 'gold-trading-mastery', 'Master gold trading strategies', 'Gold Trading', 'advanced', 129.99, 'USD', 16, 18, TRUE, TRUE),
('Technical Analysis Pro', 'technical-analysis-pro', 'Advanced technical analysis techniques', 'Technical Analysis', 'intermediate', 79.99, 'USD', 10, 12, TRUE, FALSE);

-- Display tables summary
SHOW TABLES;
SHOW TABLE STATUS;
