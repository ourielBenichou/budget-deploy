import { getApiBase, setAuth } from './auth.js';

if (localStorage.getItem('auth_token')) {
    window.location.href = '/app.html';
}

const API_BASE = getApiBase();
const authForm = document.getElementById('auth-form');
const errorMsg = document.getElementById('error-msg');
const toggleModeBtn = document.getElementById('toggle-mode-btn');
const toggleText = document.getElementById('toggle-text');
const formSubtitle = document.getElementById('form-subtitle');
const submitBtn = document.getElementById('submit-btn');

let isRegisterMode = false;

function showError(message) {
    errorMsg.textContent = message;
    errorMsg.style.display = 'block';
}

function hideError() {
    errorMsg.style.display = 'none';
}

function saveSession(data) {
    setAuth(data.token, data.user);
    window.location.href = '/app.html';
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
                hideError();
                try {
                    const authResponse = await fetch(`${API_BASE}/auth/google`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ credential: response.credential })
                    });
                    const data = await authResponse.json();
                    if (!authResponse.ok) {
                        showError(data.error || 'Google login failed');
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
    hideError();
    document.body.classList.toggle('register-mode', isRegisterMode);

    if (isRegisterMode) {
        formSubtitle.textContent = 'צור חשבון חדש';
        submitBtn.textContent = 'הירשם';
        toggleText.textContent = 'יש לך כבר חשבון?';
        toggleModeBtn.textContent = 'התחבר כאן';
        document.getElementById('register-username').required = true;
        document.getElementById('register-email').required = true;
        document.getElementById('login-username').required = false;
    } else {
        formSubtitle.textContent = 'התחבר לאזור האישי שלך';
        submitBtn.textContent = 'התחבר';
        toggleText.textContent = 'אין לך חשבון?';
        toggleModeBtn.textContent = 'הירשם כאן';
        document.getElementById('register-username').required = false;
        document.getElementById('register-email').required = false;
        document.getElementById('login-username').required = true;
    }
});

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

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
        } else {
            response = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
        }

        const data = await response.json();
        if (!response.ok) {
            showError(data.error || 'שגיאה בהתחברות');
            return;
        }

        saveSession(data);
    } catch {
        showError('שגיאת רשת, נסה שוב');
    }
});

window.addEventListener('load', initGoogleLogin);
