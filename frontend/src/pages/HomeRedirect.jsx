import { Navigate } from 'react-router-dom';
import { getToken } from '../auth.js';

export default function HomeRedirect() {
    return <Navigate to={getToken() ? '/app' : '/login'} replace />;
}
