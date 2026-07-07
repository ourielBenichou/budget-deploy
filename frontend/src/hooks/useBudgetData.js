import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    getApiBase,
    getAuthUser,
    getStorageKey,
    getToken,
    setAuth
} from '../services/auth.js';
import { createBudgetApi } from '../services/budgetApi.js';
import {
    buildMonthOptions,
    getCurrentMonthKey,
    getMonthData,
    getTransactionId,
    loadInitialMonthsData,
    normalizeServerTransaction
} from '../utils/budgetHelpers.js';

export function useBudgetData(onUnauthorized) {
    const apiBase = getApiBase();
    const storageKey = getStorageKey('budget_app_monthly_v3');
    const collapseStorageKey = getStorageKey('budget_table_collapsed');
    const api = useMemo(() => createBudgetApi(apiBase, onUnauthorized), [apiBase, onUnauthorized]);

    const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey());
    const [allMonthsData, setAllMonthsData] = useState(() =>
        loadInitialMonthsData(storageKey, getCurrentMonthKey())
    );
    const [editingId, setEditingId] = useState(null);
    const [collapsedTables, setCollapsedTables] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem(collapseStorageKey) || '{}');
        } catch {
            return {};
        }
    });
    const [user, setUser] = useState(getAuthUser());

    const lastMutationTime = useRef(0);
    const bankBalanceSaveTimeout = useRef(null);
    const backgroundSyncTimer = useRef(null);
    const bankBalanceFocused = useRef(false);

    const monthData = useMemo(
        () => getMonthData(allMonthsData, selectedMonth),
        [allMonthsData, selectedMonth]
    );

    const monthOptions = useMemo(() => buildMonthOptions(), []);

    const markLocalMutation = useCallback(() => {
        lastMutationTime.current = Date.now();
    }, []);

    const persistLocalData = useCallback((nextData) => {
        setAllMonthsData(nextData);
        localStorage.setItem(storageKey, JSON.stringify(nextData));
    }, [storageKey]);

    const updateMonthData = useCallback((updater) => {
        setAllMonthsData(prev => {
            const current = getMonthData(prev, selectedMonth);
            const updatedMonth = typeof updater === 'function' ? updater(current) : updater;
            const next = {
                ...prev,
                [selectedMonth]: updatedMonth
            };
            localStorage.setItem(storageKey, JSON.stringify(next));
            return next;
        });
    }, [selectedMonth, storageKey]);

    const shouldApplyServerTransactions = useCallback(() => {
        return editingId === null && Date.now() >= lastMutationTime.current + 5000;
    }, [editingId]);

    const syncFromServer = useCallback(async () => {
        try {
            const [txResponse, monthResponse] = await api.fetchMonthData(selectedMonth);
            let shouldRefresh = false;

            if (txResponse.ok && shouldApplyServerTransactions()) {
                const serverTransactions = await txResponse.json();
                serverTransactions.forEach(normalizeServerTransaction);
                updateMonthData(current => ({
                    ...current,
                    transactions: serverTransactions
                }));
                shouldRefresh = true;
            }

            if (monthResponse.ok) {
                const monthPayload = await monthResponse.json();

                if (monthPayload.exists === false && monthData.bankBalance !== 5000) {
                    await api.saveBankBalance(selectedMonth, monthData.bankBalance);
                    markLocalMutation();
                } else if (!bankBalanceFocused.current) {
                    updateMonthData(current => ({
                        ...current,
                        bankBalance: monthPayload.bankBalance ?? 5000
                    }));
                    shouldRefresh = true;
                }
            }

            if (shouldRefresh && editingId !== null) {
                return;
            }
        } catch (error) {
            console.error('Error syncing from server:', error);
        }
    }, [
        api,
        editingId,
        markLocalMutation,
        monthData.bankBalance,
        selectedMonth,
        shouldApplyServerTransactions,
        updateMonthData
    ]);

    const scheduleBackgroundSync = useCallback(() => {
        if (editingId !== null) return;
        clearTimeout(backgroundSyncTimer.current);
        backgroundSyncTimer.current = setTimeout(syncFromServer, 1500);
    }, [editingId, syncFromServer]);

    useEffect(() => {
        syncFromServer();
    }, [selectedMonth, syncFromServer]);

    useEffect(() => {
        const onFocus = () => scheduleBackgroundSync();
        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                scheduleBackgroundSync();
            }
        };

        window.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', onVisibilityChange);

        return () => {
            window.removeEventListener('focus', onFocus);
            document.removeEventListener('visibilitychange', onVisibilityChange);
            clearTimeout(backgroundSyncTimer.current);
            clearTimeout(bankBalanceSaveTimeout.current);
        };
    }, [scheduleBackgroundSync]);

    useEffect(() => {
        api.fetchCurrentUser()
            .then(async (response) => {
                if (!response.ok) return;
                const data = await response.json();
                setAuth(getToken(), data.user);
                setUser(data.user);
            })
            .catch(() => setUser(getAuthUser()));
    }, [api]);

    const changeMonth = useCallback((monthKey) => {
        setSelectedMonth(monthKey);
        setEditingId(null);
    }, []);

    const updateBankBalance = useCallback((value) => {
        const bankBalance = parseFloat(value) || 0;
        updateMonthData(current => ({ ...current, bankBalance }));
        clearTimeout(bankBalanceSaveTimeout.current);
        bankBalanceSaveTimeout.current = setTimeout(async () => {
            try {
                const response = await api.saveBankBalance(selectedMonth, bankBalance);
                if (response.ok) markLocalMutation();
            } catch (error) {
                console.error('Error saving bank balance:', error);
            }
        }, 500);
    }, [api, markLocalMutation, selectedMonth, updateMonthData]);

    const addTransaction = useCallback(async (transaction) => {
        updateMonthData(current => ({
            ...current,
            transactions: [...current.transactions, transaction]
        }));

        try {
            const response = await api.createTransaction(transaction, selectedMonth);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to save');
            }
            markLocalMutation();
            return true;
        } catch (error) {
            updateMonthData(current => ({
                ...current,
                transactions: current.transactions.filter(t => getTransactionId(t) !== transaction.id)
            }));
            alert('שמירת התנועה נכשלה. נסה שוב.');
            return false;
        }
    }, [api, markLocalMutation, selectedMonth, updateMonthData]);

    const deleteTransaction = useCallback(async (id) => {
        if (!confirm('האם אתה בטוח שברצונך למחוק שורה זו?')) return;

        try {
            const response = await api.deleteTransaction(id);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                alert(errorData.message || errorData.error || 'מחיקה נכשלה בשרת');
                return;
            }

            updateMonthData(current => ({
                ...current,
                transactions: current.transactions.filter(t => getTransactionId(t) !== id)
            }));
            markLocalMutation();
            if (editingId === id) setEditingId(null);
        } catch (error) {
            console.error('Network error:', error);
            alert('שגיאת רשת במחיקה. נסה שוב.');
        }
    }, [api, editingId, markLocalMutation, updateMonthData]);

    const saveInlineEdit = useCallback(async (id, payload) => {
        const current = getMonthData(allMonthsData, selectedMonth);
        const transaction = current.transactions.find(item => getTransactionId(item) === id);
        if (!transaction) return;

        const previousValues = {
            amount: transaction.amount,
            day: transaction.day,
            date: transaction.date
        };

        updateMonthData(month => ({
            ...month,
            transactions: month.transactions.map(item =>
                getTransactionId(item) === id ? { ...item, ...payload } : item
            )
        }));

        try {
            const response = await api.updateTransaction(id, payload);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                updateMonthData(month => ({
                    ...month,
                    transactions: month.transactions.map(item =>
                        getTransactionId(item) === id ? { ...item, ...previousValues } : item
                    )
                }));
                alert(errorData.message || errorData.error || 'שמירת השינויים נכשלה. נסה שוב.');
                return;
            }

            markLocalMutation();
            setEditingId(null);
        } catch (error) {
            updateMonthData(month => ({
                ...month,
                transactions: month.transactions.map(item =>
                    getTransactionId(item) === id ? { ...item, ...previousValues } : item
                )
            }));
            console.error('Error updating:', error);
            alert('שגיאת רשת בשמירה. נסה שוב.');
        }
    }, [allMonthsData, api, markLocalMutation, selectedMonth, updateMonthData]);

    const toggleTableCollapsed = useCallback((tableId) => {
        setCollapsedTables(prev => {
            const next = { ...prev, [tableId]: !prev[tableId] };
            localStorage.setItem(collapseStorageKey, JSON.stringify(next));
            return next;
        });
    }, [collapseStorageKey]);

    return {
        user,
        setUser,
        selectedMonth,
        monthOptions,
        monthData,
        editingId,
        setEditingId,
        collapsedTables,
        changeMonth,
        updateBankBalance,
        setBankBalanceFocused: (focused) => {
            bankBalanceFocused.current = focused;
        },
        addTransaction,
        deleteTransaction,
        saveInlineEdit,
        toggleTableCollapsed
    };
}
