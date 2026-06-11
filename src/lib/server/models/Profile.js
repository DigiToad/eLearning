import mongoose from "mongoose";

const jsonSchema = {
  type: mongoose.Schema.Types.Mixed,
  default: null,

};
const chemiDashProfileSchema = new mongoose.Schema(
  {

    firstName: {
      type: String,
    },
    lastName: {
      type: String,
    },
    email: {
      type: String,
      unique: true,
    },
    phone: {
      type: String,
    },
    institution: {
      type: String,
    },
    branch: {
      type: String,
    },
    userId: {
      type: String,
    },
    resetPasswordToken: { type: String },
    resetTokenExpiry: { type: Date },
    acessedcourse: { type: [String], default: [] },
      // interestedcourse: { type: [String], default: [] }
      interestedcourse: {
  type: [{
    courseId:    { type: String, required: true },
    courseName:  { type: String, default: '' },
    coursePrice: { type: String, default: '' },

  }],
  default: [],
   _id:false
}

  },
  {
    timestamps: true,
    collection: "profiles",
  }
);

if (mongoose.models.Profile) {
  delete mongoose.models.Profile;
}

const Profile = mongoose.models.Profile || mongoose.model("Profile", chemiDashProfileSchema);

export default Profile;