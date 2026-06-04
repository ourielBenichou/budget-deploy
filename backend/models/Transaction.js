import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
    description: { type: String, required: true }, // וודא שזה כתוב description
    amount: { type: Number, required: true },
    type: { type: String, required: true },
    day: Number,
    date: String
});

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;