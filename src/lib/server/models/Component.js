import mongoose from 'mongoose';
const componentSchema = new mongoose.Schema(
    {
        category: { type: String },
        Categoryorder : { type: String},
        subcategory: { type: String },
        title: { type: String },
        subtitle: { type: String },
        description: { type: String },
        overview: { type: String },
        features: { type: String }, 
        applications: { type: String }, 
        image: { type: String },
        datasheet :{ type : String},
		producturl: { type: String },
        keywords :{type:String},
    },
    {
        timestamps: true, 
        collection: 'products',
    }
);

export const Component = mongoose.models.Component || mongoose.model('Component', componentSchema);
export default Component;