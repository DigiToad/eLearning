import nodemailer from "nodemailer";
import {
  APP_URL,
  SENDER_EMAIL,
  SENDER_PASSWORD,
  MAIL_HOST,
} from "$env/static/private";
import { PUBLIC_WEBSITE_NAME } from "$env/static/public";

const otpStore = new Map();
export const sendEmailOTP = async (email) => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  otpStore.set(email, otp);
  setTimeout(() => otpStore.delete(email), 1 * 60 * 1000); 

  const transporter = nodemailer.createTransport({
    service: "partskeys",
    host: MAIL_HOST,
    port: 587,
    secure: false,
    auth: {
      user: SENDER_EMAIL,
      pass: SENDER_PASSWORD,
    },
  });
  const mailOptions = {
    from: SENDER_EMAIL,
    to: email,
    subject: "Your One-Time Password (OTP) for Secure Login",
    html: `
<html>
  <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f2f2f2;">
    <table width="100%" cellspacing="0" cellpadding="0" border="0" align="center" style="background-color: #f2f2f2; padding: 20px;">
      <tr>
        <td align="center">
          <table width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 5px; overflow: hidden;">
            <tr>
              <td style="background-color: #fe5939; padding: 20px; text-align: center;">
                <p style="display: block; margin: auto; color: white; font-size: 25px; font-weight: bold;">${PUBLIC_WEBSITE_NAME}</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 30px; text-align: center;">
                <h2 style="font-size: 22px; color: #333333; margin-bottom: 10px;">Secure Login with Your OTP</h2>
                <p style="font-size: 16px; color: #555555; line-height: 1.5; margin-bottom: 20px;">
                  Hi there! You have requested to log in to your ${PUBLIC_WEBSITE_NAME} account using a One-Time Password (OTP). Please use the code below to proceed with your login. If you did not request this, please ignore this email.
                </p>
                <h4 style="font-size: 16px; color: #333333; font-weight: bold; margin-bottom: 5px;">Your OTP Code</h4>
                <p style="font-size: 32px; color: #333333; font-weight: bold; margin: 0;">${otp}</p>
                <p style="font-size: 14px; color: #777777; margin-top: 10px;">(This code is valid for 1 minute)</p>
              </td>
            </tr>
            <tr>
              <td style="background-color: #f8f8f8; padding: 20px; text-align: center; font-size: 14px; color: #555555;">
                ${PUBLIC_WEBSITE_NAME} will never email you and ask you to disclose your password, credit card, or banking account number.<br>
                Visit our website: <a href="${APP_URL}" style="color: #0281ff; text-decoration: none; font-weight: normal;">${APP_URL}</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  };
  try {
    const result = await transporter.sendMail(mailOptions);
    console.log("Verification email sent successfully:", result);
    console.log("OTP sent successfully:", otp);
    return true;
  } catch (error) {
    console.error("Error sending verification email:", error);
    return false;
  }
};
export function verifyOtp(email, enteredOtp) {
  const storedOtp = otpStore.get(email);
  return storedOtp === enteredOtp;
}