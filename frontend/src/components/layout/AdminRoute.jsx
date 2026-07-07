import { Navigate, useLocation } from 'react-router-dom';
import { getAuthUser, getToken } from '../../services/auth.js';

export default function AdminRoute({ children }) {
    const location = useLocation();
    const user = getAuthUser();

    if (!getToken()) {
        return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    }

    if (user?.role !== 'admin') {
        return <Navigate to="/app" replace />;
    }

    return children;
}
