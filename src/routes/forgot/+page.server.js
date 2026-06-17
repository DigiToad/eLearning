import Profile from '$lib/server/models/Profile.js';
import { sendEmail } from '$lib/server/sendEmail.js';
import crypto from 'crypto'; 
import {PUBLIC_WEBSITE_URL} from '$env/static/private';
import {PUBLIC_WEBSITE_NAME} from '$env/static/public';
import { emailTemplates } from '$lib/email/templates.js';


const EXPIRATION_TIME = 1000 * 60 * 60; 

export const actions = {
  resetrequest: async ({ request }) => {
    const body = Object.fromEntries(await request.formData());
    try {
      if (!body.email) {
        return {
          success: false,
          message: 'Please provide your registered email '
        };
      }
      const user = await Profile.findOne({ email: body.email });
      if (!user) {
        return {
          success: false,
          message: 'No account found'
        };
      }
      const resetToken = crypto.randomUUID();
      user.resetPasswordToken = resetToken;
      user.resetTokenExpiry = Date.now() + EXPIRATION_TIME;
      await user.save();
      const resetLink = `${PUBLIC_WEBSITE_URL}/reset-password?token=${resetToken}`;
      const webname = PUBLIC_WEBSITE_NAME;
      const content = emailTemplates.resetPasswordTemplate(resetLink, webname);

        await sendEmail('Password Reset Request', content, user.email);
      return {
        
        success: true,
        message: 'Password reset link sent to your email.'
      };
    } catch (error) {
      console.error('Password reset error:', error);
      return {

        success: false,
        message: 'Something went wrong. Please try again.'
      };
    }
  }
};

