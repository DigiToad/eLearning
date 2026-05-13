// src/routes/admin/dashboard/courses/[courseId]/+page.server.js
import { fail, redirect, error } from '@sveltejs/kit';
import { Course, CourseDraft } from '$lib/server/models/Courses.js';

// ─── Load ─────────────────────────────────────────────────────────────────────
export async function load({ params }) {
  const { courseId } = params;

  // Try published course first, then fall back to draft
  let course = await Course.findOne({ id: courseId }).lean();
  let isDraft = false;

  if (!course) {
    const draft = await CourseDraft.findOne({ courseId }).lean();
    if (draft) {
      course = draft.courseData;
      isDraft = true;
    }
  }

  if (!course) {
    throw error(404, `Course "${courseId}" not found.`);
  }

  return {
    course:  JSON.parse(JSON.stringify(course)),
    isDraft,
    courseId
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// FORM ACTIONS
// ═════════════════════════════════════════════════════════════════════════════
export const actions = {

  // ── Edit top-level course info ────────────────────────────────────────────
  editCourse: async ({ request, params }) => {
    const { courseId } = params;
    const data = await request.formData();

    const title       = data.get('title')?.toString().trim();
    const category    = data.get('category')?.toString().trim();
    const instructor  = data.get('instructor')?.toString().trim();
    const level       = data.get('level')?.toString();
    const description = data.get('description')?.toString().trim();
    const image       = data.get('image')?.toString().trim();
    const tags        = data.get('tags')?.toString() ?? '';
    const status      = data.get('status')?.toString();

    const errs = {};
    if (!title)       errs.title       = 'Course name is required.';
    if (!category)    errs.category    = 'Category is required.';
    if (!instructor)  errs.instructor  = 'Instructor name is required.';
    if (!level)       errs.level       = 'Level is required.';
    if (!description) errs.description = 'Description is required.';
    if (!image)       errs.image       = 'Thumbnail URL is required.';

    if (Object.keys(errs).length)
      return fail(422, { action: 'editCourse', errors: errs, values: Object.fromEntries(data) });

    try {
      await Course.findOneAndUpdate(
        { id: courseId },
        {
          title, category, instructor, level, description, image, status,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          instructorAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(instructor)}`
        },
        { new: true }
      );
      return { action: 'editCourse', success: true };
    } catch (err) {
      return fail(500, { action: 'editCourse', serverError: err.message });
    }
  },

  // ── Edit a specific module title & passMark ───────────────────────────────
  editModule: async ({ request, params }) => {
    const { courseId } = params;
    const data = await request.formData();

    const moduleId  = data.get('moduleId')?.toString();
    const title     = data.get('moduleTitle')?.toString().trim();
    const passMark  = parseInt(data.get('passMark')?.toString() ?? '70');

    if (!title)
      return fail(422, { action: 'editModule', moduleId, error: 'Module title is required.' });
    if (isNaN(passMark) || passMark < 0 || passMark > 100)
      return fail(422, { action: 'editModule', moduleId, error: 'Pass mark must be 0–100.' });

    try {
      await Course.findOneAndUpdate(
        { id: courseId, 'modules.id': moduleId },
        { $set: { 'modules.$.title': title, 'modules.$.passMark': passMark } }
      );
      return { action: 'editModule', success: true, moduleId };
    } catch (err) {
      return fail(500, { action: 'editModule', serverError: err.message });
    }
  },

  // ── Edit a specific lesson ────────────────────────────────────────────────
  editLesson: async ({ request, params }) => {
    const { courseId } = params;
    const data = await request.formData();

    const moduleId        = data.get('moduleId')?.toString();
    const lessonId        = data.get('lessonId')?.toString();
    const title           = data.get('lessonTitle')?.toString().trim();
    const videoUrl        = data.get('videoUrl')?.toString().trim();
    const durationSeconds = parseInt(data.get('durationSeconds')?.toString() ?? '0');

    const errs = {};
    if (!title)    errs.lessonTitle     = 'Lesson title is required.';
    if (!videoUrl) errs.videoUrl        = 'Video URL is required.';
    if (!durationSeconds || isNaN(durationSeconds))
      errs.durationSeconds = 'Valid duration in seconds is required.';

    if (Object.keys(errs).length)
      return fail(422, { action: 'editLesson', lessonId, moduleId, errors: errs });

    try {
      // Use positional $ filtered operator to update nested lesson
      await Course.findOneAndUpdate(
        { id: courseId },
        {
          $set: {
            'modules.$[mod].lessons.$[les].title':           title,
            'modules.$[mod].lessons.$[les].videoUrl':        videoUrl,
            'modules.$[mod].lessons.$[les].durationSeconds': durationSeconds
          }
        },
        {
          arrayFilters: [{ 'mod.id': moduleId }, { 'les.id': lessonId }],
          new: true
        }
      );

      // Recalculate duration
      const course = await Course.findOne({ id: courseId }).lean();
      let totalSecs = 0;
      let totalLessons = 0;
      for (const mod of course.modules) {
        for (const les of mod.lessons) { totalSecs += les.durationSeconds; totalLessons++; }
      }
      const h = Math.floor(totalSecs / 3600);
      const m = Math.floor((totalSecs % 3600) / 60);
      await Course.findOneAndUpdate(
        { id: courseId },
        { duration: m ? `${h}h ${m}m` : `${h}h`, totalLessons }
      );

      return { action: 'editLesson', success: true, lessonId };
    } catch (err) {
      return fail(500, { action: 'editLesson', serverError: err.message });
    }
  },

  // ── Delete a lesson ───────────────────────────────────────────────────────
  deleteLesson: async ({ request, params }) => {
    const { courseId } = params;
    const data = await request.formData();

    const moduleId = data.get('moduleId')?.toString();
    const lessonId = data.get('lessonId')?.toString();

    try {
      await Course.findOneAndUpdate(
        { id: courseId, 'modules.id': moduleId },
        { $pull: { 'modules.$.lessons': { id: lessonId } } }
      );

      // Recalculate duration + totalLessons
      const course = await Course.findOne({ id: courseId }).lean();
      let totalSecs = 0;
      let totalLessons = 0;
      for (const mod of course.modules) {
        for (const les of mod.lessons) { totalSecs += les.durationSeconds; totalLessons++; }
      }
      const h = Math.floor(totalSecs / 3600);
      const m = Math.floor((totalSecs % 3600) / 60);
      await Course.findOneAndUpdate(
        { id: courseId },
        { duration: m ? `${h}h ${m}m` : `${h}h`, totalLessons }
      );

      return { action: 'deleteLesson', success: true };
    } catch (err) {
      return fail(500, { action: 'deleteLesson', serverError: err.message });
    }
  },

  // ── Delete a module (and all its lessons/assessment) ─────────────────────
  deleteModule: async ({ request, params }) => {
    const { courseId } = params;
    const data = await request.formData();
    const moduleId = data.get('moduleId')?.toString();

    try {
      await Course.findOneAndUpdate(
        { id: courseId },
        { $pull: { modules: { id: moduleId } } }
      );
      // Recalculate
      const course = await Course.findOne({ id: courseId }).lean();
      let totalSecs = 0;
      let totalLessons = 0;
      for (const mod of course.modules) {
        for (const les of mod.lessons) { totalSecs += les.durationSeconds; totalLessons++; }
      }
      const h = Math.floor(totalSecs / 3600);
      const m = Math.floor((totalSecs % 3600) / 60);
      await Course.findOneAndUpdate(
        { id: courseId },
        { duration: m ? `${h}h ${m}m` : `${h}h`, totalLessons }
      );
      return { action: 'deleteModule', success: true };
    } catch (err) {
      return fail(500, { action: 'deleteModule', serverError: err.message });
    }
  },

  // ── Delete the entire course ──────────────────────────────────────────────
  deleteCourse: async ({ request, params }) => {
    const { courseId } = params;
    try {
      await Course.deleteOne({ id: courseId });
      await CourseDraft.deleteOne({ courseId });
    } catch (err) {
      return fail(500, { action: 'deleteCourse', serverError: err.message });
    }
    throw redirect(303, '/admin/dashboard/courses');
  },

  // ── Toggle published / draft status ──────────────────────────────────────
  toggleStatus: async ({ request, params }) => {
    const { courseId } = params;
    const data = await request.formData();
    const current = data.get('currentStatus')?.toString();
    const next = current === 'published' ? 'draft' : 'published';
    try {
      await Course.findOneAndUpdate({ id: courseId }, { status: next });
      return { action: 'toggleStatus', success: true, status: next };
    } catch (err) {
      return fail(500, { action: 'toggleStatus', serverError: err.message });
    }
  },

  // ── Replace assessment for a module ──────────────────────────────────────
  replaceAssessment: async ({ request, params }) => {
    const { courseId } = params;
    const data     = await request.formData();
    const moduleId = data.get('moduleId')?.toString();
    const file     = data.get('assessmentFile');

    if (!file || file.size === 0)
      return fail(422, { action: 'replaceAssessment', moduleId, error: 'Please select a JSON file.' });
    if (!file.name.endsWith('.json'))
      return fail(422, { action: 'replaceAssessment', moduleId, error: 'File must be .json.' });

    let parsed;
    try { parsed = JSON.parse(await file.text()); }
    catch { return fail(422, { action: 'replaceAssessment', moduleId, error: 'Invalid JSON file.' }); }

    // Validate
    const errs = [];
    if (!parsed.title) errs.push('Missing "title".');
    if (!Array.isArray(parsed.questions) || !parsed.questions.length)
      errs.push('"questions" array is required and must be non-empty.');
    (parsed.questions || []).forEach((q, qi) => {
      if (!q.text) errs.push(`Q[${qi}] missing "text".`);
      if (!['mcq','truefalse'].includes(q.type)) errs.push(`Q[${qi}] invalid type.`);
      if (!Array.isArray(q.options) || q.options.length < 2) errs.push(`Q[${qi}] needs ≥2 options.`);
      else if (!q.options.some(o => o.isCorrect === true)) errs.push(`Q[${qi}] needs a correct option.`);
    });
    if (errs.length)
      return fail(422, { action: 'replaceAssessment', moduleId, error: errs.join(' | ') });

    const assessment = {
      id:              `asmnt-${moduleId}`,
      title:           parsed.title,
      passMark:        parsed.passMark ?? 70,
      attemptsAllowed: parsed.attemptsAllowed ?? 3,
      questions:       parsed.questions.map((q, qi) => ({
        id:      q.id || `q-${moduleId}-${qi}`,
        text:    q.text,
        type:    q.type,
        options: q.options.map((o, oi) => ({
          id:        o.id || `opt-${qi}-${oi}`,
          text:      o.text,
          isCorrect: o.isCorrect
        }))
      }))
    };

    try {
      await Course.findOneAndUpdate(
        { id: courseId, 'modules.id': moduleId },
        { $set: { 'modules.$.assessment': assessment } }
      );
      return { action: 'replaceAssessment', success: true, moduleId };
    } catch (err) {
      return fail(500, { action: 'replaceAssessment', serverError: err.message });
    }
  }
};