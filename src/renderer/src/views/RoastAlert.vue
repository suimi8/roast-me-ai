<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'

const message = ref('')
const visible = ref(false)

onMounted(() => {
  ;(window as any).api.onRoast(async (msg: string) => {
    message.value = msg
    visible.value = true

    await nextTick()
    setTimeout(() => {
      const actualHeight = document.body.scrollHeight
      // Ensure it never shrinks below 320
      const targetHeight = Math.max(actualHeight + 10, 320)
      
      ;(window as any).api.resizeRoastWindow({ 
        width: 480, 
        height: targetHeight
      })
    }, 100)

    // Shake effect
    document.body.classList.add('shake-hard')
    setTimeout(() => document.body.classList.remove('shake-hard'), 500)

    // Auto close after 8 seconds
    setTimeout(() => close(), 8000)
  })
})

const close = (): void => {
  visible.value = false
  ;(window as any).api.closeRoast()
}
</script>

<template>
  <div v-if="visible" class="roast-container" @click="close">
    <!-- Close btn -->
    <button class="close-btn" @click.stop="close">&times;</button>

    <!-- Alert icon -->
    <div class="alert-icon">
      <span>!</span>
    </div>

    <!-- Roast text -->
    <div class="roast-text">
      {{ message || '摸鱼被我抓到了吧？！' }}
    </div>

    <!-- Bottom bar -->
    <div class="bottom-hint">点击任意处关闭 · 赛博监工</div>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
html, body {
  background: transparent !important;
  width: 100%;
}
#app {
  width: 100%;
}

@keyframes shake-hard {
  0%   { transform: translate(1px, 1px) rotate(0deg); }
  10%  { transform: translate(-3px, -4px) rotate(-1deg); }
  20%  { transform: translate(-3px, 0px) rotate(1deg); }
  30%  { transform: translate(3px, 4px) rotate(0deg); }
  40%  { transform: translate(1px, -1px) rotate(1deg); }
  50%  { transform: translate(-1px, 4px) rotate(-1deg); }
  60%  { transform: translate(-4px, 1px) rotate(0deg); }
  70%  { transform: translate(3px, 1px) rotate(-1deg); }
  80%  { transform: translate(-1px, -1px) rotate(1deg); }
  90%  { transform: translate(1px, 4px) rotate(0deg); }
  100% { transform: translate(1px, -4px) rotate(-1deg); }
}
.shake-hard {
  animation: shake-hard 0.4s;
}


@keyframes iconBounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
}
</style>

<style scoped>
.roast-container {
  width: 100%;
  min-height: 320px;
  height: auto;
  box-sizing: border-box;
  background: rgba(10, 10, 20, 0.85);
  backdrop-filter: blur(12px);
  border: 2px solid rgba(231, 76, 60, 0.7);
  border-radius: 16px;
  box-shadow:
    0 0 40px rgba(231, 76, 60, 0.3),
    inset 0 0 30px rgba(231, 76, 60, 0.05);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 30px 20px 24px 20px;
  cursor: pointer;
  user-select: none;
  font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
  position: relative;
}

.close-btn {
  position: absolute;
  top: 8px;
  right: 14px;
  background: none;
  border: none;
  color: #666;
  font-size: 22px;
  cursor: pointer;
  transition: color 0.2s;
  line-height: 1;
}
.close-btn:hover {
  color: #fff;
}

.alert-icon {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: linear-gradient(135deg, #e74c3c, #f39c12);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  box-shadow: 0 0 25px rgba(231, 76, 60, 0.6);
  animation: iconBounce 1s ease-in-out infinite;
  flex-shrink: 0;
}
.alert-icon span {
  color: white;
  font-size: 28px;
  font-weight: 900;
}

.roast-text {
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.6;
  text-align: center;
  word-break: break-word;
  text-shadow: 0 1px 4px rgba(0,0,0,0.5);
  width: 100%;
  padding: 0 10px 30px 10px;
}

.bottom-hint {
  position: absolute;
  bottom: 10px;
  font-size: 10px;
  color: #444;
}
</style>
