const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { query, auditLog } = require('../db');

const router = express.Router();

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const contacts = await query(
      'SELECT * FROM contacts WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.userId]
    );
    res.json({ contacts });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({ error: 'Error fetching contacts' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, phone, email, relation } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }

    const result = await query(
      `INSERT INTO contacts (user_id, name, phone, email, relation, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, now(), now()) RETURNING id`,
      [req.user.userId, name, phone, email || '', relation || '']
    );

    await auditLog(req.user.userId, null, 'CONTACT_ADDED', `Contact added: ${name} (${phone})`);

    const newContact = {
      id: result[0].id,
      user_id: req.user.userId,
      name,
      phone,
      email: email || '',
      relation: relation || ''
    };

    res.status(201).json({ message: 'Contact added successfully', contact: newContact });
  } catch (error) {
    console.error('Add contact error:', error);
    res.status(500).json({ error: 'Error adding contact' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, phone, email, relation } = req.body;

    const existing = await query(
      'SELECT * FROM contacts WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    await query(
      'UPDATE contacts SET name = $1, phone = $2, email = $3, relation = $4, updated_at = now() WHERE id = $5 AND user_id = $6',
      [name || existing[0].name, phone || existing[0].phone, email !== undefined ? email : existing[0].email, relation !== undefined ? relation : existing[0].relation, req.params.id, req.user.userId]
    );

    await auditLog(req.user.userId, null, 'CONTACT_UPDATED', `Contact updated: ${name || existing[0].name}`);

    res.json({ message: 'Contact updated successfully' });
  } catch (error) {
    console.error('Update contact error:', error);
    res.status(500).json({ error: 'Error updating contact' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const existing = await query(
      'SELECT * FROM contacts WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    await query(
      'DELETE FROM contacts WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    );

    await auditLog(req.user.userId, null, 'CONTACT_DELETED', `Contact deleted: ${existing[0].name}`);

    res.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({ error: 'Error deleting contact' });
  }
});

module.exports = router;