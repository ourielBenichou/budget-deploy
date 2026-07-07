const RECURRING_TYPES = ['income', 'fixed-expense'];

export function getPreviousMonthKey(monthKey) {
    const [year, month] = monthKey.split('-').map(Number);
    const date = new Date(year, month - 2, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export { RECURRING_TYPES };
