import React, { useState } from 'react'
import { fmtRp, fmtNum, fmtPct, fmtFreq, fmtRoas, getWAMessages, getAddToCart, getLinkClicks, getPurchaseCount, getPurchaseValue } from './api'

// ─── Rank categories ────────────────────────────────────────────────────────
const RANKS = [
  { key: 'spend',       label: 'Spend Terbanyak',     sort: (a, b) => b._spend - a._spend },
  { key: 'cpm_low',     label: 'CPM Terendah',        sort: (a, b) => (a._cpm || 99999) - (b._cpm || 99999) },
  { key: 'ctr_high',    label: 'CTR Tertinggi',       sort: (a, b) => b._ctr - a._ctr },
  { key: 'cpc_low',     label: 'CPC Terendah',        sort: (a, b) => (a._cpc || 99999) - (b._cpc || 99999) },
  { key: 'atc',         label: 'Add to Cart Terbanyak', sort: (a, b) => b._atc - a._atc },
  { key: 'cost_purchase', label: 'Purchase Termurah', sort: (a, b) => (a._costPurchase || 999999) - (b._costPurchase || 999999), filter: r => r._purchase > 0 },
  { key: 'purchase',    label: 'Purchase Terbanyak',  sort: (a, b) => b._purchase - a._purchase },
  { key: 'wa',          label: 'Pesan WA Terbanyak',  sort: (a, b) => b._wa - a._wa },
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
      _impressions: parseFloat(r.impressions || 0),
      _reach: parseFloat(r.reach || 0),
      _ctr: parseFloat(r.ctr || 0),
      _cpc: parseFloat(r.cpc || 0),
      _cpm: parseFloat(r.cpm || 0),
      _freq: parseFloat(r.frequency || 0),
      _wa: getWAMessages(r.actions),
      _atc: getAddToCart(r.actions),
      _lc: getLinkClicks(r.actions),
      _purchase: purchase,
      _purchaseValue: getPurchaseValue(r.action_values),
      _costPurchase: purchase > 0 ? spend / purchase : null,
    }
  })
}

// ─── Single rank card ────────────────────────────────────────────────────────
function RankCard({ rank, rows }) {
  const filtered = rank.filter ? rows.filter(rank.filter) : rows
  const sorted = [...filtered].sort(rank.sort)
  const top = sorted.slice(0, 5)

  return (
    <div style={{
      background: 'var(--bg3)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid var(--border)',
        fontSize: 11,
        color: 'var(--accent2)',
        fontFamily: 'var(--font-mono)',
        textTransform: 'uppercase',
        letterSpacing: '0.6px',
        fontWeight: 500,
      }}>
        {rank.label}
      </div>
      {top.length === 0 ? (
        <div style={{ padding: '16px 14px', fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
          tidak ada data
        </div>
      ) : top.map((r, i) => {
        let metric = ''
        switch (rank.key) {
          case 'spend':        metric = fmtRp(r._spend); break
          case 'cpm_low':      metric = fmtRp(r._cpm); break
          case 'ctr_high':     metric = fmtPct(r._ctr); break
          case 'cpc_low':      metric = fmtRp(r._cpc); break
          case 'atc':          metric = fmtNum(r._atc); break
          case 'cost_purchase':metric = fmtRp(r._costPurchase); break
          case 'purchase':     metric = fmtNum(r._purchase); break
          case 'wa':           metric = fmtNum(r._wa); break
        }
        return (
          <div key={i} style={{
            padding: '9px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            borderBottom: i < top.length - 1 ? '1px solid var(--border)' : 'none',
          }}>
            <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)', width: 16, flexShrink: 0 }}>
              #{i + 1}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r._name}>
                {r._name}
              </div>
              {r._campaign && (
                <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }} title={r._campaign}>
                  {r._campaign}
                </div>
              )}
            </div>
            <span style={{ fontSize: 13, color: 'var(--accent)', fontFamily: 'var(--font-mono)', flexShrink: 0, fontWeight: 600 }}>
              {metric}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Level Tabs + Filter ─────────────────────────────────────────────────────
function FilterBar({ campaigns, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      <button
        onClick={() => onChange('')}
        style={{
          padding: '4px 10px', borderRadius: 6, fontSize: 11,
          border: '1px solid ' + (value === '' ? 'var(--accent2)' : 'var(--border)'),
          background: value === '' ? 'rgba(196,169,110,0.12)' : 'transparent',
          color: value === '' ? 'var(--accent2)' : 'var(--text3)',
          fontFamily: 'var(--font-mono)',
        }}
      >Semua Campaign</button>
      {campaigns.map(c => (
        <button
          key={c}
          onClick={() => onChange(c)}
          style={{
            padding: '4px 10px', borderRadius: 6, fontSize: 11,
            border: '1px solid ' + (value === c ? 'var(--accent2)' : 'var(--border)'),
            background: value === c ? 'rgba(196,169,110,0.12)' : 'transparent',
            color: value === c ? 'var(--accent2)' : 'var(--text3)',
            fontFamily: 'var(--font-mono)',
            maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}
          title={c}
        >{c}</button>
      ))}
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function CampaignTable({ adsets, ads }) {
  const [level, setLevel] = useState('adset')
  const [campaignFilter, setCampaignFilter] = useState('')

  const isAdset = level === 'adset'
  const rows = isAdset ? (adsets || []) : (ads || [])

  const allCampaigns = [...new Set(rows.map(r => r.campaign_name).filter(Boolean))].sort()

  const filtered = campaignFilter
    ? rows.filter(r => r.campaign_name === campaignFilter)
    : rows

  const enriched = enrichRows(filtered, isAdset)

  const tabStyle = (active) => ({
    padding: '6px 16px',
    borderRadius: 6,
    fontSize: 12,
    border: 'none',
    background: active ? 'var(--bg2)' : 'transparent',
    color: active ? 'var(--text)' : 'var(--text3)',
    fontFamily: 'var(--font-body)',
    fontWeight: active ? 500 : 400,
    transition: 'all 0.15s',
  })

  return (
    <div>
      {/* Header */}
      <div style={{ padding: '1.25rem 1.25rem 1rem', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Best Performers</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
              Top 5 per kategori · {enriched.length} {isAdset ? 'ad set' : 'iklan'}
            </div>
          </div>
          {/* Level tabs */}
          <div style={{ display: 'flex', gap: 3, background: 'var(--bg3)', borderRadius: 8, padding: 3 }}>
            <button onClick={() => setLevel('adset')} style={tabStyle(level === 'adset')}>Ad Set</button>
            <button onClick={() => setLevel('ad')} style={tabStyle(level === 'ad')}>Ads</button>
          </div>
        </div>
        {/* Campaign filter */}
        <FilterBar campaigns={allCampaigns} value={campaignFilter} onChange={setCampaignFilter} />
      </div>

      {/* Rank cards grid */}
      <div style={{ padding: '1rem 1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
        {RANKS.map(rank => (
          <RankCard key={rank.key} rank={rank} rows={enriched} />
        ))}
      </div>
    </div>
  )
}
