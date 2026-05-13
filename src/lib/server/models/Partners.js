import mongoose from 'mongoose';

const partnerSchema = new mongoose.Schema(
	{
       order: { type: Number, default: 0, required: true },
		title: { type: String },
		content: { type: String },
		image: { type: String },
        location :{type:String},
		url :{type:String},
		partnertype:{type :String},
	},
	{
		timestamps: true, 
		collection: 'partners',
	}
);
export const Partners = mongoose.models.Partners || mongoose.model('Partners', partnerSchema);

export default Partners;
