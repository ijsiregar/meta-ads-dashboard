import React, { useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale,
  BarController, BarElement,
  LineController, LineElement, PointElement,
  Tooltip, Legend
} from 'chart.js'
import { Chart } from 'react-chartjs-2'
import { getWAMessages, getAddToCart, getPurchaseCount, getLinkClicks, fmtRp, fmtNum } from './api'

ChartJS.register(
  CategoryScale, LinearScale,
  BarController, BarElement,
  LineController, LineElement, PointElement,
  Tooltip, Legend
)

const METRICS = [
  { key: 'spend',    label: 'Spend',        color: '#1a3260', type: 'bar',  fmt: v => 'Rp ' + Math.round(v).toLocaleString('id-ID'), axis: 'y' },
  { key: 'purchase', label: 'Purchase',     color: '#2563eb', type: 'line', fmt: v => fmtNum(v) + ' pcs', axis: 'y2' },
  { key: 'wa',       label: 'Pesan WA',     color: '#16a34a', type: 'line', fmt: v => fmtNum(v) + ' pesan', axis: 'y2' },
  { key: 'atc',      label: 'Add to Cart',  color: '#dc2626', type: 'line', fmt: v => fmtNum(v) + ' atc', axis: 'y2' },
  { key: 'reach',    label: 'Reach',        color: '#7c3aed', type: 'line', fmt: v => fmtNum(v), axis: 'y2' },
  { key: 'cpm',      label: 'CPM',          color: '#d97706', type: 'line', fmt: v => 'Rp ' + Math.round(v).toLocaleString('id-ID'), axis: 'y2' },
  { key: 'cpc',      label: 'CPC',          color: '#0891b2', type: 'line', fmt: v => 'Rp ' + Math.round(v).toLocaleString('id-ID'), axis: 'y2' },
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
  const [active, setActive] = useState({ spend: true })

  const toggle = key => setActive(a => ({ ...a, [key]: !a[key] }))

  if (!data || !data.length) return (
    <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 13 }}>
      Belum ada data
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
    backgroundColor: m.type === 'bar' ? m.color + '22' : undefined,
    borderColor: m.color,
    borderWidth: m.type === 'bar' ? 1 : 2,
    pointRadius: m.type === 'line' ? 3 : undefined,
    pointBackgroundColor: m.type === 'line' ? m.color : undefined,
    tension: m.type === 'line' ? 0.4 : undefined,
    yAxisID: m.axis,
    borderRadius: m.type === 'bar' ? 4 : undefined,
    borderDash: m.type === 'line' && m.key !== 'spend' ? [4, 3] : undefined,
    fill: false,
  }))

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#fff',
        borderColor: '#e2e6ee',
        borderWidth: 1,
        titleColor: '#0f1c35',
        bodyColor: '#4a5568',
        padding: 10,
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
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
        ticks: { color: '#8896a8', font: { size: 11, family: 'Inter' }, autoSkip: true, maxRotation: 0 },
        grid: { color: '#f0f2f5' },
        border: { color: '#e2e6ee' },
      },
      y: {
        display: !!active.spend,
        ticks: {
          color: '#1a3260',
          font: { size: 11, family: 'Inter' },
          callback: v => v >= 1_000_000 ? (v/1_000_000).toFixed(1)+'M' : v >= 1000 ? (v/1000).toFixed(0)+'K' : v
        },
        grid: { color: '#f0f2f5' },
        border: { color: '#e2e6ee' },
      },
      y2: {
        position: 'right',
        display: activeMetrics.some(m => m.axis === 'y2'),
        ticks: {
          color: '#8896a8',
          font: { size: 11, family: 'Inter' },
          callback: v => v >= 1_000_000 ? (v/1_000_000).toFixed(1)+'M' : v >= 1000 ? (v/1000).toFixed(0)+'K' : v
        },
        grid: { display: false },
        border: { color: '#e2e6ee' },
      },
    },
  }

  return (
    <div>
      {/* Toggles */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
        {METRICS.map(m => (
          <button key={m.key} onClick={() => toggle(m.key)} style={{
            padding: '4px 12px',
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 500,
            border: `1.5px solid ${active[m.key] ? m.color : 'var(--border2)'}`,
            background: active[m.key] ? m.color + '14' : 'var(--bg3)',
            color: active[m.key] ? m.color : 'var(--text3)',
            display: 'flex', alignItems: 'center', gap: 5,
            transition: 'all 0.15s',
          }}>
            {active[m.key] && <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.color, display: 'inline-block' }} />}
            {m.label}
          </button>
        ))}
      </div>

      {activeMetrics.length === 0 ? (
        <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 13 }}>
          Pilih minimal satu metrik di atas
        </div>
      ) : (
        <div style={{ position: 'relative', width: '100%', height: 220 }}>
          <Chart type="bar" data={{ labels, datasets }} options={options} />
        </div>
      )}
    </div>
  )
}
