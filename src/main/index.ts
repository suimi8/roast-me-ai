import { app, shell, BrowserWindow, ipcMain, screen, Tray, Menu, globalShortcut } from 'electron'
import { join } from 'path'
import { electronApp, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import screenshot from 'screenshot-desktop'
import dotenv from 'dotenv'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { dirname } from 'path'

dotenv.config()

// ============ Persistent Settings ============
interface ApiProfile {
  id: string
  name: string
  providerType: string
  apiKey: string
  apiUrl: string
  modelName: string
}

interface AppSettings {
  activeProfileId: string
  intervalMinutes: number
  profiles: ApiProfile[]
}

function makeDefaultSettings(): AppSettings {
  return { activeProfileId: '', intervalMinutes: 5, profiles: [] }
}

function getSettingsPath(): string {
  // If running via electron-builder portable executable, use current executing directory
  if (process.env.PORTABLE_EXECUTABLE_DIR) {
    return join(process.env.PORTABLE_EXECUTABLE_DIR, 'settings.json')
  }

  // Otherwise stick to user app data path
  const userDataPath = app.isReady()
    ? app.getPath('userData')
    : join(process.env.APPDATA || '', 'roast-me-ai')
  return join(userDataPath, 'settings.json')
}

function loadSettings(): AppSettings {
  try {
    const p = getSettingsPath()
    if (existsSync(p)) {
      const data = JSON.parse(readFileSync(p, 'utf-8'))
      // Migrate old single-profile format
      if (data.apiKey && !data.profiles) {
        const migrated: AppSettings = {
          activeProfileId: 'migrated-1',
          intervalMinutes: data.intervalMinutes || 5,
          profiles: [{
            id: 'migrated-1',
            name: '已迁移配置',
            providerType: data.providerType || 'openai',
            apiKey: data.apiKey,
            apiUrl: data.apiUrl || '',
            modelName: data.modelName || ''
          }]
        }
        saveSettingsToFile(migrated)
        console.log('[Roast] Migrated old settings to multi-profile format')
        return migrated
      }
      console.log('[Roast] Settings loaded from:', p)
      return { ...makeDefaultSettings(), ...data }
    }
  } catch (e) {
    console.error('[Roast] Failed to load settings:', e)
  }
  return makeDefaultSettings()
}

function saveSettingsToFile(s: AppSettings): void {
  try {
    const p = getSettingsPath()
    const dir = dirname(p)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    writeFileSync(p, JSON.stringify(s, null, 2), 'utf-8')
    console.log('[Roast] Settings saved to:', p)
  } catch (e) {
    console.error('[Roast] Failed to save settings:', e)
  }

}

function getActiveProfile(s: AppSettings): ApiProfile | null {
  return s.profiles.find(p => p.id === s.activeProfileId) || s.profiles[0] || null
}

// Fix Windows console UTF-8 encoding
if (process.platform === 'win32') {
  const { execSync } = require('child_process')
  try { execSync('chcp 65001', { stdio: 'ignore' }) } catch { /* ignore */ }
}

let mainWindow: BrowserWindow | null = null
let roastWindow: BrowserWindow | null = null
let tray: Tray | null = null
let captureInterval: ReturnType<typeof setInterval> | null = null
let currentIntervalMs = 60 * 1000

// --- Provider State ---
type ProviderType = 'openai' | 'anthropic' | 'codex'
let providerType: ProviderType = 'openai'
let openai: OpenAI | null = null
let anthropic: Anthropic | null = null
let aiReady = false
let currentModel = ''

// ============ Logger ============
function sendAppLog(msg: string, type: 'info' | 'error' = 'info') {
  const timestamp = new Date().toLocaleTimeString('zh-CN', { hour12: false })
  const logMsg = `[${timestamp}] ${type === 'error' ? '❌ ' : ''}${msg}`
  if (type === 'error') {
    console.error(logMsg)
  } else {
    console.log(logMsg)
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('app-log', { text: logMsg, type })
  }
}

const ROAST_PROMPT = `你是一个毒舌但有真才实学的赛博监工。请仔细分析这张屏幕截图，完成以下任务：

1. 精准识别用户正在做什么（具体到：在用什么软件、看什么网站、写什么代码、打什么游戏等）
2. 基于你看到的**具体内容**，给出一针见血的点评

要求：
- 如果在写代码：指出你看到的具体问题（如变量命名、逻辑结构、技术选型等）
- 如果在浏览网页：说出具体在看什么内容，并评价这个行为
- 如果在摸鱼：精确说出在摸什么鱼（哪个网站/游戏/视频）
- 如果在学习/工作：肯定但挑刺，指出可以改进的地方  
- 语气阴阳怪气、尖酸刻薄，但每句话必须有信息量，不许说空话套话
- 用中文输出一句话，40-80字，不要换行，不要引号`

function initProvider(type: string, key: string, url: string, model: string): boolean {
  try {
    const finalKey = key || 'dummy_key'
    if (type === 'anthropic') {
      providerType = 'anthropic'
      anthropic = new Anthropic({ apiKey: finalKey, baseURL: url })
      currentModel = model
    } else if (type === 'codex') {
      providerType = 'codex'
      openai = new OpenAI({ apiKey: finalKey, baseURL: url })
      currentModel = model
    } else {
      providerType = 'openai'
      openai = new OpenAI({ apiKey: finalKey, baseURL: url })
      currentModel = model
    }
    aiReady = true
    sendAppLog(`接口已初始化: ${providerType}, 模型: ${currentModel}`)
    return true
  } catch (e: any) {
    sendAppLog(`接口初始化失败: ${e.message}`, 'error')
    aiReady = false
    return false
  }
}

// Init from saved settings only
let globalSettings = loadSettings()
const activeProfile = getActiveProfile(globalSettings)
if (activeProfile) {
  initProvider(activeProfile.providerType, activeProfile.apiKey, activeProfile.apiUrl, activeProfile.modelName)
  if (globalSettings.intervalMinutes > 0) {
    currentIntervalMs = globalSettings.intervalMinutes * 60 * 1000
  }
} else {
  sendAppLog('未配置主接口，请在设置中配置。', 'error')
}

// ============ Roast Window ============
function createRoastWindow(message: string): void {
  if (roastWindow && !roastWindow.isDestroyed()) {
    roastWindow.webContents.send('show-roast', message)
    if (!roastWindow.isVisible()) roastWindow.showInactive()
    return
  }

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize
  const winWidth = 480
  const winHeight = 320

  roastWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x: width - winWidth - 20,
    y: height - winHeight - 20,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    roastWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/#/roast')
  } else {
    roastWindow.loadURL(`file://${join(__dirname, '../renderer/index.html')}#/roast`)
  }

  roastWindow.on('ready-to-show', () => {
    roastWindow?.webContents.send('show-roast', message)
    roastWindow?.showInactive()
  })

  roastWindow.on('closed', () => { roastWindow = null })
}

// ============ Settings Window ============
function createWindow(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.focus()
    return
  }

  mainWindow = new BrowserWindow({
    width: 900,
    height: 720,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => { mainWindow?.show() })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => { mainWindow = null })
}

// ============ Tray ============
function createTray(): void {
  tray = new Tray(icon)
  const contextMenu = Menu.buildFromTemplate([
    { label: '⚙️ 设置', click: () => createWindow() },
    { label: '🎯 立即审判', click: () => performScreenshotAndRoast() },
    { type: 'separator' },
    { label: '❌ 退出', click: () => app.quit() }
  ])
  tray.setToolTip('Roast Me AI - 赛博监工')
  tray.setContextMenu(contextMenu)
  tray.on('double-click', () => createWindow())
}

// ============ AI Call: OpenAI Chat Completions ============
async function callOpenAI(base64Image: string): Promise<string | null> {
  if (!openai) return null
  const response = await openai.chat.completions.create({
    model: currentModel,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: ROAST_PROMPT },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
        ]
      }
    ]
  })
  return response.choices[0].message.content
}

// ============ AI Call: Anthropic Messages ============
async function callAnthropic(base64Image: string): Promise<string | null> {
  if (!anthropic) return null
  const response = await anthropic.messages.create({
    model: currentModel,
    max_tokens: 256,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: base64Image
            }
          },
          { type: 'text', text: ROAST_PROMPT }
        ]
      }
    ]
  })
  const textBlock = response.content.find((b: any) => b.type === 'text')
  return textBlock ? (textBlock as any).text : null
}

// ============ AI Call: OpenAI Responses API (Codex) ============
async function callCodex(base64Image: string): Promise<string | null> {
  if (!openai) return null
  const response = await (openai as any).responses.create({
    model: currentModel,
    input: [
      {
        role: 'user',
        content: [
          { type: 'input_text', text: ROAST_PROMPT },
          {
            type: 'input_image',
            image_url: `data:image/jpeg;base64,${base64Image}`
          }
        ]
      }
    ]
  })
  // Responses API returns output array with output_text items
  if (response.output && Array.isArray(response.output)) {
    const textItem = response.output.find((item: any) => item.type === 'message')
    if (textItem?.content) {
      const textContent = textItem.content.find((c: any) => c.type === 'output_text')
      return textContent?.text || null
    }
  }
  // Fallback: some endpoints return output_text directly
  if (response.output_text) return response.output_text
  return null
}

// ============ Screenshot & Roast ============
let isRoasting = false
async function performScreenshotAndRoast(): Promise<void> {
  if (!aiReady) {
    sendAppLog('引擎未就绪，取消审判。', 'error')
    return
  }
  if (isRoasting) {
    sendAppLog('审判正在进行中，请勿频繁触发。', 'error')
    return
  }
  isRoasting = true

  try {
    sendAppLog('准备执行截图...')
    const imgBuffer = await screenshot({ format: 'jpg' })
    const base64Image = imgBuffer.toString('base64')
    sendAppLog(`截图成功，大小: ${Math.round(base64Image.length / 1024)}KB，开始请求AI (${providerType})...`)

    let roastText: string | null = null
    if (providerType === 'anthropic') {
      roastText = await callAnthropic(base64Image)
    } else if (providerType === 'codex') {
      roastText = await callCodex(base64Image)
    } else {
      roastText = await callOpenAI(base64Image)
    }

    sendAppLog(`审判完成！AI回复长度: ${roastText?.length || 0}字符`)
    if (roastText) createRoastWindow(roastText)

  } catch (error: any) {
    let errMsg = ''
    try {
      const body = error?.error || error?.body || error?.response?.data
      if (body && typeof body === 'object') {
        errMsg = body?.error?.message || body?.message || JSON.stringify(body)
      } else if (typeof error?.message === 'string') {
        const jsonMatch = error.message.match(/\{.*\}/s)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          errMsg = parsed?.error?.message || parsed?.message || error.message
        } else {
          errMsg = error.message
        }
      }
    } catch {
      errMsg = error?.message || String(error)
    }
    sendAppLog(`审判时崩溃: ${errMsg}`, 'error')
  } finally {
    isRoasting = false
  }
}

// ============ Watching Loop ============
function startWatching(intervalMs?: number): void {
  if (captureInterval) clearInterval(captureInterval)
  if (intervalMs) currentIntervalMs = intervalMs
  const mins = Math.round(currentIntervalMs / 60000)
  sendAppLog(`开启自动监工: 循环间隔已设定为 ${mins} 分钟一段。`)
  captureInterval = setInterval(() => performScreenshotAndRoast(), currentIntervalMs)
}

// ============ App Ready ============
app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.roast-me-ai')

  // IPC
  ipcMain.handle('save-settings', (_, s: AppSettings) => {
    globalSettings = s
    saveSettingsToFile(s)
    sendAppLog(`配置已保存，当前主接口: ${s.activeProfileId || '未设置'}`)
    // Re-init provider from new active profile
    const profile = getActiveProfile(s)
    if (profile) {
      initProvider(profile.providerType, profile.apiKey, profile.apiUrl, profile.modelName)
    }
    if (s.intervalMinutes && s.intervalMinutes > 0) {
      startWatching(s.intervalMinutes * 60 * 1000)
    }
    return true
  })

  ipcMain.handle('get-settings', () => {
    return globalSettings
  })

  ipcMain.handle('activate-profile', (_, profileId: string) => {
    globalSettings.activeProfileId = profileId
    saveSettingsToFile(globalSettings)
    const profile = getActiveProfile(globalSettings)
    if (profile) {
      initProvider(profile.providerType, profile.apiKey, profile.apiUrl, profile.modelName)
    }
    return true
  })

  ipcMain.handle('test-connection', async (_, s) => {
    try {
      console.log(`[Roast] Testing connection: ${s.providerType} @ ${s.apiUrl}`)
      const finalKey = s.apiKey || 'dummy_key'
      if (s.providerType === 'anthropic') {
        const client = new Anthropic({ apiKey: finalKey, baseURL: s.apiUrl })
        const res = await client.messages.create({
          model: s.modelName,
          max_tokens: 32,
          messages: [{ role: 'user', content: '请回复"连接成功"四个字' }]
        })
        const text = res.content.find((b: any) => b.type === 'text')
        return { success: true, message: (text as any)?.text || '✅' }
      } else if (s.providerType === 'codex') {
        const client = new OpenAI({ apiKey: finalKey, baseURL: s.apiUrl })
        const res = await (client as any).responses.create({
          model: s.modelName,
          input: '请回复"连接成功"四个字'
        })
        return { success: true, message: res.output_text || '✅' }
      } else {
        const client = new OpenAI({ apiKey: finalKey, baseURL: s.apiUrl })
        const res = await client.chat.completions.create({
          model: s.modelName,
          messages: [{ role: 'user', content: '请回复"连接成功"四个字' }],
          max_tokens: 32
        })
        return { success: true, message: res.choices[0].message.content || '✅' }
      }
    } catch (error: any) {
      let errMsg = error?.message || String(error)
      try {
        const body = error?.error
        if (body?.error?.message) errMsg = body.error.message
        else if (body?.message) errMsg = body.message
      } catch { /* ignore */ }
      console.error(`[Roast] Connection test failed: ${errMsg}`)
      return { success: false, message: errMsg }
    }
  })

  ipcMain.on('close-roast', () => {
    if (roastWindow && !roastWindow.isDestroyed()) {
      roastWindow.hide()
      const primaryDisplay = screen.getPrimaryDisplay()
      const { width, height } = primaryDisplay.workAreaSize
      roastWindow.setBounds({
        width: 480, height: 320,
        x: width - 480 - 20, y: height - 320 - 20
      })
    }
  })

  ipcMain.on('resize-roast-window', (_, size: { width: number, height: number }) => {
    if (roastWindow && !roastWindow.isDestroyed()) {
      const primaryDisplay = screen.getPrimaryDisplay()
      const { width, height } = primaryDisplay.workAreaSize
      roastWindow.setBounds({
        width: size.width,
        height: size.height,
        x: width - size.width - 20,
        y: height - size.height - 20
      })
    }
  })

  ipcMain.on('test-roast', () => performScreenshotAndRoast())

  createTray()
  createWindow()
  startWatching()

  // One-time initial roast on app launch
  setTimeout(() => performScreenshotAndRoast(), 3000)

  // Global shortcut: Alt+Win+Z to trigger roast
  const hotkey = 'Alt+Super+Z'
  const registered = globalShortcut.register(hotkey, () => {
    console.log('[Roast] Alt+Win+Z pressed — triggering roast!')
    performScreenshotAndRoast()
  })
  console.log(`[Roast] Hotkey bound: ${hotkey} (${registered ? '✅' : '❌'})`)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => { /* keep tray alive */ })
