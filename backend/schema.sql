USE LostAndFoundSystem;

-- Drop tables if they exist to start fresh
DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS images;
DROP TABLE IF EXISTS credentials;
DROP TABLE IF EXISTS claims;
DROP TABLE IF EXISTS found_reports;
DROP TABLE IF EXISTS lost_reports;
DROP TABLE IF EXISTS locations;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;

-- 1. Create users table
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone BIGINT,
    role ENUM('student', 'admin') DEFAULT 'student',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create categories table
CREATE TABLE categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL
);

-- 3. Create locations table
CREATE TABLE locations (
    location_id INT AUTO_INCREMENT PRIMARY KEY,
    location_name VARCHAR(100) NOT NULL
);

-- 4. Create lost_reports table
CREATE TABLE lost_reports (
    lost_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    category_id INT,
    location_id INT,
    item_name VARCHAR(100),
    description TEXT,
    lost_date DATE,
    lost_time TIME,
    status ENUM('open', 'claimed', 'matched', 'closed') DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE SET NULL,
    FOREIGN KEY (location_id) REFERENCES locations(location_id) ON DELETE SET NULL
);

-- 5. Create found_reports table
CREATE TABLE found_reports (
    found_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    category_id INT,
    location_id INT,
    item_name VARCHAR(100),
    description TEXT,
    found_date DATE,
    found_time TIME,
    status ENUM('open', 'claimed', 'matched', 'closed') DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE SET NULL,
    FOREIGN KEY (location_id) REFERENCES locations(location_id) ON DELETE SET NULL
);

-- 6. Create claims table
CREATE TABLE claims (
    claim_id INT AUTO_INCREMENT PRIMARY KEY,
    lost_id INT,
    found_id INT,
    claimed_by INT,
    admin_id INT,
    status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lost_id) REFERENCES lost_reports(lost_id) ON DELETE CASCADE,
    FOREIGN KEY (found_id) REFERENCES found_reports(found_id) ON DELETE CASCADE,
    FOREIGN KEY (claimed_by) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (admin_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- 7. Create credentials table
CREATE TABLE credentials (
    cred_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    claim_id INT,
    cred_type VARCHAR(100),
    image_path VARCHAR(255),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (claim_id) REFERENCES claims(claim_id) ON DELETE CASCADE
);

-- 8. Create images table
CREATE TABLE images (
    image_id INT AUTO_INCREMENT PRIMARY KEY,
    report_id INT,
    report_type ENUM('lost', 'found'),
    image_path VARCHAR(255),
    description VARCHAR(200),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Create audit_log table
CREATE TABLE audit_log (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    action VARCHAR(50),
    item_name VARCHAR(100),
    action_date DATETIME
);

-- TRIGGERS SETUP
DELIMITER $$

-- Trigger 1: after_lost_insert
CREATE TRIGGER after_lost_insert
AFTER INSERT ON lost_reports
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (action, item_name, action_date)
    VALUES ('Lost Item Added', NEW.item_name, NOW());
END $$

-- Trigger 2: before_user_insert
CREATE TRIGGER before_user_insert
BEFORE INSERT ON users
FOR EACH ROW
BEGIN
    DECLARE email_count INT;
    SELECT COUNT(*) INTO email_count FROM users WHERE email = NEW.email;
    IF email_count > 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Duplicate email not allowed';
    END IF;
END $$

-- Trigger 3: after_claim_insert
CREATE TRIGGER after_claim_insert
AFTER INSERT ON claims
FOR EACH ROW
BEGIN
    UPDATE lost_reports SET status = 'claimed' WHERE lost_id = NEW.lost_id;
END $$

DELIMITER ;

-- SAMPLE DATA INSERTION

-- 1. Insert Users
INSERT INTO users (name, email, phone, role) VALUES
('Alice', 'alice@student.edu', 1111111111, 'student'),
('Bob', 'bob@student.edu', 2222222222, 'student'),
('Charlie', 'charlie@student.edu', 3333333333, 'student'),
('Dave', 'dave@admin.edu', 4444444444, 'admin'),
('Eve', 'eve@admin.edu', 5555555555, 'admin');

-- 2. Insert Categories
INSERT INTO categories (category_name) VALUES
('Electronics'),
('Books'),
('Clothing'),
('Accessories'),
('IDs and Cards');

-- 3. Insert Locations
INSERT INTO locations (location_name) VALUES
('Library'),
('Cafeteria'),
('Main Hall'),
('Gym'),
('Lab 1');

-- 4. Insert Lost Reports (This will also trigger 5 audit_log insertions)
INSERT INTO lost_reports (user_id, category_id, location_id, item_name, description, lost_date, lost_time, status) VALUES
(1, 1, 1, 'MacBook Pro', 'Silver with stickers', '2023-10-01', '10:00:00', 'open'),
(2, 2, 2, 'Math Textbook', 'Calculus 101', '2023-10-02', '11:00:00', 'open'),
(3, 3, 3, 'Blue Jacket', 'Denim jacket', '2023-10-03', '12:00:00', 'open'),
(1, 4, 4, 'Gold Necklace', 'Small pendant', '2023-10-04', '13:00:00', 'open'),
(2, 5, 5, 'Student ID Card', 'Bob ID', '2023-10-05', '14:00:00', 'open');

-- 5. Insert Found Reports
INSERT INTO found_reports (user_id, category_id, location_id, item_name, description, found_date, found_time, status) VALUES
(3, 1, 1, 'iPhone 13', 'Black case', '2023-10-06', '15:00:00', 'open'),
(1, 2, 2, 'Physics Notes', 'Spiral notebook', '2023-10-07', '16:00:00', 'open'),
(2, 3, 3, 'Red Scarf', 'Wool material', '2023-10-08', '17:00:00', 'open'),
(3, 4, 4, 'Silver Watch', 'Metal band', '2023-10-09', '18:00:00', 'open'),
(1, 5, 5, 'Driver License', 'Alice ID', '2023-10-10', '19:00:00', 'open');

-- 6. Insert Claims (This will trigger updates on lost_reports status)
INSERT INTO claims (lost_id, found_id, claimed_by, admin_id, status, remarks) VALUES
(1, NULL, 1, 4, 'pending', 'This is my MacBook'),
(2, NULL, 2, 4, 'verified', 'Verified with receipt'),
(3, NULL, 3, 5, 'rejected', 'Wrong color jacket'),
(4, NULL, 1, 5, 'pending', 'Necklace matches mine'),
(5, NULL, 2, 4, 'verified', 'ID matches face');

-- 7. Insert Credentials
INSERT INTO credentials (user_id, claim_id, cred_type, image_path) VALUES
(1, 1, 'Purchase Receipt', '/uploads/receipt1.jpg'),
(2, 2, 'Purchase Receipt', '/uploads/receipt2.jpg'),
(3, 3, 'Photo', '/uploads/photo3.jpg'),
(1, 4, 'Certificate', '/uploads/cert4.jpg'),
(2, 5, 'ID Copy', '/uploads/idcopy5.jpg');

-- 8. Insert Images
INSERT INTO images (report_id, report_type, image_path, description) VALUES
(1, 'lost', '/uploads/lost1.jpg', 'Macbook front'),
(2, 'lost', '/uploads/lost2.jpg', 'Textbook cover'),
(1, 'found', '/uploads/found1.jpg', 'iPhone screen'),
(2, 'found', '/uploads/found2.jpg', 'Notes page 1'),
(3, 'found', '/uploads/found3.jpg', 'Red scarf');


-- VERIFICATION QUERIES
SELECT * FROM users;
SELECT * FROM categories;
SELECT * FROM locations;
SELECT * FROM lost_reports;
SELECT * FROM found_reports;
SELECT * FROM claims;
SELECT * FROM credentials;
SELECT * FROM images;
SELECT * FROM audit_log;
