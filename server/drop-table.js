import pool from './db.js';

async function dropGroupsTable() {
  try {
    await pool.execute('DROP TABLE IF EXISTS `groups`');
    console.log('成功删除 groups 表');
  } catch (error) {
    console.error('删除 groups 表失败:', error);
  } finally {
    await pool.end();
  }
}

dropGroupsTable();