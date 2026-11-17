<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { usePlayerStore } from '../../stores/player'
import Icon from '../ui/Icon.vue'

const player = usePlayerStore()
const scroller = ref<HTMLElement | null>(null)

const lyrics = computed(() => player.current?.lyrics ?? null)

const activeIndex = computed(() => {
  const data = lyrics.value
  if (!data?.synced) return -1
  const now = player.currentTime + 0.15
  let found = -1
  for (let i = 0; i < data.lines.length; i += 1) {
    if (data.lines[i].time <= now) found = i
  }
  return found
})

watch(
  activeIndex,
  async (index) => {
    if (index < 0) return
    await nextTick()
    const line = scroller.value?.querySelector<HTMLElement>(`[data-index="${index}"]`)
    line?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  },
  { immediate: true },
)

function seekTo(index: number): void {
  const data = lyrics.value
  if (data?.synced) player.seek(data.lines[index].time)
}
</script>

<template>
  <section class="panel lyrics" aria-label="歌词">
    <header>
      <div class="head-text">
        <p class="eyebrow">Lyrics</p>
        <h3>{{ player.current?.title ?? '歌词' }}</h3>
      </div>
      <button class="icon-btn" aria-label="关闭歌词" @click="player.showLyrics = false">
        <Icon name="x" :size="16" />
      </button>
    </header>

    <div ref="scroller" class="body">
      <template v-if="lyrics">
        <div v-if="lyrics.synced" class="lines">
          <p
            v-for="(line, index) in lyrics.lines"
            :key="`${line.time}-${index}`"
            :data-index="index"
            class="line"
            :class="{ active: index === activeIndex, past: index < activeIndex }"
            @click="seekTo(index)"
          >
            {{ line.text }}
          </p>
        </div>
        <pre v-else class="plain">{{ lyrics.raw }}</pre>
      </template>

      <div v-else class="empty">
        <span class="icon"><Icon name="mic" :size="24" /></span>
        <p>这首歌没有歌词</p>
        <small>
          把同名 <code>.lrc</code> 放到 music/ 对应目录，或写入音频的内嵌歌词标签，
          重新构建后会自动读取。
        </small>
      </div>
    </div>

    <footer v-if="lyrics">
      <span class="chip">
        {{ lyrics.source === 'lrc' ? '.lrc 文件' : '内嵌标签' }}
        {{ lyrics.synced ? ' · 逐行同步' : ' · 纯文本' }}
      </span>
      <span class="chip">{{ lyrics.lines.length || lyrics.raw.length }} 字</span>
    </footer>
  </section>
</template>

<style scoped>
.panel {
  position: absolute;
  right: 14px;
  bottom: calc(100% + 10px);
  width: min(390px, calc(100vw - 28px));
  max-height: 62vh;
  display: flex;
  flex-direction: column;
  background: rgba(18, 20, 28, 0.94);
  border: 1px solid var(--border-strong);
  border-radius: 16px;
  box-shadow: var(--shadow);
  backdrop-filter: blur(20px);
  overflow: hidden;
  animation: rise 0.18s ease;
  z-index: 40;
}

header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 16px 10px;
  border-bottom: 1px solid var(--border);
}

.head-text {
  min-width: 0;
}

h3 {
  font-size: 15px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 14px 18px 20px;
  scroll-behavior: smooth;
}

.lines {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.line {
  padding: 7px 6px;
  border-radius: 8px;
  font-size: 13.5px;
  line-height: 1.65;
  color: var(--muted);
  cursor: pointer;
  transition: color 0.2s ease, transform 0.2s ease, background-color 0.2s ease;
}

.line:hover {
  color: var(--text-soft);
  background: rgba(255, 255, 255, 0.04);
}

.line.past {
  color: rgba(141, 148, 168, 0.55);
}

.line.active {
  color: var(--text);
  font-weight: 600;
  font-size: 14.5px;
  background: var(--accent-soft);
  transform: translateX(2px);
}

.plain {
  margin: 0;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.9;
  color: var(--text-soft);
  white-space: pre-wrap;
  word-break: break-word;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  padding: 34px 18px;
  text-align: center;
  color: var(--muted);
}

.empty .icon {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: var(--accent);
  background: var(--accent-soft);
  margin-bottom: 2px;
}

.empty p {
  color: var(--text-soft);
  font-size: 13.5px;
}

.empty small {
  font-size: 11.5px;
  line-height: 1.8;
  max-width: 280px;
}

code {
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.08);
  font-family: ui-monospace, 'Cascadia Code', monospace;
  font-size: 11px;
}

footer {
  display: flex;
  gap: 8px;
  padding: 10px 16px;
  border-top: 1px solid var(--border);
}

@media (max-width: 900px) {
  .panel {
    right: 0;
    left: 0;
    width: auto;
    bottom: calc(100% + 6px);
    max-height: 54vh;
    border-radius: 16px 16px 0 0;
  }
}
</style>
