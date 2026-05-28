import { redirect } from '@sveltejs/kit';
import { ADMIN_EMAIL } from '$env/static/private';
import { Courseinfo } from '$lib/server/models/Courseinfo.js';
import Profile from '$lib/server/models/Profile.js';
import User from '$lib/server/models/User.js';

const PAGE_SIZE = 10;

export const load = async ({ locals, url }) => {
    // if (!locals.user) throw redirect(302, '/admin/login');

    // const authedUser = { id: locals.user.userId };
    // const userProfile = await Profile.findOne({ userId: authedUser.id });
    // if (!userProfile) throw redirect(302, '/admin/login');

    const search = url.searchParams.get('search')?.trim() || '';
    const page   = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const skip   = (page - 1) * PAGE_SIZE;

    try {
        // Build search filter against User (email) and Profile (institution)
        let userIds = null;

        if (search) {
            // Find profiles whose institution matches
            const matchedProfiles = await Profile.find({
                institution: { $regex: search, $options: 'i' }
            }).select('userId').lean();

            const profileUserIds = matchedProfiles.map((p) => p.userId?.toString());

            // Find users whose email matches
            const matchedUsers = await User.find({
                email: { $regex: search, $options: 'i' }
            }).select('_id').lean();

            const emailUserIds = matchedUsers.map((u) => u._id.toString());

            // Union of both sets
            userIds = [...new Set([...profileUserIds, ...emailUserIds])];
        }

        // Build query filter
        const userFilter = userIds !== null
            ? { _id: { $in: userIds } }
            : {};

        const [totalCount, users, profiles, courses] = await Promise.all([
            User.countDocuments(userFilter),
            User.find(userFilter).skip(skip).limit(PAGE_SIZE).lean(),
            Profile.find({}).lean(),
            Courseinfo.find({}).lean()
        ]);

        const profileMap = new Map(profiles.map((p) => [p.userId?.toString(), p]));

        const enrichedUsers = users.map((user) => {
            const profile = profileMap.get(user._id?.toString()) || {};
            return {
                userId:      user._id.toString(),
                name:        user.name           || profile.firstName        || '',
                email:       user.email          || '',
                phone:       profile.phone       || '',
                institution: profile.institution || '',
                accessedcourse : profile.acessedcourse || '',
            };
        });

        const courseList = courses.map((c) => ({
            _id:      c._id.toString(),
            courseId: c.courseId || c._id.toString(),
            title:    c.title   || c.courseName || ''
        }));

        return {
            users:      enrichedUsers,
            courses:    courseList,
            isAdmin:    ADMIN_EMAIL,
            search,
            pagination: {
                page,
                pageSize:  PAGE_SIZE,
                total:     totalCount,
                totalPages: Math.ceil(totalCount / PAGE_SIZE)
            }
        };

    } catch (error) {
        console.error('Error in load:', error);
        return {
            users: [], courses: [], search: '',
            pagination: { page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 1 },
            error: 'Unexpected error loading registrants'
        };
    }
};

export const actions = {
    // grantAccess: async ({ request }) => {
    //     const formData = await request.formData();
    //     const email       = formData.get('email');
    //     const courseId    = formData.get('courseId');
    //     const courseTitle = formData.get('courseTitle');

    //     if (!email || !courseId || !courseTitle) {
    //         return { success: false, message: 'email, courseId and courseTitle are required.' };
    //     }

    //     try {
    //         // ── Your access-grant logic here ──────────────────────────────
    //         // e.g. await Enrollment.create({ email, courseId, courseTitle, grantedAt: new Date() });
    //         // ─────────────────────────────────────────────────────────────

    //         console.log(`[grantAccess] email: ${email} | courseId: ${courseId} | course: ${courseTitle}`);
    //         return { success: true, message: `Access granted to "${courseTitle}" for ${email}.` };
    //     } catch (error) {
    //         console.error('Error in grantAccess:', error);
    //         return { success: false, message: 'Failed to grant access.' };
    //     }
    // },
    grantAccess: async ({ request }) => {
        const formData    = await request.formData();
        const email       = formData.get('email');
        const coursesJson = formData.get('coursesJson');
 
        if (!email || !coursesJson) {
            return { success: false, message: 'email and coursesJson are required.' };
        }
 
        let courses;
        try {
            courses = JSON.parse(coursesJson);
            if (!Array.isArray(courses) || courses.length === 0) throw new Error();
        } catch {
            return { success: false, message: 'coursesJson must be a non-empty JSON array.' };
        }
 
        try {
            const courseIds = courses.map(c => c.courseId);
 
            // Step 1: fetch current profile to check existing acessedcourse type
            const profile = await Profile.findOne({ email }).lean();
 
            if (!profile) {
                return { success: false, message: `No profile found for ${email}.` };
            }
 
            const existing = profile.acessedcourse;
 
            let currentArray = [];
            if (Array.isArray(existing)) {
                currentArray = existing;
            } else if (existing && typeof existing === 'string') {
                // Old doc — migrate: wrap the string into an array
                currentArray = [existing];
            }
 
            // Merge, deduplicating
            const merged = [...new Set([...currentArray, ...courseIds])];
 
            // Step 2: overwrite with clean array (works regardless of old field type)
            await Profile.updateOne(
                { email },
                { $set: { acessedcourse: merged } }
            );
 
            const label = courses.length === 1
                ? `Access granted to "${courses[0].courseTitle}" for ${email}.`
                : `Access granted to ${courses.length} courses for ${email}.`;
 
            return { success: true, message: label };
 
        } catch (error) {
            console.error('Error in grantAccess:', error);
            return { success: false, message: 'Failed to grant access. ' + error.message };
        }
    },
 
    revokeAccess: async ({ request }) => {
        const formData    = await request.formData();
        const email       = formData.get('email');
        const coursesJson = formData.get('coursesJson');
 
        if (!email || !coursesJson) {
            return { success: false, message: 'email and coursesJson are required.' };
        }
 
        let courses;
        try {
            courses = JSON.parse(coursesJson);
            if (!Array.isArray(courses) || courses.length === 0) throw new Error();
        } catch {
            return { success: false, message: 'coursesJson must be a non-empty JSON array.' };
        }
 
        try {
            const courseIds = courses.map(c => String(c.courseId));
 
            const profile = await Profile.findOne({ email }).lean();
            if (!profile) {
                return { success: false, message: `No profile found for ${email}.` };
            }
 
            const existing = profile.acessedcourse;
            let currentArray = [];
            if (Array.isArray(existing)) {
                currentArray = existing.map(String);
            } else if (existing && typeof existing === 'string') {
                currentArray = [existing];
            }
 
            // Remove the revoked ones
            const remaining = currentArray.filter(id => !courseIds.includes(id));
 
            await Profile.updateOne(
                { email },
                { $set: { acessedcourse: remaining } }
            );
 
            const label = courses.length === 1
                ? `Access revoked for "${courses[0].courseTitle}" from ${email}.`
                : `Access revoked for ${courses.length} courses from ${email}.`;
 
            return { success: true, message: label };
 
        } catch (error) {
            console.error('Error in revokeAccess:', error);
            return { success: false, message: 'Failed to revoke access. ' + error.message };
        }
    },


    search: async ({ request, url }) => {
        // Search is handled via GET (load), this just redirects with query params
        const formData = await request.formData();
        const search = formData.get('search')?.trim() || '';
        throw redirect(303, `?search=${encodeURIComponent(search)}&page=1`);
    }
};