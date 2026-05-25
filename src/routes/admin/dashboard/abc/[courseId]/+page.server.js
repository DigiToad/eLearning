import { error } from "@sveltejs/kit";

import { Courseinfo } from "$lib/server/models/Courseinfo.js";
import { Section } from "$lib/server/models/Section.js";
import { SubSection } from "$lib/server/models/SubSection.js";

import { fail } from "@sveltejs/kit";
export async function load({ params }) {
    const { courseId } = params;

    // fetch course
    const course = await Courseinfo.findOne({
        courseId
    }).lean();

    if (!course) {
        throw error(404, `Course "${courseId}" not found.`);
    }

    // fetch sections
    const sectionData = await Section.findOne({
        courseId
    }).lean();
    const subSections = await SubSection.find({ courseId }).lean();
    return {
        course: JSON.parse(JSON.stringify(course)),

        // all sections
        sections: JSON.parse(
            JSON.stringify(sectionData?.sections || [])
        ),
        sectionDocId: sectionData?._id?.toString() ?? "",
        subSections: JSON.parse(JSON.stringify(subSections)),
        courseId
    };
}


export const actions = {
    createVideoLesson: async ({ request }) => {
        const data = await request.formData();

        const courseId = data.get("courseId")?.toString().trim();
        const sectionId = data.get("sectionId")?.toString().trim();
        const moduleSectionId = data.get("moduleSectionId")?.toString().trim();
        const title = data.get("title")?.toString().trim();
        const videoUrl = data.get("videoUrl")?.toString().trim();
        const duration = parseInt(data.get("duration") || "0");

        if (!courseId || !sectionId || !moduleSectionId)
            return fail(400, { type: "video", serverError: "Missing section or course information." });
        if (!title || title.length < 3)
            return fail(400, { type: "video", serverError: "Title must be at least 3 characters." });
        if (!videoUrl)
            return fail(400, { type: "video", serverError: "Video URL is required." });

        try {
            // Check for duplicate title within the same section
            const existing = await SubSection.findOne({
                courseId,
                moduleSectionId,
                title
            });

            if (existing) {
                return fail(400, {
                    type: "video",
                    serverError: `A lesson named "${title}" already exists in this section.`
                });
            }

            await SubSection.create({
                courseId,
                sectionId,
                moduleSectionId,
                title,
                videoUrl,
                duration: isNaN(duration) ? 0 : duration,
                type: "video",
                status: "draft"
            });

            return { success: true, type: "video" };

        } catch (err) {
            console.error("createVideoLesson error:", err);
            return fail(500, { type: "video", serverError: "Failed to save lesson. Please try again." });
        }
    },
    updateVideoLesson: async ({ request }) => {
        // await connectDB();
        const data = await request.formData();

        const lessonId = data.get("lessonId")?.toString().trim();
        const title = data.get("title")?.toString().trim();
        const videoUrl = data.get("videoUrl")?.toString().trim();
        const duration = parseInt(data.get("duration") || "0");

        if (!lessonId) {
            return fail(400, {
                type: "video",
                serverError: "Lesson ID is missing."
            });
        }
        if (!title || title.length < 3) {
            return fail(400, {
                type: "video",
                serverError: "Title must be at least 3 characters."
            });
        }
        if (!videoUrl) {
            return fail(400, {
                type: "video",
                serverError: "Video URL is required."
            });
        }

        try {
            const updated = await SubSection.findByIdAndUpdate(
                lessonId,
                {
                    $set: {
                        title,
                        videoUrl,
                        duration: isNaN(duration) ? 0 : duration
                    }
                },
                { new: true }
            );

            if (!updated) {
                return fail(404, {
                    type: "video",
                    serverError: "Lesson not found."
                });
            }

            return { success: true, type: "video" };

        } catch (err) {
            console.error("updateVideoLesson error:", err);
            return fail(500, {
                type: "video",
                serverError: "Failed to update lesson. Please try again."
            });
        }
    },
    createAssessmentLesson: async ({ request }) => {
        const data = await request.formData();
        const courseId = data.get("courseId")?.toString().trim();
        const sectionId = data.get("sectionId")?.toString().trim();
        const moduleSectionId = data.get("moduleSectionId")?.toString().trim();
        const title = data.get("title")?.toString().trim();
        const questionsRaw = data.get("questions")?.toString();

        if (!courseId || !sectionId || !moduleSectionId)
            return fail(400, { type: "assessment", serverError: "Missing section or course information." });
        if (!title || title.length < 3)
            return fail(400, { type: "assessment", serverError: "Title must be at least 3 characters." });

        let questions = [];
        try { questions = JSON.parse(questionsRaw || "[]"); }
        catch { return fail(400, { type: "assessment", serverError: "Invalid questions format." }); }

        if (!questions.length)
            return fail(400, { type: "assessment", serverError: "At least one question is required." });

        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            if (!q.question?.trim())
                return fail(400, { type: "assessment", serverError: `Question ${i + 1} text is required.` });
            if (!q.options || q.options.length < 2)
                return fail(400, { type: "assessment", serverError: `Question ${i + 1} needs at least 2 options.` });
        }

        try {
            // Prevent duplicate title within same section
            const existing = await SubSection.findOne({ courseId, moduleSectionId, title });
            if (existing) {
                return fail(400, {
                    type: "assessment",
                    serverError: `An assessment named "${title}" already exists in this section.`
                });
            }

            await SubSection.create({
                courseId,
                sectionId,
                moduleSectionId,
                title,
                type: "assessment",
                questions,
                status: "draft"
            });

            return { success: true, type: "assessment" };

        } catch (err) {
            console.error("createAssessmentLesson error:", err);
            return fail(500, { type: "assessment", serverError: "Failed to save assessment. Please try again." });
        }
    },
    updateAssessmentLesson: async ({ request }) => {
        // await connectDB();
        const data = await request.formData();

        const lessonId = data.get("lessonId")?.toString().trim();
        const title = data.get("title")?.toString().trim();
        const questionsRaw = data.get("questions")?.toString();

        if (!lessonId) {
            return fail(400, {
                type: "assessment",
                serverError: "Lesson ID is missing."
            });
        }
        if (!title || title.length < 3) {
            return fail(400, {
                type: "assessment",
                serverError: "Title must be at least 3 characters."
            });
        }

        let questions = [];
        try {
            questions = JSON.parse(questionsRaw || "[]");
        } catch {
            return fail(400, {
                type: "assessment",
                serverError: "Invalid questions format."
            });
        }

        if (!questions.length) {
            return fail(400, {
                type: "assessment",
                serverError: "At least one question is required."
            });
        }

        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            if (!q.question?.trim()) {
                return fail(400, {
                    type: "assessment",
                    serverError: `Question ${i + 1} text is required.`
                });
            }
            if (!q.options || q.options.length < 2) {
                return fail(400, {
                    type: "assessment",
                    serverError: `Question ${i + 1} needs at least 2 options.`
                });
            }
        }

        try {
            const updated = await SubSection.findByIdAndUpdate(
                lessonId,
                { $set: { title, questions } },
                { new: true }
            );

            if (!updated) {
                return fail(404, {
                    type: "assessment",
                    serverError: "Assessment not found."
                });
            }

            return { success: true, type: "assessment" };

        } catch (err) {
            console.error("updateAssessmentLesson error:", err);
            return fail(500, {
                type: "assessment",
                serverError: "Failed to update assessment. Please try again."
            });
        }
    },
    addSection: async ({ request }) => {
        try {
            const data = await request.formData();

            const courseId = data.get("courseId")?.toString().trim();
            const title = data.get("title")?.toString().trim();

            if (!courseId) {
                return fail(400, { serverError: "Course ID is required." });
            }

            if (!title || title.length < 3 || title.length > 100) {
                return fail(422, { serverError: "Chapter title must be between 3 and 100 characters." });
            }

            // Find existing Section doc for this course, or create a new one
            const existing = await Section.findOne({ courseId });

            if (existing) {
                // Push the new section into the existing document
                const nextOrder = (existing.sections?.length ?? 0) + 1;

                await Section.findByIdAndUpdate(
                    existing._id,
                    {
                        $push: {
                            sections: { title, order: nextOrder }
                        }
                    },
                    { new: true }
                );
            } else {
                // First section for this course
                await Section.create({
                    courseId,
                    sections: [{ title, order: 1 }]
                });
            }

            return { success: true };

        } catch (err) {
            console.error("addSection error:", err);
            return fail(500, { serverError: "Failed to save chapter." });
        }
    },
    access: async ({ request }) => {
        const data = await request.formData();
        const courseId = data.get("courseId")?.toString().trim();
        const status = data.get("status")?.toString().trim();

        if (!courseId || !status) {
            return fail(400, { serverError: "Missing courseId or status." });
        }

        try {
            const updated = await Courseinfo.findOneAndUpdate(
                { courseId },
                { $set: { status } },
                { new: true }
            );

            if (!updated) return fail(404, { serverError: "Course not found." });

            return { success: true, type: "access", status };

        } catch (err) {
            console.error("access error:", err);
            return fail(500, { serverError: "Failed to update course status." });
        }
    },
};