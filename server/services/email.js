const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const config = require('../config');

const LOGO_PATH = path.join(__dirname, '../../logo.jpeg');

const initTransporter = () => {
  if (!config.email.user || !config.email.pass) {
    console.warn('⚠️ Email not configured - cannot create transporter');
    return null;
  }

  const cleanPass = config.email.pass.replace(/\s/g, '');

  console.log(`📧 Creating transporter for: ${config.email.user} via ${config.email.host}:${config.email.port}`);

  return nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: false,
    requireTLS: true,
    auth: {
      user: config.email.user,
      pass: cleanPass
    },
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 8000,
    greetingTimeout: 8000
  });
};

const isEmailConfigured = () => {
  return !!(config.email.user && config.email.pass);
};

const sendOTPEmail = async (email, name, otp) => {
  const transporter = initTransporter();
  if (!transporter) {
    return { success: false, error: 'Email not configured' };
  }

  try {
    const mailOptions = {
      from: 'ZELDA <' + config.email.user + '>',
      to: email,
      subject: 'ZELDA - Email Verification',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fafafa; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08);">
          <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; text-align: center;">
            <h1 style="color: #e94560; margin: 0; font-size: 28px; letter-spacing: 3px;">ZELDA</h1>
            <p style="color: #a0a0b0; margin: 5px 0 0; font-size: 13px;">Women Safety Guardian</p>
          </div>
          <div style="padding: 30px;">
            <p style="color: #333; font-size: 16px;">Hello ${name},</p>
            <p style="color: #555;">Thank you for registering. Use the OTP below to verify your email:</p>
            <div style="background: #f0f0f5; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; border: 1px solid #e0e0e5;">
              <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #e94560;">${otp}</span>
            </div>
            <p style="color: #888; font-size: 13px;">This OTP is valid for 5 minutes.</p>
            <p style="color: #888; font-size: 13px;">If you didn't request this, please ignore this email.</p>
          </div>
          <div style="background: #1a1a2e; padding: 15px; text-align: center;">
            <p style="color: #666; font-size: 11px; margin: 0;">ZELDA &mdash; Women Safety Guardian</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`📧 OTP email sent to ${email}`);
    return { success: true };
  } catch (error) {
    console.error('Email send error:', error.message);
    return { success: false, error: error.message };
  }
};

const sendSOSAlert = async (caseData, videoUrl, audioUrl) => {
  const transporter = initTransporter();
  if (!transporter) {
    console.log('📧 Email not configured - SOS alert skipped');
    return { success: false, error: 'Email not configured' };
  }

  try {
    const mediaLinks = [];
    if (videoUrl) {
      mediaLinks.push(`<p><strong>Video:</strong> <a href="${videoUrl}">Play emergency video</a></p>`);
    }
    if (audioUrl) {
      mediaLinks.push(`<p><strong>Audio:</strong> <a href="${audioUrl}">Play emergency audio</a></p>`);
    }

    const mailOptions = {
      from: config.email.user,
      to: config.email.policeEmail,
      subject: `🚨 SOS ALERT - Emergency from ${caseData.user_email}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">🚨 SOS EMERGENCY ALERT</h2>
          <p><strong>User:</strong> ${caseData.user_email}</p>
          <p><strong>Status:</strong> ${caseData.status}</p>
          <p><strong>Time:</strong> ${caseData.created_at}</p>
          ${caseData.location_link ? `<p><strong>Location:</strong> <a href="${caseData.location_link}">View on Google Maps</a></p>` : ''}
          ${caseData.notes ? `<p><strong>Notes:</strong> ${caseData.notes}</p>` : ''}
          ${mediaLinks.join('')}
          <p style="color: #dc2626; font-weight: bold;">Immediate response required.</p>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`📧 SOS alert email sent to police`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('SOS email error:', error.message);
    return { success: false, error: error.message };
  }
};

const sendContactSOSAlert = async (caseData, contact) => {
  const transporter = initTransporter();
  if (!transporter) {
    return { success: false, error: 'Email not configured' };
  }

  try {
    const mailOptions = {
      from: config.email.user,
      to: contact.email,
      subject: `🚨 SOS EMERGENCY - ${caseData.user_email} needs help!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">🚨 SOS EMERGENCY ALERT</h2>
          <p>Hello <strong>${contact.name}</strong>,</p>
          <p><strong>${caseData.user_email}</strong> has triggered an emergency SOS alert.</p>
          ${caseData.location_link ? `<p><strong>Location:</strong> <a href="${caseData.location_link}">View on Google Maps</a></p>` : ''}
          ${caseData.notes ? `<p><strong>Details:</strong> ${caseData.notes}</p>` : ''}
          <p><strong>Time:</strong> ${caseData.created_at}</p>
          <hr>
          <p style="color: #dc2626; font-weight: bold;">Please check on them immediately.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`📧 SOS alert sent to contact: ${contact.email}`);
    return { success: true };
  } catch (error) {
    console.error('Contact email error:', error.message);
    return { success: false, error: error.message };
  }
};

const sendTestEmail = async () => {
  const transporter = initTransporter();
  if (!transporter) {
    return { success: false, error: 'Email not configured' };
  }

  try {
    await transporter.sendMail({
      from: config.email.user,
      to: config.email.policeEmail,
      subject: 'Test Email - Women Safety Guardian',
      text: 'This is a test email from Women Safety Guardian.'
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

module.exports = { sendOTPEmail, sendSOSAlert, sendContactSOSAlert, sendTestEmail, isEmailConfigured };