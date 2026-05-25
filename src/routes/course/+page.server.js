import { fail, redirect } from '@sveltejs/kit';
import { fetchCourseinfo } from '$lib/server/mongoLoads.js';
import { error } from '@sveltejs/kit';
import { Section } from '$lib/server/models/Section.js';

export async function load() {
    const records = await fetchCourseinfo();

    // Fetch section counts for all courses
    const sectionDocs = await Section.find({}, { courseId: 1, sections: 1 }).lean();

    // Build a map: courseId → section count
    const sectionCountMap = {};
    for (const doc of sectionDocs) {
        sectionCountMap[doc.courseId] = doc.sections?.length ?? 0;
    }

    // Attach section count to each course
    const courses = JSON.parse(JSON.stringify(records));
    const enriched = (courses.records ?? courses).map(course => ({
        ...course,
        sectionsCount: sectionCountMap[course.courseId] ?? 0,
    }));

    return {
        courseInfo: {
            records: enriched,
        },
    };
}