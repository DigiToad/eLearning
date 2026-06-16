

import nodemailer from 'nodemailer';
import {
  SMTP_USER,
  SMTP_PASS,
  MAIL_HOST,
  FROM_EMAIL,
  FROM_NAME,

} from '$env/static/private';

import {PUBLIC_NOTIFICATION_TARGET_EMAIL} from '$env/static/public';
const transporter = nodemailer.createTransport({
  host: MAIL_HOST,          
  port: 587,
  secure: false,
  auth: {
    user: SMTP_USER,        
    pass: SMTP_PASS,         
  },
});

export const sendEmailToUser = async (subject, content, userEmail) => {
  const mailOptions = {
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: userEmail,
    subject,
    html: content,
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    console.log('User mail sent:', result.messageId);
    return true;
  } catch (error) {
    console.error('sendEmailToUser ERROR:', error);
    throw error;
  }
};

export const sendNotificationEmail = async (subject, content) => {
  const mailOptions = {
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: PUBLIC_NOTIFICATION_TARGET_EMAIL, // support@digitoadtech.com
    subject,
    html: content,
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    console.log('Notification mail sent:', result.messageId);
    return true;
  } catch (error) {
    console.error('sendNotificationEmail ERROR:', error);
    throw error;
  }
};

