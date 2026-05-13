import mongoose from "mongoose";

const { Schema } = mongoose;

const ProductdemoSchema = new Schema(
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
    productCategory: {  
        type: String,
        required: false,
        trim: true,
    },    
  productName: {  
        type: String,
        required: false,
        trim: true,
    },  
    expectAudience: {
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
    collection: "productdemo",
  }
);


const Productdemo = mongoose.models.Productdemo || mongoose.model("Productdemo", ProductdemoSchema);

export default Productdemo;
