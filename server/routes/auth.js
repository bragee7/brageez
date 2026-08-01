const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query, auditLog } = require('../db');
const { JWT_SECRET } = require('../middleware/auth');
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
  const existing = await query('SELECT * FROM `users table` WHERE Email = ?', [guardianEmail]);
  if (existing.length === 0) return guardianEmail;

  for (let i = 1; i < 100; i++) {
    guardianEmail = base + i + '@guardian.com';
    const found = await query('SELECT * FROM `users table` WHERE Email = ?', [guardianEmail]);
    if (found.length === 0) return guardianEmail;
  }

  return base + Date.now() + '@guardian.com';
};

router.post('/register', async (req, res) => {
  try {
    const { name, personalEmail, password, role } = req.body;

    if (!name || !personalEmail || !password) {
      return res.status(400).json({ error: 'Name, personal email and password are required' });
    }

    if (role === 'police') {
      return res.status(403).json({ error: 'Police accounts cannot be self-registered' });
    }

    const existingByPersonalEmail = await query('SELECT * FROM `users table` WHERE PersonalEmail = ?', [personalEmail]);
    const existingPersonalUser = existingByPersonalEmail[0];

    if (existingPersonalUser) {
      if (existingPersonalUser.isVerified) {
        return res.status(400).json({ error: 'This personal email is already registered. Please login with your Guardian ID.' });
      }

      const newGuardianEmail = await generateGuardianEmail(name);
      const otp = generateOTP();
      const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

      await query(
        'UPDATE `users table` SET Name = ?, Email = ?, Password = ?, Role = ?, Updated_at = NOW(), otp = ?, otpExpiry = ? WHERE id = ?',
        [name, newGuardianEmail, await bcrypt.hash(password, 10), 'user', otp, otpExpiry, existingPersonalUser.id]
      );

      emailService.sendOTPEmail(personalEmail, name, otp).catch(() => {});

      return res.status(201).json({
        message: 'Verification OTP sent to your personal email',
        guardianEmail: newGuardianEmail,
        personalEmail,
        otp,
        requiresVerification: true
      });
    }

    const guardianEmail = await generateGuardianEmail(name);
    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole = 'user';
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

    const result = await query(
      'INSERT INTO `users table` (Name, Email, PersonalEmail, Password, Role, Created_at, Updated_at, isVerified, otp, otpExpiry) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, guardianEmail, personalEmail, hashedPassword, userRole, 'NOW()', 'NOW()', false, otp, otpExpiry]
    );

    const insertId = result.insertId;

    await auditLog(insertId, null, 'USER_REGISTERED', `New user registered: ${guardianEmail} (via ${personalEmail}) - pending verification`);

    emailService.sendOTPEmail(personalEmail, name, otp).catch(() => {});

    res.status(201).json({
      message: 'Registration successful! Please check your personal email for the verification OTP.',
      requiresVerification: true,
      guardianEmail,
      personalEmail,
      otp
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

    const users = await query('SELECT * FROM `users table` WHERE PersonalEmail = ?', [personalEmail]);
    const user = users[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: 'Email already verified. Please login.' });
    }

    if (!user.otp || user.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    const now = new Date();
    const expiry = new Date(user.otpExpiry);
    if (now > expiry) {
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    await query(
      'UPDATE `users table` SET isVerified = TRUE, otp = NULL, otpExpiry = NULL, Updated_at = NOW() WHERE id = ?',
      [user.id]
    );

    await auditLog(user.id, null, 'EMAIL_VERIFIED', `Personal email verified: ${personalEmail} for guardian: ${user.Email}`);

    res.json({
      message: 'Email verified successfully! You can now login with your Guardian ID.',
      verified: true,
      guardianEmail: user.Email
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

    const users = await query('SELECT * FROM `users table` WHERE PersonalEmail = ?', [personalEmail]);
    const user = users[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: 'Email already verified. Please login.' });
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

    await query(
      'UPDATE `users table` SET otp = ?, otpExpiry = ?, Updated_at = NOW() WHERE id = ?',
      [otp, otpExpiry, user.id]
    );

    emailService.sendOTPEmail(personalEmail, user.Name, otp).catch(() => {});

    res.json({
      message: 'New OTP sent to your personal email',
      otp
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

    const users = await query('SELECT * FROM `users table` WHERE Email = ?', [email]);
    const user = users[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid Guardian ID or password' });
    }

    if (!user.isVerified) {
      const otp = generateOTP();
      const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

      await query(
        'UPDATE `users table` SET otp = ?, otpExpiry = ?, Updated_at = NOW() WHERE id = ?',
        [otp, otpExpiry, user.id]
      );

      emailService.sendOTPEmail(user.PersonalEmail, user.Name, otp).catch(() => {});

      return res.status(403).json({
        error: 'Please verify your email first. A new OTP has been sent to your personal email.',
        requiresVerification: true,
        personalEmail: user.PersonalEmail,
        otp
      });
    }

    const isMatch = await bcrypt.compare(password, user.Password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid Guardian ID or password' });
    }

    await auditLog(user.id, null, 'USER_LOGIN', `User logged in: ${email} (Role: ${user.Role})`);

    const token = jwt.sign(
      { userId: user.id, email: user.Email, role: user.Role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.Name,
        email: user.Email,
        role: user.Role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

module.exports = router;
