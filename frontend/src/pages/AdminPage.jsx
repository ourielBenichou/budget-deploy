import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import AdminMessages from '../components/admin/AdminMessages.jsx';
import BudgetViewModal from '../components/admin/BudgetViewModal.jsx';
import RegistrationRequestsTable from '../components/admin/RegistrationRequestsTable.jsx';
import UsersTable from '../components/admin/UsersTable.jsx';
import { useAdminPanel } from '../hooks/useAdminPanel.js';
import '../styles/admin.css';

export default function AdminPage() {
    const onUnauthorized = useCallback(() => {
        window.location.href = '/login';
    }, []);

    const {
        users,
        requests,
        error,
        success,
        editingUserId,
        budgetData,
        budgetMonth,
        budgetOpen,
        setEditingUserId,
        refreshAll,
        approveRegistration,
        rejectRegistration,
        saveUser,
        deleteUser,
        openBudget,
        closeBudget,
        changeBudgetMonth
    } = useAdminPanel(onUnauthorized);

    return (
        <main className="admin-page container">
            <div className="top-bar">
                <h1>ניהול משתמשים</h1>
                <div className="actions">
                    <Link to="/app" className="btn btn-secondary">חזרה לאפליקציה</Link>
                    <button type="button" className="btn btn-primary" onClick={refreshAll}>
                        רענן
                    </button>
                </div>
            </div>

            <AdminMessages error={error} success={success} />

            <section className="card requests-card">
                <h2 className="section-title">בקשות הרשמה ממתינות</h2>
                <RegistrationRequestsTable
                    requests={requests}
                    onApprove={approveRegistration}
                    onReject={rejectRegistration}
                />
            </section>

            <section className="card">
                <h2 className="section-title">משתמשים</h2>
                <UsersTable
                    users={users}
                    editingUserId={editingUserId}
                    onStartEdit={setEditingUserId}
                    onCancelEdit={() => setEditingUserId(null)}
                    onSaveUser={saveUser}
                    onViewBudget={openBudget}
                    onDeleteUser={deleteUser}
                />
            </section>

            <BudgetViewModal
                open={budgetOpen}
                budgetData={budgetData}
                selectedMonth={budgetMonth}
                onMonthChange={changeBudgetMonth}
                onClose={closeBudget}
            />
        </main>
    );
}
