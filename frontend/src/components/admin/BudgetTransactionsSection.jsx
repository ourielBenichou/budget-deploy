import { formatMoney } from '../../utils/format.js';
import { getTransactionTimeDisplay } from '../../utils/installments.js';

export default function BudgetTransactionsSection({ title, transactions }) {
    return (
        <div className="budget-section">
            <h3>{title}</h3>
            {!transactions.length ? (
                <div className="empty-state">אין תנועות</div>
            ) : (
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>שם</th>
                            <th>מועד</th>
                            <th>סכום</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.map(transaction => (
                            <tr key={transaction.id || transaction._id}>
                                <td>{transaction.description}</td>
                                <td>{getTransactionTimeDisplay(transaction)}</td>
                                <td>{formatMoney(transaction.amount)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
