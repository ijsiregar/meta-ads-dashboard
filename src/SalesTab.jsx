import React, { useState, useEffect, useCallback } from 'react'
import { fetchSalesData, PRODUCTS } from './sheets.js'
import { fmtRp, fmtRpFull, fmtNum } from './api.js'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarController, BarElement, LineController, LineElement, PointElement,
  Tooltip, Legend
} from 'chart.js'
import { Chart } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarController, BarElement,
  LineController, LineElement, PointElement, Tooltip, Legend)

const PERIODS = [
  { key: 'today',      label: 'Hari Ini' },
  { key: 'yesterday',  label: 'Kemarin' },
  { key: '7day',       label: '7 Hari' },
  { key: 'this_month', label: 'Bulan Ini' },
  { key: 'last_month', label: 'Bulan Lalu' },
  { key: 'custom',     label: 'Pilih Tanggal' },
]

const PRODUCT_COLORS = {
  'Jasa Video Iklan':   '#1a3260',
  'Jasa Creative lain': '#2563eb',
  'Ebook Saham':        '#16a34a',
  'Prodig Lain':        '#d97706',
}

// ─── Metric mini card ─────────────────────────────────────────────────────────
function MiniCard({ label, value, sub, highlight, small }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: small ? '12px 14px' : '14px 16px',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.7px', fontWeight: 600, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: small ? 16 : 20, fontWeight: 700, color: highlight || 'var(--text)', letterSpacing: '-0.3px' }}>
        {value || '—'}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>{sub}</div>}
    </div>
  )
}

// ─── Product section ──────────────────────────────────────────────────────────
function ProductCard({ name, data, includeBiayaLain }) {
  const color = PRODUCT_COLORS[name] || '#1a3260'
  const net = includeBiayaLain ? (data.netAfterBiaya ?? data.net) : data.net
  return (
    <div style={{
      background: '#fff',
      border: '1px solid var(--border)',
      borderRadius: 12,
      overflow: 'hidden',
      boxShadow: 'var(--shadow-sm)',
    }}>
      {/* header */}
      <div style={{
        padding: '10px 14px',
        background: color + '0f',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 700, color, letterSpacing: '-0.1px' }}>{name}</span>
      </div>
      {/* metrics grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, background: 'var(--border)' }}>
        {[
          { label: 'Omzet',    value: fmtRp(data.omzet) },
          { label: 'Spent',    value: fmtRp(data.spent) },
          { label: 'Net',      value: fmtRp(net), highlight: net > 0 ? 'var(--green)' : net < 0 ? 'var(--red)' : undefined },
          { label: 'Lead',     value: fmtNum(data.lead) },
          { label: 'Closing',  value: fmtNum(data.closing) },
          { label: 'CR',       value: data.closingRate ? data.closingRate + '%' : '—' },
          { label: 'CPL',      value: data.cpl ? fmtRp(data.cpl) : '—' },
          { label: 'CPP',      value: data.cpp ? fmtRp(data.cpp) : '—' },
          { label: 'ROI',      value: data.roi ? data.roi + '%' : '—', highlight: data.roi > 100 ? 'var(--green)' : data.roi > 0 ? 'var(--amber)' : data.roi !== null ? 'var(--red)' : undefined },
        ].map((m, i) => (
          <div key={i} style={{ padding: '10px 12px', background: '#fff' }}>
            <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 600, marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: m.highlight || 'var(--text)' }}>{m.value}</div>
          </div>
        ))}
      </div>
      {includeBiayaLain && data.biayaLain > 0 && (
        <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', background: '#fef9ec', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--amber)' }}>Biaya Lain</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--amber)', fontFamily: 'var(--font-mono)' }}>− {fmtRp(data.biayaLain)}</span>
        </div>
      )}
    </div>
  )
}

// ─── Mini chart ───────────────────────────────────────────────────────────────
function SalesTrendChart({ daily }) {
  const [metric, setMetric] = useState('omzet')

  if (!daily || daily.length < 2) return (
    <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 12 }}>
      Minimal 2 hari data untuk chart
    </div>
  )

  const OPTS = [
    { key: 'omzet',   label: 'Omzet',   color: '#1a3260' },
    { key: 'spent',   label: 'Spent',   color: '#dc2626' },
    { key: 'net',     label: 'Net',     color: '#16a34a' },
    { key: 'lead',    label: 'Lead',    color: '#d97706' },
    { key: 'closing', label: 'Closing', color: '#7c3aed' },
  ]

  const cur = OPTS.find(o => o.key === metric)
  const labels = daily.map(d => {
    const dt = new Date(d.date + 'T00:00:00Z')
    return `${dt.getUTCMonth()+1}/${dt.getUTCDate()}`
  })

  const chartData = {
    labels,
    datasets: [{
      type: 'bar',
      label: cur.label,
      data: daily.map(d => d[metric] || 0),
      backgroundColor: cur.color + '22',
      borderColor: cur.color,
      borderWidth: 1.5,
      borderRadius: 4,
    }]
  }

  const opts = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#fff', borderColor: '#e2e6ee', borderWidth: 1,
        titleColor: '#0f1c35', bodyColor: '#4a5568', padding: 8,
        callbacks: {
          label: ctx => ` ${cur.label}: ${metric === 'lead' || metric === 'closing' ? fmtNum(ctx.raw) : fmtRp(ctx.raw)}`
        }
      }
    },
    scales: {
      x: { ticks: { color: '#8896a8', font: { size: 10 } }, grid: { color: '#f0f2f5' } },
      y: {
        ticks: { color: '#8896a8', font: { size: 10 }, callback: v => v >= 1e6 ? (v/1e6).toFixed(1)+'M' : v >= 1e3 ? (v/1e3).toFixed(0)+'K' : v },
        grid: { color: '#f0f2f5' }
      }
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {OPTS.map(o => (
          <button key={o.key} onClick={() => setMetric(o.key)} style={{
            padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500,
            border: `1.5px solid ${metric === o.key ? o.color : 'var(--border2)'}`,
            background: metric === o.key ? o.color + '14' : 'var(--bg3)',
            color: metric === o.key ? o.color : 'var(--text3)',
            transition: 'all 0.15s',
          }}>{o.label}</button>
        ))}
      </div>
      <div style={{ height: 160, position: 'relative' }}>
        <Chart type="bar" data={chartData} options={opts} />
      </div>
    </div>
  )
}

// ─── Setup panel ──────────────────────────────────────────────────────────────
function SetupPanel({ onSave }) {
  const [key, setKey] = useState('')
  return (
    <div style={{ maxWidth: 480, margin: '4rem auto', padding: '2rem', background: '#fff', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow-md)' }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Setup Google Sheets API</div>
      <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20, lineHeight: 1.6 }}>
        Butuh Google Sheets API Key (gratis) untuk membaca data penjualan. Cara mendapatkan:
      </p>
      <ol style={{ paddingLeft: 18, fontSize: 12, color: 'var(--text2)', lineHeight: 2, marginBottom: 20 }}>
        <li>Buka <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" style={{ color: 'var(--navy)' }}>console.cloud.google.com</a></li>
        <li>Buat project baru → Library → cari "Google Sheets API" → Enable</li>
        <li>Credentials → Create Credentials → API Key</li>
        <li>Optional: restrict ke "Sheets API" saja untuk keamanan</li>
        <li>Copy API Key dan paste di bawah</li>
      </ol>
      <input
        type="password"
        value={key}
        onChange={e => setKey(e.target.value)}
        placeholder="AIza..."
        style={{
          width: '100%', boxSizing: 'border-box',
          background: 'var(--bg3)', border: '1px solid var(--border2)',
          borderRadius: 8, padding: '10px 12px', fontSize: 13,
          color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-mono)',
          marginBottom: 14,
        }}
      />
      <div style={{ background: 'var(--amber-bg)', border: '1px solid #f5d08a', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: 'var(--amber)', lineHeight: 1.6 }}>
        API Key disimpan di localStorage browser kamu saja.
      </div>
      <button
        onClick={() => key.trim() && onSave(key.trim())}
        style={{ background: 'var(--navy)', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, color: '#fff', fontWeight: 600, width: '100%' }}
      >
        Simpan & Muat Data
      </button>
    </div>
  )
}

// ─── Main SalesTab ────────────────────────────────────────────────────────────
export default function SalesTab() {
  const [apiKey, setApiKey]     = useState(() => localStorage.getItem('mads_sheets_key') || '')
  const [mode, setMode]         = useState('today')
  const [customDate, setCustom] = useState('')
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [lastUpdated, setLU]    = useState(null)

  const load = useCallback(async (key, m, cd) => {
    if (!key) return
    setLoading(true); setError(null)
    try {
      const result = await fetchSalesData(key, m, cd)
      setData(result); setLU(new Date())
      if (result.errors?.length) setError('Warning: ' + result.errors.join('; '))
    } catch(e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (apiKey) load(apiKey, mode, customDate)
  }, [mode, customDate, apiKey])

  const handleSaveKey = key => {
    localStorage.setItem('mads_sheets_key', key)
    setApiKey(key)
  }

  const handleResetKey = () => {
    if (!confirm('Hapus API Key?')) return
    localStorage.removeItem('mads_sheets_key')
    setApiKey('')
    setData(null)
  }

  if (!apiKey) return <SetupPanel onSave={handleSaveKey} />

  const showBiayaLain = mode === 'this_month' || mode === 'last_month'
  const t = data?.total

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '1.25rem 1.5rem 3rem' }}>

      {/* ── Controls ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {/* Period selector */}
        <div style={{ display: 'flex', gap: 3, background: 'var(--bg3)', borderRadius: 8, padding: 3, border: '1px solid var(--border)', flexWrap: 'wrap' }}>
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => setMode(p.key)} style={{
              padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
              border: 'none',
              background: mode === p.key ? 'var(--navy)' : 'transparent',
              color: mode === p.key ? '#fff' : 'var(--text3)',
              transition: 'all 0.15s',
            }}>{p.label}</button>
          ))}
        </div>

        {/* Date picker */}
        {mode === 'custom' && (
          <input
            type="date"
            value={customDate}
            onChange={e => setCustom(e.target.value)}
            max={new Date(Date.now() + 7*3600000).toISOString().split('T')[0]}
            style={{
              background: '#fff', border: '1px solid var(--border2)',
              borderRadius: 8, padding: '6px 10px', fontSize: 12,
              color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-body)',
              boxShadow: 'var(--shadow-sm)',
            }}
          />
        )}

        {/* Refresh + reset key */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button
            onClick={() => load(apiKey, mode, customDate)}
            disabled={loading}
            style={{
              background: '#fff', border: '1px solid var(--border2)',
              borderRadius: 8, padding: '6px 10px', fontSize: 14,
              color: 'var(--text3)', boxShadow: 'var(--shadow-sm)',
              animation: loading ? 'spin 1s linear infinite' : 'none',
            }}
          >↻</button>
          <button onClick={handleResetKey} style={{
            background: 'transparent', border: '1px solid var(--border2)',
            borderRadius: 8, padding: '6px 12px', fontSize: 12,
            color: 'var(--text3)',
          }}>API Key</button>
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
        <span style={{
          width: 7, height: 7, borderRadius: '50%',
          background: error && !data ? 'var(--red)' : loading ? 'var(--amber)' : data ? 'var(--green)' : 'var(--text3)',
          animation: loading ? 'pulse 1s infinite' : 'none',
        }} />
        <span>
          {loading ? 'Memuat data...'
            : error ? error
            : data ? `${data.totalRows} baris · ${data.start}${data.start !== data.end ? ' – ' + data.end : ''} · diperbarui ${lastUpdated?.toLocaleTimeString('id-ID')}`
            : 'Belum ada data'}
        </span>
        {showBiayaLain && (
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--amber)', fontWeight: 500 }}>
            ⚠ Biaya Lain dihitung sebagai pengurang profit
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
            <MiniCard label="Total Lead"    value={fmtNum(t.lead)}   sub="semua produk" />
            <MiniCard label="Total Closing" value={fmtNum(t.closing)} sub="semua produk" />
            <MiniCard
              label="Closing Rate"
              value={t.closingRate ? t.closingRate + '%' : '—'}
              highlight={parseFloat(t.closingRate) > 50 ? 'var(--green)' : parseFloat(t.closingRate) > 20 ? 'var(--amber)' : 'var(--red)'}
            />
            <MiniCard label="ROI"           value={t.roi ? t.roi + '%' : '—'} highlight={parseFloat(t.roi) > 100 ? 'var(--green)' : parseFloat(t.roi) > 0 ? 'var(--amber)' : 'var(--red)'} />
            <MiniCard label="Cost/Lead"     value={t.cpl ? fmtRp(t.cpl) : '—'} />
            {showBiayaLain && (
              <MiniCard label="Biaya Lain"  value={fmtRp(t.biayaLain)} highlight="var(--amber)" sub="pengurang profit" />
            )}
          </div>

          {/* ── Per product ──────────────────────────────────────────────── */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>Per Produk</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
              {PRODUCTS.map(p => (
                <ProductCard
                  key={p}
                  name={p}
                  data={data.byProduct[p]}
                  includeBiayaLain={showBiayaLain}
                />
              ))}
            </div>
          </div>

          {/* ── Trend chart ──────────────────────────────────────────────── */}
          {data.daily && data.daily.length >= 2 && (
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>Tren Harian</div>
              <SalesTrendChart daily={data.daily} />
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!loading && !error && data && data.totalRows === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text3)', fontSize: 13 }}>
          Tidak ada data untuk periode ini
        </div>
      )}
    </div>
  )
}
