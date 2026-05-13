import mongoose from "mongoose";

const { Schema } = mongoose;

const TechnicalDiscussionSchema = new Schema(
  {
    name: {
      type: String,
      required: false,
      trim: true,
    },
    designation: {
      type: String,
      required: false,      
        trim: true,         
    },
    institution: {                  
        type: String,
        required: false,
        trim: true,
    },
    email: {
      type: String,
      required: false, 
      match: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 
      trim: true,
    },
    country: {
      type: String,
      required: false,
      trim: true,
    },
    areaofinterest: {  
        type: String,
        required: false,
        trim: true,
    },    
    specifictopic: {
      type: String,
      required: false,
      trim: true,
    },
    comments: {
      type: String,
      required: false,
      trim: true,
    },
    file: {
      type: String,
      required: false,
      trim: true,
    },  
    phone: {
      type: Number,
      required: false,
      min: null, 
      max: null,
    },
    status: {
      type: String,
      default: "unread"  
    },
  },
  {
    timestamps: true,
    collection: "TechnicalDiscussion",
  }
);


const TechnicalDiscussion = mongoose.models.TechnicalDiscussion || mongoose.model("TechnicalDiscussion", TechnicalDiscussionSchema);

export default TechnicalDiscussion;
