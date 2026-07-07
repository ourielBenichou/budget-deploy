import mongoose from 'mongoose';

const monthSettingsSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    month: { type: String, required: true },
    bankBalance: { type: Number, default: 5000 },
    recurringSeeded: { type: Boolean, default: false }
});

monthSettingsSchema.index({ userId: 1, month: 1 }, { unique: true });

const MonthSettings = mongoose.model('MonthSettings', monthSettingsSchema);

export default MonthSettings;
