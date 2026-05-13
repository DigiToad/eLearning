import mongoose from 'mongoose';
const emailVerificationSchema = new mongoose.Schema({
    email: { type: String, required: true },
    token: { type: String, required: true },
    expiry: { type: Date, required: true },
    isEmailVerified: { type: Boolean, default: false },
    isPhoneVerified: { type: Boolean, default: false },
    verificationType: { type: String, required: true },
    userId: { type: String }
},{
        timestamps: true,
        collection: "tokenverifications"
    }
);
delete mongoose.models.TokenVerification
const TokenVerification = mongoose.models.TokenVerification || mongoose.model('TokenVerification', emailVerificationSchema);

export default TokenVerification;