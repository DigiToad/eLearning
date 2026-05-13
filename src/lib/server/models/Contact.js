import mongoose from "mongoose";

const { Schema } = mongoose;

const contactUSSchema = new Schema(
  {
    name: {
      type: String,
      required: false,
      trim: true,
    },
    email: {
      type: String,
      required: true, 
      match: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 
      trim: true,
    },
    country: {
      type: String,
      required: false,
      trim: true,
    },
    subject: {
      type: String,
      required: false,
      trim: true,
    },
    message: {
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
    areaOfWork:{
       type: String,
    },
    interestedin:{
       type: String,
    },
    status: {
      type: String,
      default: "unread"  
    },
  },
  {
    timestamps: true,
    collection: "contactus",
  }
);


const Contact = mongoose.models.Contact || mongoose.model("Contact", contactUSSchema);

export default Contact;
