import { redirect } from '@sveltejs/kit';
import Profile from '$lib/server/models/Profile.js';
import { signUp } from "$lib/server/mongoActions.js";
import { ADMIN_EMAIL } from '$env/static/private';
import User from '$lib/server/models/User.js'

export const actions = {
  register: async ({ request, cookies }) => {
    try {
      const body = Object.fromEntries(await request.formData());
      console.log(body, "body");

      const result = await signUp(body, cookies);
      console.log(result, "resultttttttttttttttttttttttttttttttttttttttttt");

      if (result && (result.success === true || result.message === "Signup successful" || result.record)) {

        const userEmail = body.email || result.record?.email || result.email;
        const username = body.username || body.firstName || result.record.username;

        if (userEmail && userEmail.trim()) {

          //   try {
          //     await sendRegistrationSuccessEmail(userEmail, username);
          //     // console.log('Registration success email sent successfully to:', userEmail);
          //   }
          //   catch (emailError) {
          //     console.log("Email not sent")
          //   }
        }
        // else {
        //     console.warn('No valid email address found for sending registration email', {
        //         bodyEmail: body.email,
        //         resultRecordEmail: result.record?.email,
        //         resultEmail: result.email
        //     });
        // }
      }
      return result;
    } catch (error) {
      return {
        success: false,
        message: "Something went wrong while processing your request. Please try again later"
      };
    }
  },
};