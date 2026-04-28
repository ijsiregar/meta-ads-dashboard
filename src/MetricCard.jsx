import React from 'react'

export default function MetricCard({ label, value, sub, highlight, delay = 0 }) {
  return (
    <div style={{
      background: 'var(--bg2)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '18px 20px',
      animation: `fadeUp 0.4s ease both`,
      animationDelay: `${delay}ms`,
    }}>
      <div style={{
        fontSize: 11,
        color: 'var(--text3)',
        textTransform: 'uppercase',
        letterSpacing: '0.8px',
        fontWeight: 500,
        marginBottom: 10,
        fontFamily: 'var(--font-mono)',
      }}>{label}</div>
      <div style={{
        fontSize: 26,
        fontWeight: 600,
        color: highlight || 'var(--text)',
        lineHeight: 1.1,
        letterSpacing: '-0.5px',
      }}>{value || '—'}</div>
      {sub && (
        <div style={{
          fontSize: 12,
          color: 'var(--text3)',
          marginTop: 6,
          fontFamily: 'var(--font-mono)',
        }}>{sub}</div>
      )}
    </div>
  )
}
