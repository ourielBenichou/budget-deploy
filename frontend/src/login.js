import { getApiBase, setAuth } from './auth.js';
import { validatePassword } from './password.js';

if (localStorage.getItem('auth_token')) {
    window.location.href = '/app.html';
}

const API_BASE = getApiBase();
const authForm = document.getElementById('auth-form');
const errorMsg = document.getElementById('error-msg');
const successMsg = document.getElementById('success-msg');
const toggleModeBtn = document.getElementById('toggle-mode-btn');
const toggleText = document.getElementById('toggle-text');
const formSubtitle = document.getElementById('form-subtitle');
const submitBtn = document.getElementById('submit-btn');
const socialSection = document.getElementById('social-login-section');
const authDivider = document.getElementById('auth-divider');
const appleBtn = document.getElementById('apple-btn');

let isRegisterMode = false;
let appleClientId = '';

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

function hideMessages() {
    errorMsg.style.display = 'none';
    successMsg.style.display = 'none';
}

function saveSession(data) {
    setAuth(data.token, data.user);
    window.location.href = '/app.html';
}

function translateError(message) {
    const messages = {
        'Registration request already pending approval': 'בקשת ההרשמה כבר ממתינה לאישור',
        'Registration request pending admin approval': 'בקשת ההרשמה ממתינה לאישור המנהל',
        'Account not found. A registration request was sent for admin approval.': 'החשבון לא קיים. נשלחה בקשה לאישור המנהל',
        'Username or email already exists': 'שם המשתמש או האימייל כבר קיימים',
        'Invalid credentials': 'פרטי התחברות שגויים',
        'Use Google or Apple sign-in for this account': 'החשבון הזה מחובר ל-Google או Apple. התחבר דרך הכפתור המתאים',
        'Password must be at least 6 characters and include uppercase, lowercase, and a number':
            'הסיסמה חייבת להכיל לפחות 6 תווים, אות גדולה, אות קטנה ומספר',
        'Google login is not configured': 'התחברות Google לא מוגדרת בשרת',
        'Apple login is not configured': 'התחברות Apple לא מוגדרת בשרת'
    };
    return messages[message] || message;
}

function hideSocialSection() {
    socialSection.style.display = 'none';
    authDivider.style.display = 'none';
}

async function handleSocialAuthResponse(authResponse) {
    const data = await authResponse.json();

    if (!authResponse.ok) {
        if (authResponse.status === 403 && data.error?.includes('registration request')) {
            showSuccess('נשלחה בקשה לאישור המנהל. לאחר האישור תוכל להתחבר.');
            return;
        }
        showError(translateError(data.error) || 'שגיאה בהתחברות');
        return;
    }

    saveSession(data);
}

function initGoogleLogin(googleClientId) {
    if (!googleClientId || !window.google?.accounts?.id) {
        document.getElementById('google-btn').style.display = 'none';
        return false;
    }

    window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
            hideMessages();
            try {
                const authResponse = await fetch(`${API_BASE}/auth/google`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ credential: response.credential })
                });
                await handleSocialAuthResponse(authResponse);
            } catch {
                showError('שגיאת רשת בהתחברות Google');
            }
        }
    });

    window.google.accounts.id.renderButton(
        document.getElementById('google-btn'),
        { theme: 'outline', size: 'large', width: 356, locale: 'he' }
    );

    return true;
}

function initAppleLogin(clientId) {
    if (!clientId || !window.AppleID?.auth) {
        appleBtn.style.display = 'none';
        return false;
    }

    appleClientId = clientId;
    appleBtn.style.display = 'flex';

    window.AppleID.auth.init({
        clientId,
        scope: 'name email',
        redirectURI: `${window.location.origin}/login.html`,
        usePopup: true
    });

    appleBtn.addEventListener('click', async () => {
        hideMessages();
        try {
            const response = await window.AppleID.auth.signIn();
            const authResponse = await fetch(`${API_BASE}/auth/apple`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    identityToken: response.authorization.id_token,
                    email: response.user?.email,
                    fullName: [
                        response.user?.name?.firstName,
                        response.user?.name?.lastName
                    ].filter(Boolean).join(' ')
                })
            });
            await handleSocialAuthResponse(authResponse);
        } catch (err) {
            if (err?.error === 'popup_closed_by_user') return;
            showError('שגיאה בהתחברות Apple');
        }
    });

    return true;
}

async function initSocialLogin() {
    try {
        const response = await fetch(`${API_BASE}/auth/config`);
        const config = await response.json();

        const hasGoogle = initGoogleLogin(config.googleClientId);
        const hasApple = initAppleLogin(config.appleClientId);

        if (!hasGoogle && !hasApple) {
            hideSocialSection();
        }
    } catch {
        hideSocialSection();
    }
}

toggleModeBtn.addEventListener('click', () => {
    isRegisterMode = !isRegisterMode;
    hideMessages();
    document.body.classList.toggle('register-mode', isRegisterMode);

    if (isRegisterMode) {
        formSubtitle.textContent = 'שליחת בקשה לפתיחת חשבון';
        submitBtn.textContent = 'שלח בקשה';
        toggleText.textContent = 'יש לך כבר חשבון?';
        toggleModeBtn.textContent = 'התחבר כאן';
        document.getElementById('register-username').required = true;
        document.getElementById('register-email').required = true;
        document.getElementById('login-username').required = false;
    } else {
        formSubtitle.textContent = 'התחבר לאזור האישי שלך';
        submitBtn.textContent = 'התחבר';
        toggleText.textContent = 'אין לך חשבון?';
        toggleModeBtn.textContent = 'שלח בקשה להרשמה';
        document.getElementById('register-username').required = false;
        document.getElementById('register-email').required = false;
        document.getElementById('login-username').required = true;
    }
});

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMessages();

    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    try {
        let response;

        if (isRegisterMode) {
            const registerUsername = document.getElementById('register-username').value.trim();
            const email = document.getElementById('register-email').value.trim();
            const passwordError = validatePassword(password);

            if (passwordError) {
                showError(passwordError);
                return;
            }

            response = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: registerUsername, email, password })
            });

            const data = await response.json();
            if (response.status === 202) {
                showSuccess('הבקשה נשלחה בהצלחה. תוכל להתחבר לאחר אישור המנהל.');
                isRegisterMode = false;
                document.body.classList.remove('register-mode');
                formSubtitle.textContent = 'התחבר לאזור האישי שלך';
                submitBtn.textContent = 'התחבר';
                toggleText.textContent = 'אין לך חשבון?';
                toggleModeBtn.textContent = 'שלח בקשה להרשמה';
                authForm.reset();
                return;
            }

            if (!response.ok) {
                showError(translateError(data.error) || 'שגיאה בשליחת הבקשה');
                return;
            }
            return;
        }

        response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        if (!response.ok) {
            showError(translateError(data.error) || 'שגיאה בהתחברות');
            return;
        }

        saveSession(data);
    } catch {
        showError('שגיאת רשת, נסה שוב');
    }
});

window.addEventListener('load', initSocialLogin);
