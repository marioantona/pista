CREATE DATABASE IF NOT EXISTS pistaDB;
USE pistaDB;

-- users (Core Authentication & Quota)
CREATE TABLE IF NOT EXISTS users (
    user_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    fullname VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NULL,
    oauth_provider VARCHAR(50) DEFAULT 'local', -- tracks signup method
    oauth_uid VARCHAR(255) NULL, -- tracks external provider ID
    profile_picture_url VARCHAR(500) NULL DEFAULT NULL, -- OAuth provider photo or NULL for avatar fallback
    creation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    credits_remaining INT DEFAULT 10,
    reset_token_hash VARCHAR(64) NULL DEFAULT NULL,
    reset_token_expires_at DATETIME NULL DEFAULT NULL
);

-- details (Personal Information)
CREATE TABLE IF NOT EXISTS details (
    user_id INT UNSIGNED PRIMARY KEY,
    first_name VARCHAR(50),
    middle_name VARCHAR(50),
    last_name VARCHAR(50),
    date_of_birth DATE,
    lang VARCHAR(50),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- preferences (App Settings)
CREATE TABLE IF NOT EXISTS preferences (
    user_id INT UNSIGNED PRIMARY KEY,
    region VARCHAR(50),
    unit VARCHAR(50),
    currency VARCHAR(50),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- itineraries (Saved Trips - Parent)
CREATE TABLE IF NOT EXISTS itineraries (
    itinerary_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    total_cost DECIMAL(10, 2),
    previous_cost DECIMAL(10, 2) NULL DEFAULT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'GBP',
    adults INT DEFAULT 1, -- track adult passenger count
    children INT DEFAULT 0, -- track child passenger count
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- flights (Saved Trips - Children)
CREATE TABLE IF NOT EXISTS flights (
    flight_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    itinerary_id INT UNSIGNED NOT NULL,
    starting_point CHAR(3),
    ending_point CHAR(3),
    flight_date DATE,
    cost DECIMAL(10, 2),
    previous_cost DECIMAL(10, 2) NULL DEFAULT NULL,
    airline VARCHAR(50),
    airline_logo VARCHAR(255),
    FOREIGN KEY (itinerary_id) REFERENCES itineraries (itinerary_id) ON DELETE CASCADE
);

-- guest_usage (Security)
CREATE TABLE IF NOT EXISTS guest_usage (
    ip_address VARCHAR(45) PRIMARY KEY,
    credits_remaining INT DEFAULT 2,
    last_search TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- rate_limits (Security) -- Phase 0B item 5
-- Fixed-window counters for login.php and forgot_password.php, written through
-- webroot/rate_limit.php. Buckets look like "login:ip:<ip>" or
-- "pwreset:email:<sha256>" -- raw email addresses never enter this table.
-- VARCHAR(100), not the 64 first proposed: "pwreset:email:" + 64 hex is 78 chars.
-- window_start must NOT carry ON UPDATE CURRENT_TIMESTAMP (guest_usage does):
-- every increment would then push the window forward and it would never expire.
-- Expired rows are deleted opportunistically by the helper; there is no cron.
-- Created as root (sudo mysql) -- pista_user has no DDL.
CREATE TABLE IF NOT EXISTS rate_limits (
    bucket VARCHAR(100) NOT NULL PRIMARY KEY,
    attempts INT UNSIGNED NOT NULL DEFAULT 0,
    window_start TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_window_start (window_start)
);

-- refunds (Correctness) -- Phase 0C, charge-on-success
-- One row per refunded search, so a signed failure receipt from Node can be
-- redeemed exactly once: the jti IS the primary key, which is why the HMAC token
-- has carried a jti since Phase 0B item 6.
-- `subject` is 'u:<user_id>' or 'g:<sha256(ip)>', matching the token's sub, so a
-- receipt cannot be redeemed into another account. The index on (subject,
-- refunded_at) serves the monthly cap that bounds deliberately-failed searches.
-- Created as root (sudo mysql) -- pista_user has no DDL.
CREATE TABLE IF NOT EXISTS refunds (
    jti CHAR(32) NOT NULL PRIMARY KEY,
    subject VARCHAR(80) NOT NULL,
    credits INT UNSIGNED NOT NULL,
    calls_spent INT UNSIGNED NOT NULL DEFAULT 0,
    refunded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_subject_time (subject, refunded_at)
);
