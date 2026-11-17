<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { usePlayerStore } from '../../stores/player'
import { getAnalyser } from '../../audio/analyser'

const player = usePlayerStore()
const canvas = ref<HTMLCanvasElement | null>(null)
let frame = 0
let cleanup: (() => void) | null = null

onMounted(() => {
  const element = canvas.value
  if (!element) return
  const context = element.getContext('2d')
  if (!context) return

  const analyser = getAnalyser(player.ensureAudio())
  const data = analyser ? new Uint8Array(analyser.frequencyBinCount) : new Uint8Array(64)

  const resize = (): void => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    element.width = Math.max(1, Math.floor(element.clientWidth * ratio))
    element.height = Math.max(1, Math.floor(element.clientHeight * ratio))
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
  }
  resize()
  window.addEventListener('resize', resize)

  const draw = (): void => {
    frame = requestAnimationFrame(draw)
    const width = element.clientWidth
    const height = element.clientHeight
    if (!width || !height) return

    context.clearRect(0, 0, width, height)
    if (analyser) analyser.getByteFrequencyData(data)

    const bars = 64
    const gap = 2
    const barWidth = Math.max(2, (width - gap * (bars - 1)) / bars)
    const gradient = context.createLinearGradient(0, height, 0, 0)
    gradient.addColorStop(0, 'rgba(30, 215, 96, 0.18)')
    gradient.addColorStop(0.6, 'rgba(30, 215, 96, 0.7)')
    gradient.addColorStop(1, 'rgba(31, 223, 100, 0.95)')
    context.fillStyle = gradient

    for (let i = 0; i < bars; i += 1) {
      const value = analyser ? data[Math.floor((i * data.length) / bars)] / 255 : 0
      const barHeight = Math.max(2, value * height)
      context.fillRect(i * (barWidth + gap), height - barHeight, barWidth, barHeight)
    }
  }
  draw()

  cleanup = () => {
    cancelAnimationFrame(frame)
    window.removeEventListener('resize', resize)
  }
})

onBeforeUnmount(() => {
  cleanup?.()
})
</script>

<template>
  <div class="viz" aria-hidden="true">
    <canvas ref="canvas" />
  </div>
</template>

<style scoped>
.viz {
  height: 46px;
  padding: 0 20px;
  background: linear-gradient(180deg, rgba(30, 215, 96, 0.05), transparent);
  border-top: 1px solid var(--border);
}

canvas {
  display: block;
  width: 100%;
  height: 100%;
}

@media (max-width: 900px) {
  .viz {
    height: 34px;
    padding: 0 12px;
  }
}
</style>
