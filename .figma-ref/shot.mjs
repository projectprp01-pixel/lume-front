// CDP screenshot helper — device-emulated shots of the guest app.
// Usage: node .figma-ref/shot.mjs <baseURL> <chromePort>
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'
import fs from 'node:fs'

const BASE = process.argv[2] || 'http://localhost:4177'
const PORT = process.argv[3] || '9333'
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = '.figma-ref/verify'
fs.mkdirSync(OUT, { recursive: true })

const shots = [
  { name: 'email-mobile', hash: '#/email', w: 390, h: 844, mobile: true },
  { name: 'splash-mobile', hash: '#/splash', w: 390, h: 844, mobile: true },
  { name: 'checkin-hub-mobile', hash: '#/checkin', w: 390, h: 844, mobile: true },
  // Click "Next" to reach the confirm step.
  { name: 'checkin-confirm-mobile', hash: '#/checkin', w: 390, h: 844, mobile: true, clickText: ['Next'] },
  // Click the guest row's edit to open the upload modal.
  { name: 'checkin-modal-mobile', hash: '#/checkin', w: 390, h: 844, mobile: true, clickSel: ['.guest-row'] },
  { name: 'checkin-addperson-mobile', hash: '#/checkin', w: 390, h: 844, mobile: true, clickSel: ['.checkin__add'] },
]

const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  '--hide-scrollbars',
  'about:blank',
], { stdio: 'ignore' })

async function cdp() {
  for (let i = 0; i < 30; i++) {
    try {
      const r = await fetch(`http://localhost:${PORT}/json`)
      const tabs = await r.json()
      const page = tabs.find((t) => t.type === 'page')
      if (page) return page.webSocketDebuggerUrl
    } catch {}
    await sleep(300)
  }
  throw new Error('Chrome DevTools not reachable')
}

const wsUrl = await cdp()
const ws = new WebSocket(wsUrl)
let id = 0
const pending = new Map()
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data)
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg.result); pending.delete(msg.id) }
}
const send = (method, params = {}) =>
  new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })

await new Promise((res) => (ws.onopen = res))
await send('Page.enable')

for (const s of shots) {
  await send('Emulation.setDeviceMetricsOverride', {
    width: s.w, height: s.h, deviceScaleFactor: 2, mobile: s.mobile,
  })
  // Full reload each time (same-hash navigation would not remount the app).
  await send('Page.navigate', { url: 'about:blank' })
  await sleep(250)
  await send('Page.navigate', { url: `${BASE}/${s.hash}` })
  await sleep(1400)
  for (const sel of s.clickSel || []) {
    await send('Runtime.evaluate', { expression: `document.querySelector(${JSON.stringify(sel)})?.click()` })
    await sleep(500)
  }
  for (const txt of s.clickText || []) {
    await send('Runtime.evaluate', {
      expression: `[...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(txt)})?.click()`,
    })
    await sleep(500)
  }
  const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
  fs.writeFileSync(`${OUT}/${s.name}.png`, Buffer.from(data, 'base64'))
  console.log('saved', s.name)
}

ws.close()
chrome.kill()
process.exit(0)
