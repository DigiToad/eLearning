import { redirect } from '@sveltejs/kit';
import Profile from '$lib/server/models/Profile.js';

// export const load = async ({ locals }) => {
    
//     if (!locals.user) {
//         throw redirect(302, '/admin/login');
//     }
//     const authedUser = { id: locals.user.userId };
//     const userProfile = await Profile.findOne({ userId: authedUser.id });
//     if (!userProfile) {
//         throw redirect(302, '/admin/login');
//     }else{
//        throw redirect(302, '/admin/dashboard');  
//     }
//     return JSON.parse(JSON.stringify({ profile: userProfile }));
// };