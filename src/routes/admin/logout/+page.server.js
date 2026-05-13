import { auth } from '$lib/server/lucia.js';
import { redirect } from '@sveltejs/kit';

export async function load({ locals, cookies }) {
  try {
    if (locals.authedUser) {
      const sessionIdToInvalidate = locals.session?.sessionId;
      
      if (sessionIdToInvalidate) {
        await auth.invalidateSession(sessionIdToInvalidate);
      }
    }
    
    // Clear locals
    locals.authedUser = undefined;
    locals.session = undefined;
    
    // Delete ALL cookies to ensure cleanup
    const allCookies = cookies.getAll();
    for (const cookie of allCookies) {
      cookies.delete(cookie.name, { path: '/' });
    }
    
    // console.log('All cookies deleted, redirecting to login page');
  } catch (err) {
    // console.error('Error during logout:', err);
  }
  
  // Throw redirect AFTER all operations complete
  throw redirect(302, '/admin/login?reload=true');
}