const BASE = 'https://graph.facebook.com/v19.0'
const FIELDS = 'spend,impressions,reach,clicks,ctr,cpc,cpm,frequency,actions,action_values,cost_per_action_type'

// ─── Date range using WIB (UTC+7) ────────────────────────────────────────────
export function getDateRange(days) {
  const wibOffset = 7 * 60 * 60 * 1000
  const nowWIB = new Date(Date.now() + wibOffset)
  // zero out to start of today in WIB
  const todayWIB = new Date(nowWIB)
  todayWIB.setUTCHours(0, 0, 0, 0)

  const fmt = d => d.toISOString().split('T')[0]

  if (days === 1) {
    const since = fmt(todayWIB)
    return { since, until: since }
  }

  const end = new Date(todayWIB)
  const start = new Date(todayWIB)
  start.setUTCDate(start.getUTCDate() - (days - 1))
  return { since: fmt(start), until: fmt(end) }
}

// ─── Action helpers ──────────────────────────────────────────────────────────
export function getActionValue(actions, ...types) {
  if (!actions) return 0
  for (const type of types) {
    const a = actions.find(a => a.action_type === type)
    if (a) return parseInt(a.value) || 0
  }
  return 0
}

export function getActionFloat(arr, ...types) {
  if (!arr) return 0
  for (const type of types) {
    const a = arr.find(a => a.action_type === type)
    if (a) return parseFloat(a.value) || 0
  }
  return 0
}

export function getWAMessages(actions) {
  return getActionValue(
    actions,
    'onsite_conversion.messaging_conversation_started_7d',
    'onsite_conversion.total_messaging_connection',
    'onsite_conversion.messaging_first_reply'
  )
}

export function getAddToCart(actions) {
  return getActionValue(actions, 'offsite_conversion.fb_pixel_add_to_cart', 'add_to_cart')
}

export function getLinkClicks(actions) {
  return getActionValue(actions, 'link_click')
}

export function getPurchaseCount(actions) {
  return getActionValue(
    actions,
    'offsite_conversion.fb_pixel_purchase',
    'purchase',
    'omni_purchase'
  )
}

export function getPurchaseValue(action_values) {
  return getActionFloat(
    action_values,
    'offsite_conversion.fb_pixel_purchase',
    'purchase',
    'omni_purchase'
  )
}

// ─── Merge helpers ──────────────────────────────────────────────────────────
function mergeActions(a, b) {
  const map = {}
  for (const arr of [a, b]) {
    if (!arr) continue
    for (const item of arr) {
      map[item.action_type] = (map[item.action_type] || 0) + (parseFloat(item.value) || 0)
    }
  }
  return Object.entries(map).map(([action_type, value]) => ({ action_type, value: String(value) }))
}

function mergeSummaries(summaries) {
  const valid = summaries.filter(Boolean)
  if (!valid.length) return null
  return valid.reduce((acc, s) => {
    if (!acc) return { ...s, actions: [...(s.actions || [])], action_values: [...(s.action_values || [])] }
    const spend = parseFloat(acc.spend || 0) + parseFloat(s.spend || 0)
    const impressions = parseFloat(acc.impressions || 0) + parseFloat(s.impressions || 0)
    const reach = parseFloat(acc.reach || 0) + parseFloat(s.reach || 0)
    const clicks = parseFloat(acc.clicks || 0) + parseFloat(s.clicks || 0)
    return {
      spend: String(spend),
      impressions: String(impressions),
      reach: String(reach),
      clicks: String(clicks),
      frequency: reach > 0 ? String(impressions / reach) : '0',
      cpc: clicks > 0 ? String(spend / clicks) : '0',
      cpm: impressions > 0 ? String((spend / impressions) * 1000) : '0',
      ctr: impressions > 0 ? String((clicks / impressions) * 100) : '0',
      actions: mergeActions(acc.actions, s.actions),
      action_values: mergeActions(acc.action_values, s.action_values),
    }
  }, null)
}

function mergeDailyData(allDaily) {
  const map = {}
  for (const daily of allDaily) {
    for (const d of daily) {
      const key = d.date_start
      if (!map[key]) {
        map[key] = { ...d, actions: [...(d.actions || [])], action_values: [...(d.action_values || [])] }
      } else {
        const acc = map[key]
        const spend = parseFloat(acc.spend || 0) + parseFloat(d.spend || 0)
        const impressions = parseFloat(acc.impressions || 0) + parseFloat(d.impressions || 0)
        const reach = parseFloat(acc.reach || 0) + parseFloat(d.reach || 0)
        const clicks = parseFloat(acc.clicks || 0) + parseFloat(d.clicks || 0)
        map[key] = {
          ...acc,
          date_start: key,
          spend: String(spend),
          impressions: String(impressions),
          reach: String(reach),
          clicks: String(clicks),
          ctr: impressions > 0 ? String((clicks / impressions) * 100) : '0',
          cpc: clicks > 0 ? String(spend / clicks) : '0',
          cpm: impressions > 0 ? String((spend / impressions) * 1000) : '0',
          actions: mergeActions(acc.actions, d.actions),
          action_values: mergeActions(acc.action_values, d.action_values),
        }
      }
    }
  }
  return Object.values(map).sort((a, b) => a.date_start.localeCompare(b.date_start))
}

// ─── Single account fetch ────────────────────────────────────────────────────
async function fetchAccountInsights(token, adAccountId, days) {
  const { since, until } = getDateRange(days)
  const timeRange = JSON.stringify({ since, until })
  const base = `${BASE}/${adAccountId}/insights`

  const p = (extra = '') =>
    `${base}?fields=${FIELDS}${extra}&time_range=${timeRange}&access_token=${token}`

  const [sR, cR, asR, adR, dR] = await Promise.all([
    fetch(p()),
    fetch(p(',campaign_name,campaign_id') + '&level=campaign'),
    fetch(p(',campaign_name,adset_name,adset_id') + '&level=adset'),
    fetch(p(',campaign_name,adset_name,ad_name,ad_id') + '&level=ad'),
    fetch(p() + '&time_increment=1'),
  ])

  const [summary, campaigns, adsets, ads, daily] = await Promise.all([
    sR.json(), cR.json(), asR.json(), adR.json(), dR.json(),
  ])

  if (summary.error) throw new Error(`[${adAccountId}] ${summary.error.message}`)

  return {
    summary: summary.data?.[0] || null,
    campaigns: campaigns.data || [],
    adsets: adsets.data || [],
    ads: ads.data || [],
    daily: daily.data || [],
    since,
    until,
  }
}

// ─── Multi-account fetch ─────────────────────────────────────────────────────
export async function fetchInsights(accounts, days) {
  const results = await Promise.allSettled(
    accounts.map(a => fetchAccountInsights(a.token, a.adact, days))
  )

  const successful = results.filter(r => r.status === 'fulfilled').map(r => r.value)
  const errors = results.filter(r => r.status === 'rejected').map(r => r.reason?.message || 'Error')

  if (!successful.length) throw new Error(errors.join('; '))

  return {
    summary: mergeSummaries(successful.map(r => r.summary)),
    campaigns: successful.flatMap(r => r.campaigns),
    adsets: successful.flatMap(r => r.adsets),
    ads: successful.flatMap(r => r.ads),
    daily: mergeDailyData(successful.map(r => r.daily)),
    since: successful[0].since,
    until: successful[0].until,
    errors,
  }
}

// ─── Formatters ──────────────────────────────────────────────────────────────
export function fmtRp(n) {
  if (!n && n !== 0) return '—'
  const num = Math.round(parseFloat(n))
  if (num >= 1_000_000) return 'Rp ' + (num / 1_000_000).toFixed(1) + 'jt'
  if (num >= 1_000) return 'Rp ' + (num / 1_000).toFixed(0) + 'rb'
  return 'Rp ' + num.toLocaleString('id-ID')
}

export function fmtRpFull(n) {
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

export function fmtRoas(n) {
  if (!n || n === Infinity) return '—'
  return parseFloat(n).toFixed(2) + 'x'
}
