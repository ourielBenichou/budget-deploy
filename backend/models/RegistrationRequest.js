import mongoose from 'mongoose';

const registrationRequestSchema = new mongoose.Schema({
    username: { type: String, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    passwordHash: { type: String },
    displayName: { type: String, required: true, trim: true },
    googleId: { type: String },
    appleId: { type: String },
    authType: { type: String, enum: ['local', 'google', 'apple'], required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reviewedAt: { type: Date },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

registrationRequestSchema.index({ email: 1, status: 1 });

const RegistrationRequest = mongoose.model('RegistrationRequest', registrationRequestSchema);

export default RegistrationRequest;
