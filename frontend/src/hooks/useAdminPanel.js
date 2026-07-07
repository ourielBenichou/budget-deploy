import { useCallback, useEffect, useMemo, useState } from 'react';
import { getApiBase, getAuthUser, getToken, setAuth } from '../services/auth.js';
import { createAdminApi } from '../services/adminApi.js';
import { getCurrentMonthKey } from '../utils/budgetHelpers.js';

export function useAdminPanel(onUnauthorized) {
    const apiBase = getApiBase();
    const api = useMemo(() => createAdminApi(apiBase, onUnauthorized), [apiBase, onUnauthorized]);

    const [users, setUsers] = useState([]);
    const [requests, setRequests] = useState([]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [editingUserId, setEditingUserId] = useState(null);
    const [viewingUserId, setViewingUserId] = useState(null);
    const [budgetData, setBudgetData] = useState(null);
    const [budgetMonth, setBudgetMonth] = useState(getCurrentMonthKey());

    const clearMessages = useCallback(() => {
        setError('');
        setSuccess('');
    }, []);

    const loadUsers = useCallback(async () => {
        const response = await api.fetchUsers();
        const data = await response.json();

        if (!response.ok) {
            setError(data.error || 'שגיאה בטעינת משתמשים');
            return;
        }

        setUsers(data);
        setEditingUserId(null);
    }, [api]);

    const loadRegistrationRequests = useCallback(async () => {
        const response = await api.fetchRegistrationRequests();
        const data = await response.json();

        if (!response.ok) {
            setError(data.error || 'שגיאה בטעינת בקשות');
            return;
        }

        setRequests(data);
    }, [api]);

    const refreshAll = useCallback(async () => {
        clearMessages();
        await Promise.all([loadRegistrationRequests(), loadUsers()]);
    }, [clearMessages, loadRegistrationRequests, loadUsers]);

    useEffect(() => {
        refreshAll().catch(() => setError('שגיאת רשת'));
    }, [refreshAll]);

    const loadUserBudget = useCallback(async (userId, month) => {
        const response = await api.fetchUserBudget(userId, month);
        const data = await response.json();

        if (!response.ok) {
            setError(data.error || 'שגיאה בטעינת תקציב');
            return;
        }

        setBudgetData(data);
    }, [api]);

    const openBudget = useCallback(async (userId) => {
        clearMessages();
        const month = getCurrentMonthKey();
        setViewingUserId(userId);
        setBudgetMonth(month);
        await loadUserBudget(userId, month);
    }, [clearMessages, loadUserBudget]);

    const closeBudget = useCallback(() => {
        setViewingUserId(null);
        setBudgetData(null);
    }, []);

    const changeBudgetMonth = useCallback(async (month) => {
        if (!viewingUserId) return;
        setBudgetMonth(month);
        await loadUserBudget(viewingUserId, month);
    }, [loadUserBudget, viewingUserId]);

    const approveRegistration = useCallback(async (requestId) => {
        if (!confirm('לאשר את בקשת ההרשמה ולפתוח חשבון חדש?')) return;

        clearMessages();
        try {
            const response = await api.approveRegistration(requestId);
            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'שגיאה באישור הבקשה');
                return;
            }

            setSuccess('החשבון נוצר בהצלחה');
            await Promise.all([loadRegistrationRequests(), loadUsers()]);
        } catch {
            setError('שגיאת רשת');
        }
    }, [api, clearMessages, loadRegistrationRequests, loadUsers]);

    const rejectRegistration = useCallback(async (requestId) => {
        if (!confirm('לדחות את בקשת ההרשמה?')) return;

        clearMessages();
        try {
            const response = await api.rejectRegistration(requestId);
            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'שגיאה בדחיית הבקשה');
                return;
            }

            setSuccess('הבקשה נדחתה');
            await loadRegistrationRequests();
        } catch {
            setError('שגיאת רשת');
        }
    }, [api, clearMessages, loadRegistrationRequests]);

    const saveUser = useCallback(async (userId, payload) => {
        clearMessages();
        try {
            const response = await api.updateUser(userId, payload);
            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'שגיאה בעדכון משתמש');
                return;
            }

            if (getAuthUser()?.id === userId) {
                setAuth(getToken(), data.user);
            }

            setSuccess('המשתמש עודכן בהצלחה');
            await loadUsers();
        } catch {
            setError('שגיאת רשת');
        }
    }, [api, clearMessages, loadUsers]);

    const deleteUser = useCallback(async (userId) => {
        const user = users.find(item => item.id === userId);
        if (!user) return;

        const confirmed = confirm(
            `למחוק את המשתמש ${user.displayName}?\nפעולה זו תמחק גם את כל התקציב שלו.`
        );
        if (!confirmed) return;

        clearMessages();
        try {
            const response = await api.deleteUser(userId);
            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'שגיאה במחיקת משתמש');
                return;
            }

            setSuccess('המשתמש נמחק בהצלחה');
            await loadUsers();
        } catch {
            setError('שגיאת רשת');
        }
    }, [api, clearMessages, loadUsers, users]);

    return {
        users,
        requests,
        error,
        success,
        editingUserId,
        budgetData,
        budgetMonth,
        budgetOpen: Boolean(viewingUserId),
        setEditingUserId,
        refreshAll,
        approveRegistration,
        rejectRegistration,
        saveUser,
        deleteUser,
        openBudget,
        closeBudget,
        changeBudgetMonth
    };
}
