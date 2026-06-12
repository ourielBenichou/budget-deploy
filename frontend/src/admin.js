import {
    getApiBase,
    requireAuth,
    authHeaders,
    handleAuthError,
    getAuthUser,
    setAuth,
    getToken
} from './auth.js';

if (!requireAuth()) {
    throw new Error('Not authenticated');
}

const authUser = getAuthUser();
if (authUser?.role !== 'admin') {
    window.location.href = '/app.html';
    throw new Error('Not admin');
}

const API_BASE = getApiBase();
const usersList = document.getElementById('users-list');
const requestsList = document.getElementById('requests-list');
const errorMsg = document.getElementById('error-msg');
const successMsg = document.getElementById('success-msg');
const budgetModal = document.getElementById('budget-modal');
const budgetMonthSelect = document.getElementById('budget-month-select');
let viewingUserId = null;

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatMoney(value) {
    return `${Number(value || 0).toLocaleString()} ₪`;
}

function getCurrentMonthKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function showError(message) {
    successMsg.style.display = 'none';
    errorMsg.textContent = message;
    errorMsg.style.display = 'block';
}

function showSuccess(message) {
    errorMsg.style.display = 'none';
    successMsg.textContent = message;
    successMsg.style.display = 'block';
}

async function apiFetch(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: authHeaders({
            'Content-Type': 'application/json',
            ...(options.headers || {})
        })
    });

    if (handleAuthError(response)) return response;
    if (response.status === 403) {
        window.location.href = '/app.html';
    }
    return response;
}

function renderRoleBadge(role) {
    const label = role === 'admin' ? 'מנהל' : 'משתמש';
    const className = role === 'admin' ? 'role-admin' : 'role-user';
    return `<span class="role-badge ${className}">${label}</span>`;
}

function formatDate(value) {
    if (!value) return '-';
    return new Date(value).toLocaleString('he-IL');
}

function renderRegistrationRequests(requests) {
    if (!requests.length) {
        requestsList.innerHTML = '<tr><td colspan="6">אין בקשות ממתינות</td></tr>';
        return;
    }

    requestsList.innerHTML = requests.map(request => `
        <tr>
            <td>${escapeHtml(request.displayName)}</td>
            <td>${escapeHtml(request.username || '-')}</td>
            <td>${escapeHtml(request.email)}</td>
            <td>${request.authType === 'google' ? 'Google' : 'שם משתמש/סיסמה'}</td>
            <td>${formatDate(request.createdAt)}</td>
            <td>
                <div class="row-actions">
                    <button type="button" class="btn btn-primary btn-small" onclick="window.approveRegistration('${request.id}')">אשר</button>
                    <button type="button" class="btn btn-danger btn-small" onclick="window.rejectRegistration('${request.id}')">דחה</button>
                </div>
            </td>
        </tr>
    `).join('');
}

window.approveRegistration = async function(requestId) {
    if (!confirm('לאשר את בקשת ההרשמה ולפתוח חשבון חדש?')) return;

    try {
        const response = await apiFetch(`${API_BASE}/admin/registration-requests/${requestId}/approve`, {
            method: 'POST'
        });
        const data = await response.json();

        if (!response.ok) {
            showError(data.error || 'שגיאה באישור הבקשה');
            return;
        }

        showSuccess('החשבון נוצר בהצלחה');
        await Promise.all([loadRegistrationRequests(), loadUsers()]);
    } catch {
        showError('שגיאת רשת');
    }
};

window.rejectRegistration = async function(requestId) {
    if (!confirm('לדחות את בקשת ההרשמה?')) return;

    try {
        const response = await apiFetch(`${API_BASE}/admin/registration-requests/${requestId}/reject`, {
            method: 'POST'
        });
        const data = await response.json();

        if (!response.ok) {
            showError(data.error || 'שגיאה בדחיית הבקשה');
            return;
        }

        showSuccess('הבקשה נדחתה');
        await loadRegistrationRequests();
    } catch {
        showError('שגיאת רשת');
    }
};

async function loadRegistrationRequests() {
    try {
        const response = await apiFetch(`${API_BASE}/admin/registration-requests?status=pending`);
        const requests = await response.json();

        if (!response.ok) {
            showError(requests.error || 'שגיאה בטעינת בקשות');
            return;
        }

        renderRegistrationRequests(requests);
    } catch {
        showError('שגיאת רשת');
    }
}

function renderUsers(users) {
    if (!users.length) {
        usersList.innerHTML = '<tr><td colspan="5">אין משתמשים</td></tr>';
        return;
    }

    usersList.innerHTML = users.map(user => `
        <tr id="row-${user.id}">
            <td>${escapeHtml(user.displayName)}</td>
            <td>${escapeHtml(user.username || '-')}</td>
            <td>${escapeHtml(user.email)}</td>
            <td>${renderRoleBadge(user.role)}</td>
            <td>
                <div class="row-actions">
                    <button type="button" class="btn btn-secondary btn-small" onclick="window.startEditUser('${user.id}')">ערוך</button>
                    <button type="button" class="btn btn-primary btn-small" onclick="window.viewUserBudget('${user.id}')">צפה בתקציב</button>
                    <button type="button" class="btn btn-danger btn-small" onclick="window.deleteUser('${user.id}')">מחק</button>
                </div>
            </td>
        </tr>
    `).join('');
}

window.startEditUser = function(userId) {
    const row = document.getElementById(`row-${userId}`);
    const user = window.__usersCache?.find(item => item.id === userId);
    if (!row || !user) return;

    row.innerHTML = `
        <td colspan="5">
            <div class="edit-form">
                <label>שם תצוגה</label>
                <input type="text" id="edit-display-${userId}" value="${escapeHtml(user.displayName)}">
                <label>שם משתמש</label>
                <input type="text" id="edit-username-${userId}" value="${escapeHtml(user.username || '')}">
                <label>אימייל</label>
                <input type="email" id="edit-email-${userId}" value="${escapeHtml(user.email)}">
                <label>תפקיד</label>
                <select id="edit-role-${userId}">
                    <option value="user" ${user.role === 'user' ? 'selected' : ''}>משתמש</option>
                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>מנהל</option>
                </select>
                <label>סיסמה חדשה (אופציונלי)</label>
                <input type="password" id="edit-password-${userId}" placeholder="השאר ריק אם לא משנים">
                <div class="edit-actions">
                    <button type="button" class="btn btn-primary btn-small" onclick="window.saveUser('${userId}')">שמור</button>
                    <button type="button" class="btn btn-secondary btn-small" onclick="window.loadUsers()">ביטול</button>
                </div>
            </div>
        </td>
    `;
};

window.saveUser = async function(userId) {
    const payload = {
        displayName: document.getElementById(`edit-display-${userId}`).value.trim(),
        username: document.getElementById(`edit-username-${userId}`).value.trim(),
        email: document.getElementById(`edit-email-${userId}`).value.trim(),
        role: document.getElementById(`edit-role-${userId}`).value
    };

    const password = document.getElementById(`edit-password-${userId}`).value;
    if (password) payload.password = password;

    try {
        const response = await apiFetch(`${API_BASE}/admin/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
        const data = await response.json();

        if (!response.ok) {
            showError(data.error || 'שגיאה בעדכון משתמש');
            return;
        }

        if (authUser?.id === userId) {
            setAuth(getToken(), data.user);
        }

        showSuccess('המשתמש עודכן בהצלחה');
        await loadUsers();
    } catch {
        showError('שגיאת רשת');
    }
};

window.deleteUser = async function(userId) {
    const user = window.__usersCache?.find(item => item.id === userId);
    if (!user) return;

    const confirmed = confirm(`למחוק את המשתמש ${user.displayName}?\nפעולה זו תמחק גם את כל התקציב שלו.`);
    if (!confirmed) return;

    try {
        const response = await apiFetch(`${API_BASE}/admin/users/${userId}`, {
            method: 'DELETE'
        });
        const data = await response.json();

        if (!response.ok) {
            showError(data.error || 'שגיאה במחיקת משתמש');
            return;
        }

        showSuccess('המשתמש נמחק בהצלחה');
        await loadUsers();
    } catch {
        showError('שגיאת רשת');
    }
};

function renderTransactionSection(title, transactions) {
    if (!transactions.length) {
        return `
            <div class="budget-section">
                <h3>${escapeHtml(title)}</h3>
                <div class="empty-state">אין תנועות</div>
            </div>
        `;
    }

    const rows = transactions.map(t => {
        const timeDisplay = t.day ? `ב-${t.day} לחודש` : (t.date || '-');
        return `
            <tr>
                <td>${escapeHtml(t.description)}</td>
                <td>${escapeHtml(timeDisplay)}</td>
                <td>${formatMoney(t.amount)}</td>
            </tr>
        `;
    }).join('');

    return `
        <div class="budget-section">
            <h3>${escapeHtml(title)}</h3>
            <table>
                <thead>
                    <tr>
                        <th>שם</th>
                        <th>מועד</th>
                        <th>סכום</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;
}

function renderBudgetModal(data) {
    document.getElementById('budget-modal-title').textContent = `תקציב של ${data.user.displayName}`;
    document.getElementById('budget-bank-balance').textContent = formatMoney(data.summary.bankBalance);
    document.getElementById('budget-total-income').textContent = formatMoney(data.summary.totalIncome);
    document.getElementById('budget-total-expenses').textContent = formatMoney(data.summary.totalExpenses);
    document.getElementById('budget-net-balance').textContent = formatMoney(data.summary.netBalance);

    const incomes = data.transactions.filter(t => t.type === 'income' || t.type === 'one-time-income');
    const fixedExpenses = data.transactions.filter(t => t.type === 'fixed-expense');
    const variableExpenses = data.transactions.filter(t => t.type === 'variable-expense');

    document.getElementById('budget-content').innerHTML = [
        renderTransactionSection('הכנסות', incomes),
        renderTransactionSection('הוצאות קבועות', fixedExpenses),
        renderTransactionSection('הוצאות משתנות', variableExpenses)
    ].join('');
}

async function loadUserBudget() {
    if (!viewingUserId) return;

    try {
        const month = budgetMonthSelect.value || getCurrentMonthKey();
        const response = await apiFetch(`${API_BASE}/admin/users/${viewingUserId}/budget?month=${month}`);
        const data = await response.json();

        if (!response.ok) {
            showError(data.error || 'שגיאה בטעינת תקציב');
            return;
        }

        renderBudgetModal(data);
        budgetModal.classList.add('open');
    } catch {
        showError('שגיאת רשת');
    }
}

window.viewUserBudget = function(userId) {
    viewingUserId = userId;
    budgetMonthSelect.value = getCurrentMonthKey();
    loadUserBudget();
};

window.loadUsers = async function loadUsers() {
    try {
        const response = await apiFetch(`${API_BASE}/admin/users`);
        const users = await response.json();

        if (!response.ok) {
            showError(users.error || 'שגיאה בטעינת משתמשים');
            return;
        }

        window.__usersCache = users;
        renderUsers(users);
    } catch {
        showError('שגיאת רשת');
    }
};

document.getElementById('refresh-btn').addEventListener('click', () => {
    loadRegistrationRequests();
    loadUsers();
});
document.getElementById('close-budget-modal').addEventListener('click', () => {
    budgetModal.classList.remove('open');
    viewingUserId = null;
});
budgetMonthSelect.addEventListener('change', loadUserBudget);
budgetModal.addEventListener('click', (event) => {
    if (event.target === budgetModal) {
        budgetModal.classList.remove('open');
        viewingUserId = null;
    }
});

loadRegistrationRequests();
loadUsers();
