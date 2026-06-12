import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, sparse: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String },
    googleId: { type: String, unique: true, sparse: true },
    displayName: { type: String, required: true, trim: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

export default User;
