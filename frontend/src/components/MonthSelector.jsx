export default function MonthSelector({ selectedMonth, monthOptions, onChange }) {
    return (
        <div className="header-area">
            <h1 className="main-title">תזרים מזומנים ותקציב חודשי</h1>
            <div className="month-selector-wrapper">
                <label htmlFor="month-select" style={{ fontSize: '14px', color: '#666', marginLeft: '8px' }}>
                    הצג נתונים עבור:
                </label>
                <select
                    id="month-select"
                    className="month-select"
                    value={selectedMonth}
                    onChange={(event) => onChange(event.target.value)}
                >
                    {monthOptions.map(option => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}
