import React, { useState } from 'react'

export default function ConfigPanel({ onSave }) {
  const [token, setToken] = useState(localStorage.getItem('mads_token') || '')
  const [adact, setAdact] = useState(localStorage.getItem('mads_adact') || '')
  const [show, setShow] = useState(false)

  const handleSave = () => {
    if (!token.trim() || !adact.trim()) return
    let act = adact.trim()
    if (!act.startsWith('act_')) act = 'act_' + act.replace(/act[_=]?/g, '')
    localStorage.setItem('mads_token', token.trim())
    localStorage.setItem('mads_adact', act)
    onSave(token.trim(), act)
    setShow(false)
  }

  return (
    <div>
      <button
        onClick={() => setShow(s => !s)}
        style={{
          background: 'transparent',
          border: '1px solid var(--border2)',
          borderRadius: 8,
          padding: '7px 14px',
          fontSize: 13,
          color: 'var(--text2)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontFamily: 'var(--font-body)',
        }}
      >
        <span style={{ fontSize: 14 }}>⚙</span> Konfigurasi
      </button>

      {show && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100,
        }} onClick={e => e.target === e.currentTarget && setShow(false)}>
          <div style={{
            background: 'var(--bg2)',
            border: '1px solid var(--border2)',
            borderRadius: 16,
            padding: '2rem',
            width: 480,
            maxWidth: '90vw',
            animation: 'fadeUp 0.2s ease',
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Konfigurasi API</h3>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 6 }}>
                ACCESS TOKEN META
              </label>
              <input
                type="password"
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder="EAASs6qu..."
                style={{
                  width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '10px 12px', fontSize: 12,
                  color: 'var(--text)', outline: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 6 }}>
                AD ACCOUNT ID
              </label>
              <input
                type="text"
                value={adact}
                onChange={e => setAdact(e.target.value)}
                placeholder="act_896092819380688"
                style={{
                  width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '10px 12px', fontSize: 12,
                  color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-mono)',
                }}
              />
            </div>

            <div style={{ background: 'rgba(212,148,58,0.1)', border: '1px solid rgba(212,148,58,0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 20 }}>
              <p style={{ fontSize: 12, color: 'var(--amber)', fontFamily: 'var(--font-mono)', lineHeight: 1.6 }}>
                Token disimpan di localStorage browser kamu saja — tidak dikirim ke server manapun selain Meta API.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShow(false)} style={{
                background: 'transparent', border: '1px solid var(--border)', borderRadius: 8,
                padding: '9px 18px', fontSize: 13, color: 'var(--text2)', fontFamily: 'var(--font-body)',
              }}>Batal</button>
              <button onClick={handleSave} style={{
                background: 'var(--accent2)', border: 'none', borderRadius: 8,
                padding: '9px 18px', fontSize: 13, color: '#1a0f00', fontWeight: 600, fontFamily: 'var(--font-body)',
              }}>Simpan &amp; Load</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
