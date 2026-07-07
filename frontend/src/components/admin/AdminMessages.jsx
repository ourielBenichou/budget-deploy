export default function AdminMessages({ error, success }) {
    return (
        <>
            {error && <div className="admin-error-msg">{error}</div>}
            {success && <div className="admin-success-msg">{success}</div>}
        </>
    );
}
