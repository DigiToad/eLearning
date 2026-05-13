import mongoose from 'mongoose';
const { Schema } = mongoose;
const oemSchema = new Schema(
    {
        title: {
            type: String,
        },
        url: {
            type: String,
        },
        image: {
            type: String,
        },
    },
    { 
        timestamps: true,
        collection: 'Oems',
    }
);
const Oems = mongoose.models.Oems || mongoose.model('Oems', oemSchema);
export default Oems;
