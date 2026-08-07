const { Pool } = require('pg');
const config = require('./config');

const pool = new Pool({
  connectionString: config.db.connectionString,
  ssl: config.db.ssl ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000
});

const query = async (sql, params = []) => {
  const result = await pool.query(sql, params);
  return result.rows;
};

const auditLog = async (userId, caseId, action, details) => {
  try {
    await query(
      'INSERT INTO audit_log (user_id, case_id, action, details, created_at) VALUES ($1, $2, $3, $4, now())',
      [userId || null, caseId || null, action, details || '']
    );
  } catch (error) {
    console.error('Audit log error:', error);
  }
};

module.exports = { pool, query, auditLog };
