import { useMemo } from 'react';
import TransactionRow from './TransactionRow.jsx';

export default function CollapsibleTransactionTable({
    tableId,
    title,
    boxClassName,
    sumVariant = 'default',
    transactions,
    collapsed,
    editingId,
    onToggleCollapsed,
    onEdit,
    onCancelEdit,
    onDelete,
    onSave
}) {
    const total = useMemo(
        () => transactions.reduce((sum, transaction) => sum + (Number(transaction.amount) || 0), 0),
        [transactions]
    );

    return (
        <div className={`table-container ${boxClassName}${collapsed ? ' collapsed' : ''}`}>
            <div className="table-header" onClick={() => onToggleCollapsed(tableId)}>
                <h3>{title}</h3>
                <div className="table-header-actions">
                    <span className={`table-sum table-sum--${sumVariant}`}>
                        {total.toLocaleString()} ₪
                    </span>
                    <button
                        type="button"
                        className="table-toggle-btn"
                        aria-expanded={!collapsed}
                        aria-label={collapsed ? 'פתח טבלה' : 'כווץ טבלה'}
                        onClick={(event) => {
                            event.stopPropagation();
                            onToggleCollapsed(tableId);
                        }}
                    >
                        {collapsed ? '+' : '−'}
                    </button>
                </div>
            </div>
            <div className="table-body-wrap">
                <table className="budget-table">
                    <thead>
                        <tr>
                            <th>שם</th>
                            <th>מועד</th>
                            <th>סכום</th>
                            <th style={{ textAlign: 'center' }}>פעולות</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.map(transaction => (
                            <TransactionRow
                                key={getTransactionKey(transaction)}
                                transaction={transaction}
                                isEditing={editingId === getTransactionKey(transaction)}
                                onEdit={onEdit}
                                onCancelEdit={onCancelEdit}
                                onDelete={onDelete}
                                onSave={onSave}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function getTransactionKey(transaction) {
    return transaction.id || String(transaction._id);
}
