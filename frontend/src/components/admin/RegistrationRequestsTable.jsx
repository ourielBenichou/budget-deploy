import { formatDate, getAuthTypeLabel } from '../../utils/format.js';

export default function RegistrationRequestsTable({ requests, onApprove, onReject }) {
    if (!requests.length) {
        return (
            <table className="admin-table">
                <tbody>
                    <tr>
                        <td colSpan={6}>אין בקשות ממתינות</td>
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
                    <th>סוג</th>
                    <th>תאריך</th>
                    <th>פעולות</th>
                </tr>
            </thead>
            <tbody>
                {requests.map(request => (
                    <tr key={request.id}>
                        <td>{request.displayName}</td>
                        <td>{request.username || '-'}</td>
                        <td>{request.email}</td>
                        <td>{getAuthTypeLabel(request.authType)}</td>
                        <td>{formatDate(request.createdAt)}</td>
                        <td>
                            <div className="row-actions">
                                <button
                                    type="button"
                                    className="btn btn-primary btn-small"
                                    onClick={() => onApprove(request.id)}
                                >
                                    אשר
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-danger btn-small"
                                    onClick={() => onReject(request.id)}
                                >
                                    דחה
                                </button>
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
