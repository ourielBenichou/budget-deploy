import '../styles/app-background.css';

export default function AppBackground() {
    return (
        <div className="app-bg" aria-hidden="true">
            <div className="app-bg__orb app-bg__orb--1" />
            <div className="app-bg__orb app-bg__orb--2" />
            <div className="app-bg__orb app-bg__orb--3" />
            <div className="app-bg__grid" />
            <svg className="app-bg__chart" viewBox="0 0 800 400" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="app-chart-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2ec4b6" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="#2ec4b6" stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path
                    d="M0,320 C120,300 180,180 280,200 S420,80 520,120 S680,40 800,60 L800,400 L0,400 Z"
                    fill="url(#app-chart-fill)"
                />
                <path
                    d="M0,320 C120,300 180,180 280,200 S420,80 520,120 S680,40 800,60"
                    fill="none"
                    stroke="#2ec4b6"
                    strokeWidth="3"
                    strokeOpacity="0.3"
                />
            </svg>
        </div>
    );
}
