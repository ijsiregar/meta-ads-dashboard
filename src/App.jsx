import React, { useState, useEffect, useCallback } from 'react'
import MetricCard from './MetricCard'
import TrendChart from './TrendChart'
import CampaignTable from './CampaignTable'
import ConfigPanel, { AccountSelector, loadAccounts, saveAccounts } from './ConfigPanel'
import SalesTab from './SalesTab'
import {
  fetchInsights, getDateRange,
  fmtRp, fmtRpFull, fmtNum, fmtPct, fmtRoas,
  getWAMessages, getAddToCart, getLinkClicks, getPurchaseCount, getPurchaseValue,
} from './api'

// Meta Ads period options
const PERIODS = [
  { label: 'Hari Ini',  days: 1,   key: 'today' },
  { label: 'Kemarin',   days: 1,   key: 'yesterday' },
  { label: '7 Hari',    days: 7,   key: '7day' },
  { label: '14 Hari',   days: 14,  key: '14day' },
  { label: '30 Hari',   days: 30,  key: '30day' },
  { label: 'Tanggal',   days: null, key: 'custom' },
]

// ─── WIB helpers ────────────────────────────────────────────────────────────
function wibToday() {
  return new Date(Date.now() + 7*3600000).toISOString().split('T')[0]
}
function wibYesterday() {
  return new Date(Date.now() + 7*3600000 - 86400000).toISOString().split('T')[0]
}

// ─── Section wrapper ─────────────────────────────────────────────────────────
function Section({ title, sub, children }) {
  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)', marginBottom: '1rem',
    }}>
      {(title || sub) && (
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
          {title && <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{title}</div>}
          {sub   && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{sub}</div>}
        </div>
      )}
      <div style={{ padding: '1.25rem' }}>{children}</div>
    </div>
  )
}

// ─── Profit modal ─────────────────────────────────────────────────────────────
function ProfitModal({ purchaseValue, onClose }) {
  const [cogs, setCogs]       = useState(localStorage.getItem('mads_cogs') || '')
  const [adSpend, setAdSpend] = useState('')

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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,28,53,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
      onClick={e => e.target === e.currentTarget && onClose(null)}>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.75rem', width: 400, maxWidth: '92vw', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Hitung Profit</div>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 20 }}>Purchase Value: {fmtRpFull(purchaseValue)}</div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>HPP / COGS Total (Rp)</label>
          <input type="number" value={cogs} onChange={e => setCogs(e.target.value)} placeholder="0" style={inputStyle} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Ad Spend (kosongkan = pakai data live)</label>
          <input type="number" value={adSpend} onChange={e => setAdSpend(e.target.value)} placeholder="Otomatis dari dashboard" style={{ ...inputStyle, color: 'var(--text3)' }} />
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={() => onClose(null)} style={{ background: 'transparent', border: '1px solid var(--border2)', borderRadius: 8, padding: '8px 18px', fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>Batal</button>
          <button onClick={() => { localStorage.setItem('mads_cogs', cogs); onClose({ cogs: parseFloat(cogs)||0, adSpend: parseFloat(adSpend)||0 }) }}
            style={{ background: 'var(--navy)', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, color: '#fff', fontWeight: 600 }}>Hitung</button>
        </div>
      </div>
    </div>
  )
}

// ─── Meta Ads Tab ─────────────────────────────────────────────────────────────
function MetaAdsTab({ accounts, onAccountsChange }) {
  const [periodKey, setPeriodKey]   = useState('today')
  const [customDate, setCustomDate] = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)
  const [data, setData]             = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [profit, setProfit]         = useState(null)
  const [showProfit, setShowProfit] = useState(false)

  const activeAccounts = accounts.filter(a => a.active)

  // Build since/until from periodKey
  function buildRange(key, cd) {
    if (key === 'today')     return { since: wibToday(), until: wibToday() }
    if (key === 'yesterday') return { since: wibYesterday(), until: wibYesterday() }
    if (key === '7day')      return getDateRange(7)
    if (key === '14day')     return getDateRange(14)
    if (key === '30day')     return getDateRange(30)
    if (key === 'custom' && cd) return { since: cd, until: cd }
    return { since: wibToday(), until: wibToday() }
  }

  const load = useCallback(async (accts, key, cd) => {
    if (!accts.length) return
    const { since, until } = buildRange(key, cd)
    if (key === 'custom' && !cd) return
    setLoading(true); setError(null)
    try {
      // pass custom range directly
      const { fetchInsightsRange } = await import('./api')
      const result = await fetchInsightsRange(accts, since, until)
      setData(result); setLastUpdated(new Date())
      if (result.errors?.length) setError('Partial: ' + result.errors.join('; '))
    } catch(e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeAccounts.length) load(activeAccounts, periodKey, customDate)
    else setData(null)
  }, [periodKey, customDate, JSON.stringify(activeAccounts)])

  const s             = data?.summary
  const spend         = s ? parseFloat(s.spend||0) : 0
  const wa            = s ? getWAMessages(s.actions) : 0
  const atc           = s ? getAddToCart(s.actions) : 0
  const linkClicks    = s ? getLinkClicks(s.actions) : 0
  const purchase      = s ? getPurchaseCount(s.actions) : 0
  const purchaseVal   = s ? getPurchaseValue(s.action_values) : 0
  const roas          = spend > 0 && purchaseVal > 0 ? purchaseVal/spend : 0
  const costPerPurch  = purchase > 0 ? spend/purchase : 0
  const freq          = s ? parseFloat(s.frequency||0) : 0
  const freqAlert     = freq >= 3
  const profitValue   = profit !== null ? purchaseVal - profit.cogs - (profit.adSpend > 0 ? profit.adSpend : spend) : null

  const statusDot = error && !data ? 'var(--red)' : loading ? 'var(--amber)' : data ? 'var(--green)' : 'var(--text3)'
  const statusMsg = loading ? 'Memuat data...'
    : error ? error
    : data ? `Diperbarui ${lastUpdated?.toLocaleTimeString('id-ID')} · ${data.since} – ${data.until}`
    : activeAccounts.length === 0 ? 'Tambah & pilih akun untuk memulai' : 'Pilih akun aktif di dropdown'

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '1.25rem 1.5rem 3rem' }}>

      {/* Period + Date picker */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', gap: 2, background: 'var(--bg3)', borderRadius: 8, padding: 3, border: '1px solid var(--border)', flexWrap: 'wrap' }}>
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => setPeriodKey(p.key)} style={{
              padding: '5px 11px', borderRadius: 6, fontSize: 12, fontWeight: 500,
              border: 'none',
              background: periodKey === p.key ? 'var(--navy)' : 'transparent',
              color: periodKey === p.key ? '#fff' : 'var(--text3)',
              transition: 'all 0.15s',
            }}>{p.label}</button>
          ))}
        </div>
        {periodKey === 'custom' && (
          <input
            type="date"
            value={customDate}
            onChange={e => setCustomDate(e.target.value)}
            max={wibToday()}
            style={{
              background: '#fff', border: '1px solid var(--border2)',
              borderRadius: 8, padding: '6px 10px', fontSize: 12,
              color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-body)',
              boxShadow: 'var(--shadow-sm)',
            }}
          />
        )}
        <button
          onClick={() => load(activeAccounts, periodKey, customDate)}
          disabled={loading || !activeAccounts.length}
          style={{
            marginLeft: 'auto', background: 'var(--bg2)', border: '1px solid var(--border2)',
            borderRadius: 8, padding: '6px 10px', fontSize: 14,
            color: 'var(--text3)', boxShadow: 'var(--shadow-sm)',
            animation: loading ? 'spin 1s linear infinite' : 'none',
          }}
        >↻</button>
      </div>

      {/* Status */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 14px', background: 'var(--bg2)',
        border: '1px solid var(--border)', borderRadius: 8,
        marginBottom: '1.25rem', fontSize: 12, color: 'var(--text3)',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusDot, animation: loading ? 'pulse 1s infinite' : 'none' }} />
        <span style={{ color: error && !data ? 'var(--red)' : 'var(--text3)' }}>{statusMsg}</span>
        {data && activeAccounts.length > 1 && (
          <span style={{ marginLeft: 'auto', color: 'var(--navy)', fontWeight: 600 }}>{activeAccounts.length} akun digabung</span>
        )}
      </div>

      {/* Frequency alert */}
      {freqAlert && (
        <div style={{ padding: '10px 16px', background: 'var(--amber-bg)', border: '1px solid #f5d08a', borderRadius: 8, marginBottom: '1.25rem', fontSize: 13, color: 'var(--amber)', fontWeight: 500 }}>
          ⚠ Frequency {freq.toFixed(2)}x — audience mungkin mulai jenuh.
        </div>
      )}

      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 8, marginBottom: '1rem' }}>
        <MetricCard label="Total Spend"    value={s ? fmtRp(s.spend)          : '—'} sub="periode ini"           delay={0}   />
        <MetricCard label="Impressions"    value={s ? fmtNum(s.impressions)   : '—'} sub="total tayangan"        delay={40}  />
        <MetricCard label="Reach"          value={s ? fmtNum(s.reach)         : '—'} sub="akun unik"             delay={80}  />
        <MetricCard label="Avg. Frequency" value={s ? freq.toFixed(2)+'x'    : '—'} sub="tayangan/orang"        delay={120}
          highlight={freqAlert ? 'var(--red)' : freq >= 2.5 ? 'var(--amber)' : undefined} />
        <MetricCard label="Avg. CTR"       value={s ? fmtPct(s.ctr)           : '—'} sub="click-through rate"   delay={160} />
        <MetricCard label="Avg. CPC"       value={s ? fmtRp(s.cpc)            : '—'} sub="cost per click"       delay={200} />
        <MetricCard label="CPM"            value={s ? fmtRp(s.cpm)            : '—'} sub="per 1.000 impresi"    delay={240} />
        <MetricCard label="Link Clicks"    value={s ? fmtNum(linkClicks)      : '—'} sub="klik ke landing page" delay={280} />
        <MetricCard label="Pesan WA"       value={s ? fmtNum(wa)              : '—'}
          sub={wa > 0 ? fmtRp(spend/wa)+'/pesan' : 'tidak ada data'}
          highlight={wa > 0 ? 'var(--green)' : undefined} delay={320} />
        <MetricCard label="Add to Cart"    value={s ? fmtNum(atc)             : '—'}
          sub={atc > 0 ? fmtRp(spend/atc)+'/atc' : 'tidak ada data'} delay={360} />
        <MetricCard label="Purchase"       value={s ? fmtNum(purchase)        : '—'}
          sub={costPerPurch > 0 ? fmtRp(costPerPurch)+'/purchase' : 'tidak ada data'}
          highlight={purchase > 0 ? 'var(--navy)' : undefined} delay={400} />
        <MetricCard label="Purchase Value" value={s ? fmtRp(purchaseVal)      : '—'}
          sub={purchaseVal > 0 ? fmtRpFull(purchaseVal) : 'tidak ada data'} delay={440} />
        <MetricCard label="ROAS"           value={roas > 0 ? fmtRoas(roas)    : '—'}
          sub={roas >= 3 ? '✓ Bagus' : roas >= 1 ? '~ Impas' : roas > 0 ? '✗ Rugi' : 'tidak ada data'}
          highlight={roas >= 3 ? 'var(--green)' : roas >= 1 ? 'var(--amber)' : roas > 0 ? 'var(--red)' : undefined}
          delay={480} />
        {/* Profit card */}
        <div
          onClick={() => purchaseVal > 0 && setShowProfit(true)}
          style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '16px 18px',
            boxShadow: 'var(--shadow-sm)',
            animation: 'fadeUp 0.35s ease both', animationDelay: '520ms',
            cursor: purchaseVal > 0 ? 'pointer' : 'default',
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={e => { if (purchaseVal > 0) { e.currentTarget.style.borderColor = 'var(--navy)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)' } }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}
        >
          <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.7px', fontWeight: 600, marginBottom: 8 }}>
            Profit {purchaseVal > 0 ? <span style={{ color: 'var(--navy)', fontSize: 9 }}>▶ hitung</span> : ''}
          </div>
          <div style={{
            fontSize: 22, fontWeight: 700, letterSpacing: '-0.4px',
            color: profitValue === null ? 'var(--text3)' : profitValue > 0 ? 'var(--green)' : 'var(--red)',
          }}>
            {profitValue === null ? '—' : fmtRp(profitValue)}
          </div>
          {profitValue !== null && (
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 5, fontFamily: 'var(--font-mono)' }}>
              {profitValue > 0 ? 'untung' : 'rugi'} · HPP {fmtRp(profit.cogs)}
            </div>
          )}
        </div>
      </div>

      {/* Trend */}
      <Section title="Tren Harian" sub="Pilih metrik untuk dibandingkan — bisa lebih dari satu">
        <TrendChart data={data?.daily} />
      </Section>

      {/* Best performers */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
        <CampaignTable adsets={data?.adsets||[]} ads={data?.ads||[]} />
      </div>

      {showProfit && <ProfitModal purchaseValue={purchaseVal} onClose={r => { setShowProfit(false); if(r) setProfit(r) }} />}
    </div>
  )
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab]           = useState('meta')
  const [accounts, setAccounts] = useState(loadAccounts)

  const handleAccountsChange = updated => {
    setAccounts(updated); saveAccounts(updated)
  }

  const tabBtn = (key, label, icon) => (
    <button onClick={() => setTab(key)} style={{
      padding: '0 18px', height: '100%',
      borderBottom: `2.5px solid ${tab === key ? 'var(--navy)' : 'transparent'}`,
      background: 'transparent', border: 'none',
      borderBottom: tab === key ? '2.5px solid var(--navy)' : '2.5px solid transparent',
      fontSize: 13, fontWeight: tab === key ? 700 : 500,
      color: tab === key ? 'var(--navy)' : 'var(--text3)',
      display: 'flex', alignItems: 'center', gap: 6,
      transition: 'all 0.15s',
      whiteSpace: 'nowrap',
    }}>
      <span>{icon}</span> {label}
    </button>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div style={{
        borderBottom: '1px solid var(--border)',
        padding: '0 1.5rem',
        height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0,
        background: 'var(--bg2)', boxShadow: 'var(--shadow-sm)',
        zIndex: 50, gap: 12,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>M</span>
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Dashboard</span>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', height: '100%', flex: 1, justifyContent: 'center', gap: 0 }}>
          {tabBtn('meta',  'Meta Ads',       '📊')}
          {tabBtn('sales', 'Data Penjualan', '🛒')}
        </div>

        {/* Right: account selector + config (only on meta tab) */}
        {tab === 'meta' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <AccountSelector accounts={accounts} onChange={handleAccountsChange} />
            <ConfigPanel accounts={accounts} onAccountsChange={handleAccountsChange} />
          </div>
        )}
      </div>

      {/* ── Tab content ──────────────────────────────────────────────────── */}
      {tab === 'meta'  && <MetaAdsTab accounts={accounts} onAccountsChange={handleAccountsChange} />}
      {tab === 'sales' && <SalesTab />}
    </div>
  )
}
