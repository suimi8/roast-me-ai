<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'

const props = defineProps(['modelValue'])
const emit = defineEmits(['update:modelValue'])

const selectedProvider = ref('bailian')
const apiKey = ref('')
const apiUrl = ref('')
const modelName = ref('')
const intervalMinutes = ref(5)
const customModel = ref(false)
const isTesting = ref(false)

interface ProviderDef {
  label: string
  icon: string
  type: 'openai' | 'anthropic' | 'codex'
  url: string
  models: string[]
  defaultModel: string
  keyHint: string
  keyUrl: string
}

const providers: Record<string, ProviderDef> = {
  bailian: {
    label: '阿里百炼',
    icon: '🟠',
    type: 'openai',
    url: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    models: [
      'qwen3.5-flash', 'qwen3.5-plus',
      'qwen3.5-flash-2026-02-23', 'qwen3.5-plus-2026-02-15',
      'qwen3.5-35b-a3b', 'qwen3.5-27b',
      'qwen3.5-122b-a10b', 'qwen3.5-397b-a17b',
      'qwen-plus', 'qwen-turbo', 'qwen-vl-plus',
    ],
    defaultModel: 'qwen3.5-flash',
    keyHint: '去阿里云百炼免费申请',
    keyUrl: 'https://dashscope.console.aliyun.com/api-key'
  },
  siliconflow: {
    label: '硅基流动',
    icon: '🟡',
    type: 'openai',
    url: 'https://api.siliconflow.cn/v1',
    models: [
      'Qwen/Qwen3-VL-32B-Instruct',
      'THUDM/GLM-4.5V-9B-Thinking',
      'Qwen/Qwen2.5-VL-32B-Instruct',
      'Pro/Qwen/Qwen2.5-VL-7B-Instruct',
      'THUDM/GLM-4.1V-9B-Thinking',
    ],
    defaultModel: 'Qwen/Qwen3-VL-32B-Instruct',
    keyHint: '去 SiliconFlow 获取 API Key',
    keyUrl: 'https://cloud.siliconflow.cn/account/ak'
  },
  openai: {
    label: 'OpenAI',
    icon: '🟢',
    type: 'openai',
    url: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
    defaultModel: 'gpt-4o',
    keyHint: '去 OpenAI Platform 获取 API Key',
    keyUrl: 'https://platform.openai.com/api-keys'
  },
  anthropic: {
    label: 'Anthropic (Claude)',
    icon: '🟣',
    type: 'anthropic',
    url: 'https://api.anthropic.com',
    models: ['claude-opus-4-5', 'claude-sonnet-4-5', 'claude-haiku-4-5'],
    defaultModel: 'claude-opus-4-5',
    keyHint: '去 Anthropic Console 获取 API Key',
    keyUrl: 'https://console.anthropic.com/settings/keys'
  },
  codex: {
    label: 'OpenAI Codex (Responses API)',
    icon: '🔵',
    type: 'codex',
    url: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'o3', 'o4-mini'],
    defaultModel: 'gpt-4o',
    keyHint: '去 OpenAI Platform 获取 API Key',
    keyUrl: 'https://platform.openai.com/api-keys'
  },
  custom: {
    label: '自定义接口',
    icon: '⚪',
    type: 'openai',
    url: '',
    models: [],
    defaultModel: '',
    keyHint: '如无需鉴权可留空',
    keyUrl: ''
  }
}

const providerKeys = Object.keys(providers)
const currentProvider = computed(() => providers[selectedProvider.value])
const modelOptions = computed(() => currentProvider.value?.models || [])

const savedProfiles = ref<Record<string, { apiKey: string, apiUrl: string, modelName: string }>>({})

function applyProfile(providerKey: string) {
  const p = providers[providerKey] || providers.custom
  const saved = savedProfiles.value[providerKey]
  if (saved) {
    apiKey.value = saved.apiKey || ''
    apiUrl.value = saved.apiUrl || p.url
    modelName.value = saved.modelName || p.defaultModel
  } else {
    apiKey.value = ''
    apiUrl.value = p.url
    modelName.value = p.defaultModel
  }
  customModel.value = providerKey === 'custom' || !p.models.includes(modelName.value)
}

async function loadSettingsFromDisk() {
  try {
    const saved = await (window as any).api.getSettings()
    if (saved) {
      intervalMinutes.value = saved.intervalMinutes || 5
      
      let activeId = 'siliconflow'

      if (saved.profiles && Array.isArray(saved.profiles)) {
        saved.profiles.forEach((p: any) => {
          let pid = p.id
          if (pid === 'migrated-1') {
            const match = Object.entries(providers).find(([k, pd]) =>
              k !== 'custom' && pd.url === p.apiUrl && pd.type === p.providerType
            )
            pid = match ? match[0] : 'custom'
          }
          savedProfiles.value[pid] = {
            apiKey: p.apiKey || '',
            apiUrl: p.apiUrl || '',
            modelName: p.modelName || ''
          }
        })
        if (saved.activeProfileId === 'migrated-1' && saved.profiles.length > 0) {
          const firstP = saved.profiles[0]
          const match = Object.entries(providers).find(([k, pd]) =>
            k !== 'custom' && pd.url === firstP?.apiUrl && pd.type === firstP?.providerType
          )
          activeId = match ? match[0] : 'custom'
        } else if (saved.activeProfileId && providers[saved.activeProfileId]) {
          activeId = saved.activeProfileId
        }
      } else if (saved.apiKey) {
        const match = Object.entries(providers).find(([k, p]) =>
          k !== 'custom' && p.url === saved.apiUrl && p.type === saved.providerType
        )
        activeId = match ? match[0] : 'custom'
        savedProfiles.value[activeId] = {
          apiKey: saved.apiKey,
          apiUrl: saved.apiUrl || '',
          modelName: saved.modelName || ''
        }
      }
      
      selectedProvider.value = activeId
      applyProfile(activeId)
    }
  } catch { /* defaults */ }
}

watch(selectedProvider, (newKey) => {
  // Always load from locally saved profiles when switching provider
  applyProfile(newKey)
})

watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    // Reload local settings from disk every time the modal is opened
    loadSettingsFromDisk()
  }
})

onMounted(() => {
  // Initial load
  loadSettingsFromDisk()
})

const saveSettings = async (): Promise<void> => {
  if (isTesting.value) return
  const mins = Number(intervalMinutes.value)
  if (!mins || mins < 1) {
    alert('间隔时间至少 1 分钟')
    return
  }
  isTesting.value = true

  savedProfiles.value[selectedProvider.value] = {
    apiKey: apiKey.value,
    apiUrl: apiUrl.value,
    modelName: modelName.value
  }

  const activeProfileData = savedProfiles.value[selectedProvider.value]
  const testObj = {
    providerType: currentProvider.value?.type || 'openai',
    apiKey: activeProfileData.apiKey,
    apiUrl: activeProfileData.apiUrl,
    modelName: activeProfileData.modelName
  }

  try {
    const res = await (window as any).api.testConnection(testObj)
    
    const newProfiles = Object.keys(savedProfiles.value).map(k => {
      const sp = savedProfiles.value[k]
      const pDef = providers[k] || providers.custom
      return {
        id: k,
        name: providers[k]?.label || 'Custom',
        providerType: pDef.type,
        apiKey: sp.apiKey,
        apiUrl: sp.apiUrl,
        modelName: sp.modelName
      }
    }).filter(p => p.apiKey || p.id === selectedProvider.value)

    const settingsObj = {
      activeProfileId: selectedProvider.value,
      intervalMinutes: mins,
      profiles: newProfiles
    }

    if (res.success) {
      await (window as any).api.saveSettings(settingsObj)
      emit('update:modelValue', false)
    } else {
      const forceSave = confirm(`接口测试未通过：\n${res.message}\n\n是否仍然强制保存该配置？`)
      if (forceSave) {
        await (window as any).api.saveSettings(settingsObj)
        emit('update:modelValue', false)
      }
    }
  } catch (error: any) {
    alert('请求异常：' + error.message)
  } finally {
    isTesting.value = false
  }
}
</script>

<template>
  <div v-if="modelValue" class="overlay" @click.self="emit('update:modelValue', false)">
    <div class="modal">
      <h2 class="modal-title">⚙️ 设置</h2>

      <!-- Provider Select -->
      <div class="form-group">
        <label>接口供应商</label>
        <select v-model="selectedProvider" class="provider-select">
          <option v-for="k in providerKeys" :key="k" :value="k">
            {{ providers[k].icon }} {{ providers[k].label }}
          </option>
        </select>
      </div>

      <!-- API Key -->
      <div class="form-group">
        <label>API Key</label>
        <input v-model="apiKey" type="password" placeholder="sk-... (可留空)" />
        <span class="hint" v-if="currentProvider?.keyUrl">
          <a :href="currentProvider.keyUrl" target="_blank">{{ currentProvider.keyHint }}</a>
        </span>
        <span class="hint" v-else>{{ currentProvider?.keyHint }}</span>
      </div>

      <!-- Base URL -->
      <div class="form-group">
        <label>Base URL</label>
        <input v-model="apiUrl" type="text" :placeholder="currentProvider?.url || 'https://... (可留空)'" />
      </div>

      <!-- Model -->
      <div class="form-group">
        <label>Model</label>
        <div v-if="!customModel && modelOptions.length > 0" class="model-select-row">
          <select v-model="modelName" class="model-select">
            <option v-for="m in modelOptions" :key="m" :value="m">{{ m }}</option>
          </select>
          <button class="btn-icon" @click="customModel = true" title="手动输入">✏️</button>
        </div>
        <div v-else class="model-select-row">
          <input v-model="modelName" type="text" placeholder="输入模型名 (可留空)" />
          <button v-if="modelOptions.length > 0" class="btn-icon" @click="customModel = false" title="切回下拉">📋</button>
        </div>
      </div>

      <!-- Interval -->
      <div class="form-group">
        <label>审判间隔（分钟）</label>
        <div class="interval-row">
          <input
            v-model.number="intervalMinutes"
            type="number"
            min="1"
            step="1"
            class="interval-input"
            placeholder="分钟数"
          />
          <span class="interval-unit">分钟</span>
        </div>
        <span class="hint">最少 1 分钟，无上限</span>
      </div>

      <div class="btn-row">
        <button class="btn-cancel" @click="emit('update:modelValue', false)" :disabled="isTesting">取消</button>
        <button class="btn-save" @click="saveSettings" :disabled="isTesting">
          {{ isTesting ? '测试中...' : '测试并保存' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 20px;
}

.modal {
  background: #1e1e2f;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 28px;
  max-width: 480px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  max-height: 90vh;
  overflow-y: auto;
}

.modal-title {
  margin: 0 0 20px;
  font-size: 20px;
  color: #fff;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #ccc;
  margin-bottom: 6px;
}

.form-group input[type="text"],
.form-group input[type="password"],
.form-group input[type="number"] {
  width: 100%;
  background: #111;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 10px 14px;
  color: #fff;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.form-group input:focus {
  border-color: #e74c3c;
}

/* Provider Dropdown */
.provider-select {
  width: 100%;
  background: #111;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 11px 14px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  outline: none;
  cursor: pointer;
  transition: border-color 0.2s;
  -webkit-appearance: none;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23888' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
}
.provider-select:focus { border-color: #e74c3c; }
.provider-select option {
  background: #1e1e2f;
  color: #fff;
  padding: 10px;
}

/* Model Select */
.model-select-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.model-select {
  flex: 1;
  background: #111;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 10px 14px;
  color: #fff;
  font-size: 13px;
  outline: none;
  cursor: pointer;
  transition: border-color 0.2s;
  -webkit-appearance: none;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23888' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
}
.model-select:focus { border-color: #e74c3c; }
.model-select option {
  background: #1e1e2f;
  color: #fff;
}

.model-select-row input {
  flex: 1;
}

.btn-icon {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  border: 1px solid #333;
  background: #111;
  color: #888;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}
.btn-icon:hover { border-color: #e74c3c; color: #fff; }

/* Interval */
.interval-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.interval-input {
  width: 120px !important;
  text-align: center;
  font-size: 18px !important;
  font-weight: 700;
  color: #f39c12 !important;
}
.interval-unit {
  font-size: 14px;
  color: #888;
}

.hint {
  display: block;
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}
.hint a {
  color: #3498db;
  text-decoration: none;
}
.hint a:hover { text-decoration: underline; }

.btn-row {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 22px;
}

.btn-cancel, .btn-save {
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  color: #fff;
}
.btn-cancel { background: #333; }
.btn-cancel:hover:not(:disabled) { background: #444; }
.btn-save { background: linear-gradient(135deg, #e74c3c, #c0392b); }
.btn-save:hover:not(:disabled) { opacity: 0.9; }
.btn-cancel:disabled, .btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
