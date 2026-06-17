import TransactionRow from './TransactionRow.jsx';

export default function CollapsibleTransactionTable({
    tableId,
    title,
    boxClassName,
    transactions,
    collapsed,
    editingId,
    onToggleCollapsed,
    onEdit,
    onCancelEdit,
    onDelete,
    onSave
}) {
    return (
        <div className={`table-container ${boxClassName}${collapsed ? ' collapsed' : ''}`}>
            <div className="table-header" onClick={() => onToggleCollapsed(tableId)}>
                <h3>{title}</h3>
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
