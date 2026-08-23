-- 创建 users 表
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    avatar VARCHAR(255),
    motto VARCHAR(255)
);

-- 创建 groups 表
CREATE TABLE IF NOT EXISTS groups (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    owner_id INT,
    FOREIGN KEY (owner_id) REFERENCES users(id)
);

-- 创建 tasks 表
CREATE TABLE IF NOT EXISTS tasks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    group_id INT,
    content TEXT NOT NULL,
    status ENUM('进行中', '已完成') DEFAULT '进行中',
    FOREIGN KEY (group_id) REFERENCES groups(id)
);