export function formatMoney(value) {
    return `${Number(value || 0).toLocaleString()} ₪`;
}

export function formatDate(value) {
    if (!value) return '-';
    return new Date(value).toLocaleString('he-IL');
}

export function getAuthTypeLabel(authType) {
    if (authType === 'google') return 'Google';
    if (authType === 'apple') return 'Apple';
    return 'שם משתמש/סיסמה';
}
