<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import Settings from '../components/Settings.vue'

const showSettings = ref(false)
const intervalText = ref('1')

interface LogEntry {
  text: string
  type: 'info' | 'error'
  id: number
}

const logs = ref<LogEntry[]>([])
let logIdCounter = 0
const logContainer = ref<HTMLElement | null>(null)

function addLog(text: string, type: 'info' | 'error' = 'info') {
  logs.value.push({ text, type, id: logIdCounter++ })
  if (logs.value.length > 200) logs.value.shift()
  nextTick(() => {
    if (logContainer.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight
    }
  })
}

onMounted(async () => {
  try {
    const saved = await (window as any).api.getSettings()
    if (saved?.intervalMinutes) intervalText.value = String(saved.intervalMinutes)
  } catch { /* use default */ }

  ;(window as any).api.onAppLog((log: { text: string; type: 'info' | 'error' }) => {
    addLog(log.text, log.type)
  })

  addLog('🚀 赛博监工已就绪，等待最新战况...')
})

const testRoast = (): void => {
  addLog('🎯 手动触发了一次立即审判...')
  ;(window as any).api.testRoast()
}
</script>

<template>
  <div class="app-layout">
    <!-- Left panel: controls -->
    <div class="main-container">
      <!-- Header -->
      <div class="header">
        <div class="icon-wrapper">
          <span class="icon-text">😈</span>
        </div>
        <h1 class="title">Roast Me AI</h1>
        <p class="subtitle">赛博监工已就位。乖乖干活，或者准备好挨骂。</p>
      </div>

      <!-- Status indicator -->
      <div class="status-bar">
        <span class="status-dot"></span>
        <span class="status-text">监控中... 每 {{ intervalText }} 分钟审视你一次</span>
      </div>

      <!-- Buttons -->
      <div class="btn-group">
        <button class="btn btn-settings" @click="showSettings = true">
          ⚙️ 设置
        </button>

        <button class="btn btn-test" @click="testRoast">
          🎯 立即审判我
        </button>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p>提示：关闭此窗口后，监工仍在后台运行。</p>
        <p>右键系统托盘图标可退出程序。</p>
      </div>
    </div>

    <!-- Right panel: logs -->
    <div class="log-panel">
      <div class="log-header">
        <span class="log-icon">📋</span>
        <span class="log-title">运行日志</span>
        <button class="log-clear" @click="logs = []" title="清空日志">✕</button>
      </div>
      <div class="log-body" ref="logContainer">
        <div
          v-if="logs.length === 0"
          class="log-empty"
        >暂无日志，等待监工上线...</div>
        <div
          v-for="log in logs"
          :key="log.id"
          class="log-entry"
          :class="log.type"
        >{{ log.text }}</div>
      </div>
    </div>

    <!-- Settings Modal -->
    <Settings v-model="showSettings" />
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
  background: linear-gradient(135deg, #0f0c29 0%, #1a1a2e 50%, #16213e 100%);
  font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
  color: #e0e0e0;
}

/* ===== Left panel ===== */
.main-container {
  width: 320px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  border-right: 1px solid rgba(255, 255, 255, 0.07);
}

.header {
  text-align: center;
  margin-bottom: 36px;
}

.icon-wrapper {
  width: 80px;
  height: 80px;
  margin: 0 auto 20px;
  border-radius: 50%;
  background: linear-gradient(135deg, #e74c3c, #f39c12);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 30px rgba(231, 76, 60, 0.4);
  animation: pulse 2s ease-in-out infinite;
}

.icon-text {
  font-size: 40px;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 20px rgba(231, 76, 60, 0.4); }
  50% { box-shadow: 0 0 40px rgba(231, 76, 60, 0.7); }
}

.title {
  font-size: 28px;
  font-weight: 800;
  background: linear-gradient(90deg, #e74c3c, #f39c12);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 8px;
}

.subtitle {
  font-size: 12px;
  color: #888;
  margin: 0;
  line-height: 1.5;
}

.status-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 8px 16px;
  margin-bottom: 32px;
  font-size: 12px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #2ecc71;
  flex-shrink: 0;
  animation: blink 1.5s ease-in-out infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.status-text {
  color: #aaa;
}

.btn-group {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
}

.btn {
  padding: 13px 20px;
  border-radius: 12px;
  border: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  color: white;
}

.btn-settings {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
}
.btn-settings:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
}

.btn-test {
  background: linear-gradient(135deg, #e74c3c, #c0392b);
  box-shadow: 0 4px 20px rgba(231, 76, 60, 0.4);
}
.btn-test:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 25px rgba(231, 76, 60, 0.6);
}
.btn-test:active {
  transform: translateY(0);
}

.footer {
  margin-top: 40px;
  text-align: center;
}
.footer p {
  font-size: 11px;
  color: #555;
  margin: 4px 0;
}

/* ===== Right panel: log ===== */
.log-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: rgba(0, 0, 0, 0.2);
}

.log-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  background: rgba(0, 0, 0, 0.15);
  flex-shrink: 0;
}

.log-icon {
  font-size: 15px;
}

.log-title {
  font-size: 13px;
  font-weight: 700;
  color: #ccc;
  flex: 1;
  letter-spacing: 1px;
}

.log-clear {
  background: none;
  border: none;
  color: #555;
  font-size: 13px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: color 0.2s;
}
.log-clear:hover {
  color: #e74c3c;
}

.log-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
  scroll-behavior: smooth;
}

.log-body::-webkit-scrollbar {
  width: 4px;
}
.log-body::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.log-empty {
  color: #444;
  font-size: 12px;
  text-align: center;
  margin-top: 40px;
}

.log-entry {
  font-size: 12px;
  line-height: 1.7;
  padding: 3px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  word-break: break-all;
  font-family: 'Consolas', 'Courier New', monospace;
}

.log-entry.info {
  color: #8abcdd;
}

.log-entry.error {
  color: #e74c3c;
}
</style>