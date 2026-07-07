import RoleBadge from './RoleBadge.jsx';
import UserEditForm from './UserEditForm.jsx';

export default function UsersTable({
    users,
    editingUserId,
    onStartEdit,
    onCancelEdit,
    onSaveUser,
    onViewBudget,
    onDeleteUser
}) {
    if (!users.length) {
        return (
            <table className="admin-table">
                <tbody>
                    <tr>
                        <td colSpan={5}>אין משתמשים</td>
                    </tr>
                </tbody>
            </table>
        );
    }

    return (
        <table className="admin-table">
            <thead>
                <tr>
                    <th>שם</th>
                    <th>שם משתמש</th>
                    <th>אימייל</th>
                    <th>תפקיד</th>
                    <th>פעולות</th>
                </tr>
            </thead>
            <tbody>
                {users.map(user => (
                    <tr key={user.id}>
                        {editingUserId === user.id ? (
                            <td colSpan={5}>
                                <UserEditForm
                                    user={user}
                                    onSave={(payload) => onSaveUser(user.id, payload)}
                                    onCancel={onCancelEdit}
                                />
                            </td>
                        ) : (
                            <>
                                <td>{user.displayName}</td>
                                <td>{user.username || '-'}</td>
                                <td>{user.email}</td>
                                <td><RoleBadge role={user.role} /></td>
                                <td>
                                    <div className="row-actions">
                                        <button
                                            type="button"
                                            className="btn btn-secondary btn-small"
                                            onClick={() => onStartEdit(user.id)}
                                        >
                                            ערוך
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-primary btn-small"
                                            onClick={() => onViewBudget(user.id)}
                                        >
                                            צפה בתקציב
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-danger btn-small"
                                            onClick={() => onDeleteUser(user.id)}
                                        >
                                            מחק
                                        </button>
                                    </div>
                                </td>
                            </>
                        )}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
