import { Navigate } from 'react-router-dom';
import { getToken } from '../services/auth.js';

export default function HomeRedirect() {
    return <Navigate to={getToken() ? '/app' : '/login'} replace />;
}
