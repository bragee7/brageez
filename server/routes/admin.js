const express = require('express');
const bcrypt = require('bcryptjs');
const { pool, query, auditLog } = require('../db');
const { authMiddleware, requireAdmin } = require('../middleware/auth');
const { supabase, MEDIA_BUCKET } = require('../supabase');
const { generateGuardianEmail } = require('./auth');

const router = express.Router();

router.use(authMiddleware);
router.use(requireAdmin);

const mapUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  personalEmail: u.personal_email,
  role: u.role,
  isVerified: u.is_verified,
  createdAt: u.created_at,
  updatedAt: u.updated_at
});

const mapCase = (c) => ({
  id: c.id,
  userId: c.user_id,
  userEmail: c.user_email,
  locationLink: c.location_link,
  latitude: c.latitude,
  longitude: c.longitude,
  status: c.status,
  notes: c.notes,
  videoUrl: c.video_url,
  audioUrl: c.audio_url,
  triggerType: c.trigger_type,
  timestamp: c.created_at,
  createdAt: c.created_at,
  updatedAt: c.updated_at
});

const deleteUserMedia = async (caseRows) => {
  if (!supabase) return;
  const fileNames = new Set();

  for (const c of caseRows) {
    for (const url of [c.video_url, c.audio_url]) {
      if (!url) continue;
      try {
        const clean = String(url).split('?')[0];
        const fileName = clean.split('/').pop();
        if (fileName) fileNames.add(fileName);
      } catch (_) {}
    }
  }

  if (fileNames.size === 0) return;

  await supabase.storage
    .from(MEDIA_BUCKET)
    .remove([...fileNames])
    .then(() => {})
    .catch((err) => console.error('Media deletion error:', err.message));
};

router.get('/stats/overview', async (req, res) => {
  try {
    const totalUsers = await query('SELECT COUNT(*)::int AS count FROM users');
    const totalCases = await query('SELECT COUNT(*)::int AS count FROM sos_cases');
    const pendingCases = await query("SELECT COUNT(*)::int AS count FROM sos_cases WHERE status = 'Pending'");
    const resolvedCases = await query("SELECT COUNT(*)::int AS count FROM sos_cases WHERE status = 'Resolved'");
    const casesToday = await query('SELECT COUNT(*)::int AS count FROM sos_cases WHERE created_at::date = CURRENT_DATE');
    const usersToday = await query('SELECT COUNT(*)::int AS count FROM users WHERE created_at::date = CURRENT_DATE');
    const totalContacts = await query('SELECT COUNT(*)::int AS count FROM contacts');
    const auditCount = await query('SELECT COUNT(*)::int AS count FROM audit_log');

    res.json({
      totalUsers: totalUsers[0].count,
      totalCases: totalCases[0].count,
      pendingCases: pendingCases[0].count,
      resolvedCases: resolvedCases[0].count,
      casesToday: casesToday[0].count,
      usersToday: usersToday[0].count,
      totalContacts: totalContacts[0].count,
      auditCount: auditCount[0].count
    });
  } catch (error) {
    console.error('Admin overview error:', error);
    res.status(500).json({ error: 'Error fetching stats' });
  }
});

router.get('/stats/registrations', async (req, res) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days) || 30, 1), 90);
    const rows = await query(
      `SELECT created_at::date AS day, COUNT(*)::int AS count
       FROM users
       WHERE created_at >= CURRENT_DATE - ($1::int - 1)
       GROUP BY created_at::date
       ORDER BY created_at::date ASC`,
      [days]
    );
    res.json({ days, series: rows });
  } catch (error) {
    console.error('Admin registrations error:', error);
    res.status(500).json({ error: 'Error fetching registration stats' });
  }
});

router.get('/stats/cases-by-day', async (req, res) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days) || 30, 1), 90);
    const rows = await query(
      `SELECT created_at::date AS day, COUNT(*)::int AS count
       FROM sos_cases
       WHERE created_at >= CURRENT_DATE - ($1::int - 1)
       GROUP BY created_at::date
       ORDER BY created_at::date ASC`,
      [days]
    );
    res.json({ days, series: rows });
  } catch (error) {
    console.error('Admin cases-by-day error:', error);
    res.status(500).json({ error: 'Error fetching case stats' });
  }
});

router.get('/stats/cases-by-user', async (req, res) => {
  try {
    const rows = await query(
      `SELECT u.id AS user_id, u.name, u.email, COUNT(c.id)::int AS case_count
       FROM users u
       LEFT JOIN sos_cases c ON c.user_id = u.id
       GROUP BY u.id, u.name, u.email
       ORDER BY case_count DESC, u.email ASC`
    );
    res.json({ users: rows });
  } catch (error) {
    console.error('Admin cases-by-user error:', error);
    res.status(500).json({ error: 'Error fetching case stats' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const rows = await query(
      `SELECT u.*, (SELECT COUNT(*)::int FROM sos_cases c WHERE c.user_id = u.id) AS case_count
       FROM users u
       ORDER BY u.created_at DESC`
    );
    res.json({ users: rows.map((u) => ({ ...mapUser(u), caseCount: u.case_count })) });
  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({ error: 'Error fetching users' });
  }
});

router.post('/users', async (req, res) => {
  try {
    const { name, personalEmail, password, role } = req.body;

    if (!name || !personalEmail || !password) {
      return res.status(400).json({ error: 'Name, personal email and password are required' });
    }

    const allowedRoles = ['user', 'police', 'admin'];
    const userRole = allowedRoles.includes(role) ? role : 'user';

    if (userRole === 'admin') {
      return res.status(400).json({ error: 'Admin accounts can only be created via the database' });
    }

    const existing = await query('SELECT * FROM users WHERE personal_email = $1', [personalEmail]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'This personal email is already registered' });
    }

    const guardianEmail = await generateGuardianEmail(name);
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await query(
      `INSERT INTO users (name, email, personal_email, password, role, created_at, updated_at, is_verified)
       VALUES ($1, $2, $3, $4, $5, now(), now(), true) RETURNING *`,
      [name, guardianEmail, personalEmail, hashedPassword, userRole]
    );

    const user = result[0];
    await auditLog(req.user.userId, null, 'ADMIN_USER_CREATED', `Admin ${req.user.email} created user ${guardianEmail} (role: ${userRole})`);

    res.status(201).json({ message: 'User created successfully', user: mapUser(user) });
  } catch (error) {
    console.error('Admin create user error:', error);
    res.status(500).json({ error: 'Error creating user' });
  }
});

router.delete('/users/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const users = await query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    const user = users[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ error: 'Cannot delete an admin account' });
    }

    const caseRows = await query('SELECT video_url, audio_url FROM sos_cases WHERE user_id = $1', [user.id]);

    let deletedCases = 0;
    let deletedContacts = 0;
    let deletedAudit = 0;
    let deletedUser = 0;

    await client.query('BEGIN');
    try {
      const casesRes = await client.query('DELETE FROM sos_cases WHERE user_id = $1', [user.id]);
      deletedCases = casesRes.rowCount;
      const contactsRes = await client.query('DELETE FROM contacts WHERE user_id = $1', [user.id]);
      deletedContacts = contactsRes.rowCount;
      const auditRes = await client.query('DELETE FROM audit_log WHERE user_id = $1', [user.id]);
      deletedAudit = auditRes.rowCount;
      const userRes = await client.query('DELETE FROM users WHERE id = $1', [user.id]);
      deletedUser = userRes.rowCount;
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }

    deleteUserMedia(caseRows);

    res.json({
      message: 'User deleted successfully',
      deleted: { user: deletedUser, cases: deletedCases, contacts: deletedContacts, auditLog: deletedAudit }
    });
  } catch (error) {
    console.error('Admin delete user error:', error);
    res.status(500).json({ error: 'Error deleting user' });
  } finally {
    client.release();
  }
});

router.get('/cases', async (req, res) => {
  try {
    const { status, limit } = req.query;
    let sql = 'SELECT * FROM sos_cases';
    const params = [];

    if (status && ['Pending', 'Resolved'].includes(status)) {
      params.push(status);
      sql += ` WHERE status = $${params.length}`;
    }

    sql += ' ORDER BY created_at DESC';

    if (limit) {
      params.push(Math.min(Math.max(parseInt(limit) || 100, 1), 500));
      sql += ` LIMIT $${params.length}`;
    }

    const rows = await query(sql, params);
    res.json({ cases: rows.map(mapCase) });
  } catch (error) {
    console.error('Admin cases error:', error);
    res.status(500).json({ error: 'Error fetching cases' });
  }
});

router.get('/cases/:id', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM sos_cases WHERE id = $1', [req.params.id]);
    const caseData = rows[0];

    if (!caseData) {
      return res.status(404).json({ error: 'Case not found' });
    }

    res.json({ case: mapCase(caseData) });
  } catch (error) {
    console.error('Admin get case error:', error);
    res.status(500).json({ error: 'Error fetching case' });
  }
});

router.put('/cases/:id', async (req, res) => {
  try {
    const { status, notes } = req.body;
    const existing = await query('SELECT * FROM sos_cases WHERE id = $1', [req.params.id]);
    const existingCase = existing[0];

    if (!existingCase) {
      return res.status(404).json({ error: 'Case not found' });
    }

    if (status && !['Pending', 'Resolved'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const oldStatus = existingCase.status;
    let newStatus = status || oldStatus;
    let notesUpdate = notes !== undefined ? notes : existingCase.notes;

    if (status && oldStatus !== status) {
      await auditLog(req.user.userId, existingCase.id, 'ADMIN_CASE_STATUS_CHANGED', `Admin ${req.user.email}: status changed from ${oldStatus} to ${status}`);
    }
    if (notes !== undefined && notes !== existingCase.notes) {
      await auditLog(req.user.userId, existingCase.id, 'ADMIN_CASE_NOTES_UPDATED', `Admin ${req.user.email}: notes updated`);
    }

    await query(
      'UPDATE sos_cases SET status = $1, notes = $2, updated_at = now() WHERE id = $3',
      [newStatus, notesUpdate, req.params.id]
    );

    const updated = await query('SELECT * FROM sos_cases WHERE id = $1', [req.params.id]);
    res.json({ message: 'Case updated successfully', case: mapCase(updated[0]) });
  } catch (error) {
    console.error('Admin update case error:', error);
    res.status(500).json({ error: 'Error updating case' });
  }
});

router.get('/audit-log', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 200, 1), 1000);
    const rows = await query(
      `SELECT a.id, a.user_id, a.case_id, a.action, a.details, a.created_at,
              u.email AS user_email, u.name AS user_name
       FROM audit_log a
       LEFT JOIN users u ON u.id = a.user_id
       ORDER BY a.created_at DESC
       LIMIT $1`,
      [limit]
    );
    res.json({ entries: rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      caseId: r.case_id,
      action: r.action,
      details: r.details,
      createdAt: r.created_at,
      userEmail: r.user_email,
      userName: r.user_name
    })) });
  } catch (error) {
    console.error('Admin audit-log error:', error);
    res.status(500).json({ error: 'Error fetching audit log' });
  }
});

module.exports = router;
