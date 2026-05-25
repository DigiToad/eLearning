// // src/routes/admin/dashboard/courses/+page.server.js
// import { fail, redirect } from '@sveltejs/kit';
// import {
//   createCourseDraft,
//   uploadLesson,
//   uploadAssessment,
//   setModuleTitle,
//   publishCourse,
//   getAllCourses,
//   getAllDrafts,
//   getDraft,
//   updateCourse
// } from '$lib/server/mongoActions.js';
// import { Course, CourseDraft } from '$lib/server/models/Courses.js';
// // ─── Single Load Function ─────────────────────────────────────────────────────
// export async function load({ url }) {
//   const courseId  = url.searchParams.get('courseId');
//   const page      = parseInt(url.searchParams.get('page') ?? '1');
//   const search    = url.searchParams.get('search') ?? '';
//   const pageSize  = 10;

//   try {
//     const [coursesResult, drafts] = await Promise.all([
//       getAllCourses({ page, search, pageSize }),
//       getAllDrafts()
//     ]);

//     let activeDraft = null;
//     if (courseId) {
//       activeDraft = await getDraft(courseId);
//     }

//     return {
//       courses:     JSON.parse(JSON.stringify(coursesResult.records)),
//       courseId :courseId,
//       totalCount:  coursesResult.totalCount,
//       drafts:      JSON.parse(JSON.stringify(drafts)),
//       activeDraft: activeDraft ? JSON.parse(JSON.stringify(activeDraft)) : null,
//       currentPage: page,
//       search
//     };
//   } catch (err) {
//     console.error('Course load error:', err);
//     return {
//       courses:     [],
//       totalCount:  0,
//       drafts:      [],
//       activeDraft: null,
//       currentPage: 1,
//       search:      ''
//     };
//   }
// }

// // ═════════════════════════════════════════════════════════════════════════════
// // FORM ACTIONS
// // ═════════════════════════════════════════════════════════════════════════════
// export const actions = {
// updateCourse: async ({ request }) => {
//     const fd = await request.formData();

//     await updateCourse({
//       courseId: fd.get('courseId'),
//       title: fd.get('title'),
//       category: fd.get('category'),
//       instructor: fd.get('instructor'),
//       description: fd.get('description'),
//       level: fd.get('level'),
//       tags: fd.get('tags'),
//       image: fd.get('image')
//     });

//     return {
//       success: true,
//       step: 'updateCourse'
//     };
//   },
//   // ── Action 1: Create course ───────────────────────────────────────────────
//   createCourse: async ({ request }) => {
//     const data = await request.formData();

//     const title           = data.get('title')?.toString().trim();
//     const category        = data.get('category')?.toString().trim();
//     const instructor      = data.get('instructor')?.toString().trim();
//     const level           = data.get('level')?.toString();
//     const description     = data.get('description')?.toString().trim();
//     const image           = data.get('image')?.toString().trim();
//     const tags            = data.get('tags')?.toString() ?? '';
//     // const totalVideos     = data.get('totalVideos')?.toString();
//     // const numberOfModules = data.get('numberOfModules')?.toString();

//     const errs = {};
//     if (!title)           errs.title           = 'Course name is required.';
//     if (!category)        errs.category        = 'Category is required.';
//     if (!instructor)      errs.instructor      = 'Instructor name is required.';
//     if (!level)           errs.level           = 'Level is required.';
//     if (!description)     errs.description     = 'Description is required.';
//     if (!image)           errs.image           = 'Thumbnail URL is required.';
//     // if (!totalVideos || isNaN(+totalVideos) || +totalVideos < 1)
//     //   errs.totalVideos = 'Enter a valid number of videos (≥1).';
//     // if (!numberOfModules || isNaN(+numberOfModules) || +numberOfModules < 1)
//     //   errs.numberOfModules = 'Enter a valid number of modules (≥1).';

//     if (Object.keys(errs).length)
//       return fail(422, { step: 'createCourse', errors: errs, values: Object.fromEntries(data) });

//     try {
//       const draft = await createCourseDraft({
//         title, category, instructor, level,
//         description, image, tags
//       });
//       throw redirect(303, `/admin/dashboard/courses?courseId=${draft.courseId}`);
//     } catch (err) {
//       if (err.status === 303) throw err;
//       return fail(500, { step: 'createCourse', serverError: err.message });
//     }
//   },

//   // ── Action 2: Set module title ────────────────────────────────────────────
//   setModuleTitle: async ({ request }) => {
//     const data        = await request.formData();
//     const courseId    = data.get('courseId')?.toString();
//     const moduleIndex = data.get('moduleIndex')?.toString();
//     const title       = data.get('moduleTitle')?.toString().trim();

//     if (!title)
//       return fail(422, { step: 'setModuleTitle', moduleIndex, error: 'Module title is required.' });

//     try {
//       await setModuleTitle({ courseId, moduleIndex, title });
//       return { step: 'setModuleTitle', success: true, moduleIndex };
//     } catch (err) {
//       return fail(500, { step: 'setModuleTitle', serverError: err.message });
//     }
//   },

//   // ── Action 3: Upload lesson ───────────────────────────────────────────────
//   uploadLesson: async ({ request }) => {
//     const data            = await request.formData();
//     const courseId        = data.get('courseId')?.toString();
//     const moduleIndex     = data.get('moduleIndex')?.toString();
//     const lessonTitle     = data.get('lessonTitle')?.toString().trim();
//     const videoUrl        = data.get('videoUrl')?.toString().trim();
//     const durationSeconds = data.get('durationSeconds')?.toString();

//     const errs = {};
//     if (!lessonTitle)  errs.lessonTitle     = 'Lesson title is required.';
//     if (!videoUrl)     errs.videoUrl        = 'Video URL is required.';
//     if (!durationSeconds || isNaN(+durationSeconds))
//       errs.durationSeconds = 'Enter a valid duration in seconds.';

//     if (Object.keys(errs).length)
//       return fail(422, { step: 'uploadLesson', errors: errs, moduleIndex });

//     try {
//       const draft = await uploadLesson({ courseId, moduleIndex, lessonTitle, videoUrl, durationSeconds });
//       return { step: 'uploadLesson', success: true, draft: JSON.parse(JSON.stringify(draft)) };
//     } catch (err) {
//       return fail(500, { step: 'uploadLesson', serverError: err.message, moduleIndex });
//     }
//   },

//   // ── Action 4: Upload assessment JSON ─────────────────────────────────────
//   // uploadAssessment: async ({ request }) => {
//   //   const data        = await request.formData();
//   //   const courseId    = data.get('courseId')?.toString();
//   //   const moduleIndex = data.get('moduleIndex')?.toString();
//   //   const file        = data.get('assessmentFile');

//   //   if (!file || file.size === 0)
//   //     return fail(422, { step: 'uploadAssessment', moduleIndex, error: 'Please select a JSON file.' });

//   //   if (!file.name.endsWith('.json'))
//   //     return fail(422, { step: 'uploadAssessment', moduleIndex, error: 'File must be a .json file.' });

//   //   const text = await file.text();

//   //   try {
//   //     const draft = await uploadAssessment({ courseId, moduleIndex, assessmentJson: text });
//   //     return { step: 'uploadAssessment', success: true, draft: JSON.parse(JSON.stringify(draft)) };
//   //   } catch (err) {
//   //     return fail(422, { step: 'uploadAssessment', moduleIndex, error: err.message });
//   //   }
//   // },
// uploadAssessment: async ({ request }) => {
//   const data        = await request.formData();
//   const courseId    = data.get('courseId')?.toString();
//   const moduleIndex = data.get('moduleIndex')?.toString();

//   // ── Path A: manual / type-questions mode ─────────────────────────────
//   // The client sets assessmentJson directly when mode === "manual".
//   const inlineJson = data.get('assessmentJson')?.toString();
//   if (inlineJson) {
//     try {
//       const draft = await uploadAssessment({ courseId, moduleIndex, assessmentJson: inlineJson });
//       return { step: 'uploadAssessment', success: true, draft: JSON.parse(JSON.stringify(draft)) };
//     } catch (err) {
//       return fail(422, { step: 'uploadAssessment', moduleIndex, error: err.message });
//     }
//   }

//   // ── Path B: file upload mode ──────────────────────────────────────────
//   const file = data.get('assessmentFile');

//   if (!file || file.size === 0)
//     return fail(422, { step: 'uploadAssessment', moduleIndex, error: 'Please select a JSON file.' });

//   if (!file.name.endsWith('.json'))
//     return fail(422, { step: 'uploadAssessment', moduleIndex, error: 'File must be a .json file.' });

//   const text = await file.text();
//   try {
//     const draft = await uploadAssessment({ courseId, moduleIndex, assessmentJson: text });
//     return { step: 'uploadAssessment', success: true, draft: JSON.parse(JSON.stringify(draft)) };
//   } catch (err) {
//     return fail(422, { step: 'uploadAssessment', moduleIndex, error: err.message });
//   }
// },
//   // ── Action 5: Publish course ──────────────────────────────────────────────
//   publishCourse: async ({ request }) => {
//     const data     = await request.formData();
//     const courseId = data.get('courseId')?.toString();

//     try {
//       const course = await publishCourse({ courseId });
//       throw redirect(303, `/admin/dashboard/courses?published=${course.id}`);
//     } catch (err) {
//       if (err.status === 303) throw err;
//       return fail(500, { step: 'publishCourse', serverError: err.message });
//     }
//   }
// };




// src/routes/admin/dashboard/courses/+page.server.js
import { fail, redirect } from '@sveltejs/kit';
import {
  createCourseDraft,
  uploadLesson,
  uploadAssessment,
  setModuleTitle,
  publishCourse,
  getAllCourses,
  getAllDrafts,
  getDraft,
  updateCourse,
  addModule,
  setModuleAssessmentFlag
} from '$lib/server/mongoActions.js';

// ─── Load ─────────────────────────────────────────────────────────────────────
export async function load({ url }) {
  const courseId = url.searchParams.get('courseId');
  const page     = parseInt(url.searchParams.get('page') ?? '1');
  const search   = url.searchParams.get('search') ?? '';
  const pageSize = 10;

  try {
    const [coursesResult, drafts] = await Promise.all([
      getAllCourses({ page, search, pageSize }),
      getAllDrafts()
    ]);

    let activeDraft = null;
    if (courseId) {
      activeDraft = await getDraft(courseId);
    }

    return {
      courses:     JSON.parse(JSON.stringify(coursesResult.records)),
      totalCount:  coursesResult.totalCount,
      drafts:      JSON.parse(JSON.stringify(drafts)),
      activeDraft: activeDraft ? JSON.parse(JSON.stringify(activeDraft)) : null,
      currentPage: page,
      search
    };
  } catch (err) {
    console.error('Course load error:', err);
    return {
      courses:     [],
      totalCount:  0,
      drafts:      [],
      activeDraft: null,
      currentPage: 1,
      search:      ''
    };
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// FORM ACTIONS
// ═════════════════════════════════════════════════════════════════════════════
export const actions = {

  // ── Action: Create course draft ───────────────────────────────────────────
  createCourse: async ({ request }) => {
    const data = await request.formData();

    const title       = data.get('title')?.toString().trim();
    const category    = data.get('category')?.toString().trim();
    const instructor  = data.get('instructor')?.toString().trim();
    const level       = data.get('level')?.toString();
    const description = data.get('description')?.toString().trim();
    const image       = data.get('image')?.toString().trim();
    const tags        = data.get('tags')?.toString() ?? '';

    const errs = {};
    if (!title)       errs.title       = 'Course name is required.';
    if (!category)    errs.category    = 'Category is required.';
    if (!instructor)  errs.instructor  = 'Instructor name is required.';
    if (!level)       errs.level       = 'Level is required.';
    if (!description) errs.description = 'Description is required.';
    if (!image)       errs.image       = 'Thumbnail URL is required.';

    if (Object.keys(errs).length)
      return fail(422, {
        step:   'createCourse',
        errors: errs,
        values: Object.fromEntries(data)
      });

    try {
      const draft = await createCourseDraft({
        title, category, instructor, level, description, image, tags
      });
      throw redirect(303, `/admin/dashboard/courses?courseId=${draft.courseId}`);
    } catch (err) {
      if (err.status === 303) throw err;
      return fail(500, { step: 'createCourse', serverError: err.message });
    }
  },

  // ── Action: Update course details ─────────────────────────────────────────
  updateCourse: async ({ request }) => {
    const fd = await request.formData();

    const courseId    = fd.get('courseId')?.toString();
    const title       = fd.get('title')?.toString().trim();
    const category    = fd.get('category')?.toString().trim();
    const instructor  = fd.get('instructor')?.toString().trim();
    const level       = fd.get('level')?.toString();
    const description = fd.get('description')?.toString().trim();
    const tags        = fd.get('tags')?.toString() ?? '';
    const image       = fd.get('image')?.toString().trim();

    if (!courseId)
      return fail(400, { step: 'updateCourse', serverError: 'Missing courseId.' });

    try {
      await updateCourse({ courseId, title, category, instructor, description, level, tags, image });
      return { success: true, step: 'updateCourse' };
    } catch (err) {
      return fail(500, { step: 'updateCourse', serverError: err.message });
    }
  },

  // ── Action: Add a module dynamically ──────────────────────────────────────
  addModule: async ({ request }) => {
    const data     = await request.formData();
    const courseId = data.get('courseId')?.toString();

    if (!courseId)
      return fail(400, { step: 'addModule', serverError: 'Missing courseId.' });

    try {
      await addModule({ courseId });
      return { success: true, step: 'addModule' };
    } catch (err) {
      return fail(500, { step: 'addModule', serverError: err.message });
    }
  },

  // ── Action: Set hasAssessment flag per module ──────────────────────────────
  setModuleAssessmentFlag: async ({ request }) => {
    const data         = await request.formData();
    const courseId     = data.get('courseId')?.toString();
    const moduleIndex  = data.get('moduleIndex')?.toString();
    const rawFlag      = data.get('hasAssessment')?.toString();

    if (!courseId || moduleIndex === undefined || moduleIndex === null)
      return fail(400, { step: 'setModuleAssessmentFlag', serverError: 'Missing courseId or moduleIndex.' });

    // Accept "true"/"false" strings and convert to boolean
    if (rawFlag !== 'true' && rawFlag !== 'false')
      return fail(400, { step: 'setModuleAssessmentFlag', serverError: 'hasAssessment must be "true" or "false".' });

    const hasAssessment = rawFlag === 'true';

    try {
      await setModuleAssessmentFlag({ courseId, moduleIndex, hasAssessment });
      return { success: true, step: 'setModuleAssessmentFlag' };
    } catch (err) {
      return fail(500, { step: 'setModuleAssessmentFlag', serverError: err.message });
    }
  },

  // ── Action: Set module title ──────────────────────────────────────────────
  setModuleTitle: async ({ request }) => {
    const data        = await request.formData();
    const courseId    = data.get('courseId')?.toString();
    const moduleIndex = data.get('moduleIndex')?.toString();
    const title       = data.get('moduleTitle')?.toString().trim();

    if (!title)
      return fail(422, {
        step:        'setModuleTitle',
        moduleIndex,
        error:       'Module title is required.'
      });

    try {
      await setModuleTitle({ courseId, moduleIndex, title });
      return { step: 'setModuleTitle', success: true, moduleIndex };
    } catch (err) {
      return fail(500, { step: 'setModuleTitle', serverError: err.message });
    }
  },

  // ── Action: Upload lesson ─────────────────────────────────────────────────
  uploadLesson: async ({ request }) => {
    const data            = await request.formData();
    const courseId        = data.get('courseId')?.toString();
    const moduleIndex     = data.get('moduleIndex')?.toString();
    const lessonTitle     = data.get('lessonTitle')?.toString().trim();
    const videoUrl        = data.get('videoUrl')?.toString().trim();
    const durationSeconds = data.get('durationSeconds')?.toString();

    const errs = {};
    if (!lessonTitle)                                       errs.lessonTitle     = 'Lesson title is required.';
    if (!videoUrl)                                         errs.videoUrl        = 'Video URL is required.';
    if (!durationSeconds || isNaN(+durationSeconds) || +durationSeconds < 1)
      errs.durationSeconds = 'Enter a valid duration in seconds (≥1).';

    if (Object.keys(errs).length)
      return fail(422, { step: 'uploadLesson', errors: errs, moduleIndex });

    try {
      const draft = await uploadLesson({
        courseId, moduleIndex, lessonTitle, videoUrl, durationSeconds
      });
      return {
        step:    'uploadLesson',
        success: true,
        draft:   JSON.parse(JSON.stringify(draft))
      };
    } catch (err) {
      return fail(500, { step: 'uploadLesson', serverError: err.message, moduleIndex });
    }
  },

  // ── Action: Upload / save assessment ─────────────────────────────────────
  //   Supports two paths:
  //   A) manual mode  → client serialises questions to `assessmentJson`
  //   B) file mode    → client also serialises parsed file to `assessmentJson`
  //   The raw file upload path (path B legacy) is kept as fallback.
  uploadAssessment: async ({ request }) => {
    const data        = await request.formData();
    const courseId    = data.get('courseId')?.toString();
    const moduleIndex = data.get('moduleIndex')?.toString();

    if (!courseId || moduleIndex === undefined)
      return fail(400, { step: 'uploadAssessment', moduleIndex, error: 'Missing courseId or moduleIndex.' });

    // Path A & B: assessmentJson already serialised by the client
    const inlineJson = data.get('assessmentJson')?.toString();
    if (inlineJson) {
      try {
        const draft = await uploadAssessment({ courseId, moduleIndex, assessmentJson: inlineJson });
        return {
          step:    'uploadAssessment',
          success: true,
          draft:   JSON.parse(JSON.stringify(draft))
        };
      } catch (err) {
        return fail(422, { step: 'uploadAssessment', moduleIndex, error: err.message });
      }
    }

    // Legacy fallback: raw .json file upload (no client-side parse)
    const file = data.get('assessmentFile');
    if (!file || file.size === 0)
      return fail(422, { step: 'uploadAssessment', moduleIndex, error: 'Please provide an assessment.' });

    const text = await file.text();
    try {
      const draft = await uploadAssessment({ courseId, moduleIndex, assessmentJson: text });
      return {
        step:    'uploadAssessment',
        success: true,
        draft:   JSON.parse(JSON.stringify(draft))
      };
    } catch (err) {
      return fail(422, { step: 'uploadAssessment', moduleIndex, error: err.message });
    }
  },

  // ── Action: Publish course ────────────────────────────────────────────────
  publishCourse: async ({ request }) => {
    const data     = await request.formData();
    const courseId = data.get('courseId')?.toString();

    if (!courseId)
      return fail(400, { step: 'publishCourse', serverError: 'Missing courseId.' });

    try {
      const course = await publishCourse({ courseId });
      throw redirect(303, `/admin/dashboard/courses?published=${course.id}`);
    } catch (err) {
      if (err.status === 303) throw err;
      return fail(500, { step: 'publishCourse', serverError: err.message });
    }
  }
};