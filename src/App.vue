<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import Sidebar from './components/layout/Sidebar.vue'
import TopBar from './components/layout/TopBar.vue'
import PlayerBar from './components/player/PlayerBar.vue'
import { usePlayerStore } from './stores/player'
import { useShortcuts } from './composables/useShortcuts'
import { useMediaSession } from './composables/useMediaSession'

const player = usePlayerStore()
const route = useRoute()
const scroller = ref<HTMLElement | null>(null)

// 首次进入恢复上次队列与音量（不自动播放）
player.hydrate()
useShortcuts()
useMediaSession()

watch(
  () => route.path,
  () => {
    scroller.value?.scrollTo({ top: 0 })
  },
)
</script>

<template>
  <div class="app">
    <Sidebar class="sidebar" />

    <div class="body">
      <TopBar />
      <main ref="scroller" class="scroller">
        <RouterView v-slot="{ Component }">
          <Transition name="view" mode="out-in">
            <component :is="Component" />
          </Transition>
        </RouterView>
      </main>
    </div>

    <PlayerBar />
  </div>
</template>

<style scoped>
.app {
  display: grid;
  grid-template-columns: var(--sidebar-w) minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr) auto;
  height: 100dvh;
  background:
    radial-gradient(800px 420px at 14% -10%, rgba(30, 215, 96, 0.07), transparent 60%),
    var(--bg);
}

.sidebar {
  grid-row: 1;
  min-height: 0;
}

.body {
  grid-row: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

.scroller {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

.view-enter-active,
.view-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.view-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.view-leave-to {
  opacity: 0;
}

@media (max-width: 900px) {
  .app {
    grid-template-columns: minmax(0, 1fr);
  }

  .sidebar {
    display: none;
  }
}
</style>
