export default function RoleBadge({ role }) {
    const label = role === 'admin' ? 'מנהל' : 'משתמש';
    const className = role === 'admin' ? 'role-admin' : 'role-user';

    return <span className={`role-badge ${className}`}>{label}</span>;
}
