import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AdminRoute from './components/layout/AdminRoute.jsx';
import AppShell from './components/layout/AppShell.jsx';
import ProtectedRoute from './components/layout/ProtectedRoute.jsx';
import AdminPage from './pages/AdminPage.jsx';
import BudgetPage from './pages/BudgetPage.jsx';
import HomeRedirect from './pages/HomeRedirect.jsx';
import LoginPage from './pages/LoginPage.jsx';

export default function App() {
    return (
        <BrowserRouter>
            <AppShell>
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
                    <Route
                        path="/admin"
                        element={
                            <AdminRoute>
                                <AdminPage />
                            </AdminRoute>
                        }
                    />
                    <Route path="/admin.html" element={<Navigate to="/admin" replace />} />
                    <Route path="*" element={<HomeRedirect />} />
                </Routes>
            </AppShell>
        </BrowserRouter>
    );
}
