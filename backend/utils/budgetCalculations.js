export function getDaysInMonth(monthKey) {
    const [year, month] = monthKey.split('-').map(Number);
    return new Date(year, month, 0).getDate();
}

export function calculateEndingBalance(monthKey, bankBalance, transactions) {
    const lastDay = getDaysInMonth(monthKey);
    let balance = bankBalance;

    transactions.forEach(transaction => {
        if (transaction.type === 'income' && transaction.day <= lastDay) {
            balance += transaction.amount;
        } else if (transaction.type === 'fixed-expense' && transaction.day <= lastDay) {
            balance -= transaction.amount;
        } else if (transaction.type === 'one-time-income' && lastDay >= 10) {
            balance += transaction.amount;
        } else if (transaction.type === 'variable-expense' && lastDay >= 10) {
            balance -= transaction.amount;
        }
    });

    return balance;
}
