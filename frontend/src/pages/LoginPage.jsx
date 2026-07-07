import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthModeToggle from '../components/auth/AuthModeToggle.jsx';
import CredentialsForm from '../components/auth/CredentialsForm.jsx';
import SocialLoginSection from '../components/auth/SocialLoginSection.jsx';
import { getApiBase, getToken, setAuth } from '../services/auth.js';
import { validatePassword } from '../utils/password.js';
import { translateAuthError } from '../utils/translateAuthError.js';
import '../styles/app-background.css';
import '../styles/login.css';

export default function LoginPage() {
    const navigate = useNavigate();
    const apiBase = getApiBase();

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

    const handleGoogleAuth = useCallback(async (credentialResponse) => {
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
    }, [apiBase]);

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

    const toggleMode = () => {
        setIsRegisterMode(current => !current);
        setError('');
        setSuccess('');
    };

    return (
        <div className={`login-page${isRegisterMode ? ' register-mode' : ''}`}>
            <div className="login-card glass-panel">
                <h1 className="gradient-title">ניהול תקציב</h1>
                <p className="subtitle">
                    {isRegisterMode ? 'שליחת בקשה לפתיחת חשבון' : 'התחבר לאזור האישי שלך'}
                </p>

                {error && <div className="error-msg" style={{ display: 'block' }}>{error}</div>}
                {success && <div className="success-msg" style={{ display: 'block' }}>{success}</div>}

                {showSocial && (
                    <>
                        <SocialLoginSection
                            apiBase={apiBase}
                            showApple={showApple}
                            onGoogleAuth={handleGoogleAuth}
                            onAppleAuth={handleAppleLogin}
                            onVisibilityChange={(hasSocial, hasAppleButton) => {
                                setShowSocial(hasSocial);
                                setShowApple(hasAppleButton);
                            }}
                        />
                        <div className="divider">או עם שם משתמש וסיסמה</div>
                    </>
                )}

                <p className="local-auth-heading login-fields">התחברות עם שם משתמש</p>
                <p className="local-auth-heading register-fields">הרשמה עם שם משתמש</p>

                <CredentialsForm
                    isRegisterMode={isRegisterMode}
                    loginUsername={loginUsername}
                    registerUsername={registerUsername}
                    registerEmail={registerEmail}
                    password={password}
                    onLoginUsernameChange={setLoginUsername}
                    onRegisterUsernameChange={setRegisterUsername}
                    onRegisterEmailChange={setRegisterEmail}
                    onPasswordChange={setPassword}
                    onSubmit={handleSubmit}
                />

                <AuthModeToggle isRegisterMode={isRegisterMode} onToggle={toggleMode} />

                <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px' }}>
                    <Link to="/download.html" style={{ color: '#24a195', textDecoration: 'none' }}>
                        הוספת האפליקציה למסך הבית
                    </Link>
                </p>
            </div>
        </div>
    );
}
