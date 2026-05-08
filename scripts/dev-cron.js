#!/usr/bin/env node
// ローカル開発用 auto-broadcast cron（1分毎に実行）

const INTERVAL_MS = 60 * 1000
const URL = 'http://localhost:3000/api/cron/auto-broadcast'

async function run() {
  try {
    const res = await fetch(URL)
    const data = await res.json()
    const { scheduled, sent, skipped, cancelled, failed } = data
    if (sent > 0 || failed > 0) {
      console.log(`[cron] scheduled:${scheduled} sent:${sent} skipped:${skipped} cancelled:${cancelled} failed:${failed}`)
    }
  } catch {
    // サーバー起動前は無視
  }
}

// 起動30秒後に最初の実行（サーバー起動を待つ）
setTimeout(() => {
  run()
  setInterval(run, INTERVAL_MS)
}, 30_000)

console.log('[cron] dev-cron started (first run in 30s, then every 60s)')
