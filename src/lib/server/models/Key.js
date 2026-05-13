import mongoose from "mongoose";

const keySchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, 
    user_id: { type: String, required: true }, 
    hashed_password: { type: String }, 
  },
  { timestamps: true }
);

export const Key = mongoose.models.Key || mongoose.model("Key", keySchema);