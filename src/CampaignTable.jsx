import React from 'react'
import { fmtRp, fmtNum, fmtPct, fmtFreq, getWAMessages } from './api'

const TH = ({ children, right }) => (
  <th style={{
    textAlign: right ? 'right' : 'left',
    padding: '8px 12px',
    fontSize: 11,
    color: 'var(--text3)',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    borderBottom: '1px solid var(--border)',
    fontFamily: 'var(--font-mono)',
    whiteSpace: 'nowrap',
  }}>{children}</th>
)

const TD = ({ children, right, mono, color }) => (
  <td style={{
    padding: '11px 12px',
    fontSize: 13,
    color: color || 'var(--text)',
    textAlign: right ? 'right' : 'left',
    fontFamily: mono ? 'var(--font-mono)' : 'var(--font-body)',
    borderBottom: '1px solid var(--border)',
    whiteSpace: 'nowrap',
  }}>{children}</td>
)

export default function CampaignTable({ campaigns }) {
  if (!campaigns.length) return (
    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text3)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
      tidak ada data campaign
    </div>
  )

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <TH>Campaign</TH>
            <TH>Spend</TH>
            <TH right>Impresi</TH>
            <TH right>Reach</TH>
            <TH right>CTR</TH>
            <TH right>CPC</TH>
            <TH right>CPM</TH>
            <TH right>Freq.</TH>
            <TH right>Pesan WA</TH>
            <TH right>Cost/Pesan</TH>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c, i) => {
            const wa = getWAMessages(c.actions)
            const freq = parseFloat(c.frequency || 0)
            const freqColor = freq >= 3 ? 'var(--red)' : freq >= 2.5 ? 'var(--amber)' : 'var(--text)'
            const name = c.campaign_name || ('Campaign ' + c.campaign_id)
            const costPerWa = wa > 0 ? fmtRp(parseFloat(c.spend) / wa) : '—'

            return (
              <tr key={c.campaign_id || i} style={{ transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{
                  padding: '11px 12px',
                  fontSize: 13,
                  color: 'var(--text)',
                  maxWidth: 200,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  borderBottom: '1px solid var(--border)',
                }} title={name}>{name}</td>
                <TD mono>{fmtRp(c.spend)}</TD>
                <TD right mono>{fmtNum(c.impressions)}</TD>
                <TD right mono>{fmtNum(c.reach)}</TD>
                <TD right mono>{fmtPct(c.ctr)}</TD>
                <TD right mono>{fmtRp(c.cpc)}</TD>
                <TD right mono>{fmtRp(c.cpm)}</TD>
                <TD right mono color={freqColor}>{fmtFreq(c.frequency)}</TD>
                <TD right mono color={wa > 0 ? 'var(--accent2)' : 'var(--text3)'}>{fmtNum(wa)}</TD>
                <TD right mono>{costPerWa}</TD>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
