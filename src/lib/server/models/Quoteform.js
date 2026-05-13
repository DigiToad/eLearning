import mongoose from "mongoose";

const { Schema } = mongoose;

const QuoteSchema = new Schema(
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
    productName: {
      type: String,
      required: false,
      trim: true,
    },
    productCategory: {
      type: String,
      required: false,
      trim: true,
    },
    expectPurchaseTime: {
      type: String,
      required: false,
      trim: true,
    },
    quantity: {
      type: String,
      required: false,
      trim: true,
    },
    intendedUse: {
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
    collection: "Quoteform",
  }
);


const Quote = mongoose.models.Quote || mongoose.model("Quote", QuoteSchema);

export default Quote;
