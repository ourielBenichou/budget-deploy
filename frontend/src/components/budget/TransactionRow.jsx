import { useState } from 'react';
import { getTransactionId } from '../../utils/budgetHelpers.js';
import { CancelIcon, DeleteIcon, EditIcon, SaveIcon } from '../common/ActionIcons.jsx';

export default function TransactionRow({
    transaction,
    isEditing,
    onEdit,
    onCancelEdit,
    onDelete,
    onSave
}) {
    const [amount, setAmount] = useState(transaction.amount);
    const [day, setDay] = useState(transaction.day || 1);
    const [date, setDate] = useState(transaction.date || '');

    const txId = getTransactionId(transaction);
    const displayName = transaction.description || transaction.name || 'ללא שם';
    const timeDisplay = transaction.day ? `ב-${transaction.day} לחודש` : (transaction.date || '-');

    const handleSave = () => {
        const payload = { amount: parseFloat(amount) };

        if (transaction.type === 'income' || transaction.type === 'fixed-expense') {
            const parsedDay = parseInt(day, 10);
            if (!Number.isNaN(parsedDay)) payload.day = parsedDay;
        } else if (transaction.type === 'variable-expense' && date) {
            payload.date = date;
        }

        onSave(txId, payload);
    };

    if (isEditing) {
        return (
            <tr>
                <td><strong>{displayName}</strong></td>
                <td>
                    {(transaction.type === 'income' || transaction.type === 'fixed-expense') && (
                        <input
                            type="number"
                            value={day}
                            min="1"
                            max="31"
                            onChange={(event) => setDay(event.target.value)}
                            style={{ width: '55px', textAlign: 'center', padding: '3px', border: '1px solid #ccc', borderRadius: '4px' }}
                        />
                    )}
                    {transaction.type === 'variable-expense' && (
                        <input
                            type="date"
                            value={date}
                            onChange={(event) => setDate(event.target.value)}
                            style={{ width: '115px', padding: '3px', border: '1px solid #ccc', borderRadius: '4px' }}
                        />
                    )}
                    {transaction.type === 'one-time-income' && '-'}
                </td>
                <td>
                    <input
                        type="number"
                        value={amount}
                        min="0"
                        onChange={(event) => setAmount(event.target.value)}
                        style={{ width: '80px', padding: '3px', border: '1px solid #ccc', borderRadius: '4px' }}
                    />
                </td>
                <td className="actions-cell">
                    <button type="button" className="btn-save" title="שמור" aria-label="שמור" onClick={handleSave}>
                        <SaveIcon />
                    </button>
                    <button type="button" className="btn-cancel" title="ביטול" aria-label="ביטול" onClick={onCancelEdit}>
                        <CancelIcon />
                    </button>
                </td>
            </tr>
        );
    }

    return (
        <tr>
            <td><strong>{displayName}</strong></td>
            <td>{timeDisplay}</td>
            <td>{transaction.amount.toLocaleString()} ₪</td>
            <td className="actions-cell">
                <button type="button" className="btn-edit" title="ערוך" aria-label="ערוך" onClick={() => onEdit(txId)}>
                    <EditIcon />
                </button>
                <button type="button" className="btn-delete" title="מחק" aria-label="מחק" onClick={() => onDelete(txId)}>
                    <DeleteIcon />
                </button>
            </td>
        </tr>
    );
}
