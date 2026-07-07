import { authHeaders, clearAuth } from './auth.js';

export function createAdminApi(apiBase, onUnauthorized) {
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
        } else if (response.status === 403) {
            onUnauthorized?.();
        }

        return response;
    }

    return {
        fetchUsers() {
            return apiFetch(`${apiBase}/admin/users`);
        },
        fetchRegistrationRequests() {
            return apiFetch(`${apiBase}/admin/registration-requests?status=pending`);
        },
        approveRegistration(requestId) {
            return apiFetch(`${apiBase}/admin/registration-requests/${requestId}/approve`, {
                method: 'POST'
            });
        },
        rejectRegistration(requestId) {
            return apiFetch(`${apiBase}/admin/registration-requests/${requestId}/reject`, {
                method: 'POST'
            });
        },
        updateUser(userId, payload) {
            return apiFetch(`${apiBase}/admin/users/${userId}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
        },
        deleteUser(userId) {
            return apiFetch(`${apiBase}/admin/users/${userId}`, {
                method: 'DELETE'
            });
        },
        fetchUserBudget(userId, month) {
            return apiFetch(`${apiBase}/admin/users/${userId}/budget?month=${month}`);
        }
    };
}
