import {
    getApiBase,
    requireAuth,
    authHeaders,
    handleAuthError,
    getStorageKey,
    getAuthUser,
    clearAuth,
    setAuth,
    getToken
} from './auth.js';

if (!requireAuth()) {
    throw new Error('Not authenticated');
}

const API_BASE = getApiBase();
const STORAGE_KEY = getStorageKey('budget_app_monthly_v3');
const now = new Date();
const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
let selectedMonth = currentMonthKey;

let allMonthsData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};

// מנגנון הגנה: הגירה של נתונים ישנים מהגרסה הקודמת (כדי שלא תאבד כלום)
if (Object.keys(allMonthsData).length === 0) {
    let oldData = JSON.parse(localStorage.getItem('budget_data_v2'));
    if (oldData && oldData.length > 0) {
        allMonthsData[currentMonthKey] = {
            bankBalance: parseFloat(localStorage.getItem('budget_old_bank_balance')) || 5000,
            transactions: oldData
        };
    }
}

// פונקציה לקבלת הנתונים של החודש שנבחר כרגע
function getSelectedMonthData() {
    if (!allMonthsData[selectedMonth]) {
        allMonthsData[selectedMonth] = { bankBalance: 5000, transactions: [] };
    }
    
    // "הגירה" מהירה: אם יש t.name, נעביר אותו ל-t.description
    allMonthsData[selectedMonth].transactions.forEach(t => {
        if (t.name && !t.description) {
            t.description = t.name;
        }
    });
    
    return allMonthsData[selectedMonth];
}

// אלמנטים מה-HTML
const budgetForm = document.getElementById('budget-form');
const transactionNameInput = document.getElementById('transaction-name');
const transactionAmountInput = document.getElementById('transaction-amount');
const transactionTypeSelect = document.getElementById('transaction-type');
const currentBankBalanceInput = document.getElementById('current-bank-balance');
const monthSelectEl = document.getElementById('month-select');

const incomesList = document.getElementById('incomes-list');
const fixedExpensesList = document.getElementById('fixed-expenses-list');
const variableExpensesList = document.getElementById('variable-expenses-list');

const netBalanceEl = document.getElementById('net-balance');
const totalIncomeEl = document.getElementById('total-income');
const totalExpensesEl = document.getElementById('total-expenses');

let trendChartInstance = null;
let bankBalanceSaveTimeout = null;
let lastMutationTime = 0;

function markLocalMutation() {
    lastMutationTime = Date.now();
}

function isInlineEditing() {
    return document.querySelector('[id^="edit-amount-"]') !== null;
}

function shouldApplyServerTransactions() {
    return !isInlineEditing() && Date.now() >= lastMutationTime + 5000;
}

function normalizeServerTransaction(t) {
    if (!t.id && t._id) t.id = String(t._id);
    return t;
}

const ICONS = {
    edit: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>`,
    delete: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>`,
    save: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`,
    cancel: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`
};

function getTransactionId(t) {
    return t.id || String(t._id);
}

// האזנה לשינוי יתרת הבנק
if (currentBankBalanceInput) {
    currentBankBalanceInput.addEventListener('input', function() {
        const data = getSelectedMonthData();
        data.bankBalance = parseFloat(currentBankBalanceInput.value) || 0;
        updateInterface();

        clearTimeout(bankBalanceSaveTimeout);
        bankBalanceSaveTimeout = setTimeout(saveBankBalanceToServer, 500);
    });
}

// בניית אפשרויות בחירת החודש בתיבת ה-Select (חצי שנה אחורה וחצי שנה קדימה)
function populateMonthSelector() {
    if (!monthSelectEl) return;
    monthSelectEl.innerHTML = '';

    const monthNamesHe = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
    const baseDate = new Date();

    // מייצרים רשימה של 12 חודשים סביב החודש הנוכחי
    for (let i = -6; i <= 6; i++) {
        const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 1);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        
        const option = document.createElement('option');
        option.value = k;
        option.textContent = `${monthNamesHe[d.getMonth()]} ${d.getFullYear()}`;
        
        if (k === selectedMonth) {
            option.selected = true;
        }
        monthSelectEl.appendChild(option);
    }
}

// פונקציה שמופעלת כשהמשתמש מחליף חודש בתיבת הבחירה
window.changeMonth = function() {
    if (!monthSelectEl) return;
    selectedMonth = monthSelectEl.value;
    
    // טעינת יתרת הבנק של החודש שנבחר אל תוך שדה הקלט
    const data = getSelectedMonthData();
    if (currentBankBalanceInput) {
        currentBankBalanceInput.value = data.bankBalance;
    }
    
    fetchMonthDataFromServer();
};

function updateSummary() {
    const data = getSelectedMonthData();
    const bankBalance = data.bankBalance;

    const totalIncome = data.transactions
        .filter(t => t.type === 'income' || t.type === 'one-time-income')
        .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = data.transactions
        .filter(t => t.type === 'fixed-expense' || t.type === 'variable-expense')
        .reduce((sum, t) => sum + t.amount, 0);

    const netBalance = bankBalance + totalIncome - totalExpenses;

    if (totalIncomeEl) totalIncomeEl.textContent = `${totalIncome.toLocaleString()} ₪`;
    if (totalExpensesEl) totalExpensesEl.textContent = `${totalExpenses.toLocaleString()} ₪`;
    if (netBalanceEl) {
        netBalanceEl.textContent = `${netBalance.toLocaleString()} ₪`;
        netBalanceEl.style.color = netBalance >= 0 ? '#2ec4b6' : '#e71d36';
    }
}

function getDaysInMonth(monthKey) {
    const [year, month] = monthKey.split('-').map(Number);
    return new Date(year, month, 0).getDate();
}

function getChartMilestones(monthKey) {
    const daysInMonth = getDaysInMonth(monthKey);
    const baseMilestones = [1, 10, 15, 20, 25, 31];
    const milestones = baseMilestones.filter(day => day <= daysInMonth);

    if (milestones.at(-1) !== daysInMonth) {
        milestones.push(daysInMonth);
    }

    return milestones;
}

function updateChart() {
    const ctx = document.getElementById('trendChart')?.getContext('2d');
    if (!ctx) return;

    const data = getSelectedMonthData();
    const startBalance = data.bankBalance;
    const milestones = getChartMilestones(selectedMonth);
    const labels = milestones.map(day => `${String(day).padStart(2, '0')} לחודש`);
    
    const chartData = milestones.map(day => {
        let balanceAtMilestone = startBalance;

        data.transactions.forEach(t => {
            if (t.type === 'income' && t.day <= day) {
                balanceAtMilestone += t.amount;
            } else if (t.type === 'fixed-expense' && t.day <= day) {
                balanceAtMilestone -= t.amount;
            } else if (t.type === 'one-time-income' && day >= 10) {
                balanceAtMilestone += t.amount;
            } else if (t.type === 'variable-expense' && day >= 10) {
                balanceAtMilestone -= t.amount;
            }
        });

        return balanceAtMilestone;
    });

    if (trendChartInstance) {
        trendChartInstance.destroy();
    }

    trendChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'גובה העו"ש בחשבון (₪)',
                data: chartData,
                borderColor: '#2ec4b6',
                borderWidth: 4,
                pointBackgroundColor: chartData.map(val => val >= 0 ? '#2ec4b6' : '#e71d36'),
                pointBorderColor: '#fff',
                pointRadius: 7,
                tension: 0.2,
                fill: true,
                backgroundColor: 'rgba(46, 196, 182, 0.1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            rtl: true,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    grid: { color: '#f0f0f0' },
                    ticks: { callback: function(value) { return value.toLocaleString() + ' ₪'; } }
                },
                x: { grid: { color: '#eaeaea', borderDash: [5, 5] } }
            }
        }
    });
}

function renderTables() {
    // איפוס הטבלאות
    [incomesList, fixedExpensesList, variableExpensesList].forEach(el => {
        if (el) el.innerHTML = '';
    });

    const data = getSelectedMonthData();

    data.transactions.forEach(t => {
        const row = document.createElement('tr');
        const displayNameText = t.description || t.name || 'ללא שם';
        const txId = getTransactionId(t);
        const timeDisplay = t.day ? `ב-${t.day} לחודש` : (t.date || '-');

    row.innerHTML = `
        <td><strong>${displayNameText}</strong></td>
        <td id="time-td-${txId}">${timeDisplay}</td>
        <td id="amount-td-${txId}">${t.amount.toLocaleString()} ₪</td>
        <td id="actions-td-${txId}" class="actions-cell">
            <button class="btn-edit" type="button" title="ערוך" aria-label="ערוך" onclick="window.startInlineEdit('${txId}')">${ICONS.edit}</button>
            <button class="btn-delete" type="button" title="מחק" aria-label="מחק" onclick="window.deleteTransaction('${txId}')">${ICONS.delete}</button>
        </td>
    `;

        if ((t.type === 'income' || t.type === 'one-time-income') && incomesList) incomesList.appendChild(row);
        else if (t.type === 'fixed-expense' && fixedExpensesList) fixedExpensesList.appendChild(row);
        else if (t.type === 'variable-expense' && variableExpensesList) variableExpensesList.appendChild(row);
    });
}

function saveToLocalStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allMonthsData));
}

async function apiFetch(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: authHeaders({
            'Content-Type': 'application/json',
            ...(options.headers || {})
        })
    });
    handleAuthError(response);
    return response;
}

async function saveTransactionToServer(transaction) {
    try {
    const response = await apiFetch(`${API_BASE}/transactions`, {
        method: 'POST',
        body: JSON.stringify({ ...transaction, month: selectedMonth })
    });
            
        // כאן נדפיס את השגיאה האמיתית אם היא קיימת
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Server rejected data:', errorData);
            throw new Error(errorData.error || 'Failed to save');
        }
        markLocalMutation();
        console.log('Transaction saved to MongoDB!');
    } catch (err) {
        console.error('Error saving to server:', err);
        throw err;
    }
}

async function saveBankBalanceToServer() {
    try {
        const data = getSelectedMonthData();
        const response = await apiFetch(`${API_BASE}/months/${selectedMonth}`, {
            method: 'PUT',
            body: JSON.stringify({ bankBalance: data.bankBalance })
        });

        if (!response.ok) {
            throw new Error('Failed to save bank balance');
        }
        markLocalMutation();
    } catch (err) {
        console.error('Error saving bank balance to server:', err);
    }
}

window.updateInterface = function updateInterface() {
    updateSummary();
    renderTables();
    saveToLocalStorage();
    updateChart();
}

window.updateFormDateLabels = function() {
    const type = transactionTypeSelect?.value;
    const timeLabel = document.getElementById('time-label');
    const timeInput = document.getElementById('transaction-time-input');

    if (!timeLabel || !timeInput) return;

    if (type === 'variable-expense') {
        timeLabel.textContent = 'תאריך הרכישה:';
        timeInput.type = 'date';
        timeInput.value = new Date().toISOString().split('T')[0];
    } else if (type === 'one-time-income') {
        timeLabel.textContent = 'מועד (לא חובה):';
        timeInput.type = 'text';
        timeInput.value = '-';
    } else {
        timeLabel.textContent = 'יום בחודש (1-31):';
        timeInput.type = 'number';
        timeInput.value = new Date().getDate();
        timeInput.min = 1;
        timeInput.max = 31;
    }
};

if (budgetForm) {
    // הוספנו כאן async כדי שנוכל להשתמש ב-await
    budgetForm.addEventListener('submit', async function(e) { 
        e.preventDefault();

        const description = transactionNameInput.value.trim();
        const amount = parseFloat(transactionAmountInput.value);
        const type = transactionTypeSelect.value;
        const timeValue = document.getElementById('transaction-time-input')?.value;

        if (!description || isNaN(amount)) return;

        const newTransaction = {
            id: Date.now().toString(),
            description: description,
            amount: amount,
            type: type,
            month: selectedMonth,
            day: (type === 'income' || type === 'fixed-expense') ? parseInt(timeValue) || new Date().getDate() : null,
            date: type === 'variable-expense' ? timeValue : null
        };

        const data = getSelectedMonthData();
        data.transactions.push(newTransaction);

        try {
            await saveTransactionToServer(newTransaction);
            updateInterface();
        } catch {
            data.transactions.pop();
            alert('שמירת התנועה נכשלה. נסה שוב.');
            return;
        }

        transactionNameInput.value = '';
        transactionAmountInput.value = '';
        if (window.updateFormDateLabels) window.updateFormDateLabels();
    });
}


window.deleteTransaction = async function(id) {
    if (!id || id === 'undefined') {
        console.error("Critical error: ID is undefined!");
        return;
    }

    if (!confirm('האם אתה בטוח שברצונך למחוק שורה זו?')) return;

    try {
        const response = await apiFetch(`${API_BASE}/transactions/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            alert(errorData.message || errorData.error || 'מחיקה נכשלה בשרת');
            return;
        }

        const data = getSelectedMonthData();
        data.transactions = data.transactions.filter(t => getTransactionId(t) !== id);
        markLocalMutation();
        updateInterface();
    } catch (err) {
        console.error('Network error:', err);
        alert('שגיאת רשת במחיקה. נסה שוב.');
    }
};

window.startInlineEdit = function(id) {
    const data = getSelectedMonthData();
    const t = data.transactions.find(item => getTransactionId(item) === id);
    if (!t) return;

    const timeTd = document.getElementById(`time-td-${id}`);
    const amountTd = document.getElementById(`amount-td-${id}`);
    const actionsTd = document.getElementById(`actions-td-${id}`);

    if (!timeTd || !amountTd || !actionsTd) return;

    if (t.type === 'income' || t.type === 'fixed-expense') {
        timeTd.innerHTML = `
            <input type="number" id="edit-day-${id}" value="${t.day || 1}" min="1" max="31" style="width: 55px; text-align: center; padding: 3px; border: 1px solid #ccc; border-radius: 4px;">
        `;
    } else if (t.type === 'variable-expense') {
        timeTd.innerHTML = `
            <input type="date" id="edit-date-${id}" value="${t.date || ''}" style="width: 115px; padding: 3px; border: 1px solid #ccc; border-radius: 4px;">
        `;
    } else {
        timeTd.innerHTML = `-`;
    }

    amountTd.innerHTML = `
        <input type="number" id="edit-amount-${id}" value="${t.amount}" min="0" style="width: 80px; padding: 3px; border: 1px solid #ccc; border-radius: 4px;">
    `;

    actionsTd.innerHTML = `
        <button class="btn-save" type="button" title="שמור" aria-label="שמור" onclick="window.saveInlineEdit('${id}')">${ICONS.save}</button>
        <button class="btn-cancel" type="button" title="ביטול" aria-label="ביטול" onclick="window.updateInterface()">${ICONS.cancel}</button>
    `;
};

window.saveInlineEdit = async function(id) {
    const editAmountInput = document.getElementById(`edit-amount-${id}`);
    const newAmount = parseFloat(editAmountInput?.value);

    if (isNaN(newAmount) || newAmount < 0) return;

    const data = getSelectedMonthData();
    const t = data.transactions.find(item => getTransactionId(item) === id);
    if (!t) return;

    const previousValues = {
        amount: t.amount,
        day: t.day,
        date: t.date
    };

    t.amount = newAmount;

    const editDayInput = document.getElementById(`edit-day-${id}`);
    if (editDayInput) t.day = parseInt(editDayInput.value);

    const editDateInput = document.getElementById(`edit-date-${id}`);
    if (editDateInput) t.date = editDateInput.value;

    const updatedData = { amount: t.amount };
    if (t.day != null) updatedData.day = t.day;
    if (t.date != null) updatedData.date = t.date;

    try {
        const response = await apiFetch(`${API_BASE}/transactions/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updatedData)
        });

        if (!response.ok) {
            Object.assign(t, previousValues);
            alert('שמירת השינויים נכשלה. נסה שוב.');
            updateInterface();
            return;
        }

        markLocalMutation();
        updateInterface();
    } catch (err) {
        Object.assign(t, previousValues);
        console.error('Error updating:', err);
        alert('שגיאת רשת בשמירה. נסה שוב.');
        updateInterface();
    }
};

function displayCurrentMonth() {
    const monthTitleEl = document.getElementById('current-month-title');
    if (monthTitleEl) {
        monthTitleEl.textContent = `תזרים מזומנים ותקציב חודשי`;
    }
}

// הרצה וביצוע אתחול ראשוני
populateMonthSelector();
displayCurrentMonth();
if (transactionTypeSelect) window.updateFormDateLabels();

async function fetchMonthDataFromServer() {
    try {
        const [txResponse, monthResponse] = await Promise.all([
            apiFetch(`${API_BASE}/transactions?month=${selectedMonth}`),
            apiFetch(`${API_BASE}/months/${selectedMonth}`)
        ]);

        const data = getSelectedMonthData();
        let shouldRefreshUi = false;

        if (txResponse.ok && shouldApplyServerTransactions()) {
            const serverTransactions = await txResponse.json();
            serverTransactions.forEach(normalizeServerTransaction);
            data.transactions = serverTransactions;
            shouldRefreshUi = true;
        }

        if (monthResponse.ok) {
            const monthData = await monthResponse.json();

            if (monthData.exists === false && data.bankBalance !== 5000) {
                await saveBankBalanceToServer();
            } else if (document.activeElement !== currentBankBalanceInput) {
                data.bankBalance = monthData.bankBalance ?? 5000;

                if (currentBankBalanceInput) {
                    currentBankBalanceInput.value = data.bankBalance;
                }
                shouldRefreshUi = true;
            }
        }

        if (shouldRefreshUi && !isInlineEditing()) {
            updateInterface();
        } else if (shouldRefreshUi) {
            updateSummary();
            updateChart();
            saveToLocalStorage();
        }
    } catch (err) {
        console.error('Error syncing from server:', err);
    }
}

fetchMonthDataFromServer();

let backgroundSyncTimer = null;
function scheduleBackgroundSync() {
    if (isInlineEditing()) return;
    clearTimeout(backgroundSyncTimer);
    backgroundSyncTimer = setTimeout(fetchMonthDataFromServer, 1500);
}

window.addEventListener('focus', scheduleBackgroundSync);
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        scheduleBackgroundSync();
    }
});

async function refreshAuthUser() {
    try {
        const response = await apiFetch(`${API_BASE}/auth/me`);
        if (response.ok) {
            const data = await response.json();
            setAuth(getToken(), data.user);
            return data.user;
        }
    } catch {
        return getAuthUser();
    }
    return getAuthUser();
}

refreshAuthUser().then((user) => {
    const greeting = document.getElementById('user-greeting');
    if (greeting && user?.displayName) {
        greeting.textContent = `שלום, ${user.displayName}`;
    }
    if (user?.role === 'admin') {
        document.getElementById('admin-link')?.style.setProperty('display', 'inline-block');
    }
});

document.getElementById('logout-btn')?.addEventListener('click', () => {
    clearAuth();
    window.location.href = '/login.html';
});

const TABLE_COLLAPSE_KEY = getStorageKey('budget_table_collapsed');

function getCollapsedTables() {
    try {
        return JSON.parse(localStorage.getItem(TABLE_COLLAPSE_KEY) || '{}');
    } catch {
        return {};
    }
}

function saveCollapsedTables(state) {
    localStorage.setItem(TABLE_COLLAPSE_KEY, JSON.stringify(state));
}

function setTableCollapsed(container, collapsed) {
    const btn = container.querySelector('.table-toggle-btn');
    const tableId = container.dataset.tableId;
    container.classList.toggle('collapsed', collapsed);
    if (btn) {
        btn.textContent = collapsed ? '+' : '−';
        btn.setAttribute('aria-expanded', String(!collapsed));
        btn.setAttribute('aria-label', collapsed ? 'פתח טבלה' : 'כווץ טבלה');
    }
    if (tableId) {
        const state = getCollapsedTables();
        state[tableId] = collapsed;
        saveCollapsedTables(state);
    }
}

function toggleTableContainer(container) {
    setTableCollapsed(container, !container.classList.contains('collapsed'));
}

function initTableToggles() {
    const collapsedState = getCollapsedTables();
    document.querySelectorAll('.table-container[data-table-id]').forEach((container) => {
        const tableId = container.dataset.tableId;
        if (collapsedState[tableId]) {
            setTableCollapsed(container, true);
        }

        container.querySelector('.table-toggle-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleTableContainer(container);
        });

        container.querySelector('.table-header')?.addEventListener('click', () => {
            toggleTableContainer(container);
        });
    });
}

initTableToggles();