import React from 'react'

export default function MetricCard({ label, value, sub, highlight, delay = 0 }) {
  return (
    <div style={{
      background: 'var(--bg2)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: '16px 18px',
      boxShadow: 'var(--shadow-sm)',
      animation: 'fadeUp 0.35s ease both',
      animationDelay: `${delay}ms`,
    }}>
      <div style={{
        fontSize: 11,
        color: 'var(--text3)',
        textTransform: 'uppercase',
        letterSpacing: '0.7px',
        fontWeight: 600,
        marginBottom: 8,
        fontFamily: 'var(--font-body)',
      }}>{label}</div>

      <div style={{
        fontSize: 22,
        fontWeight: 700,
        color: highlight || 'var(--text)',
        lineHeight: 1.15,
        letterSpacing: '-0.4px',
      }}>{value || '—'}</div>

      {sub && (
        <div style={{
          fontSize: 11,
          color: 'var(--text3)',
          marginTop: 5,
          fontFamily: 'var(--font-mono)',
        }}>{sub}</div>
      )}
    </div>
  )
}
