// ============================================================
// META ADS → GOOGLE SHEET AUTO-SYNC
// Google Apps Script — jalankan di script.google.com
// ============================================================
//
// SETUP:
// 1. Buka script.google.com → New Project
// 2. Paste seluruh kode ini
// 3. Isi META_ACCESS_TOKEN dan AD_ACCOUNT_ID di bawah
// 4. Klik Run → authorizeScript (untuk grant permission)
// 5. Klik Triggers (jam) → Add Trigger:
//    - Function: dailySync
//    - Event source: Time-driven
//    - Type: Day timer
//    - Time: 7am-8am
// ============================================================

const META_ACCESS_TOKEN = 'GANTI_DENGAN_TOKEN_BARU_KAMU'
const AD_ACCOUNT_ID = 'act_896092819380688'
const SHEET_NAME_RAW = 'raw_data'
const SHEET_NAME_SUMMARY = 'summary'

// ---- MAIN TRIGGER (dipanggil setiap hari) ----
function dailySync() {
  const yesterday = getYesterdayDate()
  Logger.log('Syncing data for: ' + yesterday)

  try {
    const data = fetchMetaInsights(yesterday, yesterday)
    writeRawData(data.campaigns, yesterday)
    writeSummaryData(data.summary, yesterday)
    sendSuccessEmail(yesterday, data.summary)
    Logger.log('Sync sukses untuk ' + yesterday)
  } catch (e) {
    Logger.log('ERROR: ' + e.message)
    sendErrorEmail(e.message, yesterday)
  }
}

// ---- FETCH META ADS API ----
function fetchMetaInsights(since, until) {
  const timeRange = JSON.stringify({ since, until })
  const fields = 'spend,impressions,reach,clicks,ctr,cpc,cpm,frequency,actions'
  const base = `https://graph.facebook.com/v19.0/${AD_ACCOUNT_ID}/insights`
  const token = META_ACCESS_TOKEN

  // Summary (account level)
  const summaryUrl = `${base}?fields=${fields}&time_range=${encodeURIComponent(timeRange)}&access_token=${token}`
  const summaryRes = UrlFetchApp.fetch(summaryUrl)
  const summaryData = JSON.parse(summaryRes.getContentText())
  if (summaryData.error) throw new Error('Meta API: ' + summaryData.error.message)

  // Per campaign
  const campUrl = `${base}?fields=campaign_name,campaign_id,${fields}&level=campaign&time_range=${encodeURIComponent(timeRange)}&access_token=${token}`
  const campRes = UrlFetchApp.fetch(campUrl)
  const campData = JSON.parse(campRes.getContentText())

  return {
    summary: summaryData.data?.[0] || {},
    campaigns: campData.data || []
  }
}

// ---- WRITE RAW DATA (1 baris per campaign per hari) ----
function writeRawData(campaigns, date) {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  let sheet = ss.getSheetByName(SHEET_NAME_RAW)

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME_RAW)
    const headers = [
      'Date', 'Campaign ID', 'Campaign Name',
      'Spend (Rp)', 'Impressions', 'Reach', 'Clicks',
      'CTR (%)', 'CPC (Rp)', 'CPM (Rp)', 'Frequency',
      'Pesan WA', 'Cost/Pesan WA (Rp)'
    ]
    sheet.appendRow(headers)
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#1a1a2e').setFontColor('#e8d5b0')
    sheet.setFrozenRows(1)
  }

  campaigns.forEach(c => {
    const wa = getWACount(c.actions)
    const costPerWa = wa > 0 ? Math.round(parseFloat(c.spend) / wa) : ''
    sheet.appendRow([
      date,
      c.campaign_id || '',
      c.campaign_name || '',
      Math.round(parseFloat(c.spend || 0)),
      parseInt(c.impressions || 0),
      parseInt(c.reach || 0),
      parseInt(c.clicks || 0),
      parseFloat(c.ctr || 0).toFixed(2),
      Math.round(parseFloat(c.cpc || 0)),
      Math.round(parseFloat(c.cpm || 0)),
      parseFloat(c.frequency || 0).toFixed(2),
      wa,
      costPerWa
    ])
  })
}

// ---- WRITE SUMMARY (1 baris per hari, account level) ----
function writeSummaryData(summary, date) {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  let sheet = ss.getSheetByName(SHEET_NAME_SUMMARY)

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME_SUMMARY)
    const headers = [
      'Date', 'Total Spend (Rp)', 'Impressions', 'Reach',
      'Clicks', 'CTR (%)', 'CPC (Rp)', 'CPM (Rp)',
      'Frequency', 'Total Pesan WA', 'Cost/Pesan WA (Rp)'
    ]
    sheet.appendRow(headers)
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#1a1a2e').setFontColor('#e8d5b0')
    sheet.setFrozenRows(1)
  }

  const wa = getWACount(summary.actions)
  const costPerWa = wa > 0 ? Math.round(parseFloat(summary.spend) / wa) : ''

  sheet.appendRow([
    date,
    Math.round(parseFloat(summary.spend || 0)),
    parseInt(summary.impressions || 0),
    parseInt(summary.reach || 0),
    parseInt(summary.clicks || 0),
    parseFloat(summary.ctr || 0).toFixed(2),
    Math.round(parseFloat(summary.cpc || 0)),
    Math.round(parseFloat(summary.cpm || 0)),
    parseFloat(summary.frequency || 0).toFixed(2),
    wa,
    costPerWa
  ])
}

// ---- HELPER: hitung pesan WA dari actions array ----
function getWACount(actions) {
  if (!actions || !Array.isArray(actions)) return 0
  const wa = actions.find(a =>
    a.action_type === 'onsite_conversion.messaging_conversation_started_7d' ||
    a.action_type === 'onsite_conversion.total_messaging_connection' ||
    a.action_type === 'onsite_conversion.messaging_first_reply'
  )
  return wa ? parseInt(wa.value) : 0
}

// ---- HELPER: dapat tanggal kemarin ----
function getYesterdayDate() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return Utilities.formatDate(d, 'Asia/Jakarta', 'yyyy-MM-dd')
}

// ---- EMAIL NOTIFIKASI ----
function sendSuccessEmail(date, summary) {
  const email = Session.getActiveUser().getEmail()
  const wa = getWACount(summary.actions)
  const subject = `✅ Meta Ads Sync — ${date}`
  const body = `
Sync berhasil untuk tanggal ${date}

Ringkasan:
- Total Spend: Rp ${Math.round(parseFloat(summary.spend||0)).toLocaleString()}
- Impressions: ${parseInt(summary.impressions||0).toLocaleString()}
- CTR: ${parseFloat(summary.ctr||0).toFixed(2)}%
- CPC: Rp ${Math.round(parseFloat(summary.cpc||0)).toLocaleString()}
- Pesan WA: ${wa}

Data tersimpan di Google Sheet.
  `.trim()
  GmailApp.sendEmail(email, subject, body)
}

function sendErrorEmail(errorMsg, date) {
  const email = Session.getActiveUser().getEmail()
  GmailApp.sendEmail(email, `❌ Meta Ads Sync GAGAL — ${date}`, 'Error: ' + errorMsg)
}

// ---- MANUAL TRIGGER (untuk test atau backfill) ----
function manualSync() {
  const date = '2026-04-27' // ganti tanggal yang diinginkan
  const data = fetchMetaInsights(date, date)
  writeRawData(data.campaigns, date)
  writeSummaryData(data.summary, date)
  Logger.log('Manual sync selesai untuk ' + date)
}
