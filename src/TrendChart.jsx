import React, { useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale,
  BarController, BarElement,
  LineController, LineElement, PointElement,
  Tooltip, Legend
} from 'chart.js'
import { Chart } from 'react-chartjs-2'
import {
  getWAMessages, getAddToCart, getPurchaseCount, getPurchaseValue,
  getLinkClicks, fmtRp, fmtNum, fmtPct
} from './api'

ChartJS.register(
  CategoryScale, LinearScale,
  BarController, BarElement,
  LineController, LineElement, PointElement,
  Tooltip, Legend
)

const METRICS = [
  { key: 'spend',     label: 'Spend',        color: 'rgba(196,169,110,0.8)',  type: 'bar',  fmt: v => 'Rp ' + Math.round(v).toLocaleString('id-ID'), axis: 'y' },
  { key: 'purchase',  label: 'Purchase',      color: '#5b8fd4',                type: 'line', fmt: v => fmtNum(v) + ' pcs', axis: 'y2' },
  { key: 'wa',        label: 'Pesan WA',      color: '#4a9e6b',                type: 'line', fmt: v => fmtNum(v) + ' pesan', axis: 'y2' },
  { key: 'atc',       label: 'Add to Cart',   color: '#c45c5c',                type: 'line', fmt: v => fmtNum(v) + ' atc', axis: 'y2' },
  { key: 'reach',     label: 'Reach',         color: '#9b7ebd',                type: 'line', fmt: v => fmtNum(v), axis: 'y2' },
  { key: 'cpm',       label: 'CPM',           color: '#d4943a',                type: 'line', fmt: v => 'Rp ' + Math.round(v).toLocaleString('id-ID'), axis: 'y2' },
  { key: 'cpc',       label: 'CPC',           color: '#e8d5b0',                type: 'line', fmt: v => 'Rp ' + Math.round(v).toLocaleString('id-ID'), axis: 'y2' },
]

function extractValue(d, key) {
  switch (key) {
    case 'spend':    return parseFloat(d.spend || 0)
    case 'purchase': return getPurchaseCount(d.actions)
    case 'wa':       return getWAMessages(d.actions)
    case 'atc':      return getAddToCart(d.actions)
    case 'reach':    return parseFloat(d.reach || 0)
    case 'cpm':      return parseFloat(d.cpm || 0)
    case 'cpc':      return parseFloat(d.cpc || 0)
    default:         return 0
  }
}

export default function TrendChart({ data }) {
  const [active, setActive] = useState({ spend: true, purchase: false, wa: false, atc: false, reach: false, cpm: false, cpc: false })

  const toggleMetric = key => setActive(a => ({ ...a, [key]: !a[key] }))

  if (!data || !data.length) return (
    <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
      belum ada data
    </div>
  )

  const labels = data.map(d => {
    const dt = new Date(d.date_start + 'T00:00:00Z')
    return `${dt.getUTCMonth() + 1}/${dt.getUTCDate()}`
  })

  const activeMetrics = METRICS.filter(m => active[m.key])

  const datasets = activeMetrics.map(m => ({
    type: m.type,
    label: m.label,
    data: data.map(d => extractValue(d, m.key)),
    backgroundColor: m.type === 'bar' ? m.color.replace('0.8', '0.25') : undefined,
    borderColor: m.color,
    borderWidth: m.type === 'bar' ? 1 : 2,
    pointRadius: m.type === 'line' ? 3 : undefined,
    pointBackgroundColor: m.type === 'line' ? m.color : undefined,
    tension: m.type === 'line' ? 0.4 : undefined,
    yAxisID: m.axis,
    borderRadius: m.type === 'bar' ? 3 : undefined,
    borderDash: m.type === 'line' && m.key !== 'spend' ? [4, 3] : undefined,
    fill: false,
  }))

  const chartData = { labels, datasets }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
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
          label: ctx => {
            const m = METRICS.find(m => m.label === ctx.dataset.label)
            return ` ${ctx.dataset.label}: ${m ? m.fmt(ctx.raw) : ctx.raw}`
          }
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
        display: active.spend,
        ticks: {
          color: 'rgba(196,169,110,0.7)',
          font: { size: 11, family: 'DM Mono' },
          callback: v => v >= 1_000_000 ? (v/1_000_000).toFixed(1)+'M' : v >= 1000 ? (v/1000).toFixed(0)+'K' : v
        },
        grid: { color: 'rgba(255,255,255,0.04)' },
        border: { color: 'rgba(255,255,255,0.06)' },
      },
      y2: {
        position: 'right',
        display: activeMetrics.some(m => m.axis === 'y2'),
        ticks: {
          color: '#555350',
          font: { size: 11, family: 'DM Mono' },
          callback: v => v >= 1_000_000 ? (v/1_000_000).toFixed(1)+'M' : v >= 1000 ? (v/1000).toFixed(0)+'K' : v
        },
        grid: { display: false },
        border: { color: 'rgba(255,255,255,0.06)' },
      },
    },
  }

  return (
    <div>
      {/* Metric toggles */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {METRICS.map(m => (
          <button
            key={m.key}
            onClick={() => toggleMetric(m.key)}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 11,
              border: `1px solid ${active[m.key] ? m.color : 'var(--border)'}`,
              background: active[m.key] ? `${m.color}22` : 'transparent',
              color: active[m.key] ? m.color : 'var(--text3)',
              fontFamily: 'var(--font-mono)',
              display: 'flex', alignItems: 'center', gap: 5,
              transition: 'all 0.15s',
            }}
          >
            {active[m.key] && (
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: m.color, display: 'inline-block' }} />
            )}
            {m.label}
          </button>
        ))}
      </div>

      {activeMetrics.length === 0 ? (
        <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
          Pilih minimal satu metrik di atas
        </div>
      ) : (
        <div style={{ position: 'relative', width: '100%', height: 240 }}>
          <Chart type="bar" data={chartData} options={options} />
        </div>
      )}
    </div>
  )
}
