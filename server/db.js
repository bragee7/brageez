const mysql = require('mysql2/promise');
const config = require('./config');

const pool = mysql.createPool({
  host: config.db.host,
  port: Number(config.db.port),
  user: config.db.user,
  password: config.db.password,
  database: config.db.name,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: 'Z',
  dateStrings: false
});

const query = async (sql, params = []) => {
  const [rows] = await pool.execute(sql, params);
  if (Array.isArray(rows)) return rows;
  return rows;
};

const auditLog = async (userId, caseId, action, details) => {
  try {
    await query(
      'INSERT INTO `audit log table` (user_id, case_id, Action, details, created_at) VALUES (?, ?, ?, ?, NOW())',
      [userId || null, caseId || null, action, details || '']
    );
  } catch (error) {
    console.error('Audit log error:', error);
  }
};

module.exports = { pool, query, auditLog };
