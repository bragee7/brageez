const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware } = require('../middleware/auth');
const { query, auditLog } = require('../db');
const { emitNewCase, emitCaseUpdated } = require('../socket');
const emailService = require('../services/email');

const router = express.Router();
const uploadsDir = path.join(__dirname, '../uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMime = /^(video|audio)\//;
    if (allowedMime.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only video and audio files are allowed'));
    }
  }
});

const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  if (err) {
    return res.status(500).json({ error: `Upload error: ${err.message}` });
  }
  next();
};

const notifySOS = async (caseForEmail, videoFilePath, audioFilePath, userId) => {
  try {
    const emailResult = await emailService.sendSOSAlert(caseForEmail, videoFilePath, audioFilePath);

    if (emailResult.success) {
      await auditLog(userId, caseForEmail.id, 'EMAIL_SENT', `SOS alert email sent to police: ${emailResult.messageId}`);
    } else {
      await auditLog(userId, caseForEmail.id, 'EMAIL_FAILED', `Failed to send SOS email: ${emailResult.error}`);
    }

    const contacts = await query(
      'SELECT * FROM `contacts table` WHERE user_id = ?',
      [userId]
    );

    for (const contact of contacts) {
      if (contact.email) {
        const contactResult = await emailService.sendContactSOSAlert(caseForEmail, contact);
        if (contactResult.success) {
          await auditLog(userId, caseForEmail.id, 'CONTACT_EMAIL_SENT', `SOS alert sent to contact: ${contact.name} (${contact.email})`);
        } else {
          await auditLog(userId, caseForEmail.id, 'CONTACT_EMAIL_FAILED', `Failed to send SOS to contact: ${contact.name} - ${contactResult.error}`);
        }
      }
    }
  } catch (error) {
    console.error('SOS notification error:', error);
  }
};

router.post('/', authMiddleware, (req, res, next) => {
  upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'audio', maxCount: 1 }
  ])(req, res, (err) => {
    if (err) return handleMulterError(err, req, res, next);
    next();
  });
}, async (req, res) => {
  try {
    const { locationLink, latitude, longitude, notes } = req.body;
    
    const latValue = latitude && latitude.trim() ? String(latitude).trim() : null;
    const lngValue = longitude && longitude.trim() ? String(longitude).trim() : null;
    const locValue = locationLink && locationLink.trim() ? String(locationLink).trim() : null;
    
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const videoFile = req.files?.video?.[0];
    const audioFile = req.files?.audio?.[0];

    const videoUrl = videoFile ? `/uploads/${videoFile.filename}` : null;
    const audioUrl = audioFile ? `/uploads/${audioFile.filename}` : null;
    const createdAt = new Date();
    const updatedAt = new Date();

    const result = await query(
      `INSERT INTO \`sos cases table\` (user_id, user_email, location_link, latitude, longitude, status, notes, video_url, audio_url, trigger_type, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.userId,
        req.user.email,
        locValue,
        latValue,
        lngValue,
        'Pending',
        notes || '',
        videoUrl,
        audioUrl,
        'manual',
        createdAt,
        updatedAt
      ]
    );

    const insertId = result.insertId;

    await auditLog(req.user.userId, insertId, 'SOS_CREATED', `SOS alert created by user ${req.user.email}`);

    const caseForEmail = {
      id: insertId,
      user_id: req.user.userId,
      user_email: req.user.email,
      location_link: locationLink || null,
      status: 'Pending',
      notes: notes || '',
      created_at: createdAt
    };

    const videoFilePath = videoFile ? path.join(uploadsDir, videoFile.filename) : null;
    const audioFilePath = audioFile ? path.join(uploadsDir, audioFile.filename) : null;

    notifySOS(caseForEmail, videoFilePath, audioFilePath, req.user.userId);

    const newCase = {
      id: insertId,
      user_id: req.user.userId,
      user_email: req.user.email,
      location_link: locationLink || null,
      status: 'Pending',
      notes: notes || '',
      video_url: videoUrl,
      audio_url: audioUrl,
      created_at: createdAt,
      updated_at: updatedAt
    };

    emitNewCase(newCase);

    res.status(201).json({
      message: 'SOS case created successfully',
      case: newCase
    });
  } catch (error) {
    console.error('Create case error:', error);
    res.status(500).json({ error: 'Error creating SOS case' });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    let cases;
    
    if (req.user.role === 'police') {
      cases = await query('SELECT * FROM `sos cases table` ORDER BY created_at DESC');
    } else {
      cases = await query('SELECT * FROM `sos cases table` WHERE user_id = ? ORDER BY created_at DESC', [req.user.userId]);
    }

    const mappedCases = cases.map(c => ({
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
    }));

    res.json({ cases: mappedCases });
  } catch (error) {
    console.error('Get cases error:', error);
    res.status(500).json({ error: 'Error fetching cases' });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const cases = await query('SELECT * FROM `sos cases table` WHERE id = ?', [req.params.id]);
    const caseData = cases[0];
    
    if (!caseData) {
      return res.status(404).json({ error: 'Case not found' });
    }

    if (req.user.role !== 'police' && caseData.user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const mappedCase = {
      id: caseData.id,
      userId: caseData.user_id,
      userEmail: caseData.user_email,
      locationLink: caseData.location_link,
      latitude: caseData.latitude,
      longitude: caseData.longitude,
      status: caseData.status,
      notes: caseData.notes,
      videoUrl: caseData.video_url,
      audioUrl: caseData.audio_url,
      triggerType: caseData.trigger_type,
      timestamp: caseData.created_at,
      createdAt: caseData.created_at,
      updatedAt: caseData.updated_at
    };

    res.json({ case: mappedCase });
  } catch (error) {
    console.error('Get case error:', error);
    res.status(500).json({ error: 'Error fetching case' });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { status, notes } = req.body;
    const updatedAt = new Date();

    const existingCases = await query('SELECT * FROM `sos cases table` WHERE id = ?', [req.params.id]);
    const existingCase = existingCases[0];
    
    if (!existingCase) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const oldStatus = existingCase.status;
    let newStatus = oldStatus;
    let notesUpdate = existingCase.notes;

    if (status) {
      newStatus = status;
      if (oldStatus !== status) {
        await auditLog(req.user.userId, existingCase.id, 'CASE_STATUS_CHANGED', `Status changed from ${oldStatus} to ${status}`);
      }
    }
    if (notes !== undefined) {
      notesUpdate = notes;
      await auditLog(req.user.userId, existingCase.id, 'CASE_NOTES_UPDATED', `Notes updated: ${notes}`);
    }

    await query(
      'UPDATE `sos cases table` SET status = ?, notes = ?, updated_at = ? WHERE id = ?',
      [newStatus, notesUpdate, updatedAt, req.params.id]
    );

    const updatedCases = await query('SELECT * FROM `sos cases table` WHERE id = ?', [req.params.id]);
    const updatedCase = updatedCases[0];

    const mappedCase = {
      id: updatedCase.id,
      userId: updatedCase.user_id,
      userEmail: updatedCase.user_email,
      locationLink: updatedCase.location_link,
      latitude: updatedCase.latitude,
      longitude: updatedCase.longitude,
      status: updatedCase.status,
      notes: updatedCase.notes,
      videoUrl: updatedCase.video_url,
      audioUrl: updatedCase.audio_url,
      timestamp: updatedCase.created_at,
      createdAt: updatedCase.created_at,
      updatedAt: updatedCase.updated_at
    };

    emitCaseUpdated(mappedCase);

    res.json({
      message: 'Case updated successfully',
      case: mappedCase
    });
  } catch (error) {
    console.error('Update case error:', error);
    res.status(500).json({ error: 'Error updating case' });
  }
});

router.put('/:id/location', authMiddleware, async (req, res) => {
  try {
    const { latitude, longitude, locationLink } = req.body;

    const existingCases = await query('SELECT * FROM `sos cases table` WHERE id = ?', [req.params.id]);
    const existingCase = existingCases[0];

    if (!existingCase) {
      return res.status(404).json({ error: 'Case not found' });
    }

    if (existingCase.user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (existingCase.status !== 'Pending') {
      return res.status(400).json({ error: 'Case is not active' });
    }

    const latValue = latitude && String(latitude).trim() ? String(latitude).trim() : existingCase.latitude;
    const lngValue = longitude && String(longitude).trim() ? String(longitude).trim() : existingCase.longitude;
    const locValue = locationLink && String(locationLink).trim() ? String(locationLink).trim() : existingCase.location_link;
    const updatedAt = new Date();

    await query(
      'UPDATE `sos cases table` SET latitude = ?, longitude = ?, location_link = ?, updated_at = ? WHERE id = ?',
      [latValue, lngValue, locValue, updatedAt, req.params.id]
    );

    res.json({
      message: 'Location updated',
      location: {
        latitude: latValue,
        longitude: lngValue,
        locationLink: locValue,
        updatedAt
      }
    });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ error: 'Error updating location' });
  }
});

router.get('/test-email', async (req, res) => {
  try {
    const result = await emailService.sendTestEmail();
    if (result.success) {
      res.json({ 
        status: 'success', 
        message: 'Email configuration is valid',
        config: {
          host: emailService.isEmailConfigured() ? 'configured' : 'not configured',
          policeEmail: require('../config').email.policeEmail
        }
      });
    } else {
      res.status(400).json({ 
        status: 'error', 
        message: result.error,
        config: {
          host: 'configured but invalid',
          policeEmail: require('../config').email.policeEmail
        }
      });
    }
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

module.exports = router;