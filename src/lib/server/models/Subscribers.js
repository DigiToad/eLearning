import mongoose from "mongoose";

const { Schema } = mongoose;

const subscribeSchema = new Schema(
  {
    email: {
      type: String,
      required: false, 
      match: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 
      trim: true,
    }
  
  },
  {
    timestamps: true,
    collection: "subscriber",
  }
);


const Subscriber = mongoose.models.subscriber || mongoose.model("subscriber", subscribeSchema);

export default Subscriber;
