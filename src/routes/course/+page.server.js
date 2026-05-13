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