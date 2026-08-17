const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware } = require('../middleware/auth');
const { query, auditLog } = require('../db');
const { supabase, MEDIA_BUCKET } = require('../supabase');
const { emitNewCase, emitCaseUpdated } = require('../socket');
const emailService = require('../services/email');

const router = express.Router();

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(os.tmpdir(), 'zelda-uploads');
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      cb(null, `${uuidv4()}-${Date.now()}`);
    }
  }),
  limits: { fileSize: 200 * 1024 * 1024 },
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

const extname = (mimetype) => {
  if (mimetype.startsWith('video/')) {
    if (mimetype.includes('mp4')) return '.mp4';
    if (mimetype.includes('quicktime')) return '.mov';
    return '.webm';
  }
  if (mimetype.startsWith('audio/')) return '.webm';
  return '.bin';
};

const uploadMedia = async (file) => {
  if (!file) return null;
  if (!supabase) return null;
  const fileName = `${uuidv4()}${extname(file.mimetype)}`;
  const fileSize = file.size || 0;
  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(fileName, fs.createReadStream(file.path), {
      contentType: file.mimetype,
      upsert: false,
      duplex: fileSize > 0 ? 'half' : undefined
    });

  try {
    fs.unlink(file.path, () => {});
  } catch (_) {}

  if (error) throw error;

  const { data } = supabase.storage
    .from(MEDIA_BUCKET)
    .getPublicUrl(fileName);

  return data.publicUrl;
};

const notifySOS = async (caseForEmail, videoUrl, audioUrl, userId) => {
  try {
    const emailResult = await emailService.sendSOSAlert(caseForEmail, videoUrl, audioUrl);

    if (emailResult.success) {
      await auditLog(userId, caseForEmail.id, 'EMAIL_SENT', `SOS alert email sent to police: ${emailResult.messageId}`);
    } else {
      await auditLog(userId, caseForEmail.id, 'EMAIL_FAILED', `Failed to send SOS email: ${emailResult.error}`);
    }

    const contacts = await query(
      'SELECT * FROM contacts WHERE user_id = $1',
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

    if (req.user.role === 'police' || req.user.role === 'admin') {
      return res.status(403).json({ error: 'Police and admin accounts cannot create SOS cases' });
    }

    const videoFile = req.files?.video?.[0];
    const audioFile = req.files?.audio?.[0];

    const videoUrl = await uploadMedia(videoFile);
    const audioUrl = await uploadMedia(audioFile);

    const createdAt = new Date();
    const updatedAt = new Date();

    const result = await query(
      `INSERT INTO sos_cases (user_id, user_email, location_link, latitude, longitude, status, notes, video_url, audio_url, trigger_type, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
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

    const insertId = result[0].id;

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

    notifySOS(caseForEmail, videoUrl, audioUrl, req.user.userId);

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

router.get('/', authMiddleware, async (req, res) => {
  try {
    let cases;

    if (req.user.role === 'police' || req.user.role === 'admin') {
      cases = await query('SELECT * FROM sos_cases ORDER BY created_at DESC');
    } else {
      cases = await query('SELECT * FROM sos_cases WHERE user_id = $1 ORDER BY created_at DESC', [req.user.userId]);
    }

    res.json({ cases: cases.map(mapCase) });
  } catch (error) {
    console.error('Get cases error:', error);
    res.status(500).json({ error: 'Error fetching cases' });
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

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const cases = await query('SELECT * FROM sos_cases WHERE id = $1', [req.params.id]);
    const caseData = cases[0];

    if (!caseData) {
      return res.status(404).json({ error: 'Case not found' });
    }

    if (req.user.role !== 'police' && req.user.role !== 'admin' && caseData.user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ case: mapCase(caseData) });
  } catch (error) {
    console.error('Get case error:', error);
    res.status(500).json({ error: 'Error fetching case' });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'police' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only police and admin can update case status and notes' });
    }

    const { status, notes } = req.body;
    const updatedAt = new Date();

    const existingCases = await query('SELECT * FROM sos_cases WHERE id = $1', [req.params.id]);
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
      'UPDATE sos_cases SET status = $1, notes = $2, updated_at = $3 WHERE id = $4',
      [newStatus, notesUpdate, updatedAt, req.params.id]
    );

    const updatedCases = await query('SELECT * FROM sos_cases WHERE id = $1', [req.params.id]);

    const mappedCase = mapCase(updatedCases[0]);

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

    const existingCases = await query('SELECT * FROM sos_cases WHERE id = $1', [req.params.id]);
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
      'UPDATE sos_cases SET latitude = $1, longitude = $2, location_link = $3, updated_at = $4 WHERE id = $5',
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

module.exports = router;