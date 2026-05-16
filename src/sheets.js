// ─── Google Sheets API (public read-only via API key) ────────────────────────
const SPREADSHEET_ID = '1xbPLtdk4COKLlaHr3RXVlqTdjD11lOnG-Gmn01bBHnM'
const BASE = 'https://sheets.googleapis.com/v4/spreadsheets'

const PRODUCTS = ['Jasa Video Iklan', 'Jasa Creative lain', 'Ebook Saham', 'Prodig Lain']

// ─── Tab name helpers ────────────────────────────────────────────────────────
const MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

function getTabName(year, month) {
  // month: 0-indexed
  return `Rekap_${MONTHS_ID[month]}_${year}`
}

export function getCurrentTabName() {
  const wib = new Date(Date.now() + 7 * 3600000)
  return getTabName(wib.getUTCFullYear(), wib.getUTCMonth())
}

export function getLastMonthTabName() {
  const wib = new Date(Date.now() + 7 * 3600000)
  let m = wib.getUTCMonth() - 1
  let y = wib.getUTCFullYear()
  if (m < 0) { m = 11; y-- }
  return getTabName(y, m)
}

// ─── WIB date helpers ────────────────────────────────────────────────────────
export function wibToday() {
  const wib = new Date(Date.now() + 7 * 3600000)
  return wib.toISOString().split('T')[0] // YYYY-MM-DD
}

export function wibYesterday() {
  const wib = new Date(Date.now() + 7 * 3600000 - 86400000)
  return wib.toISOString().split('T')[0]
}

export function wibDateRange(days) {
  const end = wibToday()
  const startMs = Date.now() + 7 * 3600000 - (days - 1) * 86400000
  const start = new Date(startMs).toISOString().split('T')[0]
  return { start, end }
}

export function wibThisMonth() {
  const wib = new Date(Date.now() + 7 * 3600000)
  const y = wib.getUTCFullYear()
  const m = String(wib.getUTCMonth() + 1).padStart(2, '0')
  return { start: `${y}-${m}-01`, end: wibToday() }
}

export function wibLastMonth() {
  const wib = new Date(Date.now() + 7 * 3600000)
  let m = wib.getUTCMonth() // 0-indexed, so this is last month's 1-indexed value
  let y = wib.getUTCFullYear()
  if (m === 0) { m = 12; y-- }
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const mm = String(m).padStart(2, '0')
  return { start: `${y}-${mm}-01`, end: `${y}-${mm}-${lastDay}` }
}

// ─── Parse sheet date strings to YYYY-MM-DD ──────────────────────────────────
function parseSheetDate(raw) {
  if (!raw) return null
  // formats: "1-May-2026", "01/05/2026", "2026-05-01"
  const months = { Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12,
    Mei:5,Agt:8,Okt:10,Nov:11,Des:12,Agu:8,Maret:3,April:4,Juni:6,Juli:7,Agustus:8,September:9,Oktober:10,Januari:1,Februari:2 }

  // "1-May-2026" or "01-May-2026"
  const m1 = raw.match(/^(\d{1,2})-([A-Za-z]+)-(\d{4})$/)
  if (m1) {
    const mo = months[m1[2]] || months[m1[2].substring(0,3)]
    if (mo) {
      const mm = String(mo).padStart(2,'0')
      const dd = String(parseInt(m1[1])).padStart(2,'0')
      return `${m1[3]}-${mm}-${dd}`
    }
  }
  // "01/05/2026" DD/MM/YYYY
  const m2 = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m2) return `${m2[3]}-${String(m2[2]).padStart(2,'0')}-${String(m2[1]).padStart(2,'0')}`

  // ISO already
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw

  return null
}

// ─── Fetch sheet data ────────────────────────────────────────────────────────
async function fetchSheetData(apiKey, tabName) {
  const range = encodeURIComponent(`${tabName}!A1:K500`)
  const url = `${BASE}/${SPREADSHEET_ID}/values/${range}?key=${apiKey}`
  const res = await fetch(url)
  const json = await res.json()
  if (json.error) throw new Error(json.error.message)
  return json.values || []
}

// ─── Parse rows into structured records ──────────────────────────────────────
function parseRows(values) {
  if (!values.length) return []
  // skip header row (row 0)
  const rows = values.slice(1)
  return rows.map(r => {
    const dateRaw = r[0] || ''
    const date = parseSheetDate(dateRaw)
    if (!date) return null
    return {
      date,
      produk:      r[1]  || '',
      omzet:       parseFloat((r[2]  || '0').toString().replace(/,/g,'')) || 0,
      spent:       parseFloat((r[3]  || '0').toString().replace(/,/g,'')) || 0,
      lead:        parseInt((r[4]   || '0').toString().replace(/,/g,''))  || 0,
      closing:     parseInt((r[5]   || '0').toString().replace(/,/g,''))  || 0,
      closingRate: r[6]  || '',
      cpl:         parseFloat((r[7]  || '0').toString().replace(/,/g,'')) || 0,
      cpp:         parseFloat((r[8]  || '0').toString().replace(/,/g,'')) || 0,
      biayaLain:   parseFloat((r[9]  || '0').toString().replace(/,/g,'')) || 0,
      net:         parseFloat((r[10] || '0').toString().replace(/,/g,'')) || 0,
    }
  }).filter(Boolean)
}

// ─── Filter rows by date range ────────────────────────────────────────────────
function filterByRange(rows, start, end) {
  return rows.filter(r => r.date >= start && r.date <= end)
}

// ─── Aggregate rows ───────────────────────────────────────────────────────────
function aggregateRows(rows, includeBiayaLain = false) {
  const byProduct = {}
  PRODUCTS.forEach(p => {
    byProduct[p] = { omzet:0, spent:0, lead:0, closing:0, net:0, biayaLain:0, rows:[] }
  })

  for (const r of rows) {
    const p = byProduct[r.produk]
    if (!p) continue
    p.omzet     += r.omzet
    p.spent     += r.spent
    p.lead      += r.lead
    p.closing   += r.closing
    p.net       += r.net
    p.biayaLain += r.biayaLain
    p.rows.push(r)
  }

  // totals
  const total = { omzet:0, spent:0, lead:0, closing:0, net:0, biayaLain:0 }
  for (const p of PRODUCTS) {
    total.omzet     += byProduct[p].omzet
    total.spent     += byProduct[p].spent
    total.lead      += byProduct[p].lead
    total.closing   += byProduct[p].closing
    total.net       += byProduct[p].net
    total.biayaLain += byProduct[p].biayaLain
  }

  // if includeBiayaLain, subtract from net
  if (includeBiayaLain) {
    total.netAfterBiaya = total.net - total.biayaLain
    for (const p of PRODUCTS) {
      byProduct[p].netAfterBiaya = byProduct[p].net - byProduct[p].biayaLain
    }
  }

  // derived
  const derive = obj => ({
    ...obj,
    roi:          obj.spent > 0 ? ((obj.omzet / obj.spent) * 100).toFixed(1) : null,
    closingRate:  obj.lead  > 0 ? ((obj.closing / obj.lead) * 100).toFixed(1) : null,
    cpl:          obj.lead  > 0 ? obj.spent / obj.lead : null,
    cpp:          obj.closing > 0 ? obj.spent / obj.closing : null,
  })

  return {
    byProduct: Object.fromEntries(PRODUCTS.map(p => [p, derive(byProduct[p])])),
    total: derive(total),
    includeBiayaLain,
  }
}

// ─── Daily series for chart ───────────────────────────────────────────────────
export function buildDailySeries(rows) {
  const map = {}
  for (const r of rows) {
    if (!map[r.date]) map[r.date] = { date: r.date, omzet: 0, spent: 0, net: 0, lead: 0, closing: 0 }
    map[r.date].omzet   += r.omzet
    map[r.date].spent   += r.spent
    map[r.date].net     += r.net
    map[r.date].lead    += r.lead
    map[r.date].closing += r.closing
  }
  return Object.values(map).sort((a,b) => a.date.localeCompare(b.date))
}

// ─── Main fetch ───────────────────────────────────────────────────────────────
export async function fetchSalesData(apiKey, mode, customDate = null) {
  const wib = new Date(Date.now() + 7 * 3600000)
  const curYear  = wib.getUTCFullYear()
  const curMonth = wib.getUTCMonth()

  // determine which tabs to load
  const thisTab = getTabName(curYear, curMonth)
  const lastTab = (() => {
    let m = curMonth - 1, y = curYear
    if (m < 0) { m = 11; y-- }
    return getTabName(y, m)
  })()

  let tabsToLoad = [thisTab]
  if (mode === 'last_month') tabsToLoad = [lastTab]
  if (mode === '7day') {
    // might span two months
    const { start } = wibDateRange(7)
    const startMonth = new Date(start + 'T00:00:00Z').getUTCMonth()
    if (startMonth !== curMonth) tabsToLoad = [lastTab, thisTab]
  }

  // load tab(s)
  const allRows = []
  const errors = []
  for (const tab of tabsToLoad) {
    try {
      const values = await fetchSheetData(apiKey, tab)
      allRows.push(...parseRows(values))
    } catch(e) {
      errors.push(`Tab "${tab}": ${e.message}`)
    }
  }

  if (!allRows.length && errors.length) throw new Error(errors.join('; '))

  // date filter
  let start, end, includeBiayaLain = false

  switch (mode) {
    case 'today':
      start = end = wibToday(); break
    case 'yesterday':
      start = end = wibYesterday(); break
    case '7day': {
      const r = wibDateRange(7); start = r.start; end = r.end; break
    }
    case 'this_month': {
      const r = wibThisMonth(); start = r.start; end = r.end; includeBiayaLain = true; break
    }
    case 'last_month': {
      const r = wibLastMonth(); start = r.start; end = r.end; includeBiayaLain = true; break
    }
    case 'custom':
      start = end = customDate || wibToday(); break
    default:
      start = end = wibToday()
  }

  const filtered = filterByRange(allRows, start, end)
  const agg = aggregateRows(filtered, includeBiayaLain)
  const daily = buildDailySeries(filtered)

  return { ...agg, daily, start, end, mode, errors, totalRows: filtered.length }
}

export { PRODUCTS }
