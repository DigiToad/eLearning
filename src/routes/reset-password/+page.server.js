import { auth } from '$lib/server/lucia'; 
import Profile from '$lib/server/models/Profile.js';
import { redirect, fail } from '@sveltejs/kit';

export const load = async ({ url }) => {
    const token = url.searchParams.get('token');
    if (!token) {
        return { showForm: false, message: 'Invalid or missing token.' };
    }   

    const user = await Profile.findOne({ resetPasswordToken: token });
    
    // Check if user exists and token hasn't been cleared/expired
    if (!user || !user.resetPasswordToken || Date.now() > user.resetTokenExpiry) {
        return { showForm: false, message: 'This link is invalid or has already been used.' };
    }

    return { showForm: true, token }; 
};   

// Remove the 'return' before success, and move redirect properly
export const actions = {
    resetPassword: async ({ request }) => {
        const formData = await request.formData();
        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword');
        const token = formData.get('token');

        if (!password || !confirmPassword || !token) {
            return fail(400, { message: 'All fields are required.' });
        }

        if (password !== confirmPassword) {
            return fail(400, { message: 'Passwords do not match.' });
        }

        try {
            const userProfile = await Profile.findOne({ resetPasswordToken: token });

            if (!userProfile || Date.now() > userProfile.resetTokenExpiry) {
                return fail(400, { message: 'Link expired or invalid.' });
            }

            await auth.updateKeyPassword('email', userProfile.email, password);
            userProfile.resetPasswordToken = null;
            userProfile.resetTokenExpiry = 0;
            await userProfile.save();

        } catch (err) {
            console.error('Password reset error:', err);
            return fail(500, { message: 'Something went wrong on the server.' });
        }

        // ✅ redirect is now reachable, outside the try/catch
        throw redirect(303, '/login');
    }
};