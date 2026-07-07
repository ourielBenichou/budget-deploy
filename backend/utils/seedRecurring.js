import Transaction from '../models/Transaction.js';
import MonthSettings from '../models/MonthSettings.js';
import { getPreviousMonthKey, RECURRING_TYPES } from './monthHelpers.js';
import { calculateEndingBalance } from './budgetCalculations.js';

const DEFAULT_BANK_BALANCE = 5000;

function createTransactionId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function getPreviousMonthEndingBalance(userId, month) {
    const previousMonth = getPreviousMonthKey(month);
    const [settings, transactions] = await Promise.all([
        MonthSettings.findOne({ userId, month: previousMonth }),
        Transaction.find({ userId, month: previousMonth })
    ]);

    const bankBalance = settings?.bankBalance ?? DEFAULT_BANK_BALANCE;
    return calculateEndingBalance(previousMonth, bankBalance, transactions);
}

export async function seedRecurringTransactions(userId, month) {
    const existing = await Transaction.find({ userId, month });
    if (existing.length > 0) {
        return existing;
    }

    const monthSettings = await MonthSettings.findOne({ userId, month });
    if (monthSettings?.recurringSeeded) {
        return [];
    }

    const previousMonth = getPreviousMonthKey(month);
    const endingBalance = await getPreviousMonthEndingBalance(userId, month);
    const previousTransactions = await Transaction.find({
        userId,
        month: previousMonth,
        type: { $in: RECURRING_TYPES }
    });

    const settingsUpdate = { recurringSeeded: true };
    if (!monthSettings) {
        settingsUpdate.bankBalance = endingBalance;
    }

    await MonthSettings.findOneAndUpdate(
        { userId, month },
        { $set: settingsUpdate },
        { upsert: true, setDefaultsOnInsert: true }
    );

    if (previousTransactions.length === 0) {
        return [];
    }

    const seededTransactions = previousTransactions.map(transaction => ({
        id: createTransactionId(),
        userId,
        description: transaction.description,
        amount: transaction.amount,
        type: transaction.type,
        month,
        day: transaction.day,
        date: transaction.date
    }));

    await Transaction.insertMany(seededTransactions);
    return Transaction.find({ userId, month });
}
