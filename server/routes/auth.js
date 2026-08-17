const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query, auditLog } = require('../db');
const { JWT_SECRET, authMiddleware } = require('../middleware/auth');
const emailService = require('../services/email');

const router = express.Router();

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const OTP_EXPIRY_MINUTES = 5;

const generateGuardianEmail = async (name) => {
  let base = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!base || base.length < 3) base = 'user';

  let guardianEmail = base + '@guardian.com';
  const existing = await query('SELECT * FROM users WHERE email = $1', [guardianEmail]);
  if (existing.length === 0) return guardianEmail;

  for (let i = 1; i < 100; i++) {
    guardianEmail = base + i + '@guardian.com';
    const found = await query('SELECT * FROM users WHERE email = $1', [guardianEmail]);
    if (found.length === 0) return guardianEmail;
  }

  return base + Date.now() + '@guardian.com';
};

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const users = await query('SELECT * FROM users WHERE id = $1', [req.user.userId]);
    const user = users[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Me error:', error);
    res.status(500).json({ error: 'Server error fetching user' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { name, personalEmail, password, role } = req.body;

    if (!name || !personalEmail || !password) {
      return res.status(400).json({ error: 'Name, personal email and password are required' });
    }

    if (role === 'police' || role === 'admin') {
      return res.status(403).json({ error: 'Police and admin accounts cannot be self-registered' });
    }

    const existingByPersonalEmail = await query('SELECT * FROM users WHERE personal_email = $1', [personalEmail]);
    const existingPersonalUser = existingByPersonalEmail[0];

    if (existingPersonalUser) {
      if (existingPersonalUser.is_verified) {
        return res.status(400).json({ error: 'This personal email is already registered. Please login with your Guardian ID.' });
      }

      const newGuardianEmail = await generateGuardianEmail(name);
      const otp = generateOTP();
      const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

      await query(
        'UPDATE users SET name = $1, email = $2, password = $3, role = $4, updated_at = now(), otp = $5, otp_expiry = $6 WHERE id = $7',
        [name, newGuardianEmail, await bcrypt.hash(password, 10), 'user', otp, otpExpiry, existingPersonalUser.id]
      );

      emailService.sendOTPEmail(personalEmail, name, otp).catch(() => {});

      return res.status(201).json({
        message: 'Verification OTP sent to your personal email',
        guardianEmail: newGuardianEmail,
        personalEmail,
        requiresVerification: true
      });
    }

    const guardianEmail = await generateGuardianEmail(name);
    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole = 'user';
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    const result = await query(
      `INSERT INTO users (name, email, personal_email, password, role, created_at, updated_at, is_verified, otp, otp_expiry)
       VALUES ($1, $2, $3, $4, $5, now(), now(), false, $6, $7) RETURNING id`,
      [name, guardianEmail, personalEmail, hashedPassword, userRole, otp, otpExpiry]
    );

    const insertId = result[0].id;

    await auditLog(insertId, null, 'USER_REGISTERED', `New user registered: ${guardianEmail} (via ${personalEmail}) - pending verification`);

    emailService.sendOTPEmail(personalEmail, name, otp).catch(() => {});

    res.status(201).json({
      message: 'Registration successful! Please check your personal email for the verification OTP.',
      requiresVerification: true,
      guardianEmail,
      personalEmail
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const { personalEmail, otp } = req.body;

    if (!personalEmail || !otp) {
      return res.status(400).json({ error: 'Personal email and OTP are required' });
    }

    const users = await query('SELECT * FROM users WHERE personal_email = $1', [personalEmail]);
    const user = users[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.is_verified) {
      return res.status(400).json({ error: 'Email already verified. Please login.' });
    }

    if (!user.otp || user.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    const now = new Date();
    const expiry = new Date(user.otp_expiry);
    if (now > expiry) {
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    await query(
      'UPDATE users SET is_verified = true, otp = NULL, otp_expiry = NULL, updated_at = now() WHERE id = $1',
      [user.id]
    );

    await auditLog(user.id, null, 'EMAIL_VERIFIED', `Personal email verified: ${personalEmail} for guardian: ${user.email}`);

    res.json({
      message: 'Email verified successfully! You can now login with your Guardian ID.',
      verified: true,
      guardianEmail: user.email
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Server error during OTP verification' });
  }
});

router.post('/resend-otp', async (req, res) => {
  try {
    const { personalEmail } = req.body;

    if (!personalEmail) {
      return res.status(400).json({ error: 'Personal email is required' });
    }

    const users = await query('SELECT * FROM users WHERE personal_email = $1', [personalEmail]);
    const user = users[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.is_verified) {
      return res.status(400).json({ error: 'Email already verified. Please login.' });
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await query(
      'UPDATE users SET otp = $1, otp_expiry = $2, updated_at = now() WHERE id = $3',
      [otp, otpExpiry, user.id]
    );

    emailService.sendOTPEmail(personalEmail, user.name, otp).catch(() => {});

    res.json({
      message: 'New OTP sent to your personal email'
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ error: 'Server error during OTP resend' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Guardian ID and password are required' });
    }

    const users = await query('SELECT * FROM users WHERE email = $1', [email]);
    const user = users[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid Guardian ID or password' });
    }

    if (!user.is_verified) {
      const otp = generateOTP();
      const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

      await query(
        'UPDATE users SET otp = $1, otp_expiry = $2, updated_at = now() WHERE id = $3',
        [otp, otpExpiry, user.id]
      );

      emailService.sendOTPEmail(user.personal_email, user.name, otp).catch(() => {});

      return res.status(403).json({
        error: 'Please verify your email first. A new OTP has been sent to your personal email.',
        requiresVerification: true,
        personalEmail: user.personal_email
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid Guardian ID or password' });
    }

    await auditLog(user.id, null, 'USER_LOGIN', `User logged in: ${email} (Role: ${user.role})`);

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

module.exports = router;
module.exports.generateGuardianEmail = generateGuardianEmail;
