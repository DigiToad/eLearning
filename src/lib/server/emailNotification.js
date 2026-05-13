// import nodemailer from 'nodemailer';
// import { SENDER_EMAIL, MAIL_HOST, NOTIFICATION_TARGET_EMAIL, SENDER_PASSWORD } from '$env/static/private';

// export const sendEmailToUser = async (subject, content, userEmail) => {
//     const transporter = nodemailer.createTransport({
//         host: MAIL_HOST,
//         port: 587,
//         secure: false, 
//         auth: {
//             user: SENDER_EMAIL,
//             pass: SENDER_PASSWORD,
//         },
//     });
//     const mailOptions = {
//         from: SENDER_EMAIL,
//         to: userEmail,
//         subject,
//         html: content,
//     };

//     try {
//         const result = await transporter.sendMail(mailOptions);

//         if (result.accepted && result.accepted.length > 0) {
//             return true;
//         } else {
//             return false;
//         }
//     } catch (error) {
//         return false;
//     }
// };

// export const sendNotificationEmail = async (subject, content, userEmail = null) => {
//     const transporter = nodemailer.createTransport({
//         host: MAIL_HOST,
//         port: 587,
//         secure: false,
//         auth: {
//             user: SENDER_EMAIL,
//             pass: SENDER_PASSWORD,
//         },
//     });

//     let toEmail = NOTIFICATION_TARGET_EMAIL; 
//     if (userEmail) {
//         toEmail = `${NOTIFICATION_TARGET_EMAIL}`;
//     }

//     const mailOptions = {
//         from: SENDER_EMAIL,
//         to: toEmail,
//         subject,
//         html: content,
//     };

//     try {
//         const result = await transporter.sendMail(mailOptions);
//         return true;
//     } catch (error) {
//         return false;
//     }
// };



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
  host: MAIL_HOST,           // smtp.gmail.com
  port: 587,
  secure: false,
  auth: {
    user: SMTP_USER,         // support@digitoadtech.com
    pass: SMTP_PASS,         // App Password
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

