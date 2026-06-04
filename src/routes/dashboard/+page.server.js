
import { error, redirect } from '@sveltejs/kit';
import { Courseinfo }    from '$lib/server/models/Courseinfo.js';
import { UserProgress }  from '$lib/server/models/UserProgress.js';
import Profile from '$lib/server/models/Profile.js';
export async function load({ locals }) {
    // ── Auth guard ────────────────────────────────────────────────────────────
    const rawUser = locals.user ?? null;
    console.log(rawUser,"rawUserrawUserrawUser");
    
    if (!rawUser) throw redirect(302, '/login');

    const userId    = String(rawUser?.userId ?? rawUser.id ?? '');
    console.log(userId,"userIduserIduserId");
    
    const userEmail = rawUser.email ?? '';
    if (!userId) throw redirect(302, '/login');

    try {
        // ── Profile ───────────────────────────────────────────────────────────
        // Your Profile model has: { userId, firstName, lastName, acessedcourse[], institution, branch, ... }
        // The field "acessedcourse" (single 'c') is the array of purchased courseIds.
        const profile = await Profile.findOne({ userId });
        console.log(profile,"profileprofileprofile");
        
        const accessedCourseIds = profile?.acessedcourse ?? [];

        // ── Courses ───────────────────────────────────────────────────────────
        const courses = accessedCourseIds.length
            ? await Courseinfo.find(
                { courseId: { $in: accessedCourseIds }, status: 'published' },
                { courseId: 1, title: 1, description: 1, image: 1,
                  instructor: 1, level: 1, price: 1, totalLessons: 1, category: 1, _id: 0 }
              ).lean()
            : [];

        // ── UserProgress ──────────────────────────────────────────────────────
        const progressDocs = accessedCourseIds.length
            ? await UserProgress.find(
                { userId, courseId: { $in: accessedCourseIds } },
                { courseId: 1, lessons: 1, firstSeenAt: 1, updatedAt: 1, _id: 0 }
              ).lean()
            : [];

        // Quick lookup map: courseId → progressDoc
        const progressMap = {};
        for (const p of progressDocs) {
            progressMap[p.courseId] = p;
        }

        // ── Merge courses + progress ──────────────────────────────────────────
        const enrolledCourses = courses.map(course => {
            const prog   = progressMap[course.courseId] ?? null;
            const lessons = prog?.lessons ?? [];

            const completedVideos      = lessons.filter(l => l.lessonType === 'video').length;
            const completedAssessments = lessons.filter(l => l.lessonType === 'assessment' && l.assessmentPassed).length;
            const totalCompleted       = lessons.length;

            const totalLessons  = course.totalLessons ?? 1;
            const completionPct = Math.min(100, Math.round((totalCompleted / totalLessons) * 100));

            const lastLesson = lessons.length
                ? [...lessons].sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))[0]
                : null;

            return {
                ...course,
                progress: {
                    completionPct,
                    totalCompleted,
                    totalLessons,
                    completedVideos,
                    completedAssessments,
                    lastActivity:    prog?.updatedAt    ? prog.updatedAt.toISOString()    : null,
                    firstSeenAt:     prog?.firstSeenAt  ? prog.firstSeenAt.toISOString()  : null,
                    lastLessonTitle: lastLesson?.lessonTitle ?? null,
                    lastModuleTitle: lastLesson?.moduleTitle ?? null,
                    started:         !!prog,
                },
            };
        });

        // ── Summary stats ─────────────────────────────────────────────────────
        const stats = {
            totalEnrolled:        enrolledCourses.length,
            totalCompleted:       enrolledCourses.filter(c => c.progress.completionPct === 100).length,
            inProgress:           enrolledCourses.filter(c => c.progress.completionPct > 0 && c.progress.completionPct < 100).length,
            notStarted:           enrolledCourses.filter(c => !c.progress.started).length,
            totalLessonsCompleted: progressDocs.reduce((s, p) => s + (p.lessons?.length ?? 0), 0),
        };

        return {
            authedUser: {
                id:    userId,
                email: userEmail,
                name:  rawUser.firstname ?? rawUser.name ?? '',
            },
            profile:         JSON.parse(JSON.stringify(profile ?? {})),
            enrolledCourses: JSON.parse(JSON.stringify(enrolledCourses)),
            stats,
        };

    } catch (err) {
        if (err?.status) throw err;
        console.error('Dashboard load error:', err.stack);
        throw error(500, err?.message || 'Internal Server Error');
    }
}