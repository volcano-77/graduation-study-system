import mysql from 'mysql2/promise';

// Node.js 20.12+ can load local environment variables without an extra package.
// A missing .env file is acceptable when variables are supplied by the host.
if (typeof process.loadEnvFile === 'function') {
    try {
        process.loadEnvFile();
    } catch (error) {
        if (error?.code !== 'ENOENT') {
            throw error;
        }
    }
}

const DB_HOST = process.env.DB_HOST?.trim() || 'localhost';
const DB_USER = process.env.DB_USER?.trim() || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD ?? '';
const DB_NAME = process.env.DB_NAME?.trim() || 'my_study_system';

if (!/^[A-Za-z0-9_]+$/.test(DB_NAME)) {
    throw new Error('DB_NAME 只能包含字母、数字和下划线');
}

// 创建数据库连接池
const pool = mysql.createPool({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// 测试数据库连接并创建数据库（如果不存在）
async function testConnection() {
    try {
        // 先尝试连接到MySQL服务器
        const connection = await pool.getConnection();
        console.log('数据库连接成功');
        connection.release();
    } catch (error) {
        console.error('数据库连接失败:', error);
        // 如果是数据库不存在的错误，尝试创建数据库
        if (error.code === 'ER_BAD_DB_ERROR') {
            try {
                // 创建一个不带数据库名的连接
                const tempPool = mysql.createPool({
                    host: DB_HOST,
                    user: DB_USER,
                    password: DB_PASSWORD,
                    waitForConnections: true,
                    connectionLimit: 10,
                    queueLimit: 0
                });
                const tempConnection = await tempPool.getConnection();
                // 创建数据库
                await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
                console.log('数据库创建成功');
                tempConnection.release();
                tempPool.end();
                // 重新测试连接
                const connection = await pool.getConnection();
                console.log('数据库连接成功');
                connection.release();
            } catch (createError) {
                console.error('创建数据库失败:', createError);
            }
        }
    }
}

testConnection();

export default pool;
