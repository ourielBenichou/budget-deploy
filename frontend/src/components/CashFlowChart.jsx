import { useMemo } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { buildChartData } from '../utils/budgetHelpers.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

export default function CashFlowChart({ selectedMonth, monthData }) {
    const chart = useMemo(
        () => buildChartData(selectedMonth, monthData),
        [selectedMonth, monthData]
    );

    const data = {
        labels: chart.labels,
        datasets: [{
            label: 'גובה העו"ש בחשבון (₪)',
            data: chart.values,
            borderColor: '#2ec4b6',
            borderWidth: 4,
            pointBackgroundColor: chart.values.map(value => value >= 0 ? '#2ec4b6' : '#e71d36'),
            pointBorderColor: '#fff',
            pointRadius: 7,
            tension: 0.2,
            fill: true,
            backgroundColor: 'rgba(46, 196, 182, 0.1)'
        }]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            y: {
                grid: { color: '#f0f0f0' },
                ticks: {
                    callback: value => `${Number(value).toLocaleString()} ₪`
                }
            },
            x: { grid: { color: '#eaeaea', borderDash: [5, 5] } }
        }
    };

    return (
        <section className="chart-section">
            <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#333', fontSize: '18px' }}>
                סרגל מדידת תזרים - גובה העו&quot;ש לאורך החודש
            </h3>
            <div style={{ position: 'relative', height: '280px', width: '100%' }}>
                <Line data={data} options={options} />
            </div>
        </section>
    );
}
