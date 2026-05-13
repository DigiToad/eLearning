import mongoose from "mongoose";

const jsonSchema = {
  type: mongoose.Schema.Types.Mixed,
  default: null,

};
const chemiDashProfileSchema = new mongoose.Schema(
  {
    
    firstName: {
      type: String,
      required: false,
    },
       lastName: {
      type: String,
      required: false,
    },
    
  
    email: {
      type: String,
      required: false,
      unique: true,
    },
    phone: {
      type: String,
      required: false,
      unique: true,
    },
   institution: {
      type: String,
      required: false,
      unique: true,
    },
    branch: {
      type: String,
      required: false,
      unique: true,
    },
    userId: {
      type: String,
      required: true,
    },
resetPasswordToken: { type: String },
resetTokenExpiry: { type: Date }
   
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