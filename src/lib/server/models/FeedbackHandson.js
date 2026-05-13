import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      match: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
    },
    phone: {
      type: String,
    },
    country: {
      type: String,
    },
    Organization: {
      type: String,
      trim: true
    },

    // ── Ratings ──
    usefulnessRating: {
      type: Number,
      
    },
    presentationRating: {
      type: Number,
      
    },
    awarenessRating: {
      type: Number,
      
    },
    demoRating: {
      type: Number,
     
    },

    // ── Radio Fields ──
    completedSessions: {
      type: String,
     
      enum: ["yes_all", "completed_most", "completed_some", "unable_to_complete"]
    },
    metObjectives: {
      type: String,
     
      enum: ["yes", "partially", "no"]
    },

    // ── Text Feedback ──
    likedMost: {
      type: String,  
    },
    challengesFaced: {
      type: String,
    },
    suggestions: {
      type: String,
    },

    status: {
      type: String,
      default: "unread",
      enum: ["unread", "read"]
    }
  },
  {
    timestamps: true 
  }
);

const FeedbackHandson =
  mongoose.models.FeedbackHandson ||
  mongoose.model("FeedbackHandson", feedbackSchema);

export default FeedbackHandson;