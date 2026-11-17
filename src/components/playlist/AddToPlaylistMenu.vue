<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { usePlaylistsStore } from '../../stores/playlists'
import Icon from '../ui/Icon.vue'

const props = withDefaults(
  defineProps<{
    trackIds: string[]
    variant?: 'icon' | 'button'
    label?: string
  }>(),
  { variant: 'icon', label: '添加到歌单' },
)

const playlists = usePlaylistsStore()
const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
const menu = ref<HTMLElement | null>(null)
const input = ref<HTMLInputElement | null>(null)
const open = ref(false)
const name = ref('')
const error = ref('')
const feedback = ref('')
const menuStyle = ref<Record<string, string>>({})

const hasTracks = computed(() => props.trackIds.length > 0)

function updatePosition(): void {
  const rect = trigger.value?.getBoundingClientRect()
  if (!rect) return
  const width = 268
  const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8))
  const openUp = rect.bottom + 320 > window.innerHeight && rect.top > 320
  menuStyle.value = {
    left: `${left}px`,
    width: `${width}px`,
    ...(openUp
      ? { bottom: `${Math.max(8, window.innerHeight - rect.top + 6)}px` }
      : { top: `${rect.bottom + 6}px` }),
  }
}

async function openMenu(): Promise<void> {
  if (!hasTracks.value) return
  updatePosition()
  open.value = true
  error.value = ''
  feedback.value = ''
  await nextTick()
  input.value?.focus()
}

function close(): void {
  open.value = false
  name.value = ''
  error.value = ''
  feedback.value = ''
}

function closeAndFocus(): void {
  close()
  trigger.value?.focus()
}

function toggle(): void {
  if (open.value) close()
  else void openMenu()
}

function addedCount(playlistId: string): boolean {
  return props.trackIds.every((id) => playlists.hasTrack(playlistId, id))
}

function addTo(playlistId: string): void {
  const added = playlists.addTracks(playlistId, props.trackIds)
  const playlist = playlists.playlistById(playlistId)
  feedback.value = added
    ? `已添加 ${added} 首到「${playlist?.name ?? '歌单'}」`
    : `已在「${playlist?.name ?? '歌单'}」中`
  if (added) window.setTimeout(close, 650)
}

function createAndAdd(): void {
  const created = playlists.createPlaylist(name.value, props.trackIds)
  if (!created) {
    error.value = '请输入歌单名称（最多 60 个字符）'
    return
  }
  close()
}

function onPointerDown(event: PointerEvent): void {
  const target = event.target as Node | null
  if (!target) return
  if (root.value?.contains(target) || menu.value?.contains(target)) return
  close()
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && open.value) {
    event.stopPropagation()
    closeAndFocus()
  }
}

onBeforeUnmount(() => {
  unbindGlobal()
})

function bindGlobal(): void {
  document.addEventListener('pointerdown', onPointerDown)
  document.addEventListener('keydown', onKeydown)
  window.addEventListener('resize', close)
  window.addEventListener('scroll', close, true)
}

function unbindGlobal(): void {
  document.removeEventListener('pointerdown', onPointerDown)
  document.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', close)
  window.removeEventListener('scroll', close, true)
}

watch(open, (value) => {
  if (value) bindGlobal()
  else unbindGlobal()
})
</script>

<template>
  <span ref="root" class="add-wrap">
    <button
      ref="trigger"
      :class="variant === 'button' ? 'btn sm add-button' : 'icon-btn add-pl'"
      :aria-label="label"
      :aria-expanded="open"
      aria-haspopup="dialog"
      :disabled="!hasTracks"
      :title="label"
      @click.stop="toggle"
    >
      <Icon name="playlist" :size="variant === 'button' ? 14 : 15" />
      <span v-if="variant === 'button'">{{ label }}</span>
    </button>

    <Teleport to="body">
      <div
        v-if="open"
        ref="menu"
        class="pl-menu"
        role="dialog"
        aria-label="添加到歌单"
        :style="menuStyle"
        @click.stop
      >
        <header class="pl-head">
          <strong>添加到歌单</strong>
          <button class="icon-btn" aria-label="关闭" @click="closeAndFocus">
            <Icon name="x" :size="14" />
          </button>
        </header>

        <p class="pl-hint">已选 {{ trackIds.length }} 首</p>

        <div class="pl-list">
          <button
            v-for="playlist in playlists.orderedPlaylists"
            :key="playlist.id"
            class="pl-row"
            @click="addTo(playlist.id)"
          >
            <span class="pl-icon"><Icon name="playlist" :size="14" /></span>
            <span class="pl-name">{{ playlist.name }}</span>
            <span class="pl-count">{{ playlist.trackIds.length }}</span>
            <Icon
              v-if="addedCount(playlist.id)"
              name="check"
              :size="14"
              class="pl-check"
            />
          </button>

          <p v-if="!playlists.playlists.length" class="pl-empty">还没有歌单，先创建一个。</p>
        </div>

        <form class="pl-create" @submit.prevent="createAndAdd">
          <label for="pl-new-name">新建歌单</label>
          <div class="pl-create-row">
            <input
              id="pl-new-name"
              ref="input"
              v-model="name"
              type="text"
              maxlength="60"
              placeholder="例如：通勤路上"
              autocomplete="off"
            />
            <button type="submit" class="btn sm primary" :disabled="!name.trim()">
              创建
            </button>
          </div>
          <p v-if="error" class="pl-error">{{ error }}</p>
        </form>

        <p v-if="feedback" class="pl-feedback" role="status">{{ feedback }}</p>
      </div>
    </Teleport>
  </span>
</template>

<style scoped>
.add-wrap {
  display: inline-flex;
}

.add-button {
  white-space: nowrap;
}

.pl-menu {
  position: fixed;
  z-index: 120;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  background: #1b1b1b;
  box-shadow: var(--shadow);
}

.pl-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 2px 4px;
}

.pl-head strong {
  font-size: 13px;
}

.pl-head .icon-btn {
  width: 26px;
  height: 26px;
}

.pl-hint {
  padding: 0 2px;
  font-size: 11px;
  color: var(--muted);
}

.pl-list {
  max-height: 190px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.pl-row {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 8px;
  border-radius: var(--radius-sm);
  text-align: left;
}

.pl-row:hover {
  background: var(--surface-hover);
}

.pl-icon {
  width: 26px;
  height: 26px;
  flex: none;
  display: grid;
  place-items: center;
  border-radius: var(--radius-xs);
  color: var(--accent);
  background: var(--accent-soft);
}

.pl-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12.5px;
}

.pl-count {
  font-size: 11px;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.pl-check {
  color: var(--accent);
  flex: none;
}

.pl-empty {
  padding: 14px 8px;
  font-size: 12px;
  color: var(--muted);
  text-align: center;
}

.pl-create {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 8px;
  border-top: 1px solid var(--border);
}

.pl-create label {
  font-size: 11px;
  color: var(--muted);
}

.pl-create-row {
  display: flex;
  gap: 6px;
}

.pl-create-row input {
  flex: 1;
  min-width: 0;
  height: 30px;
  padding: 0 9px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.04);
  outline: none;
  font-size: 12px;
}

.pl-create-row input:focus {
  border-color: var(--accent);
}

.pl-create .btn {
  height: 30px;
}

.pl-error {
  font-size: 11px;
  color: var(--danger);
}

.pl-feedback {
  padding: 6px 8px;
  border-radius: var(--radius-sm);
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 11.5px;
}
</style>
