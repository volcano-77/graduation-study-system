import express from 'express';
import pool from './db.js';
import cors from 'cors';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*'
    }
});
const PORT = 3001;
const TASK_STATUS_OPTIONS = ['待处理', '进行中', '已完成'];
const DEFAULT_TASK_STATUS = '待处理';
const BCRYPT_SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 4;
const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AUTH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const AUTH_TOKEN_SECRET = process.env.AUTH_TOKEN_SECRET || crypto.randomBytes(32).toString('hex');
const DEMO_USER_ACCOUNT = {
    username: 'demo_user',
    password: 'DemoUser123!',
    email: 'demo-user@example.invalid'
};
const DEMO_ADMIN_ACCOUNT = {
    username: 'admin',
    password: 'DemoAdmin123!',
    email: 'demo-admin@example.invalid'
};
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDirectory = path.join(__dirname, 'uploads');

fs.mkdirSync(uploadsDirectory, { recursive: true });

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(uploadsDirectory));

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadsDirectory);
    },
    filename: (_req, file, cb) => {
        const decodedOriginalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        cb(null, `${Date.now()}-${decodedOriginalName}`);
    }
});

const upload = multer({ storage });

io.on('connection', (socket) => {
    socket.on('join_group', (groupId) => {
        const normalizedGroupId = Number.parseInt(groupId, 10);
        if (!Number.isInteger(normalizedGroupId) || normalizedGroupId <= 0) {
            return;
        }
        socket.join(String(normalizedGroupId));
    });
});

function generateToken(user) {
    const payload = {
        id: user.id,
        iat: Date.now(),
        exp: Date.now() + AUTH_TOKEN_TTL_MS,
        nonce: crypto.randomBytes(8).toString('hex')
    };
    const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const signature = crypto.createHmac('sha256', AUTH_TOKEN_SECRET).update(encodedPayload).digest('hex');
    return `${encodedPayload}.${signature}`;
}

function decodeBase64Url(value) {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    return Buffer.from(base64 + padding, 'base64').toString('utf8');
}

function isValidTokenSignature(encodedPayload, receivedSignature) {
    if (typeof receivedSignature !== 'string' || !receivedSignature) {
        return false;
    }

    const expectedSignature = crypto.createHmac('sha256', AUTH_TOKEN_SECRET).update(encodedPayload).digest('hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const receivedBuffer = Buffer.from(receivedSignature, 'utf8');
    if (expectedBuffer.length !== receivedBuffer.length) {
        return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

function parseUserIdFromAuthHeader(authorization = '') {
    if (!authorization.startsWith('Bearer ')) {
        return null;
    }

    const token = authorization.slice(7).trim();
    if (!token) {
        return null;
    }

    try {
        const tokenParts = token.split('.');
        if (tokenParts.length !== 2) {
            return null;
        }

        const [encodedPayload, signature] = tokenParts;
        if (!isValidTokenSignature(encodedPayload, signature)) {
            return null;
        }

        const payloadText = decodeBase64Url(encodedPayload);
        const payload = JSON.parse(payloadText);
        const userId = Number.parseInt(payload?.id, 10);
        if (!Number.isInteger(userId) || userId <= 0) {
            return null;
        }
        if (!Number.isInteger(payload?.exp) || payload.exp <= Date.now()) {
            return null;
        }

        return userId;
    } catch (error) {
        return null;
    }
}

async function requireAuthUser(req, res, next) {
    const userId = parseUserIdFromAuthHeader(req.headers.authorization || '');
    if (!userId) {
        return res.status(401).json({ success: false, message: '未登录或令牌无效' });
    }

    try {
        const [rows] = await pool.execute(
            'SELECT id, username, email, avatar, motto, major, role FROM users WHERE id = ? LIMIT 1',
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: '用户不存在' });
        }

        req.currentUser = rows[0];
        return next();
    } catch (error) {
        console.error('解析当前用户失败:', error);
        return res.status(500).json({ success: false, message: '服务器错误' });
    }
}

function requireAdmin(req, res, next) {
    if (!req.currentUser || req.currentUser.role !== 'admin') {
        return res.status(403).json({ success: false, message: '仅管理员可执行该操作' });
    }
    return next();
}

function isValidPasswordLength(password) {
    return password.length >= MIN_PASSWORD_LENGTH;
}

function isValidEmail(email) {
    return EMAIL_PATTERN.test(email);
}

async function ensureColumnExists(tableName, columnName, columnDefinition) {
    if (!/^[a-zA-Z0-9_]+$/.test(tableName) || !/^[a-zA-Z0-9_]+$/.test(columnName)) {
        throw new Error('Invalid table or column identifier');
    }

    const [rows] = await pool.query(
        `
            SELECT 1
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = ?
              AND COLUMN_NAME = ?
            LIMIT 1
        `,
        [tableName, columnName]
    );

    if (rows.length === 0) {
        await pool.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${columnDefinition}`);
    }
}

// 创建表结构
async function createTables() {
    try {
        // 创建 users 表
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INT PRIMARY KEY AUTO_INCREMENT,
                username VARCHAR(50) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                email VARCHAR(100) NOT NULL UNIQUE,
                avatar LONGTEXT,
                motto VARCHAR(255),
                major VARCHAR(100),
                role VARCHAR(20) NOT NULL DEFAULT 'user',
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 兼容旧 users 表结构，避免 profile 查询/更新触发 Unknown column
        await ensureColumnExists('users', 'avatar', 'LONGTEXT NULL');
        await ensureColumnExists('users', 'motto', 'VARCHAR(255) NULL');
        await ensureColumnExists('users', 'major', 'VARCHAR(100) NULL');
        await ensureColumnExists('users', 'role', "VARCHAR(20) NOT NULL DEFAULT 'user'");
        await ensureColumnExists('users', 'created_at', "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP");
        await pool.execute('ALTER TABLE users MODIFY COLUMN avatar LONGTEXT NULL');
        await pool.execute("ALTER TABLE users MODIFY COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user'");
        await pool.execute("ALTER TABLE users MODIFY COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP");
        await pool.execute("UPDATE users SET role = 'user' WHERE role IS NULL OR TRIM(role) = ''");

        // 将历史明文密码迁移为 bcrypt 密文
        const [passwordRows] = await pool.execute('SELECT id, password FROM users');
        for (const row of passwordRows) {
            const rawPassword = typeof row.password === 'string' ? row.password : '';
            if (!rawPassword || BCRYPT_HASH_PATTERN.test(rawPassword)) {
                continue;
            }
            const hashedPassword = await bcrypt.hash(rawPassword, BCRYPT_SALT_ROUNDS);
            await pool.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, row.id]);
        }
        
        // 创建 groups 表
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS groups_table (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                owner_id INT,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (owner_id) REFERENCES users(id)
            )
        `);
        await ensureColumnExists('groups_table', 'created_at', "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP");
        await pool.execute("ALTER TABLE groups_table MODIFY COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP");

        // 创建小组成员表
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS group_members (
                id INT PRIMARY KEY AUTO_INCREMENT,
                group_id INT NOT NULL,
                user_id INT NOT NULL,
                role VARCHAR(50) NOT NULL DEFAULT '成员',
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uniq_group_user (group_id, user_id),
                FOREIGN KEY (group_id) REFERENCES groups_table(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // 创建通知表（邀请流程：发送邀请 -> 对方确认）
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                sender_id INT NOT NULL,
                group_id INT NOT NULL,
                type VARCHAR(20) NOT NULL DEFAULT 'invite',
                status ENUM('pending', 'accepted', 'rejected') NOT NULL DEFAULT 'pending',
                message TEXT,
                is_read TINYINT(1) NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (group_id) REFERENCES groups_table(id) ON DELETE CASCADE
            )
        `);
        await ensureColumnExists('notifications', 'message', 'TEXT NULL');
        await ensureColumnExists('notifications', 'is_read', 'TINYINT(1) NOT NULL DEFAULT 0');
        await pool.execute('UPDATE notifications SET is_read = 0 WHERE is_read IS NULL');
        await pool.execute('ALTER TABLE notifications MODIFY COLUMN is_read TINYINT(1) NOT NULL DEFAULT 0');

        // 创建小组讨论表
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS discussions (
                id INT PRIMARY KEY AUTO_INCREMENT,
                group_id INT NOT NULL,
                user_id INT NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (group_id) REFERENCES groups_table(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // 创建小组资料共享表
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS shared_files (
                id INT PRIMARY KEY AUTO_INCREMENT,
                group_id INT NOT NULL,
                user_id INT NOT NULL,
                file_name VARCHAR(255) NOT NULL,
                file_url TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (group_id) REFERENCES groups_table(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // 创建小组文件上传表（multer 上传文件）
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS group_files (
                id INT PRIMARY KEY AUTO_INCREMENT,
                group_id INT NOT NULL,
                uploader_id INT NOT NULL,
                file_name VARCHAR(255) NOT NULL,
                file_url TEXT NOT NULL,
                file_size BIGINT NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (group_id) REFERENCES groups_table(id) ON DELETE CASCADE,
                FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        
        // 创建 tasks 表
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS tasks (
                id INT PRIMARY KEY AUTO_INCREMENT,
                group_id INT,
                content TEXT NOT NULL,
                status ENUM('待处理', '进行中', '已完成') NOT NULL DEFAULT '待处理',
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (group_id) REFERENCES groups_table(id)
            )
        `);

        // 兼容旧表结构：将 status 枚举统一为 待处理/进行中/已完成
        await pool.execute(`
            ALTER TABLE tasks
            MODIFY COLUMN status ENUM('待处理', '进行中', '已完成') NOT NULL DEFAULT '待处理'
        `);
        await ensureColumnExists('tasks', 'created_at', "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP");
        await pool.execute("ALTER TABLE tasks MODIFY COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP");
        
        // 初始化公开演示用普通账号（请勿用于生产环境）
        const [rows] = await pool.execute(
            'SELECT id FROM users WHERE username = ? LIMIT 1',
            [DEMO_USER_ACCOUNT.username]
        );
        if (rows.length === 0) {
            const demoUserPasswordHash = await bcrypt.hash(DEMO_USER_ACCOUNT.password, BCRYPT_SALT_ROUNDS);
            await pool.execute(
                'INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)',
                [DEMO_USER_ACCOUNT.username, demoUserPasswordHash, DEMO_USER_ACCOUNT.email, 'user']
            );
            console.log('演示普通用户创建成功');
        }

        // 初始化公开演示用管理员账号（请勿用于生产环境）
        const [adminRows] = await pool.execute(
            'SELECT id FROM users WHERE username = ? LIMIT 1',
            [DEMO_ADMIN_ACCOUNT.username]
        );
        if (adminRows.length === 0) {
            const adminPasswordHash = await bcrypt.hash(DEMO_ADMIN_ACCOUNT.password, BCRYPT_SALT_ROUNDS);
            await pool.execute(
                'INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)',
                [DEMO_ADMIN_ACCOUNT.username, adminPasswordHash, DEMO_ADMIN_ACCOUNT.email, 'admin']
            );
            console.log('演示管理员创建成功');
        } else {
            await pool.execute(
                "UPDATE users SET role = 'admin' WHERE username = ?",
                [DEMO_ADMIN_ACCOUNT.username]
            );
        }

        // 权限兜底：全站仅演示管理员账号为管理员，其余账户一律普通用户
        await pool.execute(
            "UPDATE users SET role = 'user' WHERE username <> ?",
            [DEMO_ADMIN_ACCOUNT.username]
        );
        await pool.execute(
            "UPDATE users SET role = 'admin' WHERE username = ?",
            [DEMO_ADMIN_ACCOUNT.username]
        );
        
        // 检查并添加初始小组数据
        const [groupRows] = await pool.execute('SELECT * FROM groups_table');
        if (groupRows.length === 0) {
            const initialGroups = [
                { name: '前端开发小组', description: '前端技术学习与交流' },
                { name: '后端学习群', description: '后端技术学习与交流' },
                { name: '数据库研讨组', description: '数据库技术学习与交流' }
            ];
            
            for (const group of initialGroups) {
                await pool.execute(
                    'INSERT INTO groups_table (name, description, owner_id) VALUES (?, ?, ?)',
                    [group.name, group.description, 1] // 默认使用 ID=1 作为初始化 owner
                );
            }
            console.log('初始小组数据添加成功');
        }

        // 回填历史小组成员：确保 owner 至少是组长成员
        await pool.execute(`
            INSERT INTO group_members (group_id, user_id, role)
            SELECT g.id, g.owner_id, '组长'
            FROM groups_table g
            LEFT JOIN group_members gm
              ON gm.group_id = g.id AND gm.user_id = g.owner_id
            WHERE g.owner_id IS NOT NULL
              AND gm.id IS NULL
        `);
        
        console.log('数据库表创建成功');
    } catch (error) {
        console.error('创建表失败:', error);
    }
}

// 启动时创建表
createTables();

async function handleLogin(req, res) {
    const { username, password } = req.body || {};
    const normalizedUsername = typeof username === 'string' ? username.trim() : '';
    const normalizedPassword = typeof password === 'string' ? password : '';

    if (!normalizedUsername || !normalizedPassword) {
        return res.status(400).json({
            success: false,
            message: '用户名和密码不能为空'
        });
    }

    try {
        const [rows] = await pool.execute(
            'SELECT * FROM users WHERE username = ? LIMIT 1',
            [normalizedUsername]
        );

        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: '用户名或密码错误' });
        }

        const storedPasswordHash = typeof rows[0].password === 'string' ? rows[0].password : '';
        let isPasswordMatched = false;
        if (BCRYPT_HASH_PATTERN.test(storedPasswordHash)) {
            isPasswordMatched = await bcrypt.compare(normalizedPassword, storedPasswordHash);
        } else if (storedPasswordHash === normalizedPassword) {
            isPasswordMatched = true;
            const upgradedHash = await bcrypt.hash(normalizedPassword, BCRYPT_SALT_ROUNDS);
            await pool.execute('UPDATE users SET password = ? WHERE id = ?', [upgradedHash, rows[0].id]);
        }

        if (!isPasswordMatched) {
            return res.status(401).json({ success: false, message: '用户名或密码错误' });
        }

        // 避免把密码返回给前端，同时兼容不同数据库版本的字段差异
        const { password: _ignoredPassword, ...user } = rows[0];
        const token = generateToken(user);
        return res.json({
            success: true,
            token,
            user
        });
    } catch (error) {
        console.error('登录失败:', error);
        return res.status(500).json({ success: false, message: '服务器错误' });
    }
}

async function handleRegister(req, res) {
    const { username, email, password } = req.body || {};
    const normalizedUsername = typeof username === 'string' ? username.trim() : '';
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const normalizedPassword = typeof password === 'string' ? password : '';

    if (!normalizedUsername || !normalizedEmail || !normalizedPassword) {
        return res.status(400).json({
            success: false,
            message: '昵称、邮箱和密码不能为空'
        });
    }
    if (!isValidEmail(normalizedEmail)) {
        return res.status(400).json({ success: false, message: '邮箱格式不正确' });
    }
    if (!isValidPasswordLength(normalizedPassword)) {
        return res.status(400).json({ success: false, message: `密码至少需要 ${MIN_PASSWORD_LENGTH} 位` });
    }

    try {
        const passwordHash = await bcrypt.hash(normalizedPassword, BCRYPT_SALT_ROUNDS);
        await pool.execute(
            'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
            [normalizedUsername, normalizedEmail, passwordHash]
        );

        return res.status(201).json({
            success: true
        });
    } catch (error) {
        console.error('注册失败:', error);
        return res.status(500).json({
            success: false,
            message: '注册失败，用户名或邮箱可能已存在'
        });
    }
}

async function getGroupAccess(groupId, userId) {
    const [rows] = await pool.execute(
        `
            SELECT
                g.id,
                g.owner_id,
                gm.id AS member_record_id
            FROM groups_table g
            LEFT JOIN group_members gm
              ON gm.group_id = g.id AND gm.user_id = ?
            WHERE g.id = ?
            LIMIT 1
        `,
        [userId, groupId]
    );

    if (rows.length === 0) {
        return {
            exists: false,
            isOwner: false,
            isMember: false
        };
    }

    const isOwner = Number(rows[0].owner_id) === Number(userId);
    const isMember = isOwner || rows[0].member_record_id !== null;
    return {
        exists: true,
        isOwner,
        isMember
    };
}

async function getTaskAccess(taskId, userId) {
    const [taskRows] = await pool.execute(
        'SELECT id, group_id FROM tasks WHERE id = ? LIMIT 1',
        [taskId]
    );

    if (taskRows.length === 0) {
        return {
            exists: false,
            task: null,
            isOwner: false,
            isMember: false
        };
    }

    const task = taskRows[0];
    const groupAccess = await getGroupAccess(task.group_id, userId);
    return {
        exists: true,
        task,
        isOwner: groupAccess.isOwner,
        isMember: groupAccess.isMember
    };
}

async function requireExistingGroupMemberBeforeUpload(req, res, next) {
    const groupId = Number.parseInt(req.params.groupId, 10);
    if (!Number.isInteger(groupId) || groupId <= 0) {
        return next();
    }

    try {
        const access = await getGroupAccess(groupId, req.currentUser.id);
        if (!access.exists) {
            return next();
        }
        if (!access.isMember) {
            return res.status(403).json({ success: false, message: '无权向该小组上传文件' });
        }
        return next();
    } catch (error) {
        console.error('校验文件上传权限失败:', error);
        return res.status(500).json({ success: false, message: '服务器错误' });
    }
}

// 登录接口（保留 /api/login，同时兼容 /login）
app.post('/api/login', handleLogin);
app.post('/login', handleLogin);
app.post('/api/register', handleRegister);
app.post('/register', handleRegister);

// 管理员：获取全站用户列表
app.get('/api/admin/users', requireAuthUser, requireAdmin, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `
                SELECT
                    u.id,
                    u.username,
                    u.email,
                    u.role,
                    u.created_at,
                    COUNT(DISTINCT gm.group_id) AS joined_group_count
                FROM users u
                LEFT JOIN group_members gm ON gm.user_id = u.id
                WHERE u.role <> 'admin'
                GROUP BY u.id, u.username, u.email, u.role, u.created_at
                ORDER BY u.id ASC
            `
        );
        return res.json({
            success: true,
            users: rows
        });
    } catch (error) {
        console.error('管理员获取用户列表失败:', error);
        return res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 管理员：新增用户
app.post('/api/admin/users', requireAuthUser, requireAdmin, async (req, res) => {
    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const role = req.body?.role === 'admin' ? 'admin' : 'user';

    if (!username || !email || !password) {
        return res.status(400).json({ success: false, message: '用户名、邮箱和密码不能为空' });
    }
    if (!isValidEmail(email)) {
        return res.status(400).json({ success: false, message: '邮箱格式不正确' });
    }
    if (!isValidPasswordLength(password)) {
        return res.status(400).json({ success: false, message: `密码至少需要 ${MIN_PASSWORD_LENGTH} 位` });
    }

    try {
        const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
        const [result] = await pool.execute(
            'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
            [username, email, passwordHash, role]
        );

        const [rows] = await pool.execute(
            `
                SELECT
                    u.id,
                    u.username,
                    u.email,
                    u.role,
                    u.created_at,
                    COUNT(DISTINCT gm.group_id) AS joined_group_count
                FROM users u
                LEFT JOIN group_members gm ON gm.user_id = u.id
                WHERE u.id = ?
                GROUP BY u.id, u.username, u.email, u.role, u.created_at
                LIMIT 1
            `,
            [result.insertId]
        );

        return res.status(201).json({
            success: true,
            user: rows[0]
        });
    } catch (error) {
        console.error('管理员新增用户失败:', error);
        if (error?.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: '用户名或邮箱已存在' });
        }
        return res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 管理员：更新用户信息
app.put('/api/admin/users/:id', requireAuthUser, requireAdmin, async (req, res) => {
    const targetUserId = Number(req.params.id);
    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const role = req.body?.role === 'admin' ? 'admin' : 'user';

    if (!/^[1-9]\d*$/.test(req.params.id) || !Number.isSafeInteger(targetUserId)) {
        return res.status(400).json({ success: false, message: '无效的用户ID' });
    }
    if (!username || !email) {
        return res.status(400).json({ success: false, message: '用户名和邮箱不能为空' });
    }
    if (!isValidEmail(email)) {
        return res.status(400).json({ success: false, message: '邮箱格式不正确' });
    }
    if (password && !isValidPasswordLength(password)) {
        return res.status(400).json({ success: false, message: `密码至少需要 ${MIN_PASSWORD_LENGTH} 位` });
    }

    try {
        const [targetRows] = await pool.execute(
            'SELECT id, username FROM users WHERE id = ? LIMIT 1',
            [targetUserId]
        );
        if (targetRows.length === 0) {
            return res.status(404).json({ success: false, message: '用户不存在' });
        }

        if (password) {
            const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
            await pool.execute(
                'UPDATE users SET username = ?, email = ?, role = ?, password = ? WHERE id = ?',
                [username, email, role, passwordHash, targetUserId]
            );
        } else {
            await pool.execute(
                'UPDATE users SET username = ?, email = ?, role = ? WHERE id = ?',
                [username, email, role, targetUserId]
            );
        }

        const [rows] = await pool.execute(
            `
                SELECT
                    u.id,
                    u.username,
                    u.email,
                    u.role,
                    u.created_at,
                    COUNT(DISTINCT gm.group_id) AS joined_group_count
                FROM users u
                LEFT JOIN group_members gm ON gm.user_id = u.id
                WHERE u.id = ?
                GROUP BY u.id, u.username, u.email, u.role, u.created_at
                LIMIT 1
            `,
            [targetUserId]
        );

        return res.json({
            success: true,
            user: rows[0]
        });
    } catch (error) {
        console.error('管理员更新用户失败:', error);
        if (error?.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: '用户名或邮箱已存在' });
        }
        return res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 管理员：全站统计
app.get('/api/admin/stats', requireAuthUser, requireAdmin, async (req, res) => {
    try {
        const [userCountResult, groupCountResult, taskCountResult, fileCountResult] = await Promise.all([
            pool.execute('SELECT COUNT(*) AS total FROM users'),
            pool.execute('SELECT COUNT(*) AS total FROM groups_table'),
            pool.execute('SELECT COUNT(*) AS total FROM tasks'),
            pool.execute('SELECT COUNT(*) AS total FROM group_files')
        ]);

        const [userCountRows] = userCountResult;
        const [groupCountRows] = groupCountResult;
        const [taskCountRows] = taskCountResult;
        const [fileCountRows] = fileCountResult;

        return res.json({
            success: true,
            stats: {
                totalUsers: Number(userCountRows[0]?.total) || 0,
                totalGroups: Number(groupCountRows[0]?.total) || 0,
                totalTasks: Number(taskCountRows[0]?.total) || 0,
                totalFiles: Number(fileCountRows[0]?.total) || 0
            }
        });
    } catch (error) {
        console.error('管理员获取统计数据失败:', error);
        return res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 管理员：平台业务聚合统计
app.get('/api/admin/business-stats', requireAuthUser, requireAdmin, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `
                SELECT
                    g.id,
                    g.name AS name,
                    COUNT(t.id) AS score
                FROM groups_table g
                LEFT JOIN tasks t ON t.group_id = g.id
                GROUP BY g.id, g.name
                ORDER BY score DESC, g.id ASC
                LIMIT 5
            `
        );

        return res.json({
            success: true,
            topGroups: rows.map((row) => ({
                id: row.id,
                name: row.name,
                score: Number(row.score) || 0,
                // 兼容旧前端字段
                group_name: row.name,
                task_count: Number(row.score) || 0
            }))
        });
    } catch (error) {
        console.error('管理员获取业务聚合统计失败:', error);
        return res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 管理员：全站活跃小组 Top 10（加权算法）
app.get('/api/admin/active-groups', requireAuthUser, requireAdmin, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `
                SELECT
                    g.id,
                    g.name,
                    COALESCE(d.discussion_count, 0) AS discussion_count,
                    COALESCE(t.task_count, 0) AS task_count,
                    COALESCE(f.file_count, 0) AS file_count,
                    (
                        COALESCE(d.discussion_count, 0) * 1 +
                        COALESCE(t.task_count, 0) * 2 +
                        COALESCE(f.file_count, 0) * 3
                    ) AS score
                FROM groups_table g
                LEFT JOIN (
                    SELECT group_id, COUNT(*) AS discussion_count
                    FROM discussions
                    GROUP BY group_id
                ) d ON d.group_id = g.id
                LEFT JOIN (
                    SELECT group_id, COUNT(*) AS task_count
                    FROM tasks
                    GROUP BY group_id
                ) t ON t.group_id = g.id
                LEFT JOIN (
                    SELECT group_id, COUNT(*) AS file_count
                    FROM group_files
                    GROUP BY group_id
                ) f ON f.group_id = g.id
                ORDER BY score DESC, g.id ASC
                LIMIT 10
            `
        );

        return res.json({
            success: true,
            groups: rows.map((row) => ({
                id: row.id,
                name: row.name,
                score: Number(row.score) || 0,
                discussion_count: Number(row.discussion_count) || 0,
                task_count: Number(row.task_count) || 0,
                file_count: Number(row.file_count) || 0
            }))
        });
    } catch (error) {
        console.error('管理员获取活跃小组排行失败:', error);
        return res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 管理员：全站活跃小组总榜（加权算法，全量）
app.get('/api/admin/active-groups/all', requireAuthUser, requireAdmin, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `
                SELECT
                    g.id,
                    g.name,
                    COALESCE(d.discussion_count, 0) AS discussion_count,
                    COALESCE(t.task_count, 0) AS task_count,
                    COALESCE(f.file_count, 0) AS file_count,
                    (
                        COALESCE(d.discussion_count, 0) * 1 +
                        COALESCE(t.task_count, 0) * 2 +
                        COALESCE(f.file_count, 0) * 3
                    ) AS score
                FROM groups_table g
                LEFT JOIN (
                    SELECT group_id, COUNT(*) AS discussion_count
                    FROM discussions
                    GROUP BY group_id
                ) d ON d.group_id = g.id
                LEFT JOIN (
                    SELECT group_id, COUNT(*) AS task_count
                    FROM tasks
                    GROUP BY group_id
                ) t ON t.group_id = g.id
                LEFT JOIN (
                    SELECT group_id, COUNT(*) AS file_count
                    FROM group_files
                    GROUP BY group_id
                ) f ON f.group_id = g.id
                ORDER BY score DESC, g.id ASC
            `
        );

        return res.json({
            success: true,
            groups: rows.map((row) => ({
                id: row.id,
                name: row.name,
                score: Number(row.score) || 0,
                discussion_count: Number(row.discussion_count) || 0,
                task_count: Number(row.task_count) || 0,
                file_count: Number(row.file_count) || 0
            }))
        });
    } catch (error) {
        console.error('管理员获取全量活跃小组排行失败:', error);
        return res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 管理员：最新平台动态（注册 + 建组）
app.get('/api/admin/activities', requireAuthUser, requireAdmin, async (req, res) => {
    try {
        const [latestUsers, latestGroups] = await Promise.all([
            pool.execute(`
                SELECT username, created_at
                FROM users
                ORDER BY created_at DESC, id DESC
                LIMIT 3
            `),
            pool.execute(`
                SELECT name AS group_name, created_at
                FROM groups_table
                ORDER BY created_at DESC, id DESC
                LIMIT 3
            `)
        ]);

        const [userRows] = latestUsers;
        const [groupRows] = latestGroups;

        const activities = [
            ...userRows.map((item, index) => ({
                id: `user-${index}-${item.created_at ? new Date(item.created_at).getTime() : Date.now()}`,
                type: 'user_register',
                username: item.username,
                created_at: item.created_at
            })),
            ...groupRows.map((item, index) => ({
                id: `group-${index}-${item.created_at ? new Date(item.created_at).getTime() : Date.now()}`,
                type: 'group_create',
                group_name: item.group_name,
                created_at: item.created_at
            }))
        ].sort((a, b) => {
            const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return timeB - timeA;
        });

        return res.json({
            success: true,
            activities
        });
    } catch (error) {
        console.error('管理员获取平台动态失败:', error);
        return res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 管理员：获取全站小组列表
app.get('/api/admin/groups', requireAuthUser, requireAdmin, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `
                SELECT
                    g.id,
                    g.name,
                    g.description,
                    g.owner_id,
                    g.created_at,
                    u.username AS owner_username
                FROM groups_table g
                LEFT JOIN users u ON u.id = g.owner_id
                ORDER BY g.id DESC
            `
        );
        return res.json({
            success: true,
            groups: rows
        });
    } catch (error) {
        console.error('管理员获取小组列表失败:', error);
        return res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 管理员：编辑小组信息
app.put('/api/admin/groups/:id', requireAuthUser, requireAdmin, async (req, res) => {
    const groupId = Number.parseInt(req.params.id, 10);
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';

    if (!Number.isInteger(groupId) || groupId <= 0) {
        return res.status(400).json({ success: false, message: '无效的小组ID' });
    }
    if (!name) {
        return res.status(400).json({ success: false, message: '小组名称不能为空' });
    }

    try {
        const [result] = await pool.execute(
            'UPDATE groups_table SET name = ?, description = ? WHERE id = ?',
            [name, description, groupId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: '小组不存在' });
        }

        const [rows] = await pool.execute(
            `
                SELECT
                    g.id,
                    g.name,
                    g.description,
                    g.owner_id,
                    g.created_at,
                    u.username AS owner_username
                FROM groups_table g
                LEFT JOIN users u ON u.id = g.owner_id
                WHERE g.id = ?
                LIMIT 1
            `,
            [groupId]
        );

        return res.json({
            success: true,
            group: rows[0]
        });
    } catch (error) {
        console.error('管理员编辑小组失败:', error);
        return res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 管理员：全站任务监管列表
app.get('/api/admin/tasks', requireAuthUser, requireAdmin, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `
                SELECT
                    t.id,
                    t.content,
                    t.status,
                    t.group_id,
                    t.created_at,
                    g.name AS group_name,
                    g.owner_id,
                    u.username
                FROM tasks t
                LEFT JOIN groups_table g ON g.id = t.group_id
                LEFT JOIN users u ON u.id = g.owner_id
                ORDER BY t.created_at DESC, t.id DESC
            `
        );

        return res.json({
            success: true,
            tasks: rows
        });
    } catch (error) {
        console.error('管理员获取全站任务失败:', error);
        return res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 管理员：编辑任务
app.put('/api/admin/tasks/:taskId', requireAuthUser, requireAdmin, async (req, res) => {
    const taskId = Number.parseInt(req.params.taskId, 10);
    const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
    const status = typeof req.body?.status === 'string' ? req.body.status.trim() : '';

    if (!Number.isInteger(taskId) || taskId <= 0) {
        return res.status(400).json({ success: false, message: '无效的任务ID' });
    }
    if (!content) {
        return res.status(400).json({ success: false, message: '任务内容不能为空' });
    }
    if (!TASK_STATUS_OPTIONS.includes(status)) {
        return res.status(400).json({
            success: false,
            message: `状态值非法，仅支持：${TASK_STATUS_OPTIONS.join('、')}`
        });
    }

    try {
        const [result] = await pool.execute(
            'UPDATE tasks SET content = ?, status = ? WHERE id = ?',
            [content, status, taskId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: '任务不存在' });
        }

        const [rows] = await pool.execute(
            `
                SELECT
                    t.id,
                    t.content,
                    t.status,
                    t.group_id,
                    t.created_at,
                    g.name AS group_name,
                    g.owner_id,
                    u.username
                FROM tasks t
                LEFT JOIN groups_table g ON g.id = t.group_id
                LEFT JOIN users u ON u.id = g.owner_id
                WHERE t.id = ?
                LIMIT 1
            `,
            [taskId]
        );

        return res.json({
            success: true,
            task: rows[0]
        });
    } catch (error) {
        console.error('管理员编辑任务失败:', error);
        return res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 管理员：强制删除任务
app.delete('/api/admin/tasks/:taskId', requireAuthUser, requireAdmin, async (req, res) => {
    const taskId = Number.parseInt(req.params.taskId, 10);
    if (!Number.isInteger(taskId) || taskId <= 0) {
        return res.status(400).json({ success: false, message: '无效的任务ID' });
    }

    try {
        const [result] = await pool.execute('DELETE FROM tasks WHERE id = ?', [taskId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: '任务不存在' });
        }
        return res.json({ success: true, message: '任务已删除' });
    } catch (error) {
        console.error('管理员删除任务失败:', error);
        return res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 管理员：全站资料审查列表
app.get('/api/admin/files', requireAuthUser, requireAdmin, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `
                SELECT
                    gf.id,
                    gf.group_id,
                    gf.uploader_id,
                    gf.file_name,
                    gf.file_url,
                    gf.file_size,
                    gf.created_at,
                    g.name AS group_name,
                    u.username
                FROM group_files gf
                LEFT JOIN groups_table g ON g.id = gf.group_id
                LEFT JOIN users u ON u.id = gf.uploader_id
                ORDER BY gf.created_at DESC, gf.id DESC
            `
        );

        return res.json({
            success: true,
            files: rows
        });
    } catch (error) {
        console.error('管理员获取全站资料失败:', error);
        return res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 管理员：彻底销毁资料（删除物理文件 + 删除数据库记录）
app.delete('/api/admin/files/:fileId', requireAuthUser, requireAdmin, async (req, res) => {
    const fileId = Number.parseInt(req.params.fileId, 10);
    if (!Number.isInteger(fileId) || fileId <= 0) {
        return res.status(400).json({ success: false, message: '无效的资料ID' });
    }

    try {
        const [fileRows] = await pool.execute(
            `
                SELECT file_url
                FROM group_files
                WHERE id = ?
                LIMIT 1
            `,
            [fileId]
        );

        if (fileRows.length === 0) {
            return res.status(404).json({ success: false, message: '资料不存在' });
        }

        const fileUrl = typeof fileRows[0].file_url === 'string' ? fileRows[0].file_url : '';
        const fileName = path.basename(fileUrl);
        if (fileName) {
            const absolutePath = path.join(__dirname, 'uploads', fileName);
            try {
                fs.unlinkSync(absolutePath);
            } catch (unlinkError) {
                console.warn('管理员删除物理文件失败（忽略）:', unlinkError.message);
            }
        }

        const [result] = await pool.execute('DELETE FROM group_files WHERE id = ?', [fileId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: '资料不存在' });
        }

        return res.json({ success: true, message: '资料已彻底销毁' });
    } catch (error) {
        console.error('管理员彻底销毁资料失败:', error);
        return res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 管理员：删除违规用户（可强制清理其所属小组数据）
app.delete('/api/admin/users/:id', requireAuthUser, requireAdmin, async (req, res) => {
    const targetUserId = Number(req.params.id);
    if (!/^[1-9]\d*$/.test(req.params.id) || !Number.isSafeInteger(targetUserId)) {
        return res.status(400).json({ success: false, message: '无效的用户ID' });
    }

    if (targetUserId === Number(req.currentUser.id)) {
        return res.status(400).json({ success: false, message: '不能删除当前登录的管理员账号' });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [targetRows] = await connection.execute(
            'SELECT id, username FROM users WHERE id = ? LIMIT 1',
            [targetUserId]
        );
        if (targetRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: '用户不存在' });
        }

        // 先清理该用户创建的小组及关联数据，避免 owner_id 外键约束阻塞
        const [ownedGroups] = await connection.execute(
            'SELECT id FROM groups_table WHERE owner_id = ?',
            [targetUserId]
        );
        for (const group of ownedGroups) {
            const groupId = Number(group.id);
            await connection.execute('DELETE FROM notifications WHERE group_id = ?', [groupId]);
            await connection.execute('DELETE FROM group_members WHERE group_id = ?', [groupId]);
            await connection.execute('DELETE FROM discussions WHERE group_id = ?', [groupId]);
            await connection.execute('DELETE FROM tasks WHERE group_id = ?', [groupId]);
            await connection.execute('DELETE FROM shared_files WHERE group_id = ?', [groupId]);
            await connection.execute('DELETE FROM groups_table WHERE id = ?', [groupId]);
        }

        const [deleteResult] = await connection.execute('DELETE FROM users WHERE id = ?', [targetUserId]);
        if (deleteResult.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: '用户不存在' });
        }

        await connection.commit();
        return res.json({ success: true, message: '用户删除成功' });
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error('管理员删除用户失败:', error);
        return res.status(500).json({ success: false, message: '服务器错误' });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// 管理员：强制解散小组
app.delete('/api/admin/groups/:id', requireAuthUser, requireAdmin, async (req, res) => {
    const groupId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(groupId) || groupId <= 0) {
        return res.status(400).json({ success: false, message: '无效的小组ID' });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [groupRows] = await connection.execute(
            'SELECT id FROM groups_table WHERE id = ? LIMIT 1',
            [groupId]
        );
        if (groupRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: '小组不存在' });
        }

        const [fileRows] = await connection.execute(
            'SELECT file_url FROM group_files WHERE group_id = ?',
            [groupId]
        );

        await connection.execute('DELETE FROM notifications WHERE group_id = ?', [groupId]);
        await connection.execute('DELETE FROM group_members WHERE group_id = ?', [groupId]);
        await connection.execute('DELETE FROM discussions WHERE group_id = ?', [groupId]);
        await connection.execute('DELETE FROM tasks WHERE group_id = ?', [groupId]);
        await connection.execute('DELETE FROM shared_files WHERE group_id = ?', [groupId]);
        const [result] = await connection.execute('DELETE FROM groups_table WHERE id = ?', [groupId]);

        await connection.commit();
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: '小组不存在' });
        }

        for (const file of fileRows) {
            const fileUrl = typeof file.file_url === 'string' ? file.file_url : '';
            const fileName = path.basename(fileUrl);
            if (!fileName) {
                continue;
            }

            const absoluteFilePath = path.join(uploadsDirectory, fileName);
            try {
                fs.unlinkSync(absoluteFilePath);
            } catch (unlinkError) {
                if (unlinkError.code !== 'ENOENT') {
                    console.warn('管理员解散小组时删除物理文件失败（数据库已提交）:', unlinkError.message);
                }
            }
        }

        return res.json({ success: true, message: '小组已强制解散' });
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error('管理员强制解散小组失败:', error);
        return res.status(500).json({ success: false, message: '服务器错误' });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// 当前登录用户资料
app.get('/api/user/profile', requireAuthUser, async (req, res) => {
    return res.json({
        success: true,
        user: req.currentUser
    });
});

app.put('/api/user/profile', requireAuthUser, async (req, res) => {
    const { nickname, bio, avatar, oldPassword, newPassword, password } = req.body || {};

    try {
        const updateSegments = [];
        const updateParams = [];

        if (typeof nickname === 'string') {
            const normalizedNickname = nickname.trim();
            if (!normalizedNickname) {
                return res.status(400).json({ success: false, message: '昵称不能为空' });
            }

            updateSegments.push('username = ?');
            updateParams.push(normalizedNickname);
        }

        if (typeof bio === 'string') {
            updateSegments.push('motto = ?');
            updateParams.push(bio.trim());
        }

        if (typeof avatar === 'string') {
            updateSegments.push('avatar = ?');
            updateParams.push(avatar.trim());
        }

        const normalizedNewPassword =
            typeof newPassword === 'string' && newPassword.trim()
                ? newPassword.trim()
                : typeof password === 'string' && password.trim()
                    ? password.trim()
                    : '';

        if (normalizedNewPassword) {
            if (!isValidPasswordLength(normalizedNewPassword)) {
                return res.status(400).json({ success: false, message: `密码至少需要 ${MIN_PASSWORD_LENGTH} 位` });
            }
            const normalizedOldPassword = typeof oldPassword === 'string' ? oldPassword : '';
            if (!normalizedOldPassword) {
                return res.status(400).json({ success: false, message: '请输入原密码' });
            }

            const [pwdRows] = await pool.execute(
                'SELECT password FROM users WHERE id = ? LIMIT 1',
                [req.currentUser.id]
            );

            if (pwdRows.length === 0) {
                return res.status(404).json({ success: false, message: '用户不存在' });
            }

            const storedPasswordHash = typeof pwdRows[0].password === 'string' ? pwdRows[0].password : '';
            const isOldPasswordMatched = BCRYPT_HASH_PATTERN.test(storedPasswordHash)
                ? await bcrypt.compare(normalizedOldPassword, storedPasswordHash)
                : storedPasswordHash === normalizedOldPassword;
            if (!isOldPasswordMatched) {
                return res.status(400).json({ success: false, message: '原密码不正确' });
            }

            const hashedNewPassword = await bcrypt.hash(normalizedNewPassword, BCRYPT_SALT_ROUNDS);
            updateSegments.push('password = ?');
            updateParams.push(hashedNewPassword);
        }

        if (updateSegments.length === 0) {
            return res.status(400).json({ success: false, message: '没有可更新的字段' });
        }

        await pool.execute(
            `UPDATE users SET ${updateSegments.join(', ')} WHERE id = ?`,
            [...updateParams, req.currentUser.id]
        );

        const [rows] = await pool.execute(
            'SELECT id, username, email, avatar, motto, major, role FROM users WHERE id = ? LIMIT 1',
            [req.currentUser.id]
        );

        return res.json({
            success: true,
            user: rows[0]
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: '昵称已存在，请换一个' });
        }

        console.error('更新当前用户资料失败:', error);
        return res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 仪表盘聚合数据接口
app.get('/api/dashboard/stats', requireAuthUser, async (req, res) => {
    const currentUserId = req.currentUser.id;

    try {
        const [groupResult, taskStatusResult, recentPendingResult, fileCountResult] = await Promise.all([
            pool.execute(
                `
                    SELECT COUNT(DISTINCT g.id) AS total
                    FROM groups_table g
                    LEFT JOIN group_members gm ON gm.group_id = g.id
                    WHERE g.owner_id = ? OR gm.user_id = ?
                `,
                [currentUserId, currentUserId]
            ),
            pool.execute(
                `
                    SELECT t.status, COUNT(*) AS total
                    FROM tasks t
                    INNER JOIN groups_table g ON g.id = t.group_id
                    WHERE g.owner_id = ?
                       OR EXISTS (
                           SELECT 1
                           FROM group_members gm
                           WHERE gm.group_id = g.id
                             AND gm.user_id = ?
                       )
                    GROUP BY t.status
                `,
                [currentUserId, currentUserId]
            ),
            pool.execute(
                `
                    SELECT t.id, t.content, t.status, t.group_id, g.name AS group_name
                    FROM tasks t
                    INNER JOIN groups_table g ON g.id = t.group_id
                    WHERE (g.owner_id = ?
                        OR EXISTS (
                            SELECT 1
                            FROM group_members gm
                            WHERE gm.group_id = g.id
                              AND gm.user_id = ?
                        ))
                      AND t.status = '待处理'
                    ORDER BY t.id DESC
                    LIMIT 5
                `,
                [currentUserId, currentUserId]
            ),
            pool.execute(
                `
                    SELECT COUNT(*) AS total
                    FROM shared_files sf
                    INNER JOIN groups_table g ON g.id = sf.group_id
                    WHERE g.owner_id = ?
                       OR EXISTS (
                           SELECT 1
                           FROM group_members gm
                           WHERE gm.group_id = g.id
                             AND gm.user_id = ?
                       )
                `,
                [currentUserId, currentUserId]
            )
        ]);

        const [groupRows] = groupResult;
        const [taskStatusRows] = taskStatusResult;
        const [recentPendingRows] = recentPendingResult;
        const [fileCountRows] = fileCountResult;

        const taskCounts = {
            pending: 0,
            inProgress: 0,
            completed: 0,
            total: 0
        };

        taskStatusRows.forEach((row) => {
            const count = Number(row.total) || 0;
            taskCounts.total += count;

            if (row.status === '待处理') {
                taskCounts.pending = count;
            } else if (row.status === '进行中') {
                taskCounts.inProgress = count;
            } else if (row.status === '已完成') {
                taskCounts.completed = count;
            }
        });

        const completionRate =
            taskCounts.total > 0
                ? Math.round((taskCounts.completed / taskCounts.total) * 100)
                : 0;

        return res.json({
            success: true,
            stats: {
                groupCount: Number(groupRows[0]?.total) || 0,
                fileCount: Number(fileCountRows[0]?.total) || 0,
                taskCounts,
                completionRate,
                recentPendingTasks: recentPendingRows.map((task) => ({
                    id: task.id,
                    title: task.content,
                    status: task.status,
                    groupId: task.group_id,
                    groupName: task.group_name
                }))
            }
        });
    } catch (error) {
        console.error('获取仪表盘聚合数据失败:', error);
        return res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 首页最新共享资料（当前用户可访问范围内的最近 5 条）
app.get('/api/files/recent', requireAuthUser, async (req, res) => {
    const currentUserId = req.currentUser.id;

    try {
        const [rows] = await pool.execute(
            `
                SELECT
                    f.id,
                    f.group_id,
                    f.uploader_id,
                    f.file_name,
                    f.file_url,
                    f.file_size,
                    f.created_at,
                    g.name AS group_name,
                    u.username
                FROM group_files f
                INNER JOIN groups_table g ON g.id = f.group_id
                LEFT JOIN users u ON u.id = f.uploader_id
                WHERE g.owner_id = ?
                   OR EXISTS (
                        SELECT 1
                        FROM group_members gm
                        WHERE gm.group_id = g.id
                          AND gm.user_id = ?
                   )
                ORDER BY f.created_at DESC, f.id DESC
                LIMIT 5
            `,
            [currentUserId, currentUserId]
        );

        return res.json({
            success: true,
            files: rows
        });
    } catch (error) {
        console.error('获取最新共享资料失败:', error);
        return res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 资料集锦：当前用户可访问范围内的全部共享资料
app.get('/api/files/all', requireAuthUser, async (req, res) => {
    const currentUserId = req.currentUser.id;

    try {
        const [rows] = await pool.execute(
            `
                SELECT
                    f.id,
                    f.group_id,
                    f.uploader_id,
                    f.file_name,
                    f.file_url,
                    f.file_size,
                    f.created_at,
                    g.name AS group_name,
                    u.username
                FROM group_files f
                INNER JOIN groups_table g ON g.id = f.group_id
                LEFT JOIN users u ON u.id = f.uploader_id
                WHERE g.owner_id = ?
                   OR EXISTS (
                        SELECT 1
                        FROM group_members gm
                        WHERE gm.group_id = g.id
                          AND gm.user_id = ?
                   )
                ORDER BY f.created_at DESC, f.id DESC
            `,
            [currentUserId, currentUserId]
        );

        return res.json({
            success: true,
            files: rows
        });
    } catch (error) {
        console.error('获取资料集锦失败:', error);
        return res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 全局任务中心：当前用户参与的所有小组任务
app.get('/api/global/tasks', requireAuthUser, async (req, res) => {
    const currentUserId = req.currentUser.id;

    try {
        const [rows] = await pool.execute(
            `
                SELECT
                    t.id,
                    t.group_id,
                    t.content,
                    t.status,
                    g.name AS group_name
                FROM tasks t
                INNER JOIN groups_table g ON g.id = t.group_id
                WHERE g.owner_id = ?
                   OR EXISTS (
                       SELECT 1
                       FROM group_members gm
                       WHERE gm.group_id = g.id
                         AND gm.user_id = ?
                   )
                ORDER BY t.id DESC
            `,
            [currentUserId, currentUserId]
        );

        return res.json({
            success: true,
            tasks: rows
        });
    } catch (error) {
        console.error('获取全局任务失败:', error);
        return res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 全局资料库：当前用户参与的所有小组共享资料
app.get('/api/global/files', requireAuthUser, async (req, res) => {
    const currentUserId = req.currentUser.id;

    try {
        const [rows] = await pool.execute(
            `
                SELECT
                    sf.id,
                    sf.group_id,
                    sf.user_id,
                    sf.file_name,
                    sf.file_url,
                    sf.created_at,
                    g.name AS group_name,
                    u.username
                FROM shared_files sf
                INNER JOIN groups_table g ON g.id = sf.group_id
                LEFT JOIN users u ON u.id = sf.user_id
                WHERE g.owner_id = ?
                   OR EXISTS (
                       SELECT 1
                       FROM group_members gm
                       WHERE gm.group_id = g.id
                         AND gm.user_id = ?
                   )
                ORDER BY sf.created_at DESC, sf.id DESC
            `,
            [currentUserId, currentUserId]
        );

        return res.json({
            success: true,
            files: rows
        });
    } catch (error) {
        console.error('获取全局资料失败:', error);
        return res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 获取任务列表接口
app.get('/api/tasks', requireAuthUser, async (req, res) => {
    const { group_id } = req.query;
    const currentUserId = req.currentUser.id;
    
    try {
        let query = 'SELECT * FROM tasks';
        let params = [];
        
        if (group_id) {
            const access = await getGroupAccess(group_id, currentUserId);
            if (access.exists && !access.isMember) {
                return res.status(403).json({ success: false, message: '无权访问该小组任务' });
            }
            query += ' WHERE group_id = ?';
            params.push(group_id);
        } else {
            query = `
                SELECT DISTINCT t.*
                FROM tasks t
                INNER JOIN groups_table g ON g.id = t.group_id
                LEFT JOIN group_members gm
                  ON gm.group_id = g.id AND gm.user_id = ?
                WHERE g.owner_id = ? OR gm.user_id IS NOT NULL
            `;
            params = [currentUserId, currentUserId];
        }
        
        const [rows] = await pool.execute(query, params);
        res.json({ success: true, tasks: rows });
    } catch (error) {
        console.error('获取任务失败:', error);
        res.json({ success: false, message: '服务器错误' });
    }
});

// 新增任务接口
app.post('/api/tasks', requireAuthUser, async (req, res) => {
    console.log('后端已收到添加任务请求:', req.body);
    const { group_id, content, status } = req.body;
    const normalizedStatus = typeof status === 'string' && status.trim() ? status.trim() : DEFAULT_TASK_STATUS;
    console.log('准备插入的数据:', { group_id, content, status: normalizedStatus });
    
    try {
        // 检查参数是否完整
        if (!group_id || !content) {
            console.error('参数不完整:', { group_id, content });
            return res.json({ success: false, message: '参数不完整' });
        }

        if (!TASK_STATUS_OPTIONS.includes(normalizedStatus)) {
            return res.status(400).json({
                success: false,
                message: `状态值非法，仅支持：${TASK_STATUS_OPTIONS.join('、')}`
            });
        }

        const access = await getGroupAccess(group_id, req.currentUser.id);
        if (access.exists && !access.isMember) {
            return res.status(403).json({ success: false, message: '无权向该小组创建任务' });
        }
        
        const [result] = await pool.execute(
            'INSERT INTO tasks (group_id, content, status) VALUES (?, ?, ?)',
            [group_id, content, normalizedStatus]
        );
        
        console.log('插入结果:', result);
        
        // 返回新增的任务
        const [rows] = await pool.execute('SELECT * FROM tasks WHERE id = ?', [result.insertId]);
        console.log('查询结果:', rows);
        
        if (rows.length > 0) {
            console.log('添加任务成功:', rows[0]);
            res.json({ success: true, task: rows[0] });
        } else {
            console.error('添加任务失败: 未找到插入的记录');
            res.json({ success: false, message: '添加任务失败' });
        }
    } catch (error) {
        console.error('新增任务失败:', error);
        res.json({ success: false, message: '服务器错误', error: error.message });
    }
});

// 获取用户信息接口
app.get('/api/users/:id', requireAuthUser, async (req, res) => {
    const userId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({ success: false, message: '无效的用户ID' });
    }
    if (Number(req.currentUser.id) !== userId && req.currentUser.role !== 'admin') {
        return res.status(403).json({ success: false, message: '无权访问该用户信息' });
    }
    
    try {
        const [rows] = await pool.execute(
            'SELECT id, username, email, avatar, motto, major, role, created_at FROM users WHERE id = ?',
            [userId]
        );
        if (rows.length > 0) {
            res.json({ success: true, user: rows[0] });
        } else {
            res.json({ success: false, message: '用户不存在' });
        }
    } catch (error) {
        console.error('获取用户信息失败:', error);
        res.json({ success: false, message: '服务器错误' });
    }
});

// 更新用户信息接口
app.put('/api/users/:id', requireAuthUser, async (req, res) => {
    const userId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({ success: false, message: '无效的用户ID' });
    }
    if (Number(req.currentUser.id) !== userId && req.currentUser.role !== 'admin') {
        return res.status(403).json({ success: false, message: '无权修改该用户信息' });
    }
    const { username, email, motto, major } = req.body;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!isValidEmail(normalizedEmail)) {
        return res.status(400).json({ success: false, message: '邮箱格式不正确' });
    }
    
    try {
        const [result] = await pool.execute(
            'UPDATE users SET username = ?, email = ?, motto = ?, major = ? WHERE id = ?',
            [username, normalizedEmail, motto, major, userId]
        );
        
        if (result.affectedRows > 0) {
            // 返回更新后的用户信息
            const [rows] = await pool.execute(
                'SELECT id, username, email, avatar, motto, major, role, created_at FROM users WHERE id = ?',
                [userId]
            );
            res.json({ success: true, user: rows[0] });
        } else {
            res.json({ success: false, message: '更新失败' });
        }
    } catch (error) {
        console.error('更新用户信息失败:', error);
        res.json({ success: false, message: '服务器错误' });
    }
});

// 更新任务状态接口
app.put('/api/tasks/:id', requireAuthUser, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const normalizedStatus = typeof status === 'string' ? status.trim() : '';
    
    try {
        if (!TASK_STATUS_OPTIONS.includes(normalizedStatus)) {
            return res.status(400).json({
                success: false,
                message: `状态值非法，仅支持：${TASK_STATUS_OPTIONS.join('、')}`
            });
        }

        const access = await getTaskAccess(id, req.currentUser.id);
        if (access.exists && !access.isMember) {
            return res.status(403).json({ success: false, message: '无权修改该任务' });
        }

        const [result] = await pool.execute(
            'UPDATE tasks SET status = ? WHERE id = ?',
            [normalizedStatus, id]
        );
        
        if (result.affectedRows > 0) {
            // 返回更新后的任务
            const [rows] = await pool.execute('SELECT * FROM tasks WHERE id = ?', [id]);
            res.json({ success: true, task: rows[0] });
        } else {
            res.json({ success: false, message: '更新失败' });
        }
    } catch (error) {
        console.error('更新任务状态失败:', error);
        res.json({ success: false, message: '服务器错误' });
    }
});

// 删除任务接口
app.delete('/api/tasks/:id', requireAuthUser, async (req, res) => {
    const { id } = req.params;
    console.log('收到删除任务请求，任务ID:', id);
    
    try {
        const access = await getTaskAccess(id, req.currentUser.id);
        if (access.exists && !access.isMember) {
            return res.status(403).json({ success: false, message: '无权删除该任务' });
        }

        console.log('执行删除操作，任务ID:', id);
        const [result] = await pool.execute(
            'DELETE FROM tasks WHERE id = ?',
            [id]
        );
        console.log('删除操作结果:', result);
        
        if (result.affectedRows > 0) {
            console.log('任务删除成功，ID:', id);
            res.json({ success: true, message: '任务删除成功' });
        } else {
            console.log('任务删除失败，未找到该任务，ID:', id);
            res.json({ success: false, message: '删除失败' });
        }
    } catch (error) {
        console.error('删除任务失败:', error);
        res.json({ success: false, message: '服务器错误' });
    }
});

// 获取小组列表接口（仅返回“我创建的”或“我加入的”小组）
app.get('/api/groups', requireAuthUser, async (req, res) => {
    const currentUserId = req.currentUser.id;

    try {
        const [rows] = await pool.execute(
            `
                SELECT DISTINCT
                    g.id,
                    g.name,
                    g.description,
                    g.owner_id
                FROM groups_table g
                LEFT JOIN group_members gm ON gm.group_id = g.id
                WHERE g.owner_id = ? OR gm.user_id = ?
                ORDER BY g.id DESC
            `,
            [currentUserId, currentUserId]
        );
        res.json({ success: true, groups: rows });
    } catch (error) {
        console.error('获取小组列表失败:', error);
        res.json({ success: false, message: '服务器错误' });
    }
});

// 创建小组接口
app.post('/api/groups', async (req, res) => {
    console.log('后端已收到创建小组请求:', req.body);
    const { name, description, owner_id } = req.body;
    
    try {
        const [result] = await pool.execute(
            'INSERT INTO groups_table (name, description, owner_id) VALUES (?, ?, ?)',
            [name, description, owner_id]
        );

        if (owner_id) {
            await pool.execute(
                'INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)',
                [result.insertId, owner_id, '组长']
            );
        }
        
        // 返回新增的小组
        const [rows] = await pool.execute('SELECT * FROM groups_table WHERE id = ?', [result.insertId]);
        console.log('创建小组成功:', rows[0]);
        res.json({ success: true, group: rows[0] });
    } catch (error) {
        console.error('创建小组失败:', error);
        res.json({ success: false, message: '服务器错误' });
    }
});

// 删除小组（仅组长可删；按顺序清理关联数据，避免外键约束报错）
app.delete('/api/groups/:id', requireAuthUser, async (req, res) => {
    const groupId = Number.parseInt(req.params.id, 10);
    const currentUserId = req.currentUser.id;
    if (!Number.isInteger(groupId) || groupId <= 0) {
        return res.status(400).json({ success: false, message: '无效的小组ID' });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [groupRows] = await connection.execute(
            'SELECT id, owner_id FROM groups_table WHERE id = ? LIMIT 1',
            [groupId]
        );
        if (groupRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: '小组不存在' });
        }

        if (Number(groupRows[0].owner_id) !== Number(currentUserId)) {
            await connection.rollback();
            return res.status(403).json({ success: false, message: '仅组长可删除小组' });
        }

        await connection.execute('DELETE FROM notifications WHERE group_id = ?', [groupId]);
        await connection.execute('DELETE FROM group_members WHERE group_id = ?', [groupId]);
        await connection.execute('DELETE FROM discussions WHERE group_id = ?', [groupId]);
        await connection.execute('DELETE FROM shared_files WHERE group_id = ?', [groupId]);
        await connection.execute('DELETE FROM tasks WHERE group_id = ?', [groupId]);
        const [result] = await connection.execute('DELETE FROM groups_table WHERE id = ?', [groupId]);

        await connection.commit();

        if (result.affectedRows > 0) {
            return res.json({ success: true, message: '小组删除成功' });
        }

        return res.status(404).json({ success: false, message: '小组不存在' });
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error('删除小组失败:', error);
        return res.status(500).json({ success: false, message: '服务器错误' });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// 退出小组（当前用户从 group_members 中移除）
app.delete('/api/groups/:id/leave', requireAuthUser, async (req, res) => {
    const groupId = Number.parseInt(req.params.id, 10);
    const currentUserId = req.currentUser.id;
    if (!Number.isInteger(groupId) || groupId <= 0) {
        return res.status(400).json({ success: false, message: '无效的小组ID' });
    }

    try {
        const [result] = await pool.execute(
            'DELETE FROM group_members WHERE group_id = ? AND user_id = ?',
            [groupId, currentUserId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: '你不在该小组中或已退出' });
        }

        return res.json({ success: true, message: '已退出小组' });
    } catch (error) {
        console.error('退出小组失败:', error);
        return res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 获取小组成员列表
app.get('/api/groups/:id/members', requireAuthUser, async (req, res) => {
    const groupId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(groupId) || groupId <= 0) {
        return res.status(400).json({ success: false, message: '无效的小组ID' });
    }

    try {
        const [rows] = await pool.execute(
            `
                SELECT
                    gm.user_id AS id,
                    gm.group_id,
                    gm.role,
                    gm.joined_at,
                    u.username,
                    u.avatar,
                    u.email
                FROM group_members gm
                INNER JOIN users u ON u.id = gm.user_id
                WHERE gm.group_id = ?
                ORDER BY gm.joined_at ASC, gm.id ASC
            `,
            [groupId]
        );

        return res.json({
            success: true,
            members: rows
        });
    } catch (error) {
        console.error('获取小组成员失败:', error);
        return res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 组长移除成员（RBAC：仅组长可移除）
app.delete('/api/groups/:groupId/members/:userId', requireAuthUser, async (req, res) => {
    const groupId = Number.parseInt(req.params.groupId, 10);
    const targetUserId = Number.parseInt(req.params.userId, 10);
    const currentUserId = Number(req.currentUser?.id);

    if (!Number.isInteger(groupId) || groupId <= 0) {
        return res.status(400).json({ success: false, message: '无效的小组ID' });
    }
    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
        return res.status(400).json({ success: false, message: '无效的成员ID' });
    }

    try {
        // 第一步：权限校验，当前用户必须是该组组长（owner_id）
        const [groupRows] = await pool.execute(
            'SELECT id, owner_id FROM groups_table WHERE id = ? LIMIT 1',
            [groupId]
        );
        if (groupRows.length === 0) {
            return res.status(404).json({ success: false, message: '小组不存在' });
        }

        if (Number(groupRows[0].owner_id) !== currentUserId) {
            return res.status(403).json({ success: false, message: '仅组长可移除成员' });
        }

        if (targetUserId === currentUserId) {
            return res.status(400).json({ success: false, message: '组长不能移除自己' });
        }

        // 第二步：执行删除（从 group_members 中移除）
        const [result] = await pool.execute(
            'DELETE FROM group_members WHERE group_id = ? AND user_id = ?',
            [groupId, targetUserId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: '成员不存在或已被移除' });
        }

        return res.json({ success: true, message: '成员已移出小组' });
    } catch (error) {
        console.error('组长移除成员失败:', error);
        return res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 模糊搜索可邀请用户（稳健版：始终返回数组）
app.get('/api/search/users', async (req, res) => {
    const { query, groupId } = req.query || {};
    if (!query) {
        return res.json([]);
    }

    const searchTerm = `%${String(query).trim()}%`;
    const parsedGroupId = Number.parseInt(String(groupId ?? ''), 10);
    const safeGroupId = Number.isInteger(parsedGroupId) && parsedGroupId > 0 ? parsedGroupId : 0;

    const sql = `
        SELECT id, username, email, avatar
        FROM users
        WHERE (username LIKE ? OR email LIKE ?)
          AND (role IS NULL OR role != 'admin')
          AND username != 'admin'
          AND id NOT IN (
              SELECT user_id
              FROM group_members
              WHERE group_id = ?
          )
    `;

    try {
        const [results] = await pool.query(sql, [searchTerm, searchTerm, safeGroupId]);
        return res.json(Array.isArray(results) ? results : []);
    } catch (err) {
        console.error('[模糊搜索数据库报错]:', err);
        return res.json([]);
    }
});

// 邀请成员加入小组
app.post('/api/groups/:id/members', requireAuthUser, async (req, res) => {
    const groupId = Number.parseInt(req.params.id, 10);
    const currentUserId = req.currentUser.id;
    const rawUserId = req.body?.user_id;
    const selectedUserId =
        Number.isInteger(rawUserId)
            ? rawUserId
            : Number.parseInt(typeof rawUserId === 'string' ? rawUserId : '', 10);
    const hasSelectedUserId = Number.isInteger(selectedUserId) && selectedUserId > 0;
    const rawKeyword = typeof req.body?.username === 'string' ? req.body.username : '';
    const keyword = rawKeyword.trim();

    if (!Number.isInteger(groupId) || groupId <= 0) {
        return res.status(400).json({ success: false, message: '无效的小组ID' });
    }

    if (!hasSelectedUserId && !keyword) {
        return res.status(400).json({ success: false, message: '请选择要邀请的用户' });
    }

    try {
        const [groupRows] = await pool.execute(
            'SELECT id, owner_id, name FROM groups_table WHERE id = ? LIMIT 1',
            [groupId]
        );
        if (groupRows.length === 0) {
            return res.status(400).json({ success: false, message: '小组不存在' });
        }

        if (Number(groupRows[0].owner_id) !== Number(currentUserId)) {
            return res.status(403).json({ success: false, message: '仅组长可邀请成员' });
        }

        const [userRows] = hasSelectedUserId
            ? await pool.execute(
                'SELECT id, username, email, avatar FROM users WHERE id = ? LIMIT 1',
                [selectedUserId]
            )
            : await pool.execute(
                'SELECT id, username, email, avatar FROM users WHERE username = ? OR email = ? LIMIT 1',
                [keyword, keyword.toLowerCase()]
            );
        if (userRows.length === 0) {
            return res.status(400).json({ success: false, message: '该用户不存在' });
        }

        const targetUser = userRows[0];
        if (Number(targetUser.id) === Number(currentUserId)) {
            return res.status(400).json({ success: false, message: '不能邀请自己加入小组' });
        }

        const [memberRows] = await pool.execute(
            'SELECT id FROM group_members WHERE group_id = ? AND user_id = ? LIMIT 1',
            [groupId, targetUser.id]
        );
        if (memberRows.length > 0) {
            return res.status(400).json({ success: false, message: '该用户已在小组中' });
        }

        const [pendingInviteRows] = await pool.execute(
            `
                SELECT id
                FROM notifications
                WHERE user_id = ?
                  AND group_id = ?
                  AND type = 'invite'
                  AND status = 'pending'
                LIMIT 1
            `,
            [targetUser.id, groupId]
        );
        if (pendingInviteRows.length > 0) {
            return res.status(400).json({ success: false, message: '该用户已有待处理邀请' });
        }

        await pool.execute(
            'INSERT INTO notifications (user_id, sender_id, group_id, type, status, message) VALUES (?, ?, ?, ?, ?, ?)',
            [
                targetUser.id,
                currentUserId,
                groupId,
                'invite',
                'pending',
                `${req.currentUser.username || '某用户'} 邀请你加入小组${groupRows[0].name ? `「${groupRows[0].name}」` : ''}`
            ]
        );

        return res.status(201).json({
            success: true,
            message: '邀请已发送，等待对方确认'
        });
    } catch (error) {
        console.error('邀请成员失败:', error);
        return res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 获取当前用户的消息通知
app.get('/api/notifications', requireAuthUser, async (req, res) => {
    const currentUserId = req.currentUser.id;

    try {
        const [rows] = await pool.execute(
            `
                SELECT
                    n.id,
                    n.user_id,
                    n.sender_id,
                    n.group_id,
                    n.type,
                    n.status,
                    n.message,
                    n.is_read,
                    n.created_at,
                    sender.username AS sender_username,
                    sender.avatar AS sender_avatar,
                    g.name AS group_name
                FROM notifications n
                LEFT JOIN users sender ON sender.id = n.sender_id
                LEFT JOIN groups_table g ON g.id = n.group_id
                WHERE n.user_id = ?
                ORDER BY n.is_read ASC, n.created_at DESC, n.id DESC
            `,
            [currentUserId]
        );

        const unreadCount = rows.reduce((count, item) => {
            return Number(item.is_read) === 0 ? count + 1 : count;
        }, 0);

        return res.json({
            success: true,
            notifications: rows,
            pendingCount: unreadCount,
            unreadCount
        });
    } catch (error) {
        console.error('获取消息通知失败:', error);
        return res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 将当前用户消息全部标记为已读
app.put('/api/notifications/mark-read', requireAuthUser, async (req, res) => {
    const currentUserId = req.currentUser.id;

    try {
        await pool.execute(
            'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
            [currentUserId]
        );

        return res.json({
            success: true,
            unreadCount: 0
        });
    } catch (error) {
        console.error('标记消息已读失败:', error);
        return res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 处理消息通知（accept/reject）
app.post('/api/notifications/:id/respond', requireAuthUser, async (req, res) => {
    const notificationId = Number.parseInt(req.params.id, 10);
    const action = typeof req.body?.action === 'string' ? req.body.action.trim().toLowerCase() : '';
    const currentUserId = req.currentUser.id;

    if (!Number.isInteger(notificationId) || notificationId <= 0) {
        return res.status(400).json({ success: false, message: '无效的通知ID' });
    }

    if (!['accept', 'reject'].includes(action)) {
        return res.status(400).json({ success: false, message: '无效的处理动作，仅支持 accept 或 reject' });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [rows] = await connection.execute(
            `
                SELECT
                    n.id,
                    n.user_id,
                    n.group_id,
                    n.type,
                    n.status,
                    n.message,
                    n.sender_id,
                    g.name AS group_name
                FROM notifications n
                LEFT JOIN groups_table g ON g.id = n.group_id
                WHERE n.id = ?
                LIMIT 1
                FOR UPDATE
            `,
            [notificationId]
        );

        if (rows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: '通知不存在或已失效' });
        }

        const notification = rows[0];
        const actorName = req.currentUser.username || '该用户';
        const groupName = notification.group_name || `ID为 ${notification.group_id} 的小组`;
        if (Number(notification.user_id) !== Number(currentUserId)) {
            await connection.rollback();
            return res.status(403).json({ success: false, message: '无权处理该通知' });
        }

        if (notification.type !== 'invite') {
            await connection.rollback();
            return res.status(400).json({ success: false, message: '暂不支持该类型通知' });
        }

        if (notification.status !== 'pending') {
            await connection.rollback();
            return res.status(400).json({ success: false, message: '该邀请已处理过' });
        }

        if (action === 'reject') {
            await connection.execute(
                'UPDATE notifications SET status = ? WHERE id = ?',
                ['rejected', notificationId]
            );
            await connection.execute(
                `
                    INSERT INTO notifications (user_id, sender_id, group_id, type, status, message)
                    VALUES (?, ?, ?, ?, ?, ?)
                `,
                [
                    notification.sender_id,
                    currentUserId,
                    notification.group_id,
                    'invite_result',
                    'rejected',
                    `${actorName} 拒绝了你发往「${groupName}」的小组邀请`
                ]
            );
            await connection.commit();
            return res.json({ success: true, status: 'rejected', message: '已拒绝邀请' });
        }

        await connection.execute(
            'UPDATE notifications SET status = ? WHERE id = ?',
            ['accepted', notificationId]
        );
        await connection.execute(
            `
                INSERT INTO group_members (group_id, user_id, role)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE role = role
            `,
            [notification.group_id, currentUserId, 'member']
        );
        await connection.execute(
            `
                INSERT INTO notifications (user_id, sender_id, group_id, type, status, message)
                VALUES (?, ?, ?, ?, ?, ?)
            `,
            [
                notification.sender_id,
                currentUserId,
                notification.group_id,
                'invite_result',
                'accepted',
                `${actorName} 同意了你的邀请，已加入「${groupName}」`
            ]
        );

        await connection.commit();
        return res.json({
            success: true,
            status: 'accepted',
            message: notification.group_name
                ? `已加入小组：${notification.group_name}`
                : '已接受邀请并加入小组'
        });
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error('处理通知失败:', error);
        return res.status(500).json({ success: false, message: '服务器错误' });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// 删除通知（当前登录用户只能删除自己的通知）
app.delete('/api/notifications/:id', requireAuthUser, async (req, res) => {
    const notificationId = Number.parseInt(req.params.id, 10);
    const currentUserId = req.currentUser.id;

    if (!Number.isInteger(notificationId) || notificationId <= 0) {
        return res.status(400).json({ success: false, message: '无效的通知ID' });
    }

    try {
        const [result] = await pool.execute(
            'DELETE FROM notifications WHERE id = ? AND user_id = ?',
            [notificationId, currentUserId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: '通知不存在或无权删除' });
        }

        return res.json({ success: true, message: '通知已删除' });
    } catch (error) {
        console.error('删除通知失败:', error);
        return res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 获取小组讨论列表
app.get('/api/groups/:id/discussions', requireAuthUser, async (req, res) => {
    const groupId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(groupId) || groupId <= 0) {
        return res.status(400).json({ success: false, message: '无效的小组ID' });
    }

    try {
        const [rows] = await pool.execute(
            `
                SELECT
                    d.id,
                    d.group_id,
                    d.user_id,
                    d.content,
                    d.created_at,
                    u.username,
                    u.avatar
                FROM discussions d
                INNER JOIN users u ON u.id = d.user_id
                WHERE d.group_id = ?
                ORDER BY d.created_at ASC, d.id ASC
            `,
            [groupId]
        );

        return res.json({
            success: true,
            discussions: rows
        });
    } catch (error) {
        console.error('获取小组讨论失败:', error);
        return res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 发送小组讨论消息
app.post('/api/groups/:id/discussions', requireAuthUser, async (req, res) => {
    const groupId = Number.parseInt(req.params.id, 10);
    const userId = req.currentUser.id;
    const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';

    if (!Number.isInteger(groupId) || groupId <= 0) {
        return res.status(400).json({ success: false, message: '无效的小组ID' });
    }

    if (!content) {
        return res.status(400).json({ success: false, message: '消息内容不能为空' });
    }

    try {
        const [groupRows] = await pool.execute(
            'SELECT id, owner_id FROM groups_table WHERE id = ? LIMIT 1',
            [groupId]
        );
        if (groupRows.length === 0) {
            return res.status(404).json({ success: false, message: '小组不存在' });
        }

        const [memberRows] = await pool.execute(
            'SELECT id FROM group_members WHERE group_id = ? AND user_id = ? LIMIT 1',
            [groupId, userId]
        );

        if (memberRows.length === 0) {
            const role = groupRows[0].owner_id === userId ? '组长' : '成员';
            await pool.execute(
                'INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)',
                [groupId, userId, role]
            );
        }

        const [insertResult] = await pool.execute(
            'INSERT INTO discussions (group_id, user_id, content) VALUES (?, ?, ?)',
            [groupId, userId, content]
        );

        const [rows] = await pool.execute(
            `
                SELECT
                    d.id,
                    d.group_id,
                    d.user_id,
                    d.content,
                    d.created_at,
                    u.username,
                    u.avatar
                FROM discussions d
                INNER JOIN users u ON u.id = d.user_id
                WHERE d.id = ?
                LIMIT 1
            `,
            [insertResult.insertId]
        );

        const savedMessage = rows[0];
        io.to(String(groupId)).emit('new_message', savedMessage);

        return res.json({
            success: true,
            discussion: savedMessage
        });
    } catch (error) {
        console.error('发送讨论消息失败:', error);
        return res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 获取小组资料共享列表
app.get('/api/groups/:id/shared-files', requireAuthUser, async (req, res) => {
    const groupId = Number.parseInt(req.params.id, 10);
    const userId = req.currentUser.id;
    if (!Number.isInteger(groupId) || groupId <= 0) {
        return res.status(400).json({ success: false, message: '无效的小组ID' });
    }

    try {
        const access = await getGroupAccess(groupId, userId);
        if (!access.exists) {
            return res.status(404).json({ success: false, message: '小组不存在' });
        }
        if (!access.isMember) {
            return res.status(403).json({ success: false, message: '无权访问该小组资料' });
        }

        const [rows] = await pool.execute(
            `
                SELECT
                    sf.id,
                    sf.group_id,
                    sf.user_id,
                    sf.file_name,
                    sf.file_url,
                    sf.created_at,
                    u.username,
                    u.avatar
                FROM shared_files sf
                INNER JOIN users u ON u.id = sf.user_id
                WHERE sf.group_id = ?
                ORDER BY sf.created_at DESC, sf.id DESC
            `,
            [groupId]
        );

        return res.json({
            success: true,
            files: rows
        });
    } catch (error) {
        console.error('获取共享资料失败:', error);
        return res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 新增小组资料
app.post('/api/groups/:id/shared-files', requireAuthUser, async (req, res) => {
    const groupId = Number.parseInt(req.params.id, 10);
    const userId = req.currentUser.id;
    const fileName = typeof req.body?.file_name === 'string' ? req.body.file_name.trim() : '';
    const fileUrl = typeof req.body?.file_url === 'string' ? req.body.file_url.trim() : '';

    if (!Number.isInteger(groupId) || groupId <= 0) {
        return res.status(400).json({ success: false, message: '无效的小组ID' });
    }
    if (!fileName) {
        return res.status(400).json({ success: false, message: '资料名称不能为空' });
    }
    if (!fileUrl) {
        return res.status(400).json({ success: false, message: '资料链接不能为空' });
    }

    try {
        const access = await getGroupAccess(groupId, userId);
        if (!access.exists) {
            return res.status(404).json({ success: false, message: '小组不存在' });
        }
        if (!access.isMember) {
            return res.status(403).json({ success: false, message: '无权向该小组分享资料' });
        }

        const [insertResult] = await pool.execute(
            'INSERT INTO shared_files (group_id, user_id, file_name, file_url) VALUES (?, ?, ?, ?)',
            [groupId, userId, fileName, fileUrl]
        );

        const [rows] = await pool.execute(
            `
                SELECT
                    sf.id,
                    sf.group_id,
                    sf.user_id,
                    sf.file_name,
                    sf.file_url,
                    sf.created_at,
                    u.username,
                    u.avatar
                FROM shared_files sf
                INNER JOIN users u ON u.id = sf.user_id
                WHERE sf.id = ?
                LIMIT 1
            `,
            [insertResult.insertId]
        );

        return res.status(201).json({
            success: true,
            file: rows[0]
        });
    } catch (error) {
        console.error('新增共享资料失败:', error);
        return res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 上传小组文件（multer）
app.post('/api/groups/:groupId/files', requireAuthUser, requireExistingGroupMemberBeforeUpload, upload.single('file'), async (req, res) => {
    const groupId = Number.parseInt(req.params.groupId, 10);
    const uploaderId = req.currentUser.id;

    if (!Number.isInteger(groupId) || groupId <= 0) {
        return res.status(400).json({ success: false, message: '无效的小组ID' });
    }
    if (!req.file) {
        return res.status(400).json({ success: false, message: '未检测到上传文件' });
    }

    try {
        const savedFileName = req.file.filename;
        const originalFileName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
        const fileSize = Number(req.file.size) || 0;
        const fileUrl = `/uploads/${savedFileName}`;

        const [insertResult] = await pool.execute(
            `
                INSERT INTO group_files (group_id, uploader_id, file_name, file_url, file_size)
                VALUES (?, ?, ?, ?, ?)
            `,
            [groupId, uploaderId, originalFileName, fileUrl, fileSize]
        );

        return res.status(200).json({
            success: true,
            file: {
                id: insertResult.insertId,
                group_id: groupId,
                uploader_id: uploaderId,
                file_name: originalFileName,
                file_url: fileUrl,
                file_size: fileSize
            }
        });
    } catch (error) {
        console.error('上传小组文件失败:', error);
        return res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 获取小组文件列表（group_files）
app.get('/api/groups/:groupId/files', requireAuthUser, async (req, res) => {
    const groupId = Number.parseInt(req.params.groupId, 10);
    if (!Number.isInteger(groupId) || groupId <= 0) {
        return res.status(400).json({ success: false, message: '无效的小组ID' });
    }

    try {
        const access = await getGroupAccess(groupId, req.currentUser.id);
        if (!access.exists) {
            return res.status(404).json({ success: false, message: '小组不存在' });
        }
        if (!access.isMember) {
            return res.status(403).json({ success: false, message: '无权访问该小组文件' });
        }

        const [rows] = await pool.execute(
            `
                SELECT
                    gf.id,
                    gf.group_id,
                    gf.uploader_id,
                    gf.file_name,
                    gf.file_url,
                    gf.file_size,
                    gf.created_at,
                    u.username
                FROM group_files gf
                LEFT JOIN users u ON gf.uploader_id = u.id
                WHERE gf.group_id = ?
                ORDER BY gf.created_at DESC, gf.id DESC
            `,
            [groupId]
        );

        return res.status(200).json({
            success: true,
            files: rows
        });
    } catch (error) {
        console.error('获取小组文件列表失败:', error);
        return res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 删除小组文件（删除磁盘文件 + 删除数据库记录）
app.delete('/api/groups/:groupId/files/:fileId', requireAuthUser, async (req, res) => {
    const groupId = Number.parseInt(req.params.groupId, 10);
    const fileId = Number.parseInt(req.params.fileId, 10);
    const currentUserId = req.currentUser.id;

    if (!Number.isInteger(groupId) || groupId <= 0) {
        return res.status(400).json({ success: false, message: '无效的小组ID' });
    }
    if (!Number.isInteger(fileId) || fileId <= 0) {
        return res.status(400).json({ success: false, message: '无效的文件ID' });
    }

    try {
        // 第一步：查询文件归属并校验当前用户权限
        const [fileRows] = await pool.execute(
            `
                SELECT gf.file_url, gf.uploader_id, g.owner_id
                FROM group_files gf
                INNER JOIN groups_table g ON g.id = gf.group_id
                WHERE gf.id = ? AND gf.group_id = ?
                LIMIT 1
            `,
            [fileId, groupId]
        );

        if (fileRows.length === 0) {
            return res.status(404).json({ success: false, message: '文件不存在' });
        }

        const access = await getGroupAccess(groupId, currentUserId);
        if (!access.isMember) {
            return res.status(403).json({ success: false, message: '无权删除该小组文件' });
        }

        const targetFile = fileRows[0];
        const isUploader = Number(targetFile.uploader_id) === Number(currentUserId);
        if (!isUploader && !access.isOwner) {
            return res.status(403).json({ success: false, message: '只能删除自己上传的文件' });
        }

        const fileUrl = typeof targetFile.file_url === 'string' ? targetFile.file_url : '';
        const fileName = path.basename(fileUrl);

        // 第二步：删除本地硬盘文件（即使文件不存在也不中断）
        if (fileName) {
            const absoluteFilePath = path.join(__dirname, 'uploads', fileName);
            try {
                fs.unlinkSync(absoluteFilePath);
            } catch (unlinkError) {
                console.warn('物理文件删除失败（忽略，继续删除数据库记录）:', unlinkError.message);
            }
        }

        // 第三步：删除数据库记录
        await pool.execute(
            'DELETE FROM group_files WHERE id = ?',
            [fileId]
        );

        return res.status(200).json({
            success: true,
            message: '文件删除成功'
        });
    } catch (error) {
        console.error('删除小组文件失败:', error);
        return res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 删除共享资料（仅上传者本人或组长可删除）
app.delete('/api/shared_files/:id', requireAuthUser, async (req, res) => {
    const fileId = Number.parseInt(req.params.id, 10);
    const currentUserId = req.currentUser.id;
    if (!Number.isInteger(fileId) || fileId <= 0) {
        return res.status(400).json({ success: false, message: '无效的资料ID' });
    }

    try {
        const [rows] = await pool.execute(
            `
                SELECT
                    sf.id,
                    sf.group_id,
                    sf.user_id,
                    g.owner_id
                FROM shared_files sf
                INNER JOIN groups_table g ON g.id = sf.group_id
                WHERE sf.id = ?
                LIMIT 1
            `,
            [fileId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: '资料不存在' });
        }

        const targetFile = rows[0];
        const isUploader = Number(targetFile.user_id) === Number(currentUserId);
        const isGroupOwner = Number(targetFile.owner_id) === Number(currentUserId);
        if (!isUploader && !isGroupOwner) {
            return res.status(403).json({ success: false, message: '无权删除该资料' });
        }

        const [result] = await pool.execute('DELETE FROM shared_files WHERE id = ?', [fileId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: '资料不存在' });
        }

        return res.json({ success: true, message: '资料删除成功' });
    } catch (error) {
        console.error('删除共享资料失败:', error);
        return res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 获取小组详情接口
app.get('/api/groups/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // 尝试将id转换为数字
        const groupId = parseInt(id, 10);
        
        // 验证id是否有效
        if (isNaN(groupId) || groupId <= 0) {
            return res.json({ 
                success: false, 
                message: '无效的小组ID',
                details: `提供的ID "${id}" 不是有效的数字` 
            });
        }
        
        const [rows] = await pool.execute('SELECT * FROM groups_table WHERE id = ?', [groupId]);
        if (rows.length > 0) {
            res.json({ success: true, group: rows[0] });
        } else {
            res.json({ 
                success: false, 
                message: '小组不存在',
                details: `未找到ID为 ${groupId} 的小组` 
            });
        }
    } catch (error) {
        console.error('获取小组详情失败:', error);
        res.json({ 
            success: false, 
            message: '服务器错误',
            details: error.message 
        });
    }
});

server.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});

