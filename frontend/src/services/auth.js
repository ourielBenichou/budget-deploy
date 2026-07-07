export const PRODUCTION_API = 'https://budget-deploy2.onrender.com/api';

function isLocalHost() {
    const host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
}

export function isNativeApp() {
    return window.Capacitor?.isNativePlatform?.() === true;
}

export function getApiBase() {
    const viteApiBase = import.meta.env?.VITE_API_BASE;
    if (viteApiBase) {
        return viteApiBase;
    }

    if (isNativeApp()) {
        return PRODUCTION_API;
    }

    if (isLocalHost()) {
        const port = window.location.port;
        // Vite dev server — use proxy to local backend
        if (port && port !== '5000') {
            return '/api';
        }

        return `${window.location.protocol}//${window.location.hostname}:5000/api`;
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
        window.location.href = '/login';
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
        window.location.href = '/login';
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
