import { redirect } from '@sveltejs/kit';
import { ADMIN_EMAIL } from '$env/static/private';
import { Courseinfo } from '$lib/server/models/Courseinfo.js';
import Profile from '$lib/server/models/Profile.js';
import User from '$lib/server/models/User.js';
import { emailTemplates } from '$lib/email/templates.js'
import { sendNotificationEmail, sendEmailToUser } from '$lib/server/emailNotification.js';
import { APP_URL } from '$env/static/private';
import { PUBLIC_WEBSITE_NAME } from '$env/static/public';
const Digitoad = PUBLIC_WEBSITE_NAME;
const PAGE_SIZE = 10;

export const load = async ({ locals, url }) => {
    const search = url.searchParams.get('search')?.trim() || '';
    const page   = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const skip   = (page - 1) * PAGE_SIZE;

    try {
        let userIds = null;

        if (search) {
            const matchedProfiles = await Profile.find({
                institution: { $regex: search, $options: 'i' }
            }).select('userId').lean();

            const profileUserIds = matchedProfiles.map((p) => p.userId?.toString());

            const matchedUsers = await User.find({
                email: { $regex: search, $options: 'i' }
            }).select('_id').lean();

            const emailUserIds = matchedUsers.map((u) => u._id.toString());
            userIds = [...new Set([...profileUserIds, ...emailUserIds])];
        }

        const userFilter = userIds !== null ? { _id: { $in: userIds } } : {};

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
                userId:           user._id.toString(),
                name:             user.name || profile.firstName || '',
                email:            user.email || '',
                phone:            profile.phone || '',
                institution:      profile.institution || '',
                accessedcourse:   profile.acessedcourse || [],
                interestedcourse: profile.interestedcourse || [],
            };
        });

        const courseList = courses.map((c) => ({
            _id:      c._id.toString(),
            courseId: c.courseId || c._id.toString(),
            title:    c.title || c.courseName || ''
        }));

        return {
            users: enrichedUsers,
            courses: courseList,
            isAdmin: ADMIN_EMAIL,
            search,
            pagination: {
                page,
                pageSize:   PAGE_SIZE,
                total:      totalCount,
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
grantAccess: async ({ request }) => {
    const formData    = await request.formData();
    const email       = formData.get('email');
    const coursesJson = formData.get('coursesJson');

    if (!email || !coursesJson)
        return { success: false, message: 'email and coursesJson are required.' };

    let courses;
    try {
        courses = JSON.parse(coursesJson);
        if (!Array.isArray(courses) || courses.length === 0) throw new Error();
    } catch {
        return { success: false, message: 'coursesJson must be a non-empty JSON array.' };
    }

    try {
        const courseIds = courses.map((c) => c.courseId);
        const profile   = await Profile.findOne({ email }).lean();
        if (!profile)
            return { success: false, message: `No profile found for ${email}.` };

        const existing     = profile.acessedcourse;
        const currentArray = Array.isArray(existing) ? existing : existing ? [existing] : [];
        const merged       = [...new Set([...currentArray, ...courseIds])];

        await Profile.updateOne({ email }, { $set: { acessedcourse: merged } });
        const userName = `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim() || email;

        for (const course of courses) {
            const courseUrl      = `${APP_URL}/course/${course.courseId}`;
            const emailContent   = emailTemplates.courseAccessGranted({
                userName,
                courseName:  course.courseTitle,
                courseUrl,
                websiteName: Digitoad,
            });

            await sendEmailToUser(
                `You now have access to "${course.courseTitle}" | ${Digitoad}`,
                emailContent,
                email
            ).catch((err) => console.error(`❌ Email failed for course ${course.courseId}:`, err));
        }

        const label = courses.length === 1
            ? `Access granted to "${courses[0].courseTitle}" for ${email}.`
            : `Access granted to ${courses.length} courses for ${email}.`;

        return { success: true, message: label };

    } catch (error) {
        console.error('grantAccess error:', error);
        return { success: false, message: 'Failed to grant access. ' + error.message };
    }
},
    revokeAccess: async ({ request }) => {
        const formData    = await request.formData();
        const email       = formData.get('email');
        const coursesJson = formData.get('coursesJson');

        if (!email || !coursesJson)
            return { success: false, message: 'email and coursesJson are required.' };

        let courses;
        try {
            courses = JSON.parse(coursesJson);
            if (!Array.isArray(courses) || courses.length === 0) throw new Error();
        } catch {
            return { success: false, message: 'coursesJson must be a non-empty JSON array.' };
        }

        try {
            const courseIds = courses.map((c) => String(c.courseId));
            const profile   = await Profile.findOne({ email }).lean();

            if (!profile)
                return { success: false, message: `No profile found for ${email}.` };

            const existing     = profile.acessedcourse;
            const currentArray = Array.isArray(existing)
                ? existing.map(String)
                : existing ? [String(existing)] : [];
            const remaining    = currentArray.filter((id) => !courseIds.includes(id));

            await Profile.updateOne({ email }, { $set: { acessedcourse: remaining } });

            const label = courses.length === 1
                ? `Access revoked for "${courses[0].courseTitle}" from ${email}.`
                : `Access revoked for ${courses.length} courses from ${email}.`;

            return { success: true, message: label };

        } catch (error) {
            console.error('revokeAccess error:', error);
            return { success: false, message: 'Failed to revoke access. ' + error.message };
        }
    },
grantFromInterest: async ({ request }) => {

    const formData   = await request.formData();
    const email      = formData.get('email');
    const userId     = formData.get('userId');
    const courseId   = formData.get('courseId');
    const courseName = formData.get('courseName');

    console.log('📋 [grantFromInterest] Form data:', { email, userId, courseId, courseName });

    if (!email || !userId || !courseId)
        return { success: false, message: 'Missing required fields.' };

    try {
        const profile = await Profile.findOne({ email }).lean();
        if (!profile) {
            console.warn('⚠️ No profile found for:', email);
            return { success: false, message: `No profile found for ${email}.` };
        }

        console.log('✅ Profile found:', { email: profile.email });

        const existing     = profile.acessedcourse;
        const currentArray = Array.isArray(existing) ? existing : existing ? [existing] : [];
        const merged       = [...new Set([...currentArray, courseId])];

        await Profile.updateOne(
            { email },
            {
                $set:  { acessedcourse: merged },
                $pull: { interestedcourse: { courseId } },
            }
        );
        console.log('✅ DB update successful');

        // Build email
        const courseUrl = `${APP_URL}/course/${courseId}`;
        const userName  = `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim() || email;

        const userEmailContent = emailTemplates?.courseAccessGranted({
            userName,
            courseName,
            courseUrl,
            websiteName: Digitoad,
        });

        console.log('📤 Sending access email to:', email);

        // ✅ Use sendEmail directly — it accepts (subject, html, recipientEmail)
        await sendEmailToUser(
            `You now have access to "${courseName}" | ${Digitoad}`,
            userEmailContent,
            email
        ).catch((err) => console.error('❌ Course access email failed:', err));

        console.log('✅ Email sent to:', email);
        return { success: true, message: `Access granted to "${courseName}" for ${email}.` };

    } catch (error) {
        console.error('❌ grantFromInterest error:', error.message);
        return { success: false, message: 'Failed to grant access. ' + error.message };
    }
},

    // grantFromInterest: async ({ request }) => {
    //     const formData   = await request.formData();
    //     const email      = formData.get('email');
    //     const userId     = formData.get('userId');
    //     const courseId   = formData.get('courseId');
    //     const courseName = formData.get('courseName');

    //     if (!email || !userId || !courseId)
    //         return { success: false, message: 'Missing required fields.' };

    //     try {
    //         const profile = await Profile.findOne({ email }).lean();
    //         if (!profile)
    //             return { success: false, message: `No profile found for ${email}.` };

    //         const existing     = profile.acessedcourse;
    //         const currentArray = Array.isArray(existing) ? existing : existing ? [existing] : [];
    //         const merged       = [...new Set([...currentArray, courseId])];

    //         // Grant access + remove from interestedcourse atomically
    //         await Profile.updateOne(
    //             { email },
    //             {
    //                 $set:  { acessedcourse: merged },
    //                 $pull: { interestedcourse: { courseId } },
    //             }
    //         );

    //         return { success: true, message: `Access granted to "${courseName}" for ${email}.` };

    //     } catch (error) {
    //         console.error('grantFromInterest error:', error);
    //         return { success: false, message: 'Failed to grant access. ' + error.message };
    //     }
    // },

    // ── Dismiss interest: remove from interestedcourse without granting access
    dismissInterest: async ({ request }) => {
        const formData = await request.formData();
        const userId   = formData.get('userId');
        const courseId = formData.get('courseId');

        if (!userId || !courseId)
            return { success: false, message: 'Missing required fields.' };

        try {
            await Profile.updateOne(
                { userId },
                { $pull: { interestedcourse: { courseId } } }
            );
            return { success: true, message: 'Interest dismissed.' };

        } catch (error) {
            console.error('dismissInterest error:', error);
            return { success: false, message: 'Failed to dismiss. ' + error.message };
        }
    },

    search: async ({ request }) => {
        const formData = await request.formData();
        const search   = formData.get('search')?.trim() || '';
        throw redirect(303, `?search=${encodeURIComponent(search)}&page=1`);
    }
};