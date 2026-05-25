import mongoose from 'mongoose';

const SectionItemSchema = new mongoose.Schema({
    title: {
        type: String,
        trim: true,
        required: true
    },

    order: {
        type: Number,
        default: 1
    },
   
});

const SectionSchema = new mongoose.Schema({
    courseId: { type: String, trim: true },
    sections: [SectionItemSchema],
   
}, {
    timestamps: true,
    collection: 'Section'
});

export const Section = mongoose.models.Section
    || mongoose.model('Section', SectionSchema);
