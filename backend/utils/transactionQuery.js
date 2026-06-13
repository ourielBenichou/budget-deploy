import mongoose from 'mongoose';

export function buildTransactionLookup(userId, transactionId) {
    const filter = { userId };

    if (
        mongoose.Types.ObjectId.isValid(transactionId) &&
        String(new mongoose.Types.ObjectId(transactionId)) === transactionId
    ) {
        filter.$or = [{ id: transactionId }, { _id: transactionId }];
    } else {
        filter.id = transactionId;
    }

    return filter;
}
