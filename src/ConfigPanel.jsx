import React, { useState, useEffect, useRef } from 'react'

const STORAGE_KEY = 'mads_accounts_v2'

export function loadAccounts() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
  } catch {
    const token = localStorage.getItem('mads_token')
    const adact = localStorage.getItem('mads_adact')
    if (token && adact) return [{ id: Date.now(), label: adact, token, adact, active: true }]
    return []
  }
}

export function saveAccounts(accounts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts))
}

// ─── Dropdown selector ───────────────────────────────────────────────────────
export function AccountSelector({ accounts, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const active = accounts.filter(a => a.active)
  const label = active.length === 0
    ? 'Pilih akun...'
    : active.length === accounts.length ? 'Semua akun'
    : active.map(a => a.label).join(', ')

  const toggle = id => onChange(accounts.map(a => a.id === id ? { ...a, active: !a.active } : a))
  const selectAll = () => onChange(accounts.map(a => ({ ...a, active: true })))
  const clearAll  = () => onChange(accounts.map(a => ({ ...a, active: false })))

  if (!accounts.length) return null

  const btnBase = {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 11, fontFamily: 'var(--font-body)', fontWeight: 500,
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'var(--bg2)',
          border: '1px solid var(--border2)',
          borderRadius: 8,
          padding: '6px 12px',
          fontSize: 13,
          color: 'var(--text)',
          display: 'flex', alignItems: 'center', gap: 8,
          fontFamily: 'var(--font-body)',
          fontWeight: 500,
          boxShadow: 'var(--shadow-sm)',
          maxWidth: 240, minWidth: 140,
        }}
      >
        <span style={{
          width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
          background: active.length > 0 ? 'var(--green)' : 'var(--text3)',
        }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'left' }}>
          {label}
        </span>
        <span style={{ color: 'var(--text3)', fontSize: 10 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0,
          background: 'var(--bg2)',
          border: '1px solid var(--border2)',
          borderRadius: 10,
          minWidth: 240, maxWidth: 320,
          zIndex: 200,
          overflow: 'hidden',
          boxShadow: 'var(--shadow-md)',
        }}>
          <div style={{
            padding: '8px 12px',
            borderBottom: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'var(--bg3)',
          }}>
            <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500 }}>
              {active.length}/{accounts.length} aktif
            </span>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={selectAll} style={{ ...btnBase, color: 'var(--navy)' }}>Semua</button>
              <button onClick={clearAll}  style={{ ...btnBase, color: 'var(--text3)' }}>Hapus</button>
            </div>
          </div>
          {accounts.map(acc => (
            <div key={acc.id} onClick={() => toggle(acc.id)}
              style={{
                padding: '10px 12px',
                display: 'flex', alignItems: 'center', gap: 10,
                cursor: 'pointer',
                borderBottom: '1px solid var(--border)',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{
                width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                border: `1.5px solid ${acc.active ? 'var(--navy)' : 'var(--border2)'}`,
                background: acc.active ? 'var(--navy)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {acc.active && <span style={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>✓</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {acc.label}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginTop: 1 }}>
                  {acc.adact}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Config Panel ────────────────────────────────────────────────────────────
export default function ConfigPanel({ accounts, onAccountsChange }) {
  const [show, setShow]     = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm]     = useState({ label: '', token: '', adact: '' })
  const [err, setErr]       = useState('')

  const openAdd = () => {
    setEditing(null); setForm({ label: '', token: '', adact: '' }); setErr(''); setShow(true)
  }
  const openEdit = acc => {
    setEditing(acc.id); setForm({ label: acc.label, token: acc.token, adact: acc.adact }); setErr(''); setShow(true)
  }
  const handleSave = () => {
    if (!form.label.trim() || !form.token.trim() || !form.adact.trim()) { setErr('Semua field wajib diisi'); return }
    let adact = form.adact.trim()
    if (!adact.startsWith('act_')) adact = 'act_' + adact.replace(/act[_=]?/g, '')
    const updated = editing === null
      ? [...accounts, { id: Date.now(), label: form.label.trim(), token: form.token.trim(), adact, active: true }]
      : accounts.map(a => a.id === editing ? { ...a, label: form.label.trim(), token: form.token.trim(), adact } : a)
    saveAccounts(updated); onAccountsChange(updated); setShow(false)
  }
  const handleDelete = id => {
    if (!confirm('Hapus akun ini?')) return
    const updated = accounts.filter(a => a.id !== id)
    saveAccounts(updated); onAccountsChange(updated)
  }

  const inputStyle = {
    width: '100%', background: 'var(--bg3)',
    border: '1px solid var(--border2)', borderRadius: 8,
    padding: '9px 12px', fontSize: 13, color: 'var(--text)',
    outline: 'none', fontFamily: 'var(--font-body)', boxSizing: 'border-box',
  }
  const labelStyle = {
    fontSize: 11, color: 'var(--text3)', fontWeight: 600,
    display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px',
  }

  return (
    <div>
      <button onClick={openAdd} style={{
        background: 'var(--bg2)',
        border: '1px solid var(--border2)',
        borderRadius: 8, padding: '7px 14px',
        fontSize: 13, fontWeight: 500,
        color: 'var(--text2)',
        display: 'flex', alignItems: 'center', gap: 6,
        boxShadow: 'var(--shadow-sm)',
      }}>
        <span>⚙</span> Akun
      </button>

      {show && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,28,53,0.35)', display: 'flex', alignItems: 'flex-start', paddingTop: '5vh', justifyContent: 'center', zIndex: 300 }}
          onClick={e => e.target === e.currentTarget && setShow(false)}>
          <div style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 14, padding: '1.75rem',
            width: 500, maxWidth: '92vw', maxHeight: '88vh', overflowY: 'auto',
            boxShadow: 'var(--shadow-md)', animation: 'fadeUp 0.2s ease',
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 20 }}>
              {editing === null ? 'Tambah Akun Baru' : 'Edit Akun'}
            </h3>

            {/* existing accounts */}
            {editing === null && accounts.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ ...labelStyle, marginBottom: 10 }}>Akun Tersimpan</div>
                {accounts.map(acc => (
                  <div key={acc.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', background: 'var(--bg3)',
                    borderRadius: 8, marginBottom: 6, border: '1px solid var(--border)',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{acc.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{acc.adact}</div>
                    </div>
                    <button onClick={() => openEdit(acc)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 14, padding: '4px 6px' }}>✎</button>
                    <button onClick={() => handleDelete(acc.id)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 14, padding: '4px 6px' }}>✕</button>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid var(--border)', margin: '18px 0' }} />
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: 'var(--text)' }}>Tambah Akun Baru</div>
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Nama / Label Akun</label>
              <input type="text" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="e.g. Brand Utama / Klien A" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Access Token Meta</label>
              <input type="password" value={form.token} onChange={e => setForm(f => ({ ...f, token: e.target.value }))} placeholder="EAASs6qu..." style={inputStyle} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Ad Account ID</label>
              <input type="text" value={form.adact} onChange={e => setForm(f => ({ ...f, adact: e.target.value }))} placeholder="act_896092819380688" style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }} />
            </div>

            {err && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 12 }}>{err}</div>}

            <div style={{ background: 'var(--amber-bg)', border: '1px solid #f5d08a', borderRadius: 8, padding: '10px 14px', marginBottom: 20 }}>
              <p style={{ fontSize: 12, color: 'var(--amber)', lineHeight: 1.6 }}>
                Token disimpan di localStorage browser kamu — tidak dikirim ke server manapun selain Meta API.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShow(false)} style={{ background: 'transparent', border: '1px solid var(--border2)', borderRadius: 8, padding: '9px 18px', fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>
                Batal
              </button>
              <button onClick={handleSave} style={{ background: 'var(--navy)', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, color: '#fff', fontWeight: 600 }}>
                {editing === null ? 'Tambah Akun' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
