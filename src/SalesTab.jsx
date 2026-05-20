import React, { useState, useEffect, useCallback, useRef } from 'react'
import { fetchSalesData } from './sheets.js'
import { fmtRp, fmtNum } from './api.js'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarController, BarElement, LineController, LineElement, PointElement,
  Tooltip, Legend
} from 'chart.js'
import { Chart } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarController, BarElement,
  LineController, LineElement, PointElement, Tooltip, Legend)

// ─── Sheet storage ────────────────────────────────────────────────────────────
const SHEETS_KEY  = 'mads_sheets_v2'
const API_KEY_KEY = 'mads_sheets_apikey'

function loadSheets() {
  try {
    const saved = JSON.parse(localStorage.getItem(SHEETS_KEY))
    if (saved?.length) return saved
  } catch {}
  // migrate dari versi lama (single sheet hardcoded)
  return []
}

function saveSheets(sheets) {
  localStorage.setItem(SHEETS_KEY, JSON.stringify(sheets))
}

const PERIODS = [
  { key: 'today',      label: 'Hari Ini'     },
  { key: 'yesterday',  label: 'Kemarin'      },
  { key: '7day',       label: '7 Hari'       },
  { key: 'this_month', label: 'Bulan Ini'    },
  { key: 'last_month', label: 'Bulan Lalu'   },
  { key: 'custom',     label: 'Pilih Tanggal'},
]

const PRODUCT_COLORS = {
  'Jasa Video Iklan':   '#1a3260',
  'Jasa Creative lain': '#2563eb',
  'Ebook Saham':        '#16a34a',
  'Prodig Lain':        '#d97706',
}
const COLOR_POOL = ['#7c3aed','#0891b2','#be185d','#059669','#dc2626','#9333ea','#0284c7','#b45309']

function getProductColor(name, allProducts) {
  if (PRODUCT_COLORS[name]) return PRODUCT_COLORS[name]
  const idx = (allProducts || []).indexOf(name)
  return COLOR_POOL[idx < 0 ? 0 : idx % COLOR_POOL.length]
}

// ─── Sheet Selector Dropdown ──────────────────────────────────────────────────
function SheetSelector({ sheets, activeId, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const active = sheets.find(s => s.id === activeId)

  if (!sheets.length) return null

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        background: '#fff', border: '1px solid var(--border2)',
        borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 500,
        color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8,
        boxShadow: 'var(--shadow-sm)', maxWidth: 220, minWidth: 140,
      }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: active ? 'var(--green)' : 'var(--text3)', flexShrink: 0 }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'left' }}>
          {active?.label || 'Pilih sheet...'}
        </span>
        <span style={{ color: 'var(--text3)', fontSize: 10 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0,
          background: '#fff', border: '1px solid var(--border2)',
          borderRadius: 10, minWidth: 240, maxWidth: 320,
          zIndex: 200, overflow: 'hidden', boxShadow: 'var(--shadow-md)',
        }}>
          {sheets.map(s => (
            <div key={s.id}
              onClick={() => { onChange(s.id); setOpen(false) }}
              style={{
                padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
                cursor: 'pointer', borderBottom: '1px solid var(--border)',
                background: s.id === activeId ? 'var(--navy-lt)' : 'transparent',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (s.id !== activeId) e.currentTarget.style.background = 'var(--bg3)' }}
              onMouseLeave={e => { if (s.id !== activeId) e.currentTarget.style.background = 'transparent' }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: s.id === activeId ? 'var(--navy)' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.label}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.spreadsheetId}
                </div>
              </div>
              {s.id === activeId && <span style={{ color: 'var(--navy)', fontSize: 12 }}>✓</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Sheet Manager Panel ──────────────────────────────────────────────────────
function SheetPanel({ sheets, apiKey, onSheetsChange, onApiKeyChange, onClose }) {
  const [editing, setEditing]   = useState(null) // null = add new
  const [form, setForm]         = useState({ label: '', spreadsheetId: '' })
  const [apiKeyInput, setApiKI] = useState(apiKey || '')
  const [err, setErr]           = useState('')
  const [showAddForm, setShowAdd] = useState(false)

  const extractId = (input) => {
    const m = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
    return m ? m[1] : input.trim()
  }

  const openAdd = () => { setEditing(null); setForm({ label: '', spreadsheetId: '' }); setErr(''); setShowAdd(true) }
  const openEdit = s => { setEditing(s.id); setForm({ label: s.label, spreadsheetId: s.spreadsheetId }); setErr(''); setShowAdd(true) }

  const handleSave = () => {
    if (!form.label.trim() || !form.spreadsheetId.trim()) { setErr('Semua field wajib diisi'); return }
    const spreadsheetId = extractId(form.spreadsheetId)
    const updated = editing === null
      ? [...sheets, { id: Date.now(), label: form.label.trim(), spreadsheetId }]
      : sheets.map(s => s.id === editing ? { ...s, label: form.label.trim(), spreadsheetId } : s)
    saveSheets(updated)
    onSheetsChange(updated)
    setShowAdd(false)
    setForm({ label: '', spreadsheetId: '' })
  }

  const handleDelete = id => {
    if (!confirm('Hapus sheet ini?')) return
    const updated = sheets.filter(s => s.id !== id)
    saveSheets(updated)
    onSheetsChange(updated)
  }

  const handleSaveApiKey = () => {
    localStorage.setItem(API_KEY_KEY, apiKeyInput.trim())
    onApiKeyChange(apiKeyInput.trim())
  }

  const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    background: 'var(--bg3)', border: '1px solid var(--border2)',
    borderRadius: 8, padding: '9px 12px', fontSize: 13,
    color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-body)',
  }
  const labelStyle = {
    fontSize: 11, color: 'var(--text3)', fontWeight: 600,
    display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,28,53,0.35)', display: 'flex', alignItems: 'flex-start', paddingTop: '5vh', justifyContent: 'center', zIndex: 300 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: '#fff', border: '1px solid var(--border)',
        borderRadius: 14, padding: '1.75rem',
        width: 520, maxWidth: '92vw', maxHeight: '88vh', overflowY: 'auto',
        boxShadow: 'var(--shadow-md)', animation: 'fadeUp 0.2s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Kelola Google Sheets</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, color: 'var(--text3)', cursor: 'pointer' }}>✕</button>
        </div>

        {/* API Key section */}
        <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
          <label style={labelStyle}>Google Sheets API Key</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="password"
              value={apiKeyInput}
              onChange={e => setApiKI(e.target.value)}
              placeholder="AIza..."
              style={{ ...inputStyle, flex: 1, fontFamily: 'var(--font-mono)', fontSize: 12 }}
            />
            <button onClick={handleSaveApiKey} style={{
              background: 'var(--navy)', border: 'none', borderRadius: 8,
              padding: '9px 14px', fontSize: 12, color: '#fff', fontWeight: 600, flexShrink: 0,
            }}>Simpan</button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8, lineHeight: 1.5 }}>
            Satu API key bisa dipakai untuk semua spreadsheet. Didapat dari{' '}
            <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" style={{ color: 'var(--navy)' }}>Google Cloud Console</a>
            {' '}→ Sheets API → Credentials.
          </div>
        </div>

        {/* Sheet list */}
        {sheets.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ ...labelStyle, marginBottom: 10 }}>Spreadsheet Tersimpan</div>
            {sheets.map(s => (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', background: 'var(--bg3)',
                borderRadius: 8, marginBottom: 6, border: '1px solid var(--border)',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{s.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.spreadsheetId}
                  </div>
                </div>
                <button onClick={() => openEdit(s)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 14, padding: '4px 6px' }}>✎</button>
                <button onClick={() => handleDelete(s.id)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 14, padding: '4px 6px' }}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit form */}
        {!showAddForm ? (
          <button onClick={openAdd} style={{
            width: '100%', background: 'var(--navy-lt)', border: '1.5px dashed var(--navy)',
            borderRadius: 8, padding: '10px', fontSize: 13, color: 'var(--navy)',
            fontWeight: 600, cursor: 'pointer',
          }}>
            + Tambah Spreadsheet
          </button>
        ) : (
          <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: 'var(--text)' }}>
              {editing === null ? 'Tambah Spreadsheet Baru' : 'Edit Spreadsheet'}
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Nama / Label</label>
              <input type="text" value={form.label}
                onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                placeholder="e.g. Toko Utama / Klien B"
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Spreadsheet ID atau URL</label>
              <input type="text" value={form.spreadsheetId}
                onChange={e => setForm(f => ({ ...f, spreadsheetId: e.target.value }))}
                placeholder="https://docs.google.com/spreadsheets/d/... atau ID saja"
                style={{ ...inputStyle, fontFamily: 'var(--font-mono)', fontSize: 11 }}
              />
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 5 }}>
                Bisa paste URL lengkap dari browser, ID akan diekstrak otomatis.
              </div>
            </div>
            {err && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 10 }}>{err}</div>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowAdd(false); setErr('') }} style={{
                background: 'transparent', border: '1px solid var(--border2)',
                borderRadius: 8, padding: '8px 16px', fontSize: 12, color: 'var(--text2)', fontWeight: 500,
              }}>Batal</button>
              <button onClick={handleSave} style={{
                background: 'var(--navy)', border: 'none',
                borderRadius: 8, padding: '8px 18px', fontSize: 12, color: '#fff', fontWeight: 600,
              }}>{editing === null ? 'Tambah' : 'Simpan'}</button>
            </div>
          </div>
        )}

        <div style={{ background: '#fef9ec', border: '1px solid #f5d08a', borderRadius: 8, padding: '10px 14px', marginTop: 16, fontSize: 11, color: 'var(--amber)', lineHeight: 1.6 }}>
          Semua data disimpan di localStorage browser kamu — tidak dikirim ke server manapun selain Google Sheets API.
        </div>
      </div>
    </div>
  )
}

// ─── Metric mini card ─────────────────────────────────────────────────────────
function MiniCard({ label, value, sub, highlight }) {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.7px', fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: highlight || 'var(--text)', letterSpacing: '-0.3px' }}>{value || '—'}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>{sub}</div>}
    </div>
  )
}

// ─── Product card ─────────────────────────────────────────────────────────────
function ProductCard({ name, data, includeBiayaLain, allProducts }) {
  const color = getProductColor(name, allProducts)
  const net   = includeBiayaLain ? (data.netAfterBiaya ?? data.net) : data.net
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ padding: '10px 14px', background: color + '0f', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{name}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, background: 'var(--border)' }}>
        {[
          { label: 'Omzet',   value: fmtRp(data.omzet) },
          { label: 'Spent',   value: fmtRp(data.spent) },
          { label: 'Net',     value: fmtRp(net), highlight: net > 0 ? 'var(--green)' : net < 0 ? 'var(--red)' : undefined },
          { label: 'Lead',    value: fmtNum(data.lead) },
          { label: 'Closing', value: fmtNum(data.closing) },
          { label: 'CR',      value: data.closingRate ? data.closingRate + '%' : '—' },
          { label: 'CPL',     value: data.cpl ? fmtRp(data.cpl) : '—' },
          { label: 'CPP',     value: data.cpp ? fmtRp(data.cpp) : '—' },
          { label: 'ROI',     value: data.roi ? data.roi + '%' : '—', highlight: data.roi > 100 ? 'var(--green)' : data.roi > 0 ? 'var(--amber)' : data.roi !== null ? 'var(--red)' : undefined },
        ].map((m, i) => (
          <div key={i} style={{ padding: '10px 12px', background: '#fff' }}>
            <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 600, marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: m.highlight || 'var(--text)' }}>{m.value}</div>
          </div>
        ))}
      </div>
      {includeBiayaLain && data.biayaLain > 0 && (
        <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', background: '#fef9ec', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: 'var(--amber)' }}>Biaya Lain</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--amber)', fontFamily: 'var(--font-mono)' }}>− {fmtRp(data.biayaLain)}</span>
        </div>
      )}
    </div>
  )
}

// ─── Trend Chart with product filter ─────────────────────────────────────────
function SalesTrendChart({ daily, allProducts }) {
  const [metric,        setMetric]  = useState('omzet')
  const [productFilter, setProduct] = useState('all')

  const METRIC_OPTS = [
    { key: 'omzet',   label: 'Omzet',   color: '#1a3260', isCurrency: true  },
    { key: 'spent',   label: 'Spent',   color: '#dc2626', isCurrency: true  },
    { key: 'net',     label: 'Net',     color: '#16a34a', isCurrency: true  },
    { key: 'lead',    label: 'Lead',    color: '#d97706', isCurrency: false },
    { key: 'closing', label: 'Closing', color: '#7c3aed', isCurrency: false },
  ]

  const cur = METRIC_OPTS.find(o => o.key === metric)

  if (!daily || daily.length < 2) return (
    <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 12 }}>
      Minimal 2 hari data untuk chart
    </div>
  )

  const labels    = daily.map(d => { const dt = new Date(d.date + 'T00:00:00Z'); return `${dt.getUTCMonth()+1}/${dt.getUTCDate()}` })
  const getValue  = d => productFilter === 'all' ? (d[metric] || 0) : (d.byProduct?.[productFilter]?.[metric] || 0)
  const barColor  = productFilter === 'all' ? cur.color : getProductColor(productFilter, allProducts)

  const chartData = {
    labels,
    datasets: [{
      type: 'bar', label: productFilter === 'all' ? `Total ${cur.label}` : `${productFilter} — ${cur.label}`,
      data: daily.map(getValue),
      backgroundColor: barColor + '22', borderColor: barColor,
      borderWidth: 1.5, borderRadius: 4,
    }]
  }

  const opts = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#fff', borderColor: '#e2e6ee', borderWidth: 1,
        titleColor: '#0f1c35', bodyColor: '#4a5568', padding: 8,
        callbacks: { label: ctx => ` ${ctx.dataset.label}: ${cur.isCurrency ? fmtRp(ctx.raw) : fmtNum(ctx.raw)}` }
      }
    },
    scales: {
      x: { ticks: { color: '#8896a8', font: { size: 10 } }, grid: { color: '#f0f2f5' } },
      y: { ticks: { color: '#8896a8', font: { size: 10 }, callback: v => v >= 1e6 ? (v/1e6).toFixed(1)+'M' : v >= 1e3 ? (v/1e3).toFixed(0)+'K' : v }, grid: { color: '#f0f2f5' } }
    }
  }

  const pill = (active, color, label, onClick) => (
    <button key={label} onClick={onClick} style={{
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500,
      border: `1.5px solid ${active ? color : 'var(--border2)'}`,
      background: active ? color + '14' : 'var(--bg3)',
      color: active ? color : 'var(--text3)',
      transition: 'all 0.15s', whiteSpace: 'nowrap',
    }}>{label}</button>
  )

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginRight: 2 }}>Metrik</span>
        {METRIC_OPTS.map(o => pill(metric === o.key, o.color, o.label, () => setMetric(o.key)))}
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginRight: 2 }}>Produk</span>
        {pill(productFilter === 'all', '#64748b', 'Semua', () => setProduct('all'))}
        {(allProducts || []).map(p => pill(productFilter === p, getProductColor(p, allProducts), p, () => setProduct(p)))}
      </div>
      <div style={{ height: 180, position: 'relative' }}>
        <Chart type="bar" data={chartData} options={opts} />
      </div>
    </div>
  )
}

// ─── First-run setup (no sheets yet) ─────────────────────────────────────────
function EmptyState({ onOpen }) {
  return (
    <div style={{ maxWidth: 440, margin: '5rem auto', textAlign: 'center', padding: '0 1rem' }}>
      <div style={{ fontSize: 36, marginBottom: 16 }}>📊</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Belum ada Google Sheet</div>
      <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 24, lineHeight: 1.6 }}>
        Tambahkan spreadsheet data penjualan dan Google Sheets API Key untuk mulai menampilkan data.
      </p>
      <button onClick={onOpen} style={{
        background: 'var(--navy)', border: 'none', borderRadius: 10,
        padding: '12px 28px', fontSize: 14, color: '#fff', fontWeight: 600,
      }}>
        + Tambah Google Sheet
      </button>
    </div>
  )
}

// ─── Main SalesTab ────────────────────────────────────────────────────────────
export default function SalesTab() {
  const [sheets, setSheets]       = useState(loadSheets)
  const [apiKey, setApiKey]       = useState(() => localStorage.getItem(API_KEY_KEY) || '')
  const [activeId, setActiveId]   = useState(() => loadSheets()[0]?.id || null)
  const [showPanel, setShowPanel] = useState(false)
  const [mode, setMode]           = useState('today')
  const [customDate, setCustom]   = useState('')
  const [data, setData]           = useState(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const [lastUpdated, setLU]      = useState(null)

  const activeSheet = sheets.find(s => s.id === activeId)

  const load = useCallback(async (sheet, key, m, cd) => {
    if (!sheet || !key) return
    setLoading(true); setError(null)
    try {
      const result = await fetchSalesData(key, m, cd, sheet.spreadsheetId)
      setData(result); setLU(new Date())
      if (result.errors?.length) setError('Warning: ' + result.errors.join('; '))
    } catch(e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeSheet && apiKey) load(activeSheet, apiKey, mode, customDate)
    else setData(null)
  }, [activeId, apiKey, mode, customDate])

  const handleSheetsChange = updated => {
    setSheets(updated)
    // jika sheet aktif dihapus, pilih yang pertama
    if (!updated.find(s => s.id === activeId)) {
      setActiveId(updated[0]?.id || null)
    }
    // jika baru ditambah dan belum ada yang aktif
    if (!activeId && updated.length > 0) setActiveId(updated[0].id)
  }

  const handleApiKeyChange = key => {
    setApiKey(key)
  }

  // tidak ada sheet sama sekali
  if (!sheets.length) return (
    <>
      <EmptyState onOpen={() => setShowPanel(true)} />
      {showPanel && (
        <SheetPanel
          sheets={sheets} apiKey={apiKey}
          onSheetsChange={handleSheetsChange}
          onApiKeyChange={handleApiKeyChange}
          onClose={() => setShowPanel(false)}
        />
      )}
    </>
  )

  const showBiayaLain = mode === 'this_month' || mode === 'last_month'
  const t = data?.total

  const statusDot = error && !data ? 'var(--red)' : loading ? 'var(--amber)' : data ? 'var(--green)' : 'var(--text3)'
  const statusMsg = !apiKey ? 'API Key belum diset — buka panel ⚙ Sheet'
    : loading ? 'Memuat data...'
    : error ? error
    : data ? `${data.totalRows} baris · ${data.start}${data.start !== data.end ? ' – '+data.end : ''} · ${lastUpdated?.toLocaleTimeString('id-ID')}`
    : 'Belum ada data'

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '1.25rem 1.5rem 3rem' }}>

      {/* ── Controls ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: '1.25rem' }}>

        {/* Sheet selector */}
        <SheetSelector sheets={sheets} activeId={activeId} onChange={id => { setActiveId(id); setData(null) }} />

        {/* Period */}
        <div style={{ display: 'flex', gap: 2, background: 'var(--bg3)', borderRadius: 8, padding: 3, border: '1px solid var(--border)', flexWrap: 'wrap' }}>
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => setMode(p.key)} style={{
              padding: '5px 11px', borderRadius: 6, fontSize: 12, fontWeight: 500, border: 'none',
              background: mode === p.key ? 'var(--navy)' : 'transparent',
              color: mode === p.key ? '#fff' : 'var(--text3)',
              transition: 'all 0.15s',
            }}>{p.label}</button>
          ))}
        </div>

        {/* Date picker */}
        {mode === 'custom' && (
          <input type="date" value={customDate}
            onChange={e => setCustom(e.target.value)}
            max={new Date(Date.now() + 7*3600000).toISOString().split('T')[0]}
            style={{
              background: '#fff', border: '1px solid var(--border2)',
              borderRadius: 8, padding: '6px 10px', fontSize: 12,
              color: 'var(--text)', outline: 'none', boxShadow: 'var(--shadow-sm)',
            }}
          />
        )}

        {/* Right: refresh + manage */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={() => load(activeSheet, apiKey, mode, customDate)} disabled={loading || !activeSheet || !apiKey}
            style={{
              background: '#fff', border: '1px solid var(--border2)',
              borderRadius: 8, padding: '6px 10px', fontSize: 14,
              color: 'var(--text3)', boxShadow: 'var(--shadow-sm)',
              animation: loading ? 'spin 1s linear infinite' : 'none',
            }}>↻</button>
          <button onClick={() => setShowPanel(true)} style={{
            background: '#fff', border: '1px solid var(--border2)',
            borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 500,
            color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 6,
            boxShadow: 'var(--shadow-sm)',
          }}>
            <span>⚙</span> Sheet
          </button>
        </div>
      </div>

      {/* ── Status ───────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 14px', background: '#fff',
        border: '1px solid var(--border)', borderRadius: 8,
        marginBottom: '1.25rem', fontSize: 12, color: 'var(--text3)',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusDot, animation: loading ? 'pulse 1s infinite' : 'none' }} />
        <span style={{ color: error && !data ? 'var(--red)' : 'var(--text3)' }}>{statusMsg}</span>
        {activeSheet && (
          <span style={{ marginLeft: 'auto', color: 'var(--navy)', fontWeight: 600, fontSize: 11 }}>
            {activeSheet.label}
          </span>
        )}
        {showBiayaLain && (
          <span style={{ color: 'var(--amber)', fontWeight: 500, fontSize: 11 }}>
            · ⚠ Biaya Lain dihitung sebagai pengurang profit
          </span>
        )}
      </div>

      {/* ── Summary cards ────────────────────────────────────────────────── */}
      {t && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8, marginBottom: '1rem' }}>
            <MiniCard label="Total Omzet"   value={fmtRp(t.omzet)}   sub="semua produk" />
            <MiniCard label="Total Spent"   value={fmtRp(t.spent)}   sub="biaya iklan" />
            <MiniCard
              label="Net Profit"
              value={fmtRp(showBiayaLain ? (t.netAfterBiaya ?? t.net) : t.net)}
              sub={showBiayaLain && t.biayaLain > 0 ? `setelah biaya lain ${fmtRp(t.biayaLain)}` : 'omzet − spent'}
              highlight={(showBiayaLain ? (t.netAfterBiaya ?? t.net) : t.net) > 0 ? 'var(--green)' : 'var(--red)'}
            />
            <MiniCard label="Total Lead"    value={fmtNum(t.lead)}    sub="semua produk" />
            <MiniCard label="Total Closing" value={fmtNum(t.closing)}  sub="semua produk" />
            <MiniCard label="Closing Rate"  value={t.closingRate ? t.closingRate + '%' : '—'}
              highlight={parseFloat(t.closingRate) > 50 ? 'var(--green)' : parseFloat(t.closingRate) > 20 ? 'var(--amber)' : 'var(--red)'} />
            <MiniCard label="ROI"           value={t.roi ? t.roi + '%' : '—'}
              highlight={parseFloat(t.roi) > 100 ? 'var(--green)' : parseFloat(t.roi) > 0 ? 'var(--amber)' : 'var(--red)'} />
            <MiniCard label="Cost/Lead"     value={t.cpl ? fmtRp(t.cpl) : '—'} />
            {showBiayaLain && <MiniCard label="Biaya Lain" value={fmtRp(t.biayaLain)} highlight="var(--amber)" sub="pengurang profit" />}
          </div>

          {/* Per produk */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>Per Produk</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
              {(data.products || []).map(p => (
                <ProductCard key={p} name={p} data={data.byProduct[p]}
                  includeBiayaLain={showBiayaLain} allProducts={data.products} />
              ))}
            </div>
          </div>

          {/* Trend chart */}
          {data.daily && data.daily.length >= 2 && (
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>Tren Harian</div>
              <SalesTrendChart daily={data.daily} allProducts={data.products || []} />
            </div>
          )}
        </>
      )}

      {!loading && !error && data && data.totalRows === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text3)', fontSize: 13 }}>
          Tidak ada data untuk periode ini
        </div>
      )}

      {/* Sheet panel */}
      {showPanel && (
        <SheetPanel
          sheets={sheets} apiKey={apiKey}
          onSheetsChange={handleSheetsChange}
          onApiKeyChange={handleApiKeyChange}
          onClose={() => setShowPanel(false)}
        />
      )}
    </div>
  )
}
