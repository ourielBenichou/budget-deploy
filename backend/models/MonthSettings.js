import mongoose from 'mongoose';

const monthSettingsSchema = new mongoose.Schema({
    month: { type: String, required: true, unique: true },
    bankBalance: { type: Number, default: 5000 }
});

const MonthSettings = mongoose.model('MonthSettings', monthSettingsSchema);

export default MonthSettings;
