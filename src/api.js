const BASE = 'https://graph.facebook.com/v19.0'
const FIELDS = 'spend,impressions,reach,clicks,ctr,cpc,cpm,frequency,actions'

export function getDateRange(days) {
  const end = new Date()
  end.setDate(end.getDate() - 1)
  const start = new Date(end)
  start.setDate(start.getDate() - (days - 1))
  const fmt = d => d.toISOString().split('T')[0]
  return { since: fmt(start), until: fmt(end) }
}

export function getWAMessages(actions) {
  if (!actions) return 0
  const wa =
    actions.find(a => a.action_type === 'onsite_conversion.messaging_conversation_started_7d') ||
    actions.find(a => a.action_type === 'onsite_conversion.total_messaging_connection') ||
    actions.find(a => a.action_type === 'onsite_conversion.messaging_first_reply')
  return wa ? parseInt(wa.value) : 0
}

export async function fetchInsights(token, adAccountId, days) {
  const { since, until } = getDateRange(days)
  const timeRange = JSON.stringify({ since, until })

  const [summaryRes, campaignRes, dailyRes] = await Promise.all([
    fetch(`${BASE}/${adAccountId}/insights?fields=${FIELDS}&time_range=${timeRange}&access_token=${token}`),
    fetch(`${BASE}/${adAccountId}/insights?fields=campaign_name,campaign_id,campaign_status,${FIELDS}&level=campaign&time_range=${timeRange}&access_token=${token}`),
    fetch(`${BASE}/${adAccountId}/insights?fields=${FIELDS}&time_increment=1&time_range=${timeRange}&access_token=${token}`)
  ])

  const [summary, campaigns, daily] = await Promise.all([
    summaryRes.json(),
    campaignRes.json(),
    dailyRes.json()
  ])

  if (summary.error) throw new Error(summary.error.message)

  return {
    summary: summary.data?.[0] || null,
    campaigns: campaigns.data || [],
    daily: daily.data || [],
    since,
    until
  }
}

export function fmtRp(n) {
  if (!n && n !== 0) return '—'
  return 'Rp ' + Math.round(parseFloat(n)).toLocaleString('id-ID')
}

export function fmtNum(n) {
  if (!n && n !== 0) return '—'
  return Math.round(parseFloat(n)).toLocaleString('id-ID')
}

export function fmtPct(n) {
  if (!n && n !== 0) return '—'
  return parseFloat(n).toFixed(2) + '%'
}

export function fmtFreq(n) {
  if (!n) return '—'
  return parseFloat(n).toFixed(2) + 'x'
}
