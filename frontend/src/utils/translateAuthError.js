export function translateAuthError(message) {
    const messages = {
        'Registration request already pending approval': 'בקשת ההרשמה כבר ממתינה לאישור',
        'Registration request pending admin approval': 'בקשת ההרשמה ממתינה לאישור המנהל',
        'Account not found. A registration request was sent for admin approval.':
            'החשבון לא קיים. נשלחה בקשה לאישור המנהל',
        'Username or email already exists': 'שם המשתמש או האימייל כבר קיימים',
        'Invalid credentials': 'פרטי התחברות שגויים',
        'Use Google or Apple sign-in for this account':
            'החשבון הזה מחובר ל-Google או Apple. התחבר דרך הכפתור המתאים',
        'Password must be at least 6 characters and include uppercase, lowercase, and a number':
            'הסיסמה חייבת להכיל לפחות 6 תווים, אות גדולה, אות קטנה ומספר',
        'Google login is not configured': 'התחברות Google לא מוגדרת בשרת',
        'Apple login is not configured': 'התחברות Apple לא מוגדרת בשרת'
    };

    return messages[message] || message;
}
