
import { error, fail } from '@sveltejs/kit';
import { Courseinfo } from "$lib/server/models/Courseinfo.js";
import { Section } from '$lib/server/models/Section.js';
import { SubSection } from '$lib/server/models/SubSection.js';
import { UserProgress } from '$lib/server/models/UserProgress.js';
import Profile from '$lib/server/models/Profile.js';
import { emailTemplates } from '$lib/email/templates.js';
import { sendNotificationEmail, sendEmailToUser } from '$lib/server/emailNotification.js';
import { contactUsstore } from "$lib/server/mongoActions.js";
import { APP_URL } from '$env/static/private';
import { PUBLIC_WEBSITE_NAME } from '$env/static/public';
const Digitoad = PUBLIC_WEBSITE_NAME;
export async function load({ params, locals }) {
    const courseId = params.courseid;
    if (!courseId) throw error(400, 'Missing course ID');

    try {
        // ── Course ────────────────────────────────────────────────────────────
        const course = await Courseinfo.findOne({ courseId, status: 'published' }).lean();
        if (!course) throw error(404, `Course "${courseId}" not found.`);

        // ── Sections & Subsections ────────────────────────────────────────────
        const sectionDoc    = await Section.findOne({ courseId }).lean();
        const innerSections = sectionDoc?.sections ?? [];
        const subsections   = sectionDoc
            ? await SubSection.find({ sectionId: sectionDoc._id }).lean()
            : [];

        const modules = innerSections
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .map(sec => ({
                id:    String(sec._id),
                title: sec.title,
                order: sec.order,
                lessons: subsections
                    .filter(sub => String(sub.moduleSectionId) === String(sec._id))
                    .map(sub => ({
                        id:              String(sub._id),
                        title:           sub.title,
                        type:            sub.type,
                        videoUrl:        sub.videoUrl ?? '',
                        durationSeconds: sub.duration ?? 0,
                        questions:       sub.questions ?? [],
                        status:          sub.status,
                    })),
            }));

        // ── Auth user ─────────────────────────────────────────────────────────
        const rawUser = locals.user ?? null;
        if (!rawUser) console.warn('[load] No user in locals — progress will be null');

        const authedUser = rawUser
            ? {
                id:    String(rawUser.userId ?? rawUser.id ?? ''),
                email: rawUser.email ?? '',
                name:  rawUser.firstname ?? rawUser.name ?? '',
            }
            : null;

        // ── UserProgress for this user + course ───────────────────────────────
        let userProgress = null;

        if (authedUser?.id) {
            const progressDoc = await UserProgress.findOne(
                { userId: authedUser.id, courseId },
                { lessons: 1, firstSeenAt: 1, updatedAt: 1, _id: 0 }
            ).lean();

            if (progressDoc) {
                const lessons = progressDoc.lessons ?? [];

                // Build a quick lookup: subsectionId → lessonProgress
                const lessonMap = {};
                for (const l of lessons) {
                    lessonMap[l.subsectionId] = l;
                }

                const completedVideos      = lessons.filter(l => l.lessonType === 'video').length;
                const completedAssessments = lessons.filter(l => l.lessonType === 'assessment' && l.assessmentPassed).length;
                const totalCompleted       = lessons.length;
                const totalLessons         = course.totalLessons ?? 1;
                const completionPct        = Math.min(100, Math.round((totalCompleted / totalLessons) * 100));

                const lastLesson = lessons.length
                    ? [...lessons].sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))[0]
                    : null;

                userProgress = {
                    completionPct,
                    totalCompleted,
                    totalLessons,
                    completedVideos,
                    completedAssessments,
                    lastActivity:    progressDoc.updatedAt   ? progressDoc.updatedAt.toISOString()   : null,
                    firstSeenAt:     progressDoc.firstSeenAt ? progressDoc.firstSeenAt.toISOString() : null,
                    lastLessonTitle: lastLesson?.lessonTitle ?? null,
                    lastModuleTitle: lastLesson?.moduleTitle ?? null,
                    started:         true,
                    lessonMap,
                    lessons,
                };
            }
        }

        return {
            course: JSON.parse(JSON.stringify({
                ...course,
                sectionId:    String(sectionDoc?._id ?? ''),
                modules,
                totalLessons: modules.reduce((acc, m) => acc + m.lessons.length, 0),
            })),
            courseId,
            authedUser,
            // null if user not logged in or hasn't started the course yet
            userProgress: JSON.parse(JSON.stringify(userProgress ?? null)),
        };

    } catch (err) {
        if (err?.status) throw err;
        console.error('SERVER ERROR:', err.stack);
        throw error(500, err?.message || 'Internal Server Error');
    }
}

// ── Actions ───────────────────────────────────────────────────────────────────
export const actions = {
  report: async ({ request, locals }) => {
    let formData;
    try {
      formData = await request.formData();
    } catch (err) {
      console.error('Failed to parse formData:', err);
      return fail(400, { error: 'Invalid form data' });
    }

    const get = (key) => formData.get(key)?.toString().trim() ?? '';

    // Prefer server-side user from locals over client-sent values
    // (never trust userId/userEmail from the client in production)
    // locals.user from Lucia: { id, userId, email, firstname, ... }
    const serverUser = locals.user ?? null;
    const userId = serverUser
      ? String(serverUser.userId ?? serverUser.id ?? '')
      : get('userId');
    const userEmail = serverUser
      ? (serverUser.email ?? '')
      : get('userEmail');

    const courseId = get('courseId');
    const subsectionId = get('subsectionId');

    if (!userId || !courseId || !subsectionId) {
      console.error('Report action — missing fields:', { userId, courseId, subsectionId });
      return fail(400, { error: 'Missing required fields: userId, courseId, subsectionId' });
    }

    const lessonType = get('lessonType');
    const watchedSeconds = Number(get('watchedSeconds')) || 0;
    const durationSeconds = Number(get('durationSeconds')) || 0;

    let extraPayload = {};
    try {
      const raw = get('extraPayload');
      if (raw) extraPayload = JSON.parse(raw);
    } catch (e) {
      console.warn('Could not parse extraPayload JSON:', e.message);
    }

    // Build the lesson entry to store
    const lessonEntry = {
      subsectionId: subsectionId,
      lessonTitle: get('lessonTitle'),
      lessonType,
      moduleId: get('moduleId'),
      moduleTitle: get('moduleTitle'),
      sectionId: get('sectionId'),
      completedAt: new Date(get('completedAt') || Date.now()),
      updatedAt: new Date(),
    };

    if (lessonType === 'video') {
      lessonEntry.watchedSeconds = watchedSeconds;
      lessonEntry.durationSeconds = durationSeconds;
      lessonEntry.watchPct = durationSeconds
        ? Math.round((watchedSeconds / durationSeconds) * 100)
        : 0;
    }

    if (lessonType === 'assessment') {
      lessonEntry.assessmentScore = extraPayload.assessmentScore ?? 0;
      lessonEntry.assessmentPassed = extraPayload.assessmentPassed ?? false;
      lessonEntry.assessmentTotalAttempts = extraPayload.assessmentTotalAttempts ?? 1;
      lessonEntry.questionAnalytics = extraPayload.questionAnalytics ?? [];
    }

    try {
      // One document per (userId + courseId).
      // If a lesson entry for this subsectionId already exists → update it in place.
      // If not → push a new entry into the lessons array.
      const existing = await UserProgress.findOne({ userId, courseId });

      if (!existing) {
        // First lesson completed for this course — create the document
        await UserProgress.create({
          userId,
          userEmail,
          courseId,
          lessons: [lessonEntry],
          firstSeenAt: new Date(),
          updatedAt: new Date(),
        });
      } else {
        const lessonIdx = existing.lessons.findIndex(
          l => l.subsectionId === subsectionId
        );

        if (lessonIdx === -1) {
          // New lesson — push into array
          await UserProgress.updateOne(
            { userId, courseId },
            {
              $push: { lessons: lessonEntry },
              $set: { updatedAt: new Date(), userEmail },
            }
          );
        } else {
          // Lesson already recorded — update it in place using positional $
          const setFields = {};
          Object.entries(lessonEntry).forEach(([k, v]) => {
            setFields[`lessons.${lessonIdx}.${k}`] = v;
          });
          await UserProgress.updateOne(
            { userId, courseId },
            { $set: { ...setFields, updatedAt: new Date(), userEmail } }
          );
        }
      }

      console.log(`✅ Progress saved — user:${userId} course:${courseId} lesson:${subsectionId}`);
      return { ok: true };
    } catch (err) {
      console.error('Report action DB error:', err);
      return fail(500, { error: err?.message || 'Internal Server Error' });
    }
  },
  //  interested: async ({ request, locals }) => {
  //   let formData;
  //   try {
  //     formData = await request.formData();
  //   } catch (err) {
  //     return fail(400, { error: 'Invalid form data' });
  //   }

  //   const get = (key) => formData.get(key)?.toString().trim() ?? '';

  //   // Prefer server-side user from locals
  //   const serverUser = locals.user ?? null;
  //   const userId     = serverUser
  //     ? String(serverUser.userId ?? serverUser.id ?? '')
  //     : get('userId');
  //   const userEmail  = serverUser ? (serverUser.email ?? '') : get('userEmail');

  //   const courseId    = get('courseId');
  //   const courseName  = get('courseName');
  //   const coursePrice = get('coursePrice');

  //   if (!userId || !courseId) {
  //     return fail(400, { error: 'Missing userId or courseId' });
  //   }

  //   try {
  //     // Push courseId into interestedcourse array only if not already present
  //     await Profile.updateOne(
  //       { userId },
  //       {
  //         $addToSet: { interestedcourse: courseId },
  //         $set:      { updatedAt: new Date() },
  //       }
  //     );

  //     console.log(`✅ Interest saved — user:${userId} course:${courseId} (${courseName}) ₹${coursePrice}`);
  //     return { ok: true, type: 'interested' };
  //   } catch (err) {
  //     console.error('Interested action DB error:', err);
  //     return fail(500, { error: err?.message || 'Internal Server Error' });
  //   }
  // },
//   interested: async ({ request, locals }) => {
//   let formData;
//   try {
//     formData = await request.formData();
//   } catch (err) {
//     return fail(400, { error: 'Invalid form data' });
//   }

//   const get = (key) => formData.get(key)?.toString().trim() ?? '';

//   const serverUser = locals.user ?? null;
//   const userId     = serverUser
//     ? String(serverUser.userId ?? serverUser.id ?? '')
//     : get('userId');
//   const userEmail  = serverUser ? (serverUser.email ?? '') : get('userEmail');
//   const courseId   = get('courseId');
//   const courseName  = get('courseName');
//   const coursePrice = get('coursePrice');

//   if (!userId || !courseId) {
//     return fail(400, { error: 'Missing userId or courseId' });
//   }

//   try {
//     // Check if already interested — no duplicate push
//     const alreadyInterested = await Profile.exists({
//       userId,
//       'interestedcourse.courseId': courseId,
//     });

//     if (!alreadyInterested) {
//       await Profile.updateOne(
//         { userId },
//         {
//           $push: {
//             interestedcourse: { courseId, courseName, coursePrice, addedAt: new Date() }
//           },
//           $set: { updatedAt: new Date() },
//         }
//       );

//     } 

//     return { ok: true, type: 'interested' };
//   } catch (err) {
//     console.error('Interested action DB error:', err);
//     return fail(500, { error: err?.message || 'Internal Server Error' });
//   }
// },
interested: async ({ request, locals }) => {
  let formData;
  try {
    formData = await request.formData();
  } catch (err) {
    return fail(400, { error: 'Invalid form data' });
  }

  const get = (key) => formData.get(key)?.toString().trim() ?? '';

  const serverUser  = locals.user ?? null;
  const userId      = serverUser
    ? String(serverUser.userId ?? serverUser.id ?? '')
    : get('userId');
  const userEmail   = serverUser ? (serverUser.email ?? '') : get('userEmail');
  const courseId    = get('courseId');
  const courseName  = get('courseName');
  const coursePrice = get('coursePrice');

  if (!userId || !courseId) {
    return fail(400, { error: 'Missing userId or courseId' });
  }

  try {
    const alreadyInterested = await Profile.exists({
      userId,
      'interestedcourse.courseId': courseId,
    });

    if (!alreadyInterested) {
      const profile     = await Profile.findOne({ userId }).lean();
      const userName    = `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim() || userEmail;
      const institution = profile?.institution ?? '—';

      // 1️⃣ Store in DB first
      await Profile.updateOne(
        { userId },
        {
          $push: {
            interestedcourse: { courseId, courseName, coursePrice, addedAt: new Date() }
          },
          $set: { updatedAt: new Date() },
        }
      );

      // 2️⃣ Only send email after successful DB write
   // 2️⃣ Only send email after successful DB write
      const adminEmailContent = emailTemplates.courseInterestAdmin({
        userName,
        userEmail,
        institution,
        courseId,
        courseName,
        coursePrice,
        websiteName: Digitoad,
        appUrl: APP_URL,
      });

      await sendNotificationEmail(
        `New Course Interest — ${courseName} | ${Digitoad}`,
        adminEmailContent        // ✅ now a plain HTML string, not { subject, html }
      ).catch((err) => console.error('Course interest admin email failed:', err));

      console.log('✅ Interest saved & notification sent');
    }                            // closes if (!alreadyInterested)

    return { ok: true, type: 'interested' };
  } catch (err) {
    console.error('Interested action DB error:', err);
    return fail(500, { error: err?.message || 'Internal Server Error' });
  }
},
    

  
};