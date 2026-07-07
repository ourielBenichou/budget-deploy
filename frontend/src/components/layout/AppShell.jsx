import { useLocation } from 'react-router-dom';
import AppBackground from './AppBackground.jsx';

export default function AppShell({ children }) {
    const { pathname } = useLocation();
    const centered = pathname === '/login' || pathname === '/login.html';

    return (
        <div className={`app-shell${centered ? ' app-shell--centered' : ''}`}>
            <AppBackground />
            <div className="app-shell__content">{children}</div>
        </div>
    );
}
