import { calculateSummary } from '../../utils/budgetHelpers.js';

export default function SummaryCards({ monthData, onBankBalanceChange, onBankBalanceFocus, onBankBalanceBlur }) {
    const { totalIncome, totalExpenses, netBalance } = calculateSummary(monthData);

    return (
        <header className="summary-header">
            <div className="card card-bank">
                <h3>יתרת פתיחה בעו&quot;ש:</h3>
                <input
                    type="number"
                    value={monthData.bankBalance}
                    onChange={(event) => onBankBalanceChange(event.target.value)}
                    onFocus={onBankBalanceFocus}
                    onBlur={onBankBalanceBlur}
                />
            </div>
            <div className="card card-net">
                <h3>מאזן נטו חודשי:</h3>
                <span style={{ color: netBalance >= 0 ? '#2ec4b6' : '#e71d36' }}>
                    {netBalance.toLocaleString()} ₪
                </span>
            </div>
            <div className="card card-income">
                <h3>סך הכנסות החודש:</h3>
                <span>{totalIncome.toLocaleString()} ₪</span>
            </div>
            <div className="card card-expenses">
                <h3>סך הוצאות החודש:</h3>
                <span>{totalExpenses.toLocaleString()} ₪</span>
            </div>
        </header>
    );
}
