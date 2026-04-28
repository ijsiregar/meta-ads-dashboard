import React from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  Legend
} from 'chart.js';

import { Chart } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  Legend
);
export default function TrendChart({ data }) {
  if (!data || !data.length) return (
    <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
      belum ada data
    </div>
  )

  const labels = data.map(d => {
    const dt = new Date(d.date_start)
    return `${dt.getMonth() + 1}/${dt.getDate()}`
  })

  const chartData = {
    labels,
    datasets: [
      {
        type: 'bar',
        label: 'Spend',
        data: data.map(d => parseFloat(d.spend || 0)),
        backgroundColor: 'rgba(196,169,110,0.25)',
        borderColor: 'rgba(196,169,110,0.7)',
        borderWidth: 1,
        yAxisID: 'y',
        borderRadius: 3,
      },
      {
        type: 'line',
        label: 'CTR %',
        data: data.map(d => parseFloat(d.ctr || 0)),
        borderColor: '#4a9e6b',
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: '#4a9e6b',
        tension: 0.4,
        yAxisID: 'y2',
        borderDash: [4, 3],
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1a1a1a',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        titleColor: '#f0ede8',
        bodyColor: '#8a8783',
        padding: 10,
        callbacks: {
          label: ctx => ctx.dataset.label === 'Spend'
            ? `Spend: Rp ${Math.round(ctx.raw).toLocaleString('id-ID')}`
            : `CTR: ${ctx.raw.toFixed(2)}%`
        }
      }
    },
    scales: {
      x: {
        ticks: { color: '#555350', font: { size: 11, family: 'DM Mono' }, autoSkip: true, maxRotation: 0 },
        grid: { display: false },
        border: { color: 'rgba(255,255,255,0.06)' },
      },
      y: {
        ticks: {
          color: '#555350',
          font: { size: 11, family: 'DM Mono' },
          callback: v => 'Rp' + (v >= 1000000 ? (v/1000000).toFixed(1)+'M' : v >= 1000 ? (v/1000).toFixed(0)+'K' : v)
        },
        grid: { color: 'rgba(255,255,255,0.04)' },
        border: { color: 'rgba(255,255,255,0.06)' },
      },
      y2: {
        position: 'right',
        ticks: {
          color: '#4a9e6b',
          font: { size: 11, family: 'DM Mono' },
          callback: v => v.toFixed(1) + '%'
        },
        grid: { display: false },
        border: { color: 'rgba(255,255,255,0.06)' },
      },
    },
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: 220 }}>
      <Chart type="bar" data={chartData} options={options} aria-label="Tren spend dan CTR harian" />
    </div>
  )
}
