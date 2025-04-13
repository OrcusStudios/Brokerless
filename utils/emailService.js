// utils/emailService.js
const sgMail = require('@sendgrid/mail');
const fs = require('fs');
const path = require('path');

// Set SendGrid API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Send an email using SendGrid
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} text - Plain text body
 * @param {string} html - HTML body (optional)
 * @returns {Promise} - Email send result
 */
const sendEmail = async (to, subject, text, html) => {
  try {
    const msg = {
      to,
      from: process.env.EMAIL_FROM || 'REMarketplace <noreply@example.com>',
      subject,
      text,
      html: html || text
    };
    
    const info = await sgMail.send(msg);
    console.log('Email sent with SendGrid');
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

/**
 * Send an email with attachment using SendGrid
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
    
    // Read the file and convert to base64
    const attachment = fs.readFileSync(attachmentPath).toString('base64');
    const filename = path.basename(attachmentPath);
    
    // Determine content type based on file extension
    let contentType = 'application/octet-stream'; // Default
    const ext = path.extname(filename).toLowerCase();
    if (ext === '.pdf') contentType = 'application/pdf';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    
    const msg = {
      to,
      from: process.env.EMAIL_FROM || 'REMarketplace <noreply@example.com>',
      subject,
      text,
      attachments: [
        {
          content: attachment,
          filename: filename,
          type: contentType,
          disposition: 'attachment'
        }
      ]
    };
    
    const info = await sgMail.send(msg);
    console.log('Email with attachment sent with SendGrid');
    return info;
  } catch (error) {
    console.error('Error sending email with attachment:', error);
    throw error;
  }
};

// Fallback to Nodemailer if SendGrid API key is not set
if (!process.env.SENDGRID_API_KEY) {
  console.warn('SENDGRID_API_KEY not found, falling back to Nodemailer');
  
  const nodemailer = require('nodemailer');
  
  // Configure email transport
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.example.com',
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER || 'youremail@example.com',
      pass: process.env.EMAIL_PASSWORD || 'yourpassword'
    }
  });
  
  // Override sendEmail function with Nodemailer implementation
  exports.sendEmail = async (to, subject, text, html) => {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'Real Estate Platform <noreply@example.com>',
        to,
        subject,
        text,
        html: html || text
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent with Nodemailer:', info.messageId);
      return info;
    } catch (error) {
      console.error('Error sending email with Nodemailer:', error);
      throw error;
    }
  };
  
  // Override sendAttachment function with Nodemailer implementation
  exports.sendAttachment = async (to, subject, text, attachmentPath) => {
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
      console.log('Email with attachment sent with Nodemailer:', info.messageId);
      return info;
    } catch (error) {
      console.error('Error sending email with attachment with Nodemailer:', error);
      throw error;
    }
  };
} else {
  module.exports = {
    sendEmail,
    sendAttachment
  };
}
