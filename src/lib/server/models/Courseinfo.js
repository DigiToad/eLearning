import mongoose from 'mongoose';

const CourseSchema = new mongoose.Schema({
    courseId: { type: String, trim: true },
    title: { type: String, trim: true },
    instructor: { type: String, trim: true },
    instructorAvatar: { type: String },
    level: {
        type: String,
        enum: ['Beginner', 'Intermediate', 'Advanced'],
        required: true
    },
    description: { type: String, },
    image: { type: String },
    keywords: { type: String },
    price: { type: String },
    status: {
        type: String,
        enum: ['draft', 'published'],
        default: 'draft'
    },

}, {
    timestamps: true,
    collection: 'courseinfo'
});

export const Courseinfo = mongoose.models.courseinfo 
    || mongoose.model('courseinfo', CourseSchema);
