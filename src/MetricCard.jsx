import React from 'react'

export default function MetricCard({ label, value, sub, highlight, delay = 0, sub2 }) {
  return (
    <div style={{
      background: 'var(--bg2)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '16px 18px',
      animation: `fadeUp 0.4s ease both`,
      animationDelay: `${delay}ms`,
    }}>
      <div style={{
        fontSize: 10,
        color: 'var(--text3)',
        textTransform: 'uppercase',
        letterSpacing: '0.8px',
        fontWeight: 500,
        marginBottom: 8,
        fontFamily: 'var(--font-mono)',
      }}>{label}</div>
      <div style={{
        fontSize: 22,
        fontWeight: 600,
        color: highlight || 'var(--text)',
        lineHeight: 1.1,
        letterSpacing: '-0.5px',
      }}>{value || '—'}</div>
      {sub && (
        <div style={{
          fontSize: 11,
          color: 'var(--text3)',
          marginTop: 5,
          fontFamily: 'var(--font-mono)',
        }}>{sub}</div>
      )}
      {sub2 && (
        <div style={{
          fontSize: 11,
          color: 'var(--text3)',
          marginTop: 2,
          fontFamily: 'var(--font-mono)',
        }}>{sub2}</div>
      )}
    </div>
  )
}
