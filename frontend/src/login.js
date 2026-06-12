import { getApiBase, setAuth } from './auth.js';

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

let isRegisterMode = false;

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
        'Invalid credentials': 'פרטי התחברות שגויים'
    };
    return messages[message] || message;
}

async function initGoogleLogin() {
    try {
        const response = await fetch(`${API_BASE}/auth/config`);
        const config = await response.json();

        if (!config.googleClientId || !window.google?.accounts?.id) {
            document.querySelector('.divider').style.display = 'none';
            document.getElementById('google-btn').style.display = 'none';
            return;
        }

        window.google.accounts.id.initialize({
            client_id: config.googleClientId,
            callback: async (response) => {
                hideMessages();
                try {
                    const authResponse = await fetch(`${API_BASE}/auth/google`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ credential: response.credential })
                    });
                    const data = await authResponse.json();
                    if (!authResponse.ok) {
                        if (authResponse.status === 403 && data.error?.includes('registration request')) {
                            showSuccess('נשלחה בקשה לאישור המנהל. לאחר האישור תוכל להתחבר.');
                            return;
                        }
                        showError(translateError(data.error) || 'שגיאה בהתחברות Google');
                        return;
                    }
                    saveSession(data);
                } catch {
                    showError('שגיאת רשת בהתחברות Google');
                }
            }
        });

        window.google.accounts.id.renderButton(
            document.getElementById('google-btn'),
            { theme: 'outline', size: 'large', width: 320, locale: 'he' }
        );
    } catch {
        document.querySelector('.divider').style.display = 'none';
        document.getElementById('google-btn').style.display = 'none';
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

window.addEventListener('load', initGoogleLogin);
