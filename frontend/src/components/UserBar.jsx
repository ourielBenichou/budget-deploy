import { useNavigate } from 'react-router-dom';
import { clearAuth } from '../auth.js';

export default function UserBar({ user }) {
    const navigate = useNavigate();

    const handleLogout = () => {
        clearAuth();
        navigate('/login', { replace: true });
    };

    return (
        <div className="user-bar">
            <span>{user?.displayName ? `שלום, ${user.displayName}` : 'שלום'}</span>
            <div className="user-actions">
                {user?.role === 'admin' && (
                    <a href="/admin.html" className="btn-admin">ניהול משתמשים</a>
                )}
                <button type="button" className="btn-logout" onClick={handleLogout}>
                    יציאה
                </button>
            </div>
        </div>
    );
}
