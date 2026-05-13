import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
    {
        order: { type: Number, required: true, default: 0 },
        title: { type: String, required: true },
    },
    {
        timestamps: true,
        collection: 'category',
    }
);

const Category =
    mongoose.models.Category || mongoose.model('Category', categorySchema);

export default Category;
