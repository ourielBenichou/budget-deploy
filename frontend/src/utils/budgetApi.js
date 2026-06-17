import { authHeaders, clearAuth } from '../auth.js';

export function createBudgetApi(apiBase, onUnauthorized) {
    async function apiFetch(url, options = {}) {
        const response = await fetch(url, {
            ...options,
            headers: authHeaders({
                'Content-Type': 'application/json',
                ...(options.headers || {})
            })
        });

        if (response.status === 401) {
            clearAuth();
            onUnauthorized?.();
        }

        return response;
    }

    return {
        apiFetch,
        fetchMonthData(month) {
            return Promise.all([
                apiFetch(`${apiBase}/transactions?month=${month}`),
                apiFetch(`${apiBase}/months/${month}`)
            ]);
        },
        createTransaction(transaction, month) {
            return apiFetch(`${apiBase}/transactions`, {
                method: 'POST',
                body: JSON.stringify({ ...transaction, month })
            });
        },
        updateTransaction(id, payload) {
            return apiFetch(`${apiBase}/transactions/${encodeURIComponent(id)}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
        },
        deleteTransaction(id) {
            return apiFetch(`${apiBase}/transactions/${encodeURIComponent(id)}`, {
                method: 'DELETE'
            });
        },
        saveBankBalance(month, bankBalance) {
            return apiFetch(`${apiBase}/months/${month}`, {
                method: 'PUT',
                body: JSON.stringify({ bankBalance })
            });
        },
        fetchAuthConfig() {
            return apiFetch(`${apiBase}/auth/config`);
        },
        fetchCurrentUser() {
            return apiFetch(`${apiBase}/auth/me`);
        }
    };
}
