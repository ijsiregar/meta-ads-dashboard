// ─── Google Sheets API (public read-only via API key) ────────────────────────

const BASE = 'https://sheets.googleapis.com/v4/spreadsheets'

// ─── Tab name helpers ────────────────────────────────────────────────────────
const MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

function getTabName(year, month) {
  return `Rekap_${MONTHS_ID[month]}_${year}`
}

// ─── WIB date helpers ────────────────────────────────────────────────────────
export function wibToday() {
  return new Date(Date.now() + 7 * 3600000).toISOString().split('T')[0]
}

export function wibYesterday() {
  return new Date(Date.now() + 7 * 3600000 - 86400000).toISOString().split('T')[0]
}

export function wibDateRange(days) {
  const end = wibToday()
  const start = new Date(Date.now() + 7 * 3600000 - (days - 1) * 86400000).toISOString().split('T')[0]
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
  let m = wib.getUTCMonth()
  let y = wib.getUTCFullYear()
  if (m === 0) { m = 12; y-- }
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const mm = String(m).padStart(2, '0')
  return { start: `${y}-${mm}-01`, end: `${y}-${mm}-${lastDay}` }
}

// ─── Parse sheet date strings to YYYY-MM-DD ──────────────────────────────────
function parseSheetDate(raw) {
  if (!raw || !raw.trim()) return null
  const s = raw.trim()
  const months = {
    Jan:1, Feb:2, Mar:3, Apr:4, May:5, Jun:6, Jul:7, Aug:8, Sep:9, Oct:10, Nov:11, Dec:12,
    Januari:1, Februari:2, Maret:3, April:4, Mei:5, Juni:6, Juli:7,
    Agustus:8, September:9, Oktober:10, November:11, Desember:12,
    Agt:8, Agu:8, Okt:10, Des:12,
  }
  // "1-May-2026" or "1-Mei-2026"
  const m1 = s.match(/^(\d{1,2})-([A-Za-z]+)-(\d{4})$/)
  if (m1) {
    const mo = months[m1[2]] || months[m1[2].charAt(0).toUpperCase() + m1[2].slice(1).toLowerCase()]
    if (mo) return `${m1[3]}-${String(mo).padStart(2,'0')}-${String(parseInt(m1[1])).padStart(2,'0')}`
  }
  // "01/05/2026" DD/MM/YYYY
  const m2 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m2) return `${m2[3]}-${String(m2[2]).padStart(2,'0')}-${String(m2[1]).padStart(2,'0')}`
  // ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  return null
}

// ─── Parse number from sheet cell (handle comma separators) ──────────────────
function parseNum(raw) {
  if (!raw && raw !== 0) return 0
  return parseFloat(raw.toString().replace(/,/g, '')) || 0
}

function parseInt2(raw) {
  if (!raw && raw !== 0) return 0
  return parseInt(raw.toString().replace(/,/g, '')) || 0
}

// ─── Fetch raw sheet values ───────────────────────────────────────────────────
async function fetchSheetData(apiKey, tabName, spreadsheetId) {
  const range = encodeURIComponent(`${tabName}!A1:K2000`)
  const url = `${BASE}/${spreadsheetId}/values/${range}?key=${apiKey}`
  const res = await fetch(url)
  const json = await res.json()
  if (json.error) throw new Error(json.error.message)
  return json.values || []
}

// ─── Parse rows — dynamic products, skip empty rows ──────────────────────────
function parseRows(values) {
  if (!values.length) return []
  const rows = values.slice(1) // skip header
  const result = []

  for (const r of rows) {
    const dateRaw = r[0] || ''
    const produk  = (r[1] || '').trim()

    // skip row jika tanggal atau produk kosong
    if (!dateRaw.trim() || !produk) continue

    const date = parseSheetDate(dateRaw)
    if (!date) continue

    // skip baris yang semua angkanya 0 (baris placeholder kosong)
    const omzet     = parseNum(r[2])
    const spent     = parseNum(r[3])
    const lead      = parseInt2(r[4])
    const closing   = parseInt2(r[5])
    const biayaLain = parseNum(r[9])
    const net       = parseNum(r[10])

    if (omzet === 0 && spent === 0 && lead === 0 && closing === 0 && net === 0) continue

    result.push({
      date, produk, omzet, spent, lead, closing,
      biayaLain, net,
      cpl: parseNum(r[7]),
      cpp: parseNum(r[8]),
    })
  }

  return result
}

// ─── Aggregate — produk dibaca dinamis dari data ──────────────────────────────
function aggregateRows(rows, includeBiayaLain = false) {
  // kumpulkan produk unik, urut sesuai kemunculan pertama
  const productOrder = []
  const seen = new Set()
  for (const r of rows) {
    if (r.produk && !seen.has(r.produk)) {
      productOrder.push(r.produk)
      seen.add(r.produk)
    }
  }

  // init per produk
  const byProduct = {}
  for (const p of productOrder) {
    byProduct[p] = { omzet:0, spent:0, lead:0, closing:0, net:0, biayaLain:0 }
  }

  // akumulasi
  for (const r of rows) {
    if (!byProduct[r.produk]) continue
    byProduct[r.produk].omzet     += r.omzet
    byProduct[r.produk].spent     += r.spent
    byProduct[r.produk].lead      += r.lead
    byProduct[r.produk].closing   += r.closing
    byProduct[r.produk].net       += r.net
    byProduct[r.produk].biayaLain += r.biayaLain
  }

  // total
  const total = { omzet:0, spent:0, lead:0, closing:0, net:0, biayaLain:0 }
  for (const p of productOrder) {
    total.omzet     += byProduct[p].omzet
    total.spent     += byProduct[p].spent
    total.lead      += byProduct[p].lead
    total.closing   += byProduct[p].closing
    total.net       += byProduct[p].net
    total.biayaLain += byProduct[p].biayaLain
  }

  // biaya lain sebagai pengurang
  if (includeBiayaLain) {
    total.netAfterBiaya = total.net - total.biayaLain
    for (const p of productOrder) {
      byProduct[p].netAfterBiaya = byProduct[p].net - byProduct[p].biayaLain
    }
  }

  // derived metrics
  const derive = obj => ({
    ...obj,
    roi:         obj.spent > 0 ? ((obj.omzet / obj.spent) * 100).toFixed(1) : null,
    closingRate: obj.lead  > 0 ? ((obj.closing / obj.lead) * 100).toFixed(1) : null,
    cpl:         obj.lead  > 0 ? obj.spent / obj.lead : null,
    cpp:         obj.closing > 0 ? obj.spent / obj.closing : null,
  })

  return {
    products: productOrder,                                          // ← dinamis
    byProduct: Object.fromEntries(productOrder.map(p => [p, derive(byProduct[p])])),
    total: derive(total),
    includeBiayaLain,
  }
}

// ─── Daily series ─────────────────────────────────────────────────────────────
export function buildDailySeries(rows) {
  const map = {}
  for (const r of rows) {
    if (!map[r.date]) map[r.date] = { date:r.date, omzet:0, spent:0, net:0, lead:0, closing:0, byProduct:{} }
    map[r.date].omzet   += r.omzet
    map[r.date].spent   += r.spent
    map[r.date].net     += r.net
    map[r.date].lead    += r.lead
    map[r.date].closing += r.closing
    if (!map[r.date].byProduct[r.produk]) {
      map[r.date].byProduct[r.produk] = { omzet:0, spent:0, net:0, lead:0, closing:0 }
    }
    map[r.date].byProduct[r.produk].omzet   += r.omzet
    map[r.date].byProduct[r.produk].spent   += r.spent
    map[r.date].byProduct[r.produk].net     += r.net
    map[r.date].byProduct[r.produk].lead    += r.lead
    map[r.date].byProduct[r.produk].closing += r.closing
  }
  return Object.values(map).sort((a,b) => a.date.localeCompare(b.date))
}

// ─── Determine which tabs to load based on date range ────────────────────────
function getTabsForRange(start, end) {
  const wib = new Date(Date.now() + 7 * 3600000)
  const curYear  = wib.getUTCFullYear()
  const curMonth = wib.getUTCMonth()

  const startDate = new Date(start + 'T00:00:00Z')
  const endDate   = new Date(end   + 'T00:00:00Z')

  const tabs = new Set()
  // iterate month by month from start to end
  let y = startDate.getUTCFullYear()
  let m = startDate.getUTCMonth()
  while (y < endDate.getUTCFullYear() || (y === endDate.getUTCFullYear() && m <= endDate.getUTCMonth())) {
    tabs.add(getTabName(y, m))
    m++
    if (m > 11) { m = 0; y++ }
  }
  return [...tabs]
}

// ─── Main fetch ───────────────────────────────────────────────────────────────
export async function fetchSalesData(apiKey, mode, customDate = null, spreadsheetId = null) {
  // 1. determine date range
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

  // 2. determine tabs to load (otomatis handle lintas bulan)
  const tabsToLoad = getTabsForRange(start, end)

  // 3. fetch semua tab secara paralel
  const allRows = []
  const errors  = []
  await Promise.all(tabsToLoad.map(async tab => {
    try {
      const values = await fetchSheetData(apiKey, tab, spreadsheetId)
      allRows.push(...parseRows(values))
    } catch(e) {
      // tab belum ada = wajar, bukan error fatal
      if (!e.message.includes('Unable to parse range') && !e.message.includes('not found')) {
        errors.push(`Tab "${tab}": ${e.message}`)
      }
    }
  }))

  if (!allRows.length && errors.length) throw new Error(errors.join('; '))

  // 4. filter by date range
  const filtered = allRows.filter(r => r.date >= start && r.date <= end)

  // 5. aggregate (produk dinamis)
  const agg   = aggregateRows(filtered, includeBiayaLain)
  const daily = buildDailySeries(filtered)

  return { ...agg, daily, start, end, mode, errors, totalRows: filtered.length }
}
