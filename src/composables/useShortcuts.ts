import { onBeforeUnmount, onMounted } from 'vue'
import { usePlayerStore } from '../stores/player'

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  )
}

/** 全局键盘快捷键：空格播放、方向键快进/音量、N/P 切歌、L 歌词、V 可视化、Q 队列 */
export function useShortcuts(): void {
  const player = usePlayerStore()

  function onKeydown(event: KeyboardEvent): void {
    if (event.metaKey || event.ctrlKey || event.altKey) return
    if (isTyping(event.target)) {
      if (event.key === 'Escape') (event.target as HTMLElement).blur()
      return
    }

    switch (event.key) {
      case ' ':
        event.preventDefault()
        player.toggle()
        break
      case 'ArrowRight':
        event.preventDefault()
        player.skip(5)
        break
      case 'ArrowLeft':
        event.preventDefault()
        player.skip(-5)
        break
      case 'ArrowUp':
        event.preventDefault()
        player.setVolume(player.volume + 0.05)
        break
      case 'ArrowDown':
        event.preventDefault()
        player.setVolume(player.volume - 0.05)
        break
      case 'n':
      case 'N':
        player.next()
        break
      case 'p':
      case 'P':
        player.prev()
        break
      case 'm':
      case 'M':
        player.toggleMute()
        break
      case 'l':
      case 'L':
        player.showLyrics = !player.showLyrics
        break
      case 'v':
      case 'V':
        player.showVisualizer = !player.showVisualizer
        break
      case 'q':
      case 'Q':
        player.showQueue = !player.showQueue
        break
      case '/':
        event.preventDefault()
        document.querySelector<HTMLInputElement>('#global-search')?.focus()
        break
      case 'Escape':
        player.showLyrics = false
        player.showQueue = false
        break
      default:
        break
    }
  }

  onMounted(() => window.addEventListener('keydown', onKeydown))
  onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
}
