import React, { useState } from 'react'
import { fmtRp, fmtNum, fmtPct, fmtFreq, getWAMessages, getAddToCart, getLinkClicks, getPurchaseCount, getPurchaseValue } from './api'

const RANKS = [
  { key: 'spend',        label: 'Spend Terbanyak',       sort: (a, b) => b._spend - a._spend },
  { key: 'cpm_low',      label: 'CPM Terendah',          sort: (a, b) => (a._cpm || 99999) - (b._cpm || 99999) },
  { key: 'ctr_high',     label: 'CTR Tertinggi',         sort: (a, b) => b._ctr - a._ctr },
  { key: 'cpc_low',      label: 'CPC Terendah',          sort: (a, b) => (a._cpc || 99999) - (b._cpc || 99999) },
  { key: 'atc',          label: 'Add to Cart Terbanyak', sort: (a, b) => b._atc - a._atc },
  { key: 'cost_purchase',label: 'Purchase Termurah',     sort: (a, b) => (a._costPurchase || 999999) - (b._costPurchase || 999999), filter: r => r._purchase > 0 },
  { key: 'purchase',     label: 'Purchase Terbanyak',    sort: (a, b) => b._purchase - a._purchase },
  { key: 'wa',           label: 'Pesan WA Terbanyak',    sort: (a, b) => b._wa - a._wa },
]

function enrichRows(rows, isAdset) {
  return rows.map(r => {
    const spend = parseFloat(r.spend || 0)
    const purchase = getPurchaseCount(r.actions)
    return {
      ...r,
      _name: isAdset ? (r.adset_name || r.adset_id) : (r.ad_name || r.ad_id),
      _campaign: r.campaign_name || '',
      _spend: spend,
      _ctr: parseFloat(r.ctr || 0),
      _cpc: parseFloat(r.cpc || 0),
      _cpm: parseFloat(r.cpm || 0),
      _wa: getWAMessages(r.actions),
      _atc: getAddToCart(r.actions),
      _purchase: purchase,
      _costPurchase: purchase > 0 ? spend / purchase : null,
    }
  })
}

function RankCard({ rank, rows }) {
  const filtered = rank.filter ? rows.filter(rank.filter) : rows
  const top = [...filtered].sort(rank.sort).slice(0, 5)

  const getMetric = r => {
    switch (rank.key) {
      case 'spend':         return fmtRp(r._spend)
      case 'cpm_low':       return fmtRp(r._cpm)
      case 'ctr_high':      return fmtPct(r._ctr)
      case 'cpc_low':       return fmtRp(r._cpc)
      case 'atc':           return fmtNum(r._atc)
      case 'cost_purchase': return fmtRp(r._costPurchase)
      case 'purchase':      return fmtNum(r._purchase)
      case 'wa':            return fmtNum(r._wa)
    }
  }

  const rankColors = ['#1a3260', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd']

  return (
    <div style={{
      background: 'var(--bg2)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      overflow: 'hidden',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid var(--border)',
        fontSize: 11,
        fontWeight: 700,
        color: 'var(--navy)',
        textTransform: 'uppercase',
        letterSpacing: '0.6px',
        background: 'var(--navy-lt)',
      }}>
        {rank.label}
      </div>
      {top.length === 0 ? (
        <div style={{ padding: '16px 14px', fontSize: 12, color: 'var(--text3)' }}>Tidak ada data</div>
      ) : top.map((r, i) => (
        <div key={i} style={{
          padding: '9px 14px',
          display: 'flex', alignItems: 'center', gap: 10,
          borderBottom: i < top.length - 1 ? '1px solid var(--border)' : 'none',
          transition: 'background 0.1s',
        }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <span style={{
            fontSize: 11, fontWeight: 700,
            color: rankColors[i],
            width: 18, flexShrink: 0, fontFamily: 'var(--font-mono)',
          }}>#{i+1}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r._name}>
              {r._name}
            </div>
            {r._campaign && (
              <div style={{ fontSize: 10, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
                {r._campaign}
              </div>
            )}
          </div>
          <span style={{ fontSize: 13, color: 'var(--navy)', fontFamily: 'var(--font-mono)', fontWeight: 600, flexShrink: 0 }}>
            {getMetric(r)}
          </span>
        </div>
      ))}
    </div>
  )
}

function FilterBar({ campaigns, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {['', ...campaigns].map(c => (
        <button key={c} onClick={() => onChange(c)} style={{
          padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500,
          border: `1.5px solid ${value === c ? 'var(--navy)' : 'var(--border2)'}`,
          background: value === c ? 'var(--navy-lt)' : 'var(--bg3)',
          color: value === c ? 'var(--navy)' : 'var(--text3)',
          maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          transition: 'all 0.15s',
        }} title={c || 'Semua Campaign'}>
          {c || 'Semua Campaign'}
        </button>
      ))}
    </div>
  )
}

export default function CampaignTable({ adsets, ads }) {
  const [level, setLevel]           = useState('adset')
  const [campaignFilter, setFilter] = useState('')

  const isAdset = level === 'adset'
  const rows    = isAdset ? (adsets || []) : (ads || [])
  const allCampaigns = [...new Set(rows.map(r => r.campaign_name).filter(Boolean))].sort()
  const filtered = campaignFilter ? rows.filter(r => r.campaign_name === campaignFilter) : rows
  const enriched = enrichRows(filtered, isAdset)

  const tabStyle = active => ({
    padding: '5px 16px', borderRadius: 6, fontSize: 12, fontWeight: active ? 600 : 500,
    border: 'none',
    background: active ? 'var(--navy)' : 'transparent',
    color: active ? '#fff' : 'var(--text3)',
    transition: 'all 0.15s',
  })

  return (
    <div>
      <div style={{ padding: '1.25rem 1.25rem 1rem', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Best Performers</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
              Top 5 per kategori · {enriched.length} {isAdset ? 'ad set' : 'iklan'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 3, background: 'var(--bg3)', borderRadius: 8, padding: 3, border: '1px solid var(--border)' }}>
            <button onClick={() => setLevel('adset')} style={tabStyle(level === 'adset')}>Ad Set</button>
            <button onClick={() => setLevel('ad')}    style={tabStyle(level === 'ad')}>Ads</button>
          </div>
        </div>
        <FilterBar campaigns={allCampaigns} value={campaignFilter} onChange={setFilter} />
      </div>
      <div style={{ padding: '1rem 1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 10 }}>
        {RANKS.map(rank => <RankCard key={rank.key} rank={rank} rows={enriched} />)}
      </div>
    </div>
  )
}
