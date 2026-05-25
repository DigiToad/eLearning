import { redirect } from '@sveltejs/kit';
import Profile from '$lib/server/models/Profile.js';
import { signUp } from "$lib/server/mongoActions.js";
import { ADMIN_EMAIL } from '$env/static/private';
// import Contactus from '$lib/server/models/Contact.js';
// import Events from '$lib/server/models/Events.js';
// import Products from '$lib/server/models/Component.js'
// import Partners from '$lib/server/models/Partners';
import User from '$lib/server/models/User.js'
// import Productdemo from '$lib/server/models/Productdemo.js';
// import Quote from '$lib/server/models/Quoteform.js';
// import Collaboration from '$lib/server/models/Collaborator.js';
// import Category from '$lib/server/models/Category.js';
// import WebinarFeedback from '$lib/server/models/Feedback.js';
// export const load = async ({ locals }) => {
// 	if (!locals.user) {
// 		throw redirect(302, '/admin/login');
// 	}
// 	const authedUser = { id: locals.user.userId };
// 	const userProfile = await Profile.findOne({ userId: authedUser.id });
// 	if (!userProfile) {
// 		throw redirect(302, '/admin/login');
// 	}
// 	return JSON.parse(JSON.stringify({ profile: userProfile , admin_email :ADMIN_EMAIL }));
// };
export const load = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(302, '/admin/login');
  }
  const authedUser = { id: locals.user.userId };
  const userProfile = await Profile.findOne({ userId: authedUser.id });
  if (!userProfile) {
    throw redirect(302, '/admin/login');
  }

  const [eventsCount, productsCount, usersCount, partnersCount, contactsCount, productdemoCount, quotecount, collaborationcount, categorycount, WebinarFeedbackcount] =
    await Promise.all([
      Events.countDocuments(),
      Products.countDocuments(),
      User.countDocuments(),
      Partners.countDocuments(),
      Contactus.countDocuments(),
      Productdemo.countDocuments(),
      Quote.countDocuments(),
      Collaboration.countDocuments(),
      Category.countDocuments(),
      WebinarFeedback.countDocuments()

    ]);

  return JSON.parse(JSON.stringify({
    profile: userProfile,
    admin_email: ADMIN_EMAIL,
    stats: {
      events: eventsCount,
      products: productsCount,
      users: usersCount,
      partners: partnersCount,
      contacts: contactsCount,
      productdemo: productdemoCount,
      quote: quotecount,
      collaborations: collaborationcount,
      category: categorycount,
      WebinarFeedbackcount: WebinarFeedbackcount

    }
  }));
};


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
