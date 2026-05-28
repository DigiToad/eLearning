import { redirect } from '@sveltejs/kit';
import Profile from '$lib/server/models/Profile.js';


export const load = async ({ url, cookies, locals, depends }) => {
  

  try {
    if (url.pathname === '/logout') {
      cookies.delete('token', { path: '/' });
      redirect(302, '/signin');
    }

    depends("data:load");

    // const productsList = await fetchProducts();

    if (!locals?.user) {
      return {
        authedUser: null,
        error: 'Not authenticated',
       
      };
    }

    const authedUser = { id: locals.user.userId };
    const userProfile = await Profile.findOne({ userId: authedUser.id });

    if (!userProfile) {
      return {
        authedUser: null,
        error: 'Profile not found',
        // products: productsList,
      };
    }

    const finalResult = JSON.parse(JSON.stringify({ profile: userProfile }));

    return {
      authedUser: {
        id: authedUser.id,
        firstname: userProfile.firstName || '',
        email: userProfile.email || '',
        phone: userProfile.cellPhone || '',
      },
      profile: finalResult.profile,
    //   products: productsList,
    };

  } catch (error) {
    // console.error('Load function error:', error);

    // try {
    //   const productsList = await fetchProducts();
    //   return { authedUser: null, error: 'Failed to load data', products: productsList };
    // } catch (productError) {
    //   return { authedUser: null, error: 'Failed to load data', products: [] };
    // }
  }
};