export default function AuthModeToggle({ isRegisterMode, onToggle }) {
    return (
        <div className="toggle-mode">
            <span>{isRegisterMode ? 'יש לך כבר חשבון?' : 'אין לך חשבון?'}</span>{' '}
            <button type="button" onClick={onToggle}>
                {isRegisterMode ? 'התחבר כאן' : 'שלח בקשה להרשמה'}
            </button>
        </div>
    );
}
