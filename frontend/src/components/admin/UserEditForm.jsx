import { useState } from 'react';

export default function UserEditForm({ user, onSave, onCancel }) {
    const [displayName, setDisplayName] = useState(user.displayName);
    const [username, setUsername] = useState(user.username || '');
    const [email, setEmail] = useState(user.email);
    const [role, setRole] = useState(user.role);
    const [password, setPassword] = useState('');

    const handleSubmit = (event) => {
        event.preventDefault();

        const payload = {
            displayName: displayName.trim(),
            username: username.trim(),
            email: email.trim(),
            role
        };

        if (password) {
            payload.password = password;
        }

        onSave(payload);
    };

    return (
        <form className="edit-form" onSubmit={handleSubmit}>
            <label htmlFor={`edit-display-${user.id}`}>שם תצוגה</label>
            <input
                id={`edit-display-${user.id}`}
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
            />

            <label htmlFor={`edit-username-${user.id}`}>שם משתמש</label>
            <input
                id={`edit-username-${user.id}`}
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
            />

            <label htmlFor={`edit-email-${user.id}`}>אימייל</label>
            <input
                id={`edit-email-${user.id}`}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
            />

            <label htmlFor={`edit-role-${user.id}`}>תפקיד</label>
            <select
                id={`edit-role-${user.id}`}
                value={role}
                onChange={(event) => setRole(event.target.value)}
            >
                <option value="user">משתמש</option>
                <option value="admin">מנהל</option>
            </select>

            <label htmlFor={`edit-password-${user.id}`}>סיסמה חדשה (אופציונלי)</label>
            <input
                id={`edit-password-${user.id}`}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="השאר ריק אם לא משנים"
            />

            <div className="edit-actions">
                <button type="submit" className="btn btn-primary btn-small">שמור</button>
                <button type="button" className="btn btn-secondary btn-small" onClick={onCancel}>
                    ביטול
                </button>
            </div>
        </form>
    );
}
