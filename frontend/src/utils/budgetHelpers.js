export const MONTH_NAMES_HE = [
    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

export function getCurrentMonthKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function buildMonthOptions(baseDate = new Date()) {
    const options = [];
    for (let i = -6; i <= 6; i += 1) {
        const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 1);
        const value = getCurrentMonthKey(d);
        options.push({
            value,
            label: `${MONTH_NAMES_HE[d.getMonth()]} ${d.getFullYear()}`
        });
    }
    return options;
}

export function getTransactionId(transaction) {
    return transaction.id || String(transaction._id);
}

export function normalizeServerTransaction(transaction) {
    if (!transaction.id && transaction._id) {
        transaction.id = String(transaction._id);
    }
    if (transaction.name && !transaction.description) {
        transaction.description = transaction.name;
    }
    return transaction;
}

export function getDaysInMonth(monthKey) {
    const [year, month] = monthKey.split('-').map(Number);
    return new Date(year, month, 0).getDate();
}

export function getChartMilestones(monthKey) {
    const daysInMonth = getDaysInMonth(monthKey);
    const baseMilestones = [1, 10, 15, 20, 25, 31];
    const milestones = baseMilestones.filter(day => day <= daysInMonth);

    if (milestones.at(-1) !== daysInMonth) {
        milestones.push(daysInMonth);
    }

    return milestones;
}

export function calculateSummary(monthData) {
    const totalIncome = monthData.transactions
        .filter(t => t.type === 'income' || t.type === 'one-time-income')
        .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = monthData.transactions
        .filter(t => t.type === 'fixed-expense' || t.type === 'variable-expense')
        .reduce((sum, t) => sum + t.amount, 0);

    return {
        totalIncome,
        totalExpenses,
        netBalance: monthData.bankBalance + totalIncome - totalExpenses
    };
}

export function buildChartData(monthKey, monthData) {
    const milestones = getChartMilestones(monthKey);
    const labels = milestones.map(day => `${String(day).padStart(2, '0')} לחודש`);
    const values = milestones.map(day => {
        let balanceAtMilestone = monthData.bankBalance;

        monthData.transactions.forEach(t => {
            if (t.type === 'income' && t.day <= day) {
                balanceAtMilestone += t.amount;
            } else if (t.type === 'fixed-expense' && t.day <= day) {
                balanceAtMilestone -= t.amount;
            } else if (t.type === 'one-time-income' && day >= 10) {
                balanceAtMilestone += t.amount;
            } else if (t.type === 'variable-expense' && day >= 10) {
                balanceAtMilestone -= t.amount;
            }
        });

        return balanceAtMilestone;
    });

    return { labels, values };
}

export function loadInitialMonthsData(storageKey, currentMonthKey) {
    let allMonthsData = JSON.parse(localStorage.getItem(storageKey) || '{}');

    if (Object.keys(allMonthsData).length === 0) {
        const oldData = JSON.parse(localStorage.getItem('budget_data_v2') || 'null');
        if (oldData?.length > 0) {
            allMonthsData[currentMonthKey] = {
                bankBalance: parseFloat(localStorage.getItem('budget_old_bank_balance')) || 5000,
                transactions: oldData
            };
        }
    }

    return allMonthsData;
}

export function getMonthData(allMonthsData, monthKey) {
    if (!allMonthsData[monthKey]) {
        return { bankBalance: 5000, transactions: [] };
    }

    const monthData = allMonthsData[monthKey];
    monthData.transactions.forEach(normalizeServerTransaction);
    return monthData;
}
