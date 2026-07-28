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

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    if (role === 'police') {
      return res.status(403).json({ error: 'Police accounts cannot be self-registered' });
    }

    const existingUsers = await query('SELECT * FROM `users table` WHERE Email = ?', [email]);
    const existingUser = existingUsers[0];

    if (existingUser) {
      if (existingUser.isVerified) {
        return res.status(400).json({ error: 'User already exists. Please login.' });
      } else {
        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

        await query(
          'UPDATE `users table` SET Name = ?, Password = ?, Role = ?, Updated_at = NOW(), otp = ?, otpExpiry = ? WHERE id = ?',
          [name, await bcrypt.hash(password, 10), 'user', otp, otpExpiry, existingUser.id]
        );

        const emailResult = await emailService.sendOTPEmail(email, name, otp);

        return res.status(201).json({
          message: 'Verification OTP sent to your email',
          emailSent: emailResult.success,
          requiresVerification: true,
          email
        });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole = 'user';
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

    const result = await query(
      'INSERT INTO `users table` (Name, Email, Password, Role, Created_at, Updated_at, isVerified, otp, otpExpiry) VALUES (?, ?, ?, ?, NOW(), NOW(), FALSE, ?, ?)',
      [name, email, hashedPassword, userRole, otp, otpExpiry]
    );

    const insertId = result.insertId;

    await auditLog(insertId, null, 'USER_REGISTERED', `New user registered: ${email} (Role: ${userRole}) - pending verification`);

    const emailResult = await emailService.sendOTPEmail(email, name, otp);

    res.status(201).json({
      message: 'Registration successful! Please check your email for the verification OTP.',
      requiresVerification: true,
      email,
      emailSent: emailResult.success
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const users = await query('SELECT * FROM `users table` WHERE Email = ?', [email]);
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

    await auditLog(user.id, null, 'EMAIL_VERIFIED', `Email verified: ${email}`);

    res.json({
      message: 'Email verified successfully! You can now login.',
      verified: true
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Server error during OTP verification' });
  }
});

router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const users = await query('SELECT * FROM `users table` WHERE Email = ?', [email]);
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

    const emailResult = await emailService.sendOTPEmail(email, user.Name, otp);

    if (!emailResult.success) {
      return res.status(500).json({ error: 'Failed to send OTP email. Please try again.' });
    }

    res.json({
      message: 'New OTP sent to your email',
      emailSent: true
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
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const users = await query('SELECT * FROM `users table` WHERE Email = ?', [email]);
    const user = users[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.isVerified) {
      const otp = generateOTP();
      const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

      await query(
        'UPDATE `users table` SET otp = ?, otpExpiry = ?, Updated_at = NOW() WHERE id = ?',
        [otp, otpExpiry, user.id]
      );

      await emailService.sendOTPEmail(email, user.Name, otp);

      return res.status(403).json({
        error: 'Please verify your email first. A new verification email has been sent.',
        requiresVerification: true,
        email
      });
    }

    const isMatch = await bcrypt.compare(password, user.Password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
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