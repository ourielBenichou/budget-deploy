export function validatePassword(password) {
    if (!password || password.length < 6) {
        return 'הסיסמה חייבת להכיל לפחות 6 תווים, אות גדולה, אות קטנה ומספר';
    }

    if (!/[a-z]/.test(password)) {
        return 'הסיסמה חייבת להכיל אות קטנה באנגלית';
    }

    if (!/[A-Z]/.test(password)) {
        return 'הסיסמה חייבת להכיל אות גדולה באנגלית';
    }

    if (!/\d/.test(password)) {
        return 'הסיסמה חייבת להכיל לפחות ספרה אחת';
    }

    return null;
}
