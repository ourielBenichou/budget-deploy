import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import CashFlowChart from '../components/budget/CashFlowChart.jsx';
import MonthSelector from '../components/budget/MonthSelector.jsx';
import SummaryCards from '../components/budget/SummaryCards.jsx';
import TransactionForm from '../components/budget/TransactionForm.jsx';
import TransactionTablesGrid from '../components/budget/TransactionTablesGrid.jsx';
import UserBar from '../components/common/UserBar.jsx';
import { useBudgetData } from '../hooks/useBudgetData.js';
import '../styles/app-background.css';
import '../styles/app.css';

export default function BudgetPage() {
    const navigate = useNavigate();
    const onUnauthorized = useCallback(() => navigate('/login', { replace: true }), [navigate]);

    const {
        user,
        selectedMonth,
        monthOptions,
        monthData,
        editingId,
        setEditingId,
        collapsedTables,
        changeMonth,
        updateBankBalance,
        setBankBalanceFocused,
        addTransaction,
        deleteTransaction,
        saveInlineEdit,
        toggleTableCollapsed
    } = useBudgetData(onUnauthorized);

    return (
        <main className="container">
            <UserBar user={user} />
            <MonthSelector
                selectedMonth={selectedMonth}
                monthOptions={monthOptions}
                onChange={changeMonth}
            />
            <SummaryCards
                monthData={monthData}
                onBankBalanceChange={updateBankBalance}
                onBankBalanceFocus={() => setBankBalanceFocused(true)}
                onBankBalanceBlur={() => setBankBalanceFocused(false)}
            />
            <CashFlowChart selectedMonth={selectedMonth} monthData={monthData} />
            <TransactionForm selectedMonth={selectedMonth} onAddTransaction={addTransaction} />
            <TransactionTablesGrid
                transactions={monthData.transactions}
                collapsedTables={collapsedTables}
                editingId={editingId}
                onToggleCollapsed={toggleTableCollapsed}
                onEdit={setEditingId}
                onCancelEdit={() => setEditingId(null)}
                onDelete={deleteTransaction}
                onSave={saveInlineEdit}
            />
        </main>
    );
}
