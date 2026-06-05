// קביעת החודש הנוכחי כברירת מחדל בפורמט YYYY-MM (לדוגמה: 2026-05)
const now = new Date();
const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
let selectedMonth = currentMonthKey;

// שליפת מבנה הנתונים השלם מחולק לפי חודשים
let allMonthsData = JSON.parse(localStorage.getItem('budget_app_monthly_v3')) || {};

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

// האזנה לשינוי יתרת הבנק
if (currentBankBalanceInput) {
    currentBankBalanceInput.addEventListener('input', function() {
        const data = getSelectedMonthData();
        data.bankBalance = parseFloat(currentBankBalanceInput.value) || 0;
        updateInterface();
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
    
    updateInterface();
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

function updateChart() {
    const ctx = document.getElementById('trendChart')?.getContext('2d');
    if (!ctx) return;

    const data = getSelectedMonthData();
    const startBalance = data.bankBalance;
    const milestones = [1, 10, 15, 20, 25, 31];
    
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
            labels: ['01 לחודש', '10 לחודש', '15 לחודש', '20 לחודש', '25 לחודש', '31 לחודש'],
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
        
    row.innerHTML = `
        <td><strong>${displayNameText}</strong></td>
        <td>${t.day ? `ב-${t.day} לחודש` : '-'}</td>
        <td>${t.amount.toLocaleString()} ₪</td>
        <td class="actions-cell">
            <button class="btn-edit" onclick="window.startInlineEdit('${t.id}')">ערוך</button>
            <button class="btn-delete" onclick="window.deleteTransaction('${t.id}')">מחק</button>
        </td>
    `;

        if ((t.type === 'income' || t.type === 'one-time-income') && incomesList) incomesList.appendChild(row);
        else if (t.type === 'fixed-expense' && fixedExpensesList) fixedExpensesList.appendChild(row);
        else if (t.type === 'variable-expense' && variableExpensesList) variableExpensesList.appendChild(row);
    });
}

function saveToLocalStorage() {
    localStorage.setItem('budget_app_monthly_v3', JSON.stringify(allMonthsData));
}

async function saveTransactionToServer(transaction) {
    try {
    const response = await fetch('https://budget-deploy2.onrender.com/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction)
    });
            
        // כאן נדפיס את השגיאה האמיתית אם היא קיימת
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Server rejected data:', errorData);
            throw new Error('Failed to save');
        }
        console.log('Transaction saved to MongoDB!');
    } catch (err) {
        console.error('Error saving to server:', err);
    }
}

function updateInterface() {
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
            description: description, // שינינו ל-description
            amount: amount,
            type: type,
            day: (type === 'income' || type === 'fixed-expense') ? parseInt(timeValue) || new Date().getDate() : null,
            date: type === 'variable-expense' ? timeValue : null
        };

        const data = getSelectedMonthData();
        data.transactions.push(newTransaction);
        
        // כאן אנחנו שולחים את הנתונים לשרת (MongoDB)
        await saveTransactionToServer(newTransaction);

        updateInterface();

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
    
    if (confirm('האם אתה בטוח שברצונך למחוק שורה זו?')) {
        try {
            const response = await fetch(`https://budget-deploy2.onrender.com/api/transactions/${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                await fetchTransactionsFromServer(); 
            } else {
                const errorData = await response.json();
                alert("שגיאה במחיקה: " + errorData.error);
            }
        } catch (err) {
            console.error('Network error:', err);
        }
    }
};

window.startInlineEdit = function(id) {
    const data = getSelectedMonthData();
    const t = data.transactions.find(item => item.id === id);
    if (!t) return;

    const timeTd = document.getElementById(`time-td-${id}`);
    const amountTd = document.getElementById(`amount-td-${id}`);
    const actionsTd = document.getElementById(`actions-td-${id}`);

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
        <button class="btn-save" onclick="saveInlineEdit('${id}')" style="background-color: #2ec4b6; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; margin-left: 4px;">שמור</button>
        <button class="btn-delete" onclick="updateInterface()" style="background-color: #777; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">ביטול</button>
    `;
};

window.saveInlineEdit = async function(id) {
    const editAmountInput = document.getElementById(`edit-amount-${id}`);
    const newAmount = parseFloat(editAmountInput.value);

    // הכנת האובייקט המעודכן
    let updatedData = { amount: newAmount };
    
    // אם זה הכנסה/קבוע, נוסיף גם את היום
    const editDayInput = document.getElementById(`edit-day-${id}`);
    if (editDayInput) updatedData.day = parseInt(editDayInput.value);

    try {
        await fetch(`https://budget-deploy2.onrender.com/api/transactions/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData)
        });
        await fetchTransactionsFromServer(); // רענון מהשרת
    } catch (err) {
        console.error('Error updating:', err);
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
const initialData = getSelectedMonthData();
if (currentBankBalanceInput) {
    currentBankBalanceInput.value = initialData.bankBalance;
}
updateInterface();
displayCurrentMonth();
if (transactionTypeSelect) window.updateFormDateLabels();

// פונקציה למשיכת נתונים מהשרת ועדכון האפליקציה
async function fetchTransactionsFromServer() {
    try {
        const response = await fetch('https://budget-deploy2.onrender.com/api/transactions');
        if (!response.ok) throw new Error('Failed to fetch');
        
        const serverTransactions = await response.json();
        
        // עדכון הנתונים בזיכרון המקומי
        const data = getSelectedMonthData();
        data.transactions = serverTransactions; 
        
        // רענון התצוגה
        updateInterface();
    } catch (err) {
        console.error('Error syncing from server:', err);
    }
}

// הרצה ראשונית
fetchTransactionsFromServer();

// עדכון אוטומטי כל 5 שניות
setInterval(fetchTransactionsFromServer, 5000);