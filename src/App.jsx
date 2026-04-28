import React, { useState, useEffect, useCallback } from 'react'
import MetricCard from './MetricCard'
import TrendChart from './TrendChart'
import CampaignTable from './CampaignTable'
import ConfigPanel from './ConfigPanel'
import { fetchInsights, fmtRp, fmtNum, fmtPct, getWAMessages } from './api'

const PERIODS = [
  { label: 'Hari Ini', days: 1 },
  { label: '7 Hari', days: 7 },
  { label: '14 Hari', days: 14 },
  { label: '30 Hari', days: 30 },
]

export default function App() {
  const [period, setPeriod] = useState(14)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)
  const [config, setConfig] = useState({
    token: localStorage.getItem('mads_token') || '',
    adact: localStorage.getItem('mads_adact') || '',
  })
  const [lastUpdated, setLastUpdated] = useState(null)

  const load = useCallback(async (token, adact, days) => {
    if (!token || !adact) return
    setLoading(true)
    setError(null)
    try {
      const result = await fetchInsights(token, adact, days)
      setData(result)
      setLastUpdated(new Date())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (config.token && config.adact) load(config.token, config.adact, period)
  }, [period, config])

  const handleConfigSave = (token, adact) => {
    setConfig({ token, adact })
  }

  const s = data?.summary
  const wa = s ? getWAMessages(s.actions) : 0
  const freq = s ? parseFloat(s.frequency || 0) : 0
  const freqAlert = freq >= 3

  const statusColor = error ? 'var(--red)' : loading ? 'var(--amber)' : data ? 'var(--green)' : 'var(--text3)'
  const statusText = error
    ? 'Error: ' + error
    : loading
    ? 'Memuat data...'
    : data
    ? `Diperbarui ${lastUpdated?.toLocaleTimeString('id-ID')} · ${data.since} – ${data.until}`
    : 'Masukkan konfigurasi untuk memulai'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Top bar */}
      <div style={{
        borderBottom: '1px solid var(--border)',
        padding: '0 2rem',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        background: 'rgba(10,10,10,0.9)',
        backdropFilter: 'blur(12px)',
        zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.3px' }}>
            Meta Ads
          </span>
          <span style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
            Dashboard
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Period tabs */}
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg3)', borderRadius: 8, padding: 3 }}>
            {PERIODS.map(p => (
              <button key={p.days} onClick={() => setPeriod(p.days)} style={{
                padding: '5px 12px',
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
          {/* Refresh */}
          <button onClick={() => load(config.token, config.adact, period)} style={{
            background: 'transparent',
            border: '1px solid var(--border2)',
            borderRadius: 8,
            padding: '6px 10px',
            fontSize: 14,
            color: 'var(--text2)',
            display: 'flex', alignItems: 'center',
            animation: loading ? 'spin 1s linear infinite' : 'none',
          }}>↻</button>
          <ConfigPanel onSave={handleConfigSave} />
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1.5rem 2rem 3rem' }}>
        {/* Status */}
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
            width: 7, height: 7, borderRadius: '50%',
            background: statusColor, flexShrink: 0,
            animation: loading ? 'pulse 1s infinite' : 'none',
          }} />
          <span style={{ color: error ? 'var(--red)' : 'var(--text3)' }}>{statusText}</span>
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

        {/* Metric cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: '1.5rem' }}>
          <MetricCard label="Total Spend" value={s ? fmtRp(s.spend) : '—'} sub="periode ini" delay={0} />
          <MetricCard label="Impressions" value={s ? fmtNum(s.impressions) : '—'} sub="total tayangan" delay={50} />
          <MetricCard label="Reach" value={s ? fmtNum(s.reach) : '—'} sub="orang unik" delay={100} />
          <MetricCard label="Avg. CTR" value={s ? fmtPct(s.ctr) : '—'} sub="click-through rate" delay={150} />
          <MetricCard label="Avg. CPC" value={s ? fmtRp(s.cpc) : '—'} sub="cost per click" delay={200} />
          <MetricCard label="CPM" value={s ? fmtRp(s.cpm) : '—'} sub="per 1000 impresi" delay={250} />
          <MetricCard
            label="Pesan WA"
            value={s ? fmtNum(wa) : '—'}
            sub={wa > 0 && s ? fmtRp(parseFloat(s.spend) / wa) + '/pesan' : 'tidak ada data'}
            highlight={wa > 0 ? 'var(--accent2)' : undefined}
            delay={300}
          />
          <MetricCard
            label="Avg. Frequency"
            value={s ? freq.toFixed(2) + 'x' : '—'}
            sub="tayangan/orang"
            highlight={freqAlert ? 'var(--red)' : freq >= 2.5 ? 'var(--amber)' : undefined}
            delay={350}
          />
        </div>

        {/* Trend chart */}
        <div style={{
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '1.25rem',
          marginBottom: '1rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Tren Harian</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                Spend &amp; CTR per hari
              </div>
            </div>
            <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 10, height: 3, background: 'rgba(196,169,110,0.7)', display: 'inline-block', borderRadius: 2 }} />
                Spend
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 10, height: 2, borderTop: '2px dashed #4a9e6b', display: 'inline-block' }} />
                CTR %
              </span>
            </div>
          </div>
          <TrendChart data={data?.daily} />
        </div>

        {/* Campaign table */}
        <div style={{
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          overflow: 'hidden',
          marginBottom: '1rem',
        }}>
          <div style={{ padding: '1.25rem 1.25rem 1rem', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Campaign Performance</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
              {data
                ? `${data.campaigns.length} campaign · ${data.since} — ${data.until}`
                : 'belum ada data'}
            </div>
          </div>
          <CampaignTable campaigns={data?.campaigns || []} />
        </div>

        {/* Google Sheet info */}
        <div style={{
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '1.25rem',
        }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Auto-sync Google Sheet</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginBottom: 16 }}>
            Lihat file <code style={{ color: 'var(--accent2)' }}>src/google-apps-script.js</code> di project untuk script lengkap
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            {[
              { step: '01', text: 'Buka script.google.com → New Project' },
              { step: '02', text: 'Paste isi file google-apps-script.js' },
              { step: '03', text: 'Isi token & ad account ID di variabel atas' },
              { step: '04', text: 'Set trigger harian jam 07.00 → fungsi dailySync' },
            ].map(item => (
              <div key={item.step} style={{ background: 'var(--bg3)', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: 'var(--accent2)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
                  STEP {item.step}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>{item.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
