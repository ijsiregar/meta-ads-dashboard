import React, { useState, useEffect, useCallback } from 'react'
import MetricCard from './MetricCard'
import TrendChart from './TrendChart'
import CampaignTable from './CampaignTable'
import ConfigPanel, { AccountSelector, loadAccounts, saveAccounts } from './ConfigPanel'
import {
  fetchInsights,
  fmtRp, fmtRpFull, fmtNum, fmtPct, fmtRoas,
  getWAMessages, getAddToCart, getLinkClicks, getPurchaseCount, getPurchaseValue,
} from './api'

const PERIODS = [
  { label: 'Hari Ini', days: 1  },
  { label: '7 Hari',   days: 7  },
  { label: '14 Hari',  days: 14 },
  { label: '30 Hari',  days: 30 },
]

// ─── Section wrapper ─────────────────────────────────────────────────────────
function Section({ title, sub, children, action }) {
  return (
    <div style={{
      background: 'var(--bg2)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      overflow: 'hidden',
      boxShadow: 'var(--shadow-sm)',
      marginBottom: '1rem',
    }}>
      {(title || action) && (
        <div style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--bg2)',
        }}>
          <div>
            {title && <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{title}</div>}
            {sub   && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{sub}</div>}
          </div>
          {action}
        </div>
      )}
      <div style={{ padding: '1.25rem' }}>
        {children}
      </div>
    </div>
  )
}

// ─── Profit modal ─────────────────────────────────────────────────────────────
function ProfitModal({ purchaseValue, onClose }) {
  const [cogs, setCogs]         = useState(localStorage.getItem('mads_cogs') || '')
  const [adSpend, setAdSpend]   = useState('')

  const handleApply = () => {
    localStorage.setItem('mads_cogs', cogs)
    onClose({ cogs: parseFloat(cogs) || 0, adSpend: parseFloat(adSpend) || 0 })
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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,28,53,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
      onClick={e => e.target === e.currentTarget && onClose(null)}>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.75rem', width: 400, maxWidth: '92vw', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Hitung Profit</div>
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
          <button onClick={handleApply} style={{ background: 'var(--navy)', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, color: '#fff', fontWeight: 600 }}>Hitung</button>
        </div>
      </div>
    </div>
  )
}

// ─── Main App ────────────────────────────────────────────────────────────────
export default function App() {
  const [period, setPeriod]         = useState(14)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)
  const [data, setData]             = useState(null)
  const [accounts, setAccounts]     = useState(loadAccounts)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [profit, setProfit]         = useState(null)
  const [showProfit, setShowProfit] = useState(false)

  const activeAccounts = accounts.filter(a => a.active)

  const load = useCallback(async (accts, days) => {
    if (!accts.length) return
    setLoading(true); setError(null)
    try {
      const result = await fetchInsights(accts, days)
      setData(result); setLastUpdated(new Date())
      if (result.errors?.length) setError('Partial: ' + result.errors.join('; '))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeAccounts.length) load(activeAccounts, period)
    else setData(null)
  }, [period, JSON.stringify(activeAccounts)])

  const handleAccountsChange = updated => {
    setAccounts(updated); saveAccounts(updated)
  }

  const s            = data?.summary
  const spend        = s ? parseFloat(s.spend || 0) : 0
  const wa           = s ? getWAMessages(s.actions) : 0
  const atc          = s ? getAddToCart(s.actions) : 0
  const linkClicks   = s ? getLinkClicks(s.actions) : 0
  const purchase     = s ? getPurchaseCount(s.actions) : 0
  const purchaseVal  = s ? getPurchaseValue(s.action_values) : 0
  const roas         = spend > 0 && purchaseVal > 0 ? purchaseVal / spend : 0
  const costPerPurch = purchase > 0 ? spend / purchase : 0
  const freq         = s ? parseFloat(s.frequency || 0) : 0
  const freqAlert    = freq >= 3

  const profitValue  = profit !== null
    ? purchaseVal - profit.cogs - (profit.adSpend > 0 ? profit.adSpend : spend)
    : null

  // Status
  const statusDot = error && !data ? 'var(--red)'
    : loading ? 'var(--amber)'
    : data ? 'var(--green)'
    : 'var(--text3)'

  const statusMsg = loading ? 'Memuat data...'
    : error ? error
    : data ? `Diperbarui ${lastUpdated?.toLocaleTimeString('id-ID')} · ${data.since} – ${data.until}`
    : activeAccounts.length === 0 ? 'Tambah & pilih akun untuk memulai'
    : 'Pilih akun aktif di dropdown'

  // shared card style for profit
  const profitCardStyle = {
    background: 'var(--bg2)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '16px 18px',
    boxShadow: 'var(--shadow-sm)',
    animation: 'fadeUp 0.35s ease both',
    animationDelay: '390ms',
    cursor: purchaseVal > 0 ? 'pointer' : 'default',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div style={{
        borderBottom: '1px solid var(--border)',
        padding: '0 1.5rem',
        height: 58,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0,
        background: 'var(--bg2)',
        boxShadow: 'var(--shadow-sm)',
        zIndex: 50, gap: 12,
      }}>
        {/* Logo + selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 6,
              background: 'var(--navy)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>M</span>
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.2px' }}>
              Meta Ads
            </span>
          </div>
          <div style={{ width: 1, height: 20, background: 'var(--border2)' }} />
          <AccountSelector accounts={accounts} onChange={handleAccountsChange} />
        </div>

        {/* Right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {/* Period */}
          <div style={{
            display: 'flex', gap: 2,
            background: 'var(--bg3)', borderRadius: 8, padding: 3,
            border: '1px solid var(--border)',
          }}>
            {PERIODS.map(p => (
              <button key={p.days} onClick={() => setPeriod(p.days)} style={{
                padding: '4px 11px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                border: 'none',
                background: period === p.days ? 'var(--navy)' : 'transparent',
                color: period === p.days ? '#fff' : 'var(--text3)',
                transition: 'all 0.15s',
              }}>{p.label}</button>
            ))}
          </div>
          {/* Refresh */}
          <button
            onClick={() => load(activeAccounts, period)}
            disabled={loading || !activeAccounts.length}
            style={{
              background: 'var(--bg3)', border: '1px solid var(--border2)',
              borderRadius: 8, padding: '6px 10px', fontSize: 14,
              color: 'var(--text3)',
              animation: loading ? 'spin 1s linear infinite' : 'none',
              boxShadow: 'var(--shadow-sm)',
            }}
          >↻</button>
          <ConfigPanel accounts={accounts} onAccountsChange={handleAccountsChange} />
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '1.25rem 1.5rem 3rem' }}>

        {/* Status bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 14px',
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          marginBottom: '1.25rem',
          fontSize: 12, color: 'var(--text3)',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
            background: statusDot,
            animation: loading ? 'pulse 1s infinite' : 'none',
          }} />
          <span style={{ color: error && !data ? 'var(--red)' : 'var(--text3)' }}>{statusMsg}</span>
          {data && activeAccounts.length > 1 && (
            <span style={{ marginLeft: 'auto', color: 'var(--navy)', fontWeight: 600 }}>
              {activeAccounts.length} akun digabung
            </span>
          )}
        </div>

        {/* Frequency alert */}
        {freqAlert && (
          <div style={{
            padding: '10px 16px',
            background: 'var(--amber-bg)',
            border: '1px solid #f5d08a',
            borderRadius: 8, marginBottom: '1.25rem',
            fontSize: 13, color: 'var(--amber)', fontWeight: 500,
          }}>
            ⚠ Frequency {freq.toFixed(2)}x — audience mungkin mulai jenuh. Pertimbangkan refresh creative atau expand audience.
          </div>
        )}

        {/* ── Metric Cards ──────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 8, marginBottom: '1rem' }}>

          {/* Spend, Impressions, Reach, Frequency */}
          <MetricCard label="Total Spend"    value={s ? fmtRp(s.spend) : '—'}          sub="periode ini"            delay={0} />
          <MetricCard label="Impressions"    value={s ? fmtNum(s.impressions) : '—'}    sub="total tayangan"         delay={40} />
          <MetricCard label="Reach"          value={s ? fmtNum(s.reach) : '—'}          sub="akun unik"              delay={80} />
          <MetricCard
            label="Avg. Frequency"
            value={s ? freq.toFixed(2) + 'x' : '—'}
            sub="tayangan/orang"
            highlight={freqAlert ? 'var(--red)' : freq >= 2.5 ? 'var(--amber)' : undefined}
            delay={120}
          />

          {/* CTR, CPC, CPM, Link Clicks */}
          <MetricCard label="Avg. CTR"       value={s ? fmtPct(s.ctr) : '—'}            sub="click-through rate"    delay={160} />
          <MetricCard label="Avg. CPC"       value={s ? fmtRp(s.cpc) : '—'}             sub="cost per click"        delay={200} />
          <MetricCard label="CPM"            value={s ? fmtRp(s.cpm) : '—'}             sub="per 1.000 impresi"     delay={240} />
          <MetricCard label="Link Clicks"    value={s ? fmtNum(linkClicks) : '—'}       sub="klik ke landing page"  delay={280} />

          {/* WA, ATC, Purchase, Purchase Value */}
          <MetricCard
            label="Pesan WA"
            value={s ? fmtNum(wa) : '—'}
            sub={wa > 0 ? fmtRp(spend / wa) + '/pesan' : 'tidak ada data'}
            highlight={wa > 0 ? 'var(--green)' : undefined}
            delay={320}
          />
          <MetricCard
            label="Add to Cart"
            value={s ? fmtNum(atc) : '—'}
            sub={atc > 0 ? fmtRp(spend / atc) + '/atc' : 'tidak ada data'}
            delay={360}
          />
          <MetricCard
            label="Purchase"
            value={s ? fmtNum(purchase) : '—'}
            sub={costPerPurch > 0 ? fmtRp(costPerPurch) + '/purchase' : 'tidak ada data'}
            highlight={purchase > 0 ? 'var(--navy)' : undefined}
            delay={400}
          />
          <MetricCard
            label="Purchase Value"
            value={s ? fmtRp(purchaseVal) : '—'}
            sub={purchaseVal > 0 ? fmtRpFull(purchaseVal) : 'tidak ada data'}
            delay={440}
          />

          {/* ROAS, Profit */}
          <MetricCard
            label="ROAS"
            value={roas > 0 ? fmtRoas(roas) : '—'}
            sub={roas >= 3 ? '✓ Bagus' : roas >= 1 ? '~ Impas' : roas > 0 ? '✗ Rugi' : 'tidak ada data'}
            highlight={roas >= 3 ? 'var(--green)' : roas >= 1 ? 'var(--amber)' : roas > 0 ? 'var(--red)' : undefined}
            delay={480}
          />
          {/* Profit card */}
          <div
            onClick={() => purchaseVal > 0 && setShowProfit(true)}
            style={profitCardStyle}
            onMouseEnter={e => { if (purchaseVal > 0) { e.currentTarget.style.borderColor = 'var(--navy)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)' } }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}
          >
            <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.7px', fontWeight: 600, marginBottom: 8 }}>
              Profit {purchaseVal > 0 ? <span style={{ color: 'var(--navy)', fontSize: 9 }}>▶ hitung</span> : ''}
            </div>
            <div style={{
              fontSize: 22, fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.4px',
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

        {/* ── Trend Chart ──────────────────────────────────────────────────── */}
        <Section
          title="Tren Harian"
          sub="Pilih metrik untuk dibandingkan — bisa lebih dari satu"
        >
          <TrendChart data={data?.daily} />
        </Section>

        {/* ── Best Performers ──────────────────────────────────────────────── */}
        <div style={{
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <CampaignTable adsets={data?.adsets || []} ads={data?.ads || []} />
        </div>
      </div>

      {/* Profit modal */}
      {showProfit && (
        <ProfitModal purchaseValue={purchaseVal} onClose={result => { setShowProfit(false); if (result) setProfit(result) }} />
      )}
    </div>
  )
}
