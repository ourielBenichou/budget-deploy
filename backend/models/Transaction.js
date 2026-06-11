import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    type: { type: String, required: true },
    month: { type: String },
    day: Number,
    date: String
});

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;