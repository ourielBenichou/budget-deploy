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
const errorMsg = document.getElementById('error-msg');
const successMsg = document.getElementById('success-msg');

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

function renderUsers(users) {
    if (!users.length) {
        usersList.innerHTML = '<tr><td colspan="5">אין משתמשים</td></tr>';
        return;
    }

    usersList.innerHTML = users.map(user => `
        <tr id="row-${user.id}">
            <td>${user.displayName}</td>
            <td>${user.username || '-'}</td>
            <td>${user.email}</td>
            <td>${renderRoleBadge(user.role)}</td>
            <td>
                <button type="button" class="btn btn-secondary btn-small" onclick="window.startEditUser('${user.id}')">ערוך</button>
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
                <input type="text" id="edit-display-${userId}" value="${user.displayName}">
                <label>שם משתמש</label>
                <input type="text" id="edit-username-${userId}" value="${user.username || ''}">
                <label>אימייל</label>
                <input type="email" id="edit-email-${userId}" value="${user.email}">
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

document.getElementById('refresh-btn').addEventListener('click', loadUsers);
loadUsers();
