import { useMemo, useState } from 'react';
import { buildInstallmentTransactions, splitInstallmentAmounts } from '../../utils/installments.js';

const TYPE_OPTIONS = [
    { value: 'income', label: 'הכנסה חודשית קבועה' },
    { value: 'one-time-income', label: 'הכנסה חד-פעמית (מתנה/מענק)' },
    { value: 'fixed-expense', label: 'הוצאה קבועה (חיובי עו"ש/משכנתא)' },
    { value: 'variable-expense', label: 'הוצאה משתנה (אשראי/שוטף)' }
];

function getDefaultTimeValue(type) {
    if (type === 'variable-expense') {
        return new Date().toISOString().split('T')[0];
    }
    if (type === 'one-time-income') {
        return '-';
    }
    return String(new Date().getDate());
}

export default function TransactionForm({ selectedMonth, onAddTransaction }) {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [type, setType] = useState('income');
    const [timeValue, setTimeValue] = useState(getDefaultTimeValue('income'));
    const [installmentCount, setInstallmentCount] = useState('1');

    const parsedInstallmentCount = Math.max(1, parseInt(installmentCount, 10) || 1);
    const isCreditInstallment = type === 'variable-expense' && parsedInstallmentCount > 1;

    const installmentPreview = useMemo(() => {
        const totalAmount = parseFloat(amount);
        if (!isCreditInstallment || Number.isNaN(totalAmount) || totalAmount <= 0) {
            return null;
        }

        const [monthlyAmount] = splitInstallmentAmounts(totalAmount, parsedInstallmentCount);
        return `${monthlyAmount.toLocaleString()} ₪ × ${parsedInstallmentCount} חודשים`;
    }, [amount, isCreditInstallment, parsedInstallmentCount]);

    const timeField = useMemo(() => {
        if (type === 'variable-expense') {
            return {
                label: 'תאריך הרכישה:',
                inputType: 'date'
            };
        }
        if (type === 'one-time-income') {
            return {
                label: 'מועד (לא חובה):',
                inputType: 'text'
            };
        }
        return {
            label: 'יום בחודש (1-31):',
            inputType: 'number'
        };
    }, [type]);

    const handleTypeChange = (nextType) => {
        setType(nextType);
        setTimeValue(getDefaultTimeValue(nextType));
        if (nextType !== 'variable-expense') {
            setInstallmentCount('1');
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        const parsedAmount = parseFloat(amount);
        if (!description.trim() || Number.isNaN(parsedAmount)) return;

        let transactions;

        if (type === 'variable-expense' && parsedInstallmentCount > 1) {
            transactions = buildInstallmentTransactions({
                description: description.trim(),
                totalAmount: parsedAmount,
                installmentCount: parsedInstallmentCount,
                startMonth: selectedMonth,
                purchaseDate: timeValue
            });
        } else {
            transactions = [{
                id: Date.now().toString(),
                description: description.trim(),
                amount: parsedAmount,
                type,
                month: selectedMonth,
                day: (type === 'income' || type === 'fixed-expense')
                    ? parseInt(timeValue, 10) || new Date().getDate()
                    : null,
                date: type === 'variable-expense' ? timeValue : null,
                installmentCount: 1,
                installmentIndex: 1
            }];
        }

        const saved = await onAddTransaction(transactions);
        if (!saved) return;

        setDescription('');
        setAmount('');
        setType('income');
        setTimeValue(getDefaultTimeValue('income'));
        setInstallmentCount('1');
    };

    return (
        <section className="form-section">
            <h2>הוספת תנועה חדשה</h2>
            <form id="budget-form" onSubmit={handleSubmit}>
                <div className="form-group flex-fill">
                    <label htmlFor="transaction-name">שם הפעולה:</label>
                    <input
                        type="text"
                        id="transaction-name"
                        placeholder="לדוגמה: שופרסל, משכורת, חוג..."
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        required
                    />
                </div>

                <div className="form-group width-sm">
                    <label htmlFor="transaction-amount">
                        {isCreditInstallment ? 'סכום כולל (₪):' : 'סכום (₪):'}
                    </label>
                    <input
                        type="number"
                        id="transaction-amount"
                        placeholder="0"
                        min="1"
                        step="any"
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                        required
                    />
                </div>

                <div className="form-group flex-fill">
                    <label htmlFor="transaction-type">סוג הפעולה:</label>
                    <select
                        id="transaction-type"
                        value={type}
                        onChange={(event) => handleTypeChange(event.target.value)}
                    >
                        {TYPE_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>

                {type === 'variable-expense' && (
                    <div className="form-group width-sm">
                        <label htmlFor="installment-count">תשלומים (חודשים)</label>
                        <input
                            type="number"
                            id="installment-count"
                            min="1"
                            max="36"
                            value={installmentCount}
                            onChange={(event) => setInstallmentCount(event.target.value)}
                        />
                    </div>
                )}

                <div className="form-group width-md">
                    <label htmlFor="transaction-time-input">{timeField.label}</label>
                    <input
                        type={timeField.inputType}
                        id="transaction-time-input"
                        min={timeField.inputType === 'number' ? 1 : undefined}
                        max={timeField.inputType === 'number' ? 31 : undefined}
                        value={timeValue}
                        onChange={(event) => setTimeValue(event.target.value)}
                    />
                </div>

                {installmentPreview && (
                    <p className="installment-preview">{installmentPreview}</p>
                )}

                <button type="submit" className="btn-submit">הוסף למאזן</button>
            </form>
        </section>
    );
}
