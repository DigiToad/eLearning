import { signUp } from "$lib/server/mongoActions.js";
export const actions = {
  register: async ({ request, cookies }) => {
    try {
      const body = Object.fromEntries(await request.formData());
      console.log(body, "body");

      const result = await signUp(body, cookies);
       console.log(result,"resultttttttttttttttttttttttttttttttttttttttttt");

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

//     if (!email) {
//       return {
//         status: 400,
//         message: "Please provide a valid email address",
//         success: false,
//         isEmailVerified: false,
//       };
//     }

//     try {
//       const tokenVerificationRecord = await TokenVerification.findOne({
//         email,
//       });
//       // console.log('TokenVerification record:', tokenVerificationRecord);
//       if (tokenVerificationRecord && tokenVerificationRecord.isEmailVerified) {
//         return {
//           status: 200,
//           message: "Email is already verified",
//           success: true,
//           isEmailVerified: true,
//         };
//       }
//       const user = await Profile.findOne({ email });
//       console.log(user);

//       if (!user) {
//         const result = await sendemailOtp(email);
//         if (result) {
//           return {
//             status: 200,
//             message:
//               "Verification email sent successfully. Please check your inbox.",
//             success: true,
//             isEmailVerified: false,
//           };
//         } else {
//           throw new Error("Email sending failed");
//         }
//       }

//       if (!user.isEmailVerified) {
//         const result = await sendemailOtp(email);
//         if (result) {
//           return {
//             status: 200,
//             message:
//               "Verification email sent successfully. Please check your inbox.",
//             success: true,
//             isEmailVerified: false,
//           };
//         } else {
//           throw new Error("Email sending failed");
//         }
//       }
//       return {
//         status: 200,
//         message: "User already exists and email is verified.",
//         success: true,
//         isEmailVerified: true,
//       };
//     } catch (error) {
//       console.log("error sending email:", error);

//       return {
//         status: 500,
//         message:
//           "Verification mail could not be sent. Double-Check your email again",
//         success: false,
//         isEmailVerified: false,
//       };
//     }
//   },

//   verifyOtp: async ({ request }) => {
//     const body = Object.fromEntries(await request.formData());
//     console.log("verifyOtp body", body);
//     const { email, enteredOtp } = body;

//     try {
//       if (!email) {
//         return {
//           status: 500,
//           message: "Please provide email to verify.",
//           success: false,
//           isEmailVerified: false,
//         };
//       }

//       if (!enteredOtp) {
//         return {
//           status: 500,
//           message: "Please provide OTP to verify.",
//           success: false,
//           isEmailVerified: false,
//         };
//       }

//       const verificationResult = await verifyemailOtp(email, enteredOtp);
//       if (!verificationResult.success) {
//         // console.log("OTP verification failed:", verificationResult.message);
//         return {
//           status: 500,
//           message: verificationResult.message,
//           success: false,
//           isEmailVerified: false,
//         };
//       } else {
//         // console.log("OTP verification successful:", verificationResult.message);
//         return {
//           status: 200,
//           message: verificationResult.message,
//           success: true,
//           isEmailVerified: true,
//         };
//       }
//     } catch (error) {
//       console.error("Error in verifyOtp handler:", error);
//       return {
//         status: 500,
//         message:
//           "An unexpected error occurred while verifying the OTP. Please try again later.",
//         success: false,
//         isEmailVerified: false,
//       };
//     }
//   }
// };
};
