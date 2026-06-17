import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getApiBase, getToken, setAuth } from '../auth.js';
import { validatePassword } from '../password.js';
import { translateAuthError } from '../utils/translateAuthError.js';
import { createBudgetApi } from '../utils/budgetApi.js';
import '../styles/login.css';

function loadScript(src, id) {
    if (document.getElementById(id)) {
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.id = id;
        script.src = src;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(script);
    });
}

export default function LoginPage() {
    const navigate = useNavigate();
    const apiBase = getApiBase();
    const api = createBudgetApi(apiBase, () => navigate('/login', { replace: true }));
    const appleInitialized = useRef(false);

    const [isRegisterMode, setIsRegisterMode] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showSocial, setShowSocial] = useState(true);
    const [showApple, setShowApple] = useState(false);

    const [loginUsername, setLoginUsername] = useState('');
    const [registerUsername, setRegisterUsername] = useState('');
    const [registerEmail, setRegisterEmail] = useState('');
    const [password, setPassword] = useState('');

    useEffect(() => {
        if (getToken()) {
            navigate('/app', { replace: true });
        }
    }, [navigate]);

    const handleSocialAuthResponse = async (authResponse) => {
        const data = await authResponse.json();

        if (!authResponse.ok) {
            if (authResponse.status === 403 && data.error?.includes('registration request')) {
                setSuccess('נשלחה בקשה לאישור המנהל. לאחר האישור תוכל להתחבר.');
                return;
            }
            setError(translateAuthError(data.error) || 'שגיאה בהתחברות');
            return;
        }

        setAuth(data.token, data.user);
        navigate('/app', { replace: true });
    };

    useEffect(() => {
        let cancelled = false;

        async function initSocialLogin() {
            try {
                await Promise.all([
                    loadScript('https://accounts.google.com/gsi/client', 'google-gsi'),
                    loadScript('https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js', 'apple-auth-js')
                ]);

                const response = await api.fetchAuthConfig();
                const config = await response.json();

                let hasGoogle = false;
                let hasApple = false;

                if (config.googleClientId && window.google?.accounts?.id) {
                    window.google.accounts.id.initialize({
                        client_id: config.googleClientId,
                        callback: async (credentialResponse) => {
                            setError('');
                            setSuccess('');
                            try {
                                const authResponse = await fetch(`${apiBase}/auth/google`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ credential: credentialResponse.credential })
                                });
                                await handleSocialAuthResponse(authResponse);
                            } catch {
                                setError('שגיאת רשת בהתחברות Google');
                            }
                        }
                    });

                    const googleButton = document.getElementById('google-btn');
                    if (googleButton) {
                        googleButton.innerHTML = '';
                        window.google.accounts.id.renderButton(googleButton, {
                            theme: 'outline',
                            size: 'large',
                            width: 356,
                            locale: 'he'
                        });
                    }
                    hasGoogle = true;
                }

                if (config.appleClientId && window.AppleID?.auth && !appleInitialized.current) {
                    window.AppleID.auth.init({
                        clientId: config.appleClientId,
                        scope: 'name email',
                        redirectURI: `${window.location.origin}/login`,
                        usePopup: true
                    });
                    appleInitialized.current = true;
                    hasApple = true;
                }

                if (!cancelled) {
                    setShowApple(hasApple);
                    setShowSocial(hasGoogle || hasApple);
                }
            } catch {
                if (!cancelled) {
                    setShowSocial(false);
                    setShowApple(false);
                }
            }
        }

        initSocialLogin();

        return () => {
            cancelled = true;
        };
    }, [api, apiBase]);

    const handleAppleLogin = async () => {
        setError('');
        setSuccess('');

        try {
            const response = await window.AppleID.auth.signIn();
            const authResponse = await fetch(`${apiBase}/auth/apple`, {
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
            setError('שגיאה בהתחברות Apple');
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setSuccess('');

        try {
            if (isRegisterMode) {
                const passwordError = validatePassword(password);
                if (passwordError) {
                    setError(passwordError);
                    return;
                }

                const response = await fetch(`${apiBase}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: registerUsername.trim(),
                        email: registerEmail.trim(),
                        password
                    })
                });
                const data = await response.json();

                if (response.status === 202) {
                    setSuccess('הבקשה נשלחה בהצלחה. תוכל להתחבר לאחר אישור המנהל.');
                    setIsRegisterMode(false);
                    setRegisterUsername('');
                    setRegisterEmail('');
                    setPassword('');
                    return;
                }

                if (!response.ok) {
                    setError(translateAuthError(data.error) || 'שגיאה בשליחת הבקשה');
                }
                return;
            }

            const response = await fetch(`${apiBase}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: loginUsername.trim(), password })
            });
            const data = await response.json();

            if (!response.ok) {
                setError(translateAuthError(data.error) || 'שגיאה בהתחברות');
                return;
            }

            setAuth(data.token, data.user);
            navigate('/app', { replace: true });
        } catch {
            setError('שגיאת רשת, נסה שוב');
        }
    };

    return (
        <div className={`login-page${isRegisterMode ? ' register-mode' : ''}`}>
            <div className="login-bg" aria-hidden="true">
                <div className="login-bg__orb login-bg__orb--1" />
                <div className="login-bg__orb login-bg__orb--2" />
                <div className="login-bg__orb login-bg__orb--3" />
                <div className="login-bg__grid" />
                <svg className="login-bg__chart" viewBox="0 0 800 400" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2ec4b6" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#2ec4b6" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    <path
                        d="M0,320 C120,300 180,180 280,200 S420,80 520,120 S680,40 800,60 L800,400 L0,400 Z"
                        fill="url(#chart-fill)"
                    />
                    <path
                        d="M0,320 C120,300 180,180 280,200 S420,80 520,120 S680,40 800,60"
                        fill="none"
                        stroke="#2ec4b6"
                        strokeWidth="3"
                        strokeOpacity="0.35"
                    />
                </svg>
            </div>

            <div className="login-card">
                <h1>ניהול תקציב</h1>
                <p className="subtitle">
                    {isRegisterMode ? 'שליחת בקשה לפתיחת חשבון' : 'התחבר לאזור האישי שלך'}
                </p>

                {error && <div className="error-msg" style={{ display: 'block' }}>{error}</div>}
                {success && <div className="success-msg" style={{ display: 'block' }}>{success}</div>}

                {showSocial && (
                    <div className="social-login">
                        <p className="social-heading">התחברות מהירה</p>
                        <div id="google-btn" />
                        {showApple && (
                            <button type="button" className="btn-apple" onClick={handleAppleLogin}>
                                &#63743; התחבר עם Apple
                            </button>
                        )}
                    </div>
                )}

                {showSocial && <div className="divider">או עם שם משתמש וסיסמה</div>}

                <p className="local-auth-heading login-fields">התחברות עם שם משתמש</p>
                <p className="local-auth-heading register-fields">הרשמה עם שם משתמש</p>

                <form onSubmit={handleSubmit}>
                    <div className="form-group register-fields">
                        <label htmlFor="register-username">שם משתמש</label>
                        <input
                            type="text"
                            id="register-username"
                            value={registerUsername}
                            onChange={(event) => setRegisterUsername(event.target.value)}
                            required={isRegisterMode}
                        />
                    </div>

                    <div className="form-group login-fields">
                        <label htmlFor="login-username">שם משתמש או אימייל</label>
                        <input
                            type="text"
                            id="login-username"
                            value={loginUsername}
                            onChange={(event) => setLoginUsername(event.target.value)}
                            required={!isRegisterMode}
                        />
                    </div>

                    <div className="form-group register-fields">
                        <label htmlFor="register-email">אימייל</label>
                        <input
                            type="email"
                            id="register-email"
                            value={registerEmail}
                            onChange={(event) => setRegisterEmail(event.target.value)}
                            required={isRegisterMode}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="login-password">סיסמה</label>
                        <input
                            type="password"
                            id="login-password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            required
                        />
                        <p className="password-hint register-fields">
                            הסיסמה חייבת להכיל לפחות 6 תווים, אות גדולה, אות קטנה ומספר.
                        </p>
                    </div>

                    <button type="submit" className="btn-primary">
                        {isRegisterMode ? 'שלח בקשה' : 'התחבר'}
                    </button>
                </form>

                <div className="toggle-mode">
                    <span>{isRegisterMode ? 'יש לך כבר חשבון?' : 'אין לך חשבון?'}</span>{' '}
                    <button
                        type="button"
                        onClick={() => {
                            setIsRegisterMode(current => !current);
                            setError('');
                            setSuccess('');
                        }}
                    >
                        {isRegisterMode ? 'התחבר כאן' : 'שלח בקשה להרשמה'}
                    </button>
                </div>

                <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px' }}>
                    <Link to="/download.html" style={{ color: '#24a195', textDecoration: 'none' }}>
                        הורדת אפליקציה ל-Android
                    </Link>
                </p>
            </div>
        </div>
    );
}
