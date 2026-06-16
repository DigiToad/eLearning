// import { redirect } from '@sveltejs/kit';
// import Profile from '$lib/server/models/Profile.js';
// import { signUp } from "$lib/server/mongoActions.js";
// import { ADMIN_EMAIL } from '$env/static/private';
// import User from '$lib/server/models/User.js'

// export const actions = {
//   register: async ({ request, cookies }) => {
//     try {
//       const body = Object.fromEntries(await request.formData());
//       console.log(body, "body");

//       const result = await signUp(body, cookies);
//       console.log(result, "resultttttttttttttttttttttttttttttttttttttttttt");

//       if (result && (result.success === true || result.message === "Signup successful" || result.record)) {

//         const userEmail = body.email || result.record?.email || result.email;
//         const username = body.username || body.firstName || result.record.username;

//         if (userEmail && userEmail.trim()) {

//           //   try {
//           //     await sendRegistrationSuccessEmail(userEmail, username);
//           //     // console.log('Registration success email sent successfully to:', userEmail);
//           //   }
//           //   catch (emailError) {
//           //     console.log("Email not sent")
//           //   }
//         }
//         // else {
//         //     console.warn('No valid email address found for sending registration email', {
//         //         bodyEmail: body.email,
//         //         resultRecordEmail: result.record?.email,
//         //         resultEmail: result.email
//         //     });
//         // }
//       }
//       return result;
//     } catch (error) {
//       return {
//         success: false,
//         message: "Something went wrong while processing your request. Please try again later"
//       };
//     }
//   },
// };


import Profile from '$lib/server/models/Profile.js';
import { signUp } from "$lib/server/mongoActions.js";
import { ADMIN_EMAIL } from '$env/static/private';
import User from '$lib/server/models/User.js';
import { sendEmail } from '$lib/server/sendEmail.js';
import TokenVerification from '$lib/server/models/TokenVerification.js'
const otpStore = new Map();

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

async function sendOtpEmail(toEmail, otp) {
  const subject = 'Your Email Verification OTP – Learnify LMS';
  const content = `
    <div style="max-width:480px;margin:0 auto;padding:32px 24px;background:#f9fafb;border-radius:12px;">
      <div style="text-align:center;margin-bottom:24px;">
        <span style="font-size:24px;font-weight:700;color:#15803d;">Learnify LMS</span>
      </div>
      <div style="background:#fff;border-radius:10px;padding:28px 24px;border:1px solid #e5e7eb;">
        <h2 style="margin:0 0 8px;font-size:18px;color:#111827;">Verify your email address</h2>
        <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
          Use the OTP below to verify your email address. It expires in <strong>10 minutes</strong>.
        </p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;text-align:center;margin-bottom:24px;">
          <span style="font-size:36px;font-weight:700;letter-spacing:10px;color:#15803d;">${otp}</span>
        </div>
        <p style="margin:0;font-size:12px;color:#9ca3af;">
          If you did not request this, please ignore this email. Do not share this OTP with anyone.
        </p>
      </div>
      <p style="margin:16px 0 0;text-align:center;font-size:12px;color:#9ca3af;">
        © ${new Date().getFullYear()} Learnify LMS. All rights reserved.
      </p>
    </div>
  `;

  // matches sendEmail(subject, content, userEmail)
  await sendEmail(subject, content, toEmail);
}

export const actions = {
sendotp: async ({ request }) => {
  try {
    const body = Object.fromEntries(await request.formData());
    // console.log('[sendotp] Raw form body:', body);

    const email = (body.email || '').trim().toLowerCase();
    // console.log('[sendotp] Parsed email:', email);

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      // console.warn('[sendotp] Invalid email format:', email);
      return { success: false, message: 'Please enter a valid email address.' };
    }

    const existing = await TokenVerification.findOne({ email });
    // console.log('[sendotp] Existing record:', existing);

    if (existing?.isEmailVerified) {
      // console.warn('[sendotp] Email already verified:', email);
      return { success: false, message: 'This email is already verified.' };
    }

    const otp = generateOtp();
    const expiry = new Date(Date.now() + OTP_EXPIRY_MS);
    // console.log('[sendotp] Generated OTP:', otp, '| Expiry:', expiry);

    const saved = await TokenVerification.findOneAndUpdate(
      { email },
      {
        token: otp,
        expiry: expiry,
        attempts: 0,
        isEmailVerified: false,
        verificationType: 'email',
      },
      { upsert: true, new: true }
    );
    // console.log('[sendotp] Saved record:', saved.toObject());

    await sendOtpEmail(email, otp);
    // console.log('[sendotp] Email sent successfully to:', email);

    return {
      success: true,
      message: 'Verification email sent successfully. Please check your inbox.',
    };
  } catch (error) {
    // console.error('[sendotp] Error:', error);
    return {
      success: false,
      message: 'Verification mail could not be sent. Please double-check your email.',
    };
  }
},
verifyemail: async ({ request }) => {
  // console.log('[verifyemail] Action triggered');
  try {
    const body = Object.fromEntries(await request.formData());
    // console.log('[verifyemail] Raw form body:', body);

    const email = (body.email || '').trim().toLowerCase();
    const otp = (body.otp || '').trim();
    // console.log('[verifyemail] Parsed inputs — email:', email, '| otp:', otp);

    if (!email || !otp) {
      // console.warn('[verifyemail] Validation failed: missing email or OTP');
      return { success: false, message: 'Email and OTP are required.' };
    }

    // console.log('[verifyemail] Looking up record for email:', email);
    const record = await TokenVerification.findOne({ email, verificationType: 'email' });
    // console.log('[verifyemail] Record found:', record);

    if (!record) {
      // console.warn('[verifyemail] No record found for email:', email);
      return { success: false, message: 'No OTP found. Please request a new one.' };
    }

    const now = new Date();
    // console.log('[verifyemail] Current time:', now, '| Record expiry:', record.expiry);
    if (now > record.expiry) {
      // console.warn('[verifyemail] OTP expired for email:', email);
      return { success: false, message: 'OTP has expired. Please request a new one.' };
    }

    // console.log('[verifyemail] Comparing OTPs — submitted:', otp, '| stored:', record.token);
    if (record.token !== otp) {
      // console.warn('[verifyemail] OTP mismatch for email:', email);
      return { success: false, message: 'Incorrect OTP. Please try again.' };
    }

    // console.log('[verifyemail] OTP matched. Updating isEmailVerified for:', email);
    const updated = await TokenVerification.findOneAndUpdate(
      { email, verificationType: 'email' },
      { isEmailVerified: true },
      { new: true }
    );
    // console.log('[verifyemail] Updated record:', updated.toObject());

    return { success: true, isEmailVerified: true, message: 'Email verified successfully.' };
  } catch (error) {
    // console.error('[verifyemail] Unexpected error:', error);
    return { success: false, message: 'Verification failed. Please try again.' };
  }
},
  // sendotp: async ({ request }) => {
  //   try {
  //     const body = Object.fromEntries(await request.formData());
  //     console.log(body, "sendotp body");

  //     const email = (body.email || '').trim().toLowerCase();

  //     if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  //       return { success: false, message: 'Please enter a valid email address.' };
  //     }

  //     const existing = await Profile.findOne({ email });
  //     if (existing) {
  //       return {
  //         success: false,
  //         message: 'This email already exists. Please login or try with another.',
  //       };
  //     }

  //     const otp = generateOtp();
  //     console.log(otp,"otpotpotpotpotp");
      
  //     const expires = Date.now() + OTP_EXPIRY_MS;
  //     otpStore.set(email, { otp, expiresAt: expires, attempts: 0 });

  //     await sendOtpEmail(email, otp);

  //     return { success: true, message: 'OTP sent successfully. Check your inbox.' };
  //   } catch (error) {
  //     console.error('sendotp error:', error);
  //     return { success: false, message: 'Failed to send OTP. Please try again.' };
  //   }
  // },
// sendotp: async ({ request }) => {
//   try {
//     const body = Object.fromEntries(await request.formData());
//     const email = (body.email || '').trim().toLowerCase();

//     if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
//       return { success: false, message: 'Please enter a valid email address.' };
//     }

//     const existing = await TokenVerification.findOne({ email });
//     if (existing?.isEmailVerified) {
//       return { success: false, message: 'This email is already verified.' };
//     }

//     const otp = generateOtp();
//     const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);
// console.log(otp,"otpotpotpotp");

//     // Persist OTP in DB instead of in-memory Map
//     await TokenVerification.findOneAndUpdate(
//       { email },
//       { otp, expiresAt, attempts: 0, isEmailVerified: false },
//       { upsert: true, new: true }
//     );

//     await sendOtpEmail(email, otp);  // use the correctly-named function

//     return {
//       success: true,
//       message: 'Verification email sent successfully. Please check your inbox.',
//     };
//   } catch (error) {
//     console.error('sendotp error:', error);
//     return {
//       success: false,
//       message: 'Verification mail could not be sent. Please double-check your email.',
//     };
//   }
// },
  // verifyemail: async ({ request }) => {
  //   try {
  //     const body = Object.fromEntries(await request.formData());
  //     const email = (body.email || '').trim().toLowerCase();
  //     const otp = (body.otp || '').trim();

  //     if (!email || !otp) {
  //       return { success: false, message: 'Email and OTP are required.' };
  //     }

  //     const record = otpStore.get(email);

  //     if (!record) {
  //       return { success: false, message: 'No OTP found for this email. Please request a new one.' };
  //     }

  //     if (Date.now() > record.expiresAt) {
  //       otpStore.delete(email);
  //       return { success: false, message: 'OTP has expired. Please request a new one.' };
  //     }

  //     record.attempts += 1;

  //     if (record.attempts > MAX_ATTEMPTS) {
  //       otpStore.delete(email);
  //       return { success: false, message: 'Too many incorrect attempts. Please request a new OTP.' };
  //     }

  //     if (record.otp !== otp) {
  //       return {
  //         success: false,
  //         message: `Incorrect OTP. ${MAX_ATTEMPTS - record.attempts} attempt(s) remaining.`,
  //       };
  //     }

  //     otpStore.delete(email);
  //     return { success: true, message: 'Email verified successfully.' };
  //   } catch (error) {
  //     console.error('verifyemail error:', error);
  //     return { success: false, message: 'Verification failed. Please try again.' };
  //   }
  // },
//  verifyemail: async ({ request }) => {
//   try {
//     const body = Object.fromEntries(await request.formData());
//     const email = (body.email || '').trim().toLowerCase();
//     const otp = (body.otp || '').trim();

//     if (!email || !otp) {
//       return { success: false, message: 'Email and OTP are required.' };
//     }

//     const record = await TokenVerification.findOne({ email });

//     if (!record) {
//       return { success: false, message: 'No OTP found. Please request a new one.' };
//     }
//     if (new Date() > record.expiresAt) {
//       return { success: false, message: 'OTP has expired. Please request a new one.' };
//     }
//     if (record.attempts >= MAX_ATTEMPTS) {
//       return { success: false, message: 'Too many attempts. Please request a new OTP.' };
//     }
//     if (record.otp !== otp) {
//       await TokenVerification.findOneAndUpdate({ email }, { $inc: { attempts: 1 } });
//       return {
//         success: false,
//         message: `Incorrect OTP. ${MAX_ATTEMPTS - record.attempts - 1} attempt(s) remaining.`,
//       };
//     }

//     await TokenVerification.findOneAndUpdate({ email }, { isEmailVerified: true });
//     return { success: true, isEmailVerified: true, message: 'Email verified successfully.' };

//   } catch (error) {
//     console.error('verifyemail error:', error);
//     return { success: false, message: 'Verification failed. Please try again.' };
//   }
// },

  register: async ({ request, cookies }) => {
    try {
      const body = Object.fromEntries(await request.formData());
      // console.log(body, "body");

      const result = await signUp(body, cookies);
      // console.log(result, "result");

      if (result && (result.success === true || result.message === "Signup successful" || result.record)) {
        const userEmail = body.email || result.record?.email || result.email;
        const username = body.username || body.firstName || result.record?.username;

        if (userEmail && userEmail.trim()) {
          // try {
          //   await sendRegistrationSuccessEmail(userEmail, username);
          // } catch (emailError) {
          //   console.log("Email not sent");
          // }
        }
      }

      return result;
    } catch (error) {
      // console.error('register error:', error);
      return {
        success: false,
        message: "Something went wrong while processing your request. Please try again later"
      };
    }
  },
};