export const PRODUCTION_API = 'https://budget-deploy2.onrender.com/api';

export function isNativeApp() {
    return window.Capacitor?.isNativePlatform?.() === true;
}

export function getApiBase() {
    if (isNativeApp()) {
        return PRODUCTION_API;
    }
    if (window.location.hostname === 'localhost') {
        return 'http://localhost:5000/api';
    }
    return `${window.location.origin}/api`;
}

export function getToken() {
    return localStorage.getItem('auth_token');
}

export function getAuthUser() {
    try {
        return JSON.parse(localStorage.getItem('auth_user') || 'null');
    } catch {
        return null;
    }
}

export function setAuth(token, user) {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
}

export function clearAuth() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
}

export function requireAuth() {
    if (!getToken()) {
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

export function authHeaders(extra = {}) {
    const headers = { ...extra };
    const token = getToken();
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }
    return headers;
}

export function handleAuthError(response) {
    if (response.status === 401) {
        clearAuth();
        window.location.href = '/login.html';
        return true;
    }
    return false;
}

export function getStorageKey(baseKey) {
    const user = getAuthUser();
    return user?.id ? `${baseKey}_${user.id}` : baseKey;
}

export function isAdmin() {
    return getAuthUser()?.role === 'admin';
}
