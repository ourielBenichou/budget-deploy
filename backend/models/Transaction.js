import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
    id: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    type: { type: String, required: true },
    month: { type: String },
    day: Number,
    date: String,
    installmentCount: { type: Number, default: 1 },
    installmentIndex: { type: Number, default: 1 },
    installmentGroupId: String
});

transactionSchema.index({ userId: 1, id: 1 }, { unique: true });

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;
