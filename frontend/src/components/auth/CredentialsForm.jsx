export default function CredentialsForm({
    isRegisterMode,
    loginUsername,
    registerUsername,
    registerEmail,
    password,
    onLoginUsernameChange,
    onRegisterUsernameChange,
    onRegisterEmailChange,
    onPasswordChange,
    onSubmit
}) {
    return (
        <form onSubmit={onSubmit}>
            <div className="form-group register-fields">
                <label htmlFor="register-username">שם משתמש</label>
                <input
                    type="text"
                    id="register-username"
                    value={registerUsername}
                    onChange={(event) => onRegisterUsernameChange(event.target.value)}
                    required={isRegisterMode}
                />
            </div>

            <div className="form-group login-fields">
                <label htmlFor="login-username">שם משתמש או אימייל</label>
                <input
                    type="text"
                    id="login-username"
                    value={loginUsername}
                    onChange={(event) => onLoginUsernameChange(event.target.value)}
                    required={!isRegisterMode}
                />
            </div>

            <div className="form-group register-fields">
                <label htmlFor="register-email">אימייל</label>
                <input
                    type="email"
                    id="register-email"
                    value={registerEmail}
                    onChange={(event) => onRegisterEmailChange(event.target.value)}
                    required={isRegisterMode}
                />
            </div>

            <div className="form-group">
                <label htmlFor="login-password">סיסמה</label>
                <input
                    type="password"
                    id="login-password"
                    value={password}
                    onChange={(event) => onPasswordChange(event.target.value)}
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
    );
}
