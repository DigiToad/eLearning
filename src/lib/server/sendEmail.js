
import nodemailer from 'nodemailer';
// import { SMTP_USER, SMTP_PASS, MAIL_HOST } from '$env/static/private'; 
import { SMTP_USER, SMTP_PASS, MAIL_HOST, FROM_EMAIL } from '$env/static/private';  


export async function sendEmail(subject, content,userEmail) {
    const transporter = nodemailer.createTransport({
        host: MAIL_HOST,  
        port: 587,  
        secure: false,  
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS,  
        },
    });
 const mailOptions = {
        from: FROM_EMAIL,
        to: userEmail,
        subject: subject,
        html: `
            <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; }
                    </style>
                </head>
                <body>
                    ${content}
                </body>
            </html>
        `,  
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully');
        return { success: true, message: 'Email sent successfully!' };
    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, message: error.message };
    }
}


// // import nodemailer from "nodemailer";
// // import { SMTP_USER, SMTP_PASS, APP_URL, NOTIFICATION_EMAIL_ADDRESS  } from "$env/static/private";

// // export async function sendEmail(subject,content) {
// //   const transporter = nodemailer.createTransport({
// //     host: APP_URL,
// //     port: 587,
// //     secure: false,
// //     auth: {
// //       user: SMTP_USER,
// //       pass: SMTP_PASS,
// //     },
// //   });

// //   const mailOptions = {
// //     from: SMTP_USER,
// //     to: NOTIFICATION_EMAIL_ADDRESS,
// //     subject: subject,
// //     html: content
// //   };

// //   try {
// //     await transporter.sendMail(mailOptions);
// //     console.log("Email sent successfully");
// //     return { success: true, message: "Email sent successfully!" };
// //   } catch (error) {
// //     console.error("Error sending email:", error);
// //     return { success: false, message: error.message };
// //   }
// // }