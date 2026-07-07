import { useNavigate, Link } from 'react-router-dom';
import { clearAuth } from '../../services/auth.js';

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
                    <Link to="/admin" className="btn-admin">ניהול משתמשים</Link>
                )}
                <button type="button" className="btn-logout" onClick={handleLogout}>
                    יציאה
                </button>
            </div>
        </div>
    );
}
