import CollapsibleTransactionTable from './CollapsibleTransactionTable.jsx';

const TABLE_CONFIG = [
    {
        tableId: 'income',
        title: 'הכנסות',
        boxClassName: 'income-box',
        sumVariant: 'income',
        types: ['income', 'one-time-income']
    },
    {
        tableId: 'fixed',
        title: 'הוצאות קבועות',
        boxClassName: 'fixed-box',
        sumVariant: 'fixed',
        types: ['fixed-expense']
    },
    {
        tableId: 'variable',
        title: 'הוצאות משתנות (אשראי)',
        boxClassName: 'variable-box',
        sumVariant: 'variable',
        types: ['variable-expense']
    }
];

export default function TransactionTablesGrid({
    transactions,
    collapsedTables,
    editingId,
    onToggleCollapsed,
    onEdit,
    onCancelEdit,
    onDelete,
    onSave
}) {
    return (
        <section className="tables-grid">
            {TABLE_CONFIG.map(config => (
                <CollapsibleTransactionTable
                    key={config.tableId}
                    tableId={config.tableId}
                    title={config.title}
                    boxClassName={config.boxClassName}
                    sumVariant={config.sumVariant}
                    transactions={transactions.filter(item => config.types.includes(item.type))}
                    collapsed={Boolean(collapsedTables[config.tableId])}
                    editingId={editingId}
                    onToggleCollapsed={onToggleCollapsed}
                    onEdit={onEdit}
                    onCancelEdit={onCancelEdit}
                    onDelete={onDelete}
                    onSave={onSave}
                />
            ))}
        </section>
    );
}
