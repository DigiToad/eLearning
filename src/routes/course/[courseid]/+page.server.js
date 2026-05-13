import { error } from '@sveltejs/kit';
import { Course } from '$lib/server/models/Courses.js';

export async function load({ params }) {
  const courseId = params.courseid;
  if (!courseId) throw error(400, 'Missing course ID');

  try {
    const course = await Course.findOne({ id: courseId }).lean();
    if (!course) throw error(404, `Course "${courseId}" not found.`);
    const plainCourse = JSON.parse(JSON.stringify(course));
    return { course: plainCourse, courseId };
  } catch (err) {
    if (err?.status) throw err;
    console.error('SERVER ERROR:', err.stack);
    throw error(500, err?.message || 'Internal Server Error');
  }
}