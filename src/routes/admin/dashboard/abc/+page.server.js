import { fail, redirect } from '@sveltejs/kit';
import {
    courseInfo, updateCourseInfo
} from '$lib/server/mongoActions.js';
import {
    fetchCourseinfoadmin
} from '$lib/server/mongoLoads.js';
import { error } from '@sveltejs/kit';
import { Section } from '$lib/server/models/Section.js';
import { Courseinfo } from '$lib/server/models/Courseinfo.js';
export async function load() {
    const records = await fetchCourseinfoadmin();
    return {
        courseInfo: JSON.parse(JSON.stringify(records)),

    };
}

export const actions = {
    createcourseinfo: async ({ request }) => {
        const formData = await request.formData();
        const body = Object.fromEntries(formData);
        try {
            const result = await courseInfo(body);
            return { status: 200, message: result.message };
        } catch (error) {
            console.error("Error during news addition:", error);
            return fail(500, {
                error: true,
                message: error.message || 'Failed to add  course info'
            });
        }
    },
    updatedcourseinfo: async ({ request }) => {
        const formData = await request.formData();
        const body = Object.fromEntries(formData);
        const courseId = body.courseId;
        if (!courseId) {
            return fail(400, { serverError: "Course ID is required for update." });
        }
        const keywords = (body.keywords ?? "").trim(); 
        try {
            const result = await Courseinfo.findOneAndUpdate(
                { courseId },
                {
                    $set: {
                        title: body.title,
                        instructor: body.instructor,
                        level: body.level,
                        description: body.description,
                        price: Number(body.price),
                        image: body.image,
                        keywords,
                    }
                },
                { new: true }
            );

            if (!result) return fail(404, { serverError: "Course not found." });
            return { success: true, message: "Course updated successfully." };
        } catch (error) {
            console.error("Error during course update:", error);
            return fail(500, { serverError: error.message || "Failed to update course info" });
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

          
            const existing = await Section.findOne({ courseId });

            if (existing) {
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

}