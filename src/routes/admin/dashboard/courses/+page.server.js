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
  getDraft
} from '$lib/server/mongoActions.js';

// ─── Single Load Function ─────────────────────────────────────────────────────
export async function load({ url }) {
  const courseId  = url.searchParams.get('courseId');
  const page      = parseInt(url.searchParams.get('page') ?? '1');
  const search    = url.searchParams.get('search') ?? '';
  const pageSize  = 10;

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
      courseId :courseId,
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

  // ── Action 1: Create course ───────────────────────────────────────────────
  createCourse: async ({ request }) => {
    const data = await request.formData();

    const title           = data.get('title')?.toString().trim();
    const category        = data.get('category')?.toString().trim();
    const instructor      = data.get('instructor')?.toString().trim();
    const level           = data.get('level')?.toString();
    const description     = data.get('description')?.toString().trim();
    const image           = data.get('image')?.toString().trim();
    const tags            = data.get('tags')?.toString() ?? '';
    const totalVideos     = data.get('totalVideos')?.toString();
    const numberOfModules = data.get('numberOfModules')?.toString();

    const errs = {};
    if (!title)           errs.title           = 'Course name is required.';
    if (!category)        errs.category        = 'Category is required.';
    if (!instructor)      errs.instructor      = 'Instructor name is required.';
    if (!level)           errs.level           = 'Level is required.';
    if (!description)     errs.description     = 'Description is required.';
    if (!image)           errs.image           = 'Thumbnail URL is required.';
    if (!totalVideos || isNaN(+totalVideos) || +totalVideos < 1)
      errs.totalVideos = 'Enter a valid number of videos (≥1).';
    if (!numberOfModules || isNaN(+numberOfModules) || +numberOfModules < 1)
      errs.numberOfModules = 'Enter a valid number of modules (≥1).';

    if (Object.keys(errs).length)
      return fail(422, { step: 'createCourse', errors: errs, values: Object.fromEntries(data) });

    try {
      const draft = await createCourseDraft({
        title, category, instructor, level,
        description, image, tags, totalVideos, numberOfModules
      });
      throw redirect(303, `/admin/dashboard/courses?courseId=${draft.courseId}`);
    } catch (err) {
      if (err.status === 303) throw err;
      return fail(500, { step: 'createCourse', serverError: err.message });
    }
  },

  // ── Action 2: Set module title ────────────────────────────────────────────
  setModuleTitle: async ({ request }) => {
    const data        = await request.formData();
    const courseId    = data.get('courseId')?.toString();
    const moduleIndex = data.get('moduleIndex')?.toString();
    const title       = data.get('moduleTitle')?.toString().trim();

    if (!title)
      return fail(422, { step: 'setModuleTitle', moduleIndex, error: 'Module title is required.' });

    try {
      await setModuleTitle({ courseId, moduleIndex, title });
      return { step: 'setModuleTitle', success: true, moduleIndex };
    } catch (err) {
      return fail(500, { step: 'setModuleTitle', serverError: err.message });
    }
  },

  // ── Action 3: Upload lesson ───────────────────────────────────────────────
  uploadLesson: async ({ request }) => {
    const data            = await request.formData();
    const courseId        = data.get('courseId')?.toString();
    const moduleIndex     = data.get('moduleIndex')?.toString();
    const lessonTitle     = data.get('lessonTitle')?.toString().trim();
    const videoUrl        = data.get('videoUrl')?.toString().trim();
    const durationSeconds = data.get('durationSeconds')?.toString();

    const errs = {};
    if (!lessonTitle)  errs.lessonTitle     = 'Lesson title is required.';
    if (!videoUrl)     errs.videoUrl        = 'Video URL is required.';
    if (!durationSeconds || isNaN(+durationSeconds))
      errs.durationSeconds = 'Enter a valid duration in seconds.';

    if (Object.keys(errs).length)
      return fail(422, { step: 'uploadLesson', errors: errs, moduleIndex });

    try {
      const draft = await uploadLesson({ courseId, moduleIndex, lessonTitle, videoUrl, durationSeconds });
      return { step: 'uploadLesson', success: true, draft: JSON.parse(JSON.stringify(draft)) };
    } catch (err) {
      return fail(500, { step: 'uploadLesson', serverError: err.message, moduleIndex });
    }
  },

  // ── Action 4: Upload assessment JSON ─────────────────────────────────────
  uploadAssessment: async ({ request }) => {
    const data        = await request.formData();
    const courseId    = data.get('courseId')?.toString();
    const moduleIndex = data.get('moduleIndex')?.toString();
    const file        = data.get('assessmentFile');

    if (!file || file.size === 0)
      return fail(422, { step: 'uploadAssessment', moduleIndex, error: 'Please select a JSON file.' });

    if (!file.name.endsWith('.json'))
      return fail(422, { step: 'uploadAssessment', moduleIndex, error: 'File must be a .json file.' });

    const text = await file.text();

    try {
      const draft = await uploadAssessment({ courseId, moduleIndex, assessmentJson: text });
      return { step: 'uploadAssessment', success: true, draft: JSON.parse(JSON.stringify(draft)) };
    } catch (err) {
      return fail(422, { step: 'uploadAssessment', moduleIndex, error: err.message });
    }
  },

  // ── Action 5: Publish course ──────────────────────────────────────────────
  publishCourse: async ({ request }) => {
    const data     = await request.formData();
    const courseId = data.get('courseId')?.toString();

    try {
      const course = await publishCourse({ courseId });
      throw redirect(303, `/admin/dashboard/courses?published=${course.id}`);
    } catch (err) {
      if (err.status === 303) throw err;
      return fail(500, { step: 'publishCourse', serverError: err.message });
    }
  }
};