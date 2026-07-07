import { formatMoney } from '../../utils/format.js';
import BudgetTransactionsSection from './BudgetTransactionsSection.jsx';

export default function BudgetViewModal({ open, budgetData, selectedMonth, onMonthChange, onClose }) {
    if (!open || !budgetData) return null;

    const incomes = budgetData.transactions.filter(
        transaction => transaction.type === 'income' || transaction.type === 'one-time-income'
    );
    const fixedExpenses = budgetData.transactions.filter(transaction => transaction.type === 'fixed-expense');
    const variableExpenses = budgetData.transactions.filter(transaction => transaction.type === 'variable-expense');

    return (
        <div className="modal-backdrop open" onClick={onClose}>
            <div className="modal" onClick={(event) => event.stopPropagation()}>
                <div className="modal-header">
                    <h2>תקציב של {budgetData.user.displayName}</h2>
                    <button type="button" className="btn btn-secondary" onClick={onClose}>
                        סגור
                    </button>
                </div>

                <div className="form-group" style={{ maxWidth: '220px', marginBottom: '20px' }}>
                    <label htmlFor="budget-month-select">חודש</label>
                    <input
                        type="month"
                        id="budget-month-select"
                        value={selectedMonth}
                        onChange={(event) => onMonthChange(event.target.value)}
                    />
                </div>

                <div className="summary-grid">
                    <div className="summary-card">
                        <span>יתרת עו&quot;ש</span>
                        <strong>{formatMoney(budgetData.summary.bankBalance)}</strong>
                    </div>
                    <div className="summary-card">
                        <span>סה&quot;כ הכנסות</span>
                        <strong>{formatMoney(budgetData.summary.totalIncome)}</strong>
                    </div>
                    <div className="summary-card">
                        <span>סה&quot;כ הוצאות</span>
                        <strong>{formatMoney(budgetData.summary.totalExpenses)}</strong>
                    </div>
                    <div className="summary-card">
                        <span>מאזן נטו</span>
                        <strong>{formatMoney(budgetData.summary.netBalance)}</strong>
                    </div>
                </div>

                <BudgetTransactionsSection title="הכנסות" transactions={incomes} />
                <BudgetTransactionsSection title="הוצאות קבועות" transactions={fixedExpenses} />
                <BudgetTransactionsSection title="הוצאות משתנות" transactions={variableExpenses} />
            </div>
        </div>
    );
}
