import React, { useState, useEffect, useCallback } from 'react'
import MetricCard from './MetricCard'
import TrendChart from './TrendChart'
import CampaignTable from './CampaignTable'
import ConfigPanel, { AccountSelector, loadAccounts, saveAccounts } from './ConfigPanel'
import {
  fetchInsights,
  fmtRp, fmtRpFull, fmtNum, fmtPct, fmtFreq, fmtRoas,
  getWAMessages, getAddToCart, getLinkClicks, getPurchaseCount, getPurchaseValue,
} from './api'

const PERIODS = [
  { label: 'Hari Ini', days: 1 },
  { label: '7 Hari',   days: 7 },
  { label: '14 Hari',  days: 14 },
  { label: '30 Hari',  days: 30 },
]

// ─── Profit input modal ──────────────────────────────────────────────────────
function ProfitModal({ purchaseValue, onClose }) {
  const [cogs, setCogs] = useState(localStorage.getItem('mads_cogs') || '')
  const [adSpend, setAdSpend] = useState('')

  const handleApply = () => {
    localStorage.setItem('mads_cogs', cogs)
    onClose({ cogs: parseFloat(cogs) || 0, adSpend: parseFloat(adSpend) || 0 })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
      onClick={e => e.target === e.currentTarget && onClose(null)}>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 14, padding: '1.5rem', width: 380, maxWidth: '92vw' }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Hitung Profit</div>
        <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginBottom: 16 }}>
          Purchase Value: {fmtRpFull(purchaseValue)}
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 5 }}>HPP / COGS TOTAL (Rp)</label>
          <input type="number" value={cogs} onChange={e => setCogs(e.target.value)} placeholder="0"
            style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-mono)', boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 5 }}>AD SPEND (otomatis dari dashboard)</label>
          <input type="number" value={adSpend} onChange={e => setAdSpend(e.target.value)} placeholder="Kosongkan untuk pakai data live"
            style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: 'var(--text3)', outline: 'none', fontFamily: 'var(--font-mono)', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={() => onClose(null)} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 16px', fontSize: 13, color: 'var(--text2)', fontFamily: 'var(--font-body)' }}>Batal</button>
          <button onClick={handleApply} style={{ background: 'var(--accent2)', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, color: '#1a0f00', fontWeight: 600, fontFamily: 'var(--font-body)' }}>Hitung</button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [period, setPeriod]           = useState(14)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState(null)
  const [data, setData]               = useState(null)
  const [accounts, setAccounts]       = useState(loadAccounts)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [profit, setProfit]           = useState(null)
  const [showProfit, setShowProfit]   = useState(false)

  const activeAccounts = accounts.filter(a => a.active)

  const load = useCallback(async (accts, days) => {
    if (!accts.length) return
    setLoading(true)
    setError(null)
    try {
      const result = await fetchInsights(accts, days)
      setData(result)
      setLastUpdated(new Date())
      if (result.errors?.length) {
        setError('Partial: ' + result.errors.join('; '))
      }
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

  const handleAccountsChange = (updated) => {
    setAccounts(updated)
    saveAccounts(updated)
  }

  const s = data?.summary
  const wa          = s ? getWAMessages(s.actions) : 0
  const atc         = s ? getAddToCart(s.actions) : 0
  const linkClicks  = s ? getLinkClicks(s.actions) : 0
  const purchase    = s ? getPurchaseCount(s.actions) : 0
  const purchaseVal = s ? getPurchaseValue(s.action_values) : 0
  const spend       = s ? parseFloat(s.spend || 0) : 0
  const roas        = spend > 0 && purchaseVal > 0 ? purchaseVal / spend : 0
  const costPerPurchase = purchase > 0 ? spend / purchase : 0
  const freq        = s ? parseFloat(s.frequency || 0) : 0
  const freqAlert   = freq >= 3

  const profitValue = profit !== null
    ? purchaseVal - profit.cogs - (profit.adSpend > 0 ? profit.adSpend : spend)
    : null

  const statusColor = error
    ? (data ? 'var(--amber)' : 'var(--red)')
    : loading ? 'var(--amber)'
    : data ? 'var(--green)'
    : 'var(--text3)'

  const statusText = loading
    ? 'Memuat data...'
    : error
    ? error
    : data
    ? `Diperbarui ${lastUpdated?.toLocaleTimeString('id-ID')} · ${data.since} – ${data.until}`
    : activeAccounts.length === 0
    ? 'Tambah & pilih akun di atas untuk memulai'
    : 'Pilih akun aktif di dropdown'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Top bar */}
      <div style={{
        borderBottom: '1px solid var(--border)',
        padding: '0 1.5rem',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        background: 'rgba(10,10,10,0.92)',
        backdropFilter: 'blur(12px)',
        zIndex: 50,
        gap: 10,
      }}>
        {/* Left: title + account selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.3px', flexShrink: 0 }}>Meta Ads</span>
          <AccountSelector accounts={accounts} onChange={handleAccountsChange} />
        </div>

        {/* Right: period + refresh + config */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 3, background: 'var(--bg3)', borderRadius: 8, padding: 3 }}>
            {PERIODS.map(p => (
              <button key={p.days} onClick={() => setPeriod(p.days)} style={{
                padding: '5px 10px',
                borderRadius: 6,
                fontSize: 12,
                border: 'none',
                background: period === p.days ? 'var(--bg2)' : 'transparent',
                color: period === p.days ? 'var(--text)' : 'var(--text3)',
                fontFamily: 'var(--font-body)',
                fontWeight: period === p.days ? 500 : 400,
                transition: 'all 0.15s',
              }}>{p.label}</button>
            ))}
          </div>
          <button
            onClick={() => load(activeAccounts, period)}
            disabled={loading || !activeAccounts.length}
            style={{
              background: 'transparent',
              border: '1px solid var(--border2)',
              borderRadius: 8,
              padding: '6px 10px',
              fontSize: 14,
              color: 'var(--text2)',
              display: 'flex', alignItems: 'center',
              animation: loading ? 'spin 1s linear infinite' : 'none',
            }}
          >↻</button>
          <ConfigPanel accounts={accounts} onAccountsChange={handleAccountsChange} />
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '1.5rem 1.5rem 3rem' }}>
        {/* Status bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '9px 14px',
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          marginBottom: '1.5rem',
          fontSize: 12,
          fontFamily: 'var(--font-mono)',
          color: 'var(--text3)',
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
            background: statusColor,
            animation: loading ? 'pulse 1s infinite' : 'none',
          }} />
          <span style={{ color: error && !data ? 'var(--red)' : 'var(--text3)' }}>{statusText}</span>
          {data && activeAccounts.length > 1 && (
            <span style={{ marginLeft: 'auto', color: 'var(--accent2)' }}>
              {activeAccounts.length} akun digabung
            </span>
          )}
        </div>

        {/* Frequency alert */}
        {freqAlert && (
          <div style={{
            padding: '10px 16px',
            background: 'rgba(212,148,58,0.1)',
            border: '1px solid rgba(212,148,58,0.3)',
            borderRadius: 8,
            marginBottom: '1.5rem',
            fontSize: 13,
            color: 'var(--amber)',
            fontFamily: 'var(--font-mono)',
          }}>
            ⚠ Frequency {freq.toFixed(2)}x — audience mungkin mulai jenuh. Pertimbangkan refresh creative atau expand audience.
          </div>
        )}

        {/* ── Metric cards ──────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 8, marginBottom: '1.25rem' }}>
          {/* Row 1: Spend, Impressions, Reach, Frequency */}
          <MetricCard label="Total Spend"     value={s ? fmtRp(s.spend) : '—'}          sub="periode ini"            delay={0} />
          <MetricCard label="Impressions"     value={s ? fmtNum(s.impressions) : '—'}    sub="total tayangan"         delay={30} />
          <MetricCard label="Reach"           value={s ? fmtNum(s.reach) : '—'}          sub="akun unik"              delay={60} />
          <MetricCard label="Avg. Frequency"
            value={s ? freq.toFixed(2) + 'x' : '—'}
            sub="tayangan/orang"
            highlight={freqAlert ? 'var(--red)' : freq >= 2.5 ? 'var(--amber)' : undefined}
            delay={90}
          />

          {/* Row 2: CTR, CPC, CPM */}
          <MetricCard label="Avg. CTR"        value={s ? fmtPct(s.ctr) : '—'}            sub="click-through rate"     delay={120} />
          <MetricCard label="Avg. CPC"        value={s ? fmtRp(s.cpc) : '—'}             sub="cost per click"         delay={150} />
          <MetricCard label="CPM"             value={s ? fmtRp(s.cpm) : '—'}             sub="per 1.000 impresi"      delay={180} />
          <MetricCard label="Link Clicks"     value={s ? fmtNum(linkClicks) : '—'}       sub="klik ke landing page"   delay={210} />

          {/* Row 3: WA, ATC, Purchase, Purchase Value */}
          <MetricCard
            label="Pesan WA"
            value={s ? fmtNum(wa) : '—'}
            sub={wa > 0 && s ? fmtRp(spend / wa) + '/pesan' : 'tidak ada data'}
            highlight={wa > 0 ? 'var(--green)' : undefined}
            delay={240}
          />
          <MetricCard
            label="Add to Cart"
            value={s ? fmtNum(atc) : '—'}
            sub={atc > 0 && s ? fmtRp(spend / atc) + '/atc' : 'tidak ada data'}
            delay={270}
          />
          <MetricCard
            label="Purchase"
            value={s ? fmtNum(purchase) : '—'}
            sub={costPerPurchase > 0 ? fmtRp(costPerPurchase) + '/purchase' : 'tidak ada data'}
            highlight={purchase > 0 ? 'var(--accent2)' : undefined}
            delay={300}
          />
          <MetricCard
            label="Purchase Value"
            value={s ? fmtRp(purchaseVal) : '—'}
            sub={purchaseVal > 0 ? fmtRpFull(purchaseVal) : 'tidak ada data'}
            delay={330}
          />

          {/* Row 4: ROAS, Profit */}
          <MetricCard
            label="ROAS"
            value={roas > 0 ? fmtRoas(roas) : '—'}
            sub={roas > 0 ? (roas >= 3 ? '✓ Bagus' : roas >= 1 ? '~ Impas' : '✗ Rugi') : 'tidak ada data'}
            highlight={roas >= 3 ? 'var(--green)' : roas >= 1 ? 'var(--amber)' : roas > 0 ? 'var(--red)' : undefined}
            delay={360}
          />
          <div
            onClick={() => purchaseVal > 0 && setShowProfit(true)}
            style={{
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '16px 18px',
              animation: 'fadeUp 0.4s ease both',
              animationDelay: '390ms',
              cursor: purchaseVal > 0 ? 'pointer' : 'default',
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => purchaseVal > 0 && (e.currentTarget.style.borderColor = 'var(--border2)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 500, marginBottom: 8, fontFamily: 'var(--font-mono)' }}>
              Profit {purchaseVal > 0 ? '(klik hitung)' : ''}
            </div>
            <div style={{
              fontSize: 22, fontWeight: 600, lineHeight: 1.1, letterSpacing: '-0.5px',
              color: profitValue === null ? 'var(--text3)'
                : profitValue > 0 ? 'var(--green)'
                : 'var(--red)',
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
        <div style={{
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '1.25rem',
          marginBottom: '1rem',
        }}>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Tren Harian</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
              Pilih metrik untuk dibandingkan — bisa lebih dari satu
            </div>
          </div>
          <TrendChart data={data?.daily} />
        </div>

        {/* ── Campaign Performance ─────────────────────────────────────────── */}
        <div style={{
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          overflow: 'hidden',
        }}>
          <CampaignTable adsets={data?.adsets || []} ads={data?.ads || []} />
        </div>
      </div>

      {/* Profit modal */}
      {showProfit && (
        <ProfitModal
          purchaseValue={purchaseVal}
          onClose={result => {
            setShowProfit(false)
            if (result) setProfit(result)
          }}
        />
      )}
    </div>
  )
}
