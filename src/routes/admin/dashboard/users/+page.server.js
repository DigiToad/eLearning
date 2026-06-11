import { usersdata } from '$lib/server/mongoLoads.js'; 
// import { deleteUser } from '$lib/server/mongoActions.js';
import { redirect } from '@sveltejs/kit';
import Profile from '$lib/server/models/Profile.js';
import User from '$lib/server/models/User.js'
import { ADMIN_EMAIL } from '$env/static/private';
export const load = async ({ locals }) => {
    if (!locals.user) {
      throw redirect(302, '/admin/login');
    }
    const authedUser = { id: locals.user.userId };
    const userProfile = await Profile.findOne({ userId: authedUser.id });
    if (!userProfile) {
      throw redirect(302, '/admin/login');
    }
    try {
      
      const  users  = await usersdata();
      // console.log(users,"users");
      const isAdmin =  ADMIN_EMAIL;
      return {
        users,
        isAdmin

      } ;
    } catch (error) {
      // console.error("Error in load:", error);
      return {
        allBlogs: [],
        error: "Unexpected error loading blogs"
      };
    }
};


export const actions = {
  // deleteusers: async ({ request }) => {
  //   const body = Object.fromEntries(await request.formData())
  //   // console.log(body,"bodyyyyyyyyyyyy");
    
  //   try {
  //     const result = await deleteUser(body);
  //     return result
  //   } catch (error) {
  //     console.error("Error during user update:", error);
  //   }
  // }
}