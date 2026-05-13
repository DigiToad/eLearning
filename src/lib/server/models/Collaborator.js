import mongoose from 'mongoose';

const CollabSchema = new mongoose.Schema(
    {

        title: { type: String },
        description: { type: String },
        image: [{ type: String }],
       
        
    },
    {
        timestamps: true, 
        collection: 'Collaborators',
    }
);
export const Collab = mongoose.models.Collab || mongoose.model('Collab', CollabSchema);

export default Collab;
