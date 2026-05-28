// import { error } from '@sveltejs/kit';
// import { Courseinfo } from "$lib/server/models/Courseinfo.js";
// import { Section } from '$lib/server/models/Section.js';
// import { SubSection } from '$lib/server/models/SubSection.js';

// export async function load({ params }) {
//     const courseId = params.courseid;
//     if (!courseId) throw error(400, 'Missing course ID');

//     try {
//         // ── Course ──────────────────────────────────────────────────────────
//         const course = await Courseinfo.findOne({ courseId }).lean();
//         if (!course) throw error(404, `Course "${courseId}" not found.`);

//         // ── Section doc (one per course) ─────────────────────────────────────
//         // Your Section model has: { courseId, sections: [{title, order, _id}] }
//         const sectionDoc = await Section.findOne({ courseId }).lean();
//         const innerSections = sectionDoc?.sections ?? [];   // the module list
// console.log(sectionDoc,"sectionDocsectionDocsectionDoc");

//         // ── All subsections for this course ──────────────────────────────────
//         // SubSection has: { courseId, sectionId (→ sectionDoc._id),
//         //                   moduleSectionId (→ innerSection._id),
//         //                   title, type, videoUrl, duration, questions[] }
//         const subsections = sectionDoc
//             ? await SubSection.find({ sectionId: sectionDoc._id }).lean()
//             : [];



//         // ── Build modules array ───────────────────────────────────────────────
//         const modules = innerSections
//             .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
//             .map(sec => ({
//                 id:    String(sec._id),
//                 title: sec.title,
//                 order: sec.order,
//                 lessons: subsections
//                     .filter(sub => String(sub.moduleSectionId) === String(sec._id))
//                     .map(sub => ({
//                         id:              String(sub._id),
//                         title:           sub.title,
//                         type:            sub.type,            // 'video' | 'assessment'
//                         videoUrl:        sub.videoUrl ?? '',
//                         durationSeconds: sub.duration ?? 0,
//                         questions:       sub.questions ?? [], // [{ question, options[], answer }]
//                         status:          sub.status,
//                     })),
//             }));

//         return {
//             course: JSON.parse(JSON.stringify({
//                 ...course,
//                 modules,
//                 totalLessons: modules.reduce((acc, m) => acc + m.lessons.length, 0),
//             })),
//             courseId,
//         };

//     } catch (err) {
//         if (err?.status) throw err;
//         console.error('SERVER ERROR:', err.stack);
//         throw error(500, err?.message || 'Internal Server Error');
//     }
// }



// src/routes/course/[courseid]/+page.server.js
import { error, fail } from '@sveltejs/kit';
import { Courseinfo } from "$lib/server/models/Courseinfo.js";
import { Section } from '$lib/server/models/Section.js';
import { SubSection } from '$lib/server/models/SubSection.js';
import { UserProgress } from '$lib/server/models/UserProgress.js';

// ── Load ──────────────────────────────────────────────────────────────────────
export async function load({ params, locals }) {
  const courseId = params.courseid;
  if (!courseId) throw error(400, 'Missing course ID');

  try {
    const course = await Courseinfo.findOne({ courseId, status: "published" }).lean();
    if (!course) throw error(404, `Course "${courseId}" not found.`);

    const sectionDoc = await Section.findOne({ courseId }).lean();
    const innerSections = sectionDoc?.sections ?? [];

    const subsections = sectionDoc
      ? await SubSection.find({ sectionId: sectionDoc._id }).lean()
      : [];

    const modules = innerSections
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map(sec => ({
        id: String(sec._id),
        title: sec.title,
        order: sec.order,
        lessons: subsections
          .filter(sub => String(sub.moduleSectionId) === String(sec._id))
          .map(sub => ({
            id: String(sub._id),
            title: sub.title,
            type: sub.type,
            videoUrl: sub.videoUrl ?? '',
            durationSeconds: sub.duration ?? 0,
            questions: sub.questions ?? [],
            status: sub.status,
          })),
      }));

    // ── Expose user to the page ──────────────────────────────────────────
    // locals.user is set by your auth hook (hooks.server.js).
    // Adjust the field names below to match your User model
    // e.g. if your model uses `_id` change id: locals.user._id
    // locals.user from Lucia has: { id, userId, email, firstname, ... }
    const rawUser = locals.user ?? null;
    if (!rawUser) console.warn('[load] No user in locals — ?/report will not fire');

    const authedUser = rawUser
      ? {
        id: String(rawUser.userId ?? rawUser.id ?? ''),
        email: rawUser.email ?? '',
        name: rawUser.firstname ?? rawUser.name ?? '',
      }
      : null;

    return {
      course: JSON.parse(JSON.stringify({
        ...course,
        sectionId: String(sectionDoc?._id ?? ''),
        modules,
        totalLessons: modules.reduce((acc, m) => acc + m.lessons.length, 0),
      })),
      courseId,
      authedUser,
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
};