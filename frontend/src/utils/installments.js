import { getCurrentMonthKey } from './budgetHelpers.js';

export function getMonthKeyOffset(monthKey, offset) {
    const [year, month] = monthKey.split('-').map(Number);
    const date = new Date(year, month - 1 + offset, 1);
    return getCurrentMonthKey(date);
}

export function splitInstallmentAmounts(totalAmount, count) {
    if (count <= 1) {
        return [totalAmount];
    }

    const baseAmount = Math.floor((totalAmount / count) * 100) / 100;
    const amounts = Array.from({ length: count }, () => baseAmount);
    const allocated = baseAmount * (count - 1);
    amounts[count - 1] = Math.round((totalAmount - allocated) * 100) / 100;
    return amounts;
}

export function createInstallmentGroupId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function buildInstallmentTransactions({
    description,
    totalAmount,
    installmentCount,
    startMonth,
    purchaseDate,
    type = 'variable-expense'
}) {
    const count = Math.max(1, parseInt(installmentCount, 10) || 1);
    const amounts = splitInstallmentAmounts(totalAmount, count);
    const groupId = count > 1 ? createInstallmentGroupId() : null;
    const baseId = Date.now();

    return amounts.map((amount, index) => ({
        id: `${baseId}-${index}`,
        description,
        amount,
        type,
        month: getMonthKeyOffset(startMonth, index),
        day: null,
        date: index === 0 ? purchaseDate : null,
        installmentCount: count,
        installmentIndex: index + 1,
        installmentGroupId: groupId
    }));
}

export function hasInstallmentPlan(transaction) {
    return Boolean(
        transaction?.installmentGroupId
        && transaction?.installmentCount > 1
    );
}

export function formatInstallmentTime(transaction) {
    if (hasInstallmentPlan(transaction)) {
        return `תשלום ${transaction.installmentIndex}/${transaction.installmentCount}`;
    }

    if (transaction.date) {
        return transaction.date;
    }

    return '-';
}

export function formatInstallmentDescription(transaction) {
    return transaction.description || transaction.name || 'ללא שם';
}

export function getTransactionTimeDisplay(transaction) {
    if (transaction.day) {
        return `ב-${transaction.day} לחודש`;
    }

    return formatInstallmentTime(transaction);
}
