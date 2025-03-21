// services/emailService.js
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Configure email transport
const transporter = nodemailer.createTransport({
  // Configure your email service - this is an example setup
  // You'll need to use real credentials for production
  host: process.env.EMAIL_HOST || 'smtp.example.com',
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER || 'youremail@example.com',
    pass: process.env.EMAIL_PASSWORD || 'yourpassword'
  }
});

/**
 * Send an email
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} text - Plain text body
 * @param {string} html - HTML body (optional)
 * @returns {Promise} - Email send result
 */
const sendEmail = async (to, subject, text, html) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'Real Estate Platform <noreply@example.com>',
      to,
      subject,
      text,
      html: html || text
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

/**
 * Send an email with attachment
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} text - Plain text body
 * @param {string} attachmentPath - Path to file attachment
 * @returns {Promise} - Email send result
 */
const sendAttachment = async (to, subject, text, attachmentPath) => {
  try {
    if (!fs.existsSync(attachmentPath)) {
      throw new Error(`Attachment file not found: ${attachmentPath}`);
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'Real Estate Platform <noreply@example.com>',
      to,
      subject,
      text,
      attachments: [
        {
          filename: path.basename(attachmentPath),
          path: attachmentPath
        }
      ]
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email with attachment sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email with attachment:', error);
    throw error;
  }
};

module.exports = {
  sendEmail,
  sendAttachment
};