import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import BudgetPage from './pages/BudgetPage.jsx';
import HomeRedirect from './pages/HomeRedirect.jsx';
import LoginPage from './pages/LoginPage.jsx';

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<HomeRedirect />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/login.html" element={<Navigate to="/login" replace />} />
                <Route
                    path="/app"
                    element={
                        <ProtectedRoute>
                            <BudgetPage />
                        </ProtectedRoute>
                    }
                />
                <Route path="/app.html" element={<Navigate to="/app" replace />} />
                <Route path="*" element={<HomeRedirect />} />
            </Routes>
        </BrowserRouter>
    );
}
