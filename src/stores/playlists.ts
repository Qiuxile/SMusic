import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Track } from '../types'
import { useLibraryStore } from './library'
import { loadJSON, saveJSON } from '../utils/storage'
import { matchScore } from '../utils/search'

export interface Playlist {
  id: string
  name: string
  description: string
  trackIds: string[]
  createdAt: number
  updatedAt: number
}

const STORAGE_KEY = 'mp.playlists.v1'
export const PLAYLIST_NAME_MAX = 60
const MAX_PLAYLISTS = 100

function makeId(): string {
  return `pl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export const usePlaylistsStore = defineStore('playlists', () => {
  const library = useLibraryStore()

  const playlists = ref<Playlist[]>(sanitize(loadJSON<unknown>(STORAGE_KEY, [])))

  function sanitize(value: unknown): Playlist[] {
    if (!Array.isArray(value)) return []
    const seen = new Set<string>()
    const result: Playlist[] = []
    for (const raw of value) {
      if (!raw || typeof raw !== 'object') continue
      const item = raw as Partial<Playlist>
      if (typeof item.id !== 'string' || !item.id || seen.has(item.id)) continue
      if (typeof item.name !== 'string' || !item.name.trim()) continue
      const trackIds = Array.isArray(item.trackIds)
        ? [...new Set(item.trackIds.filter((id): id is string => typeof id === 'string'))].filter(
            (id) => library.byId.has(id),
          )
        : []
      seen.add(item.id)
      result.push({
        id: item.id,
        name: item.name.trim().slice(0, PLAYLIST_NAME_MAX),
        description: typeof item.description === 'string' ? item.description.slice(0, 240) : '',
        trackIds,
        createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now(),
        updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : Date.now(),
      })
      if (result.length >= MAX_PLAYLISTS) break
    }
    return result
  }

  function persist(): void {
    saveJSON(STORAGE_KEY, playlists.value)
  }

  const orderedPlaylists = computed(() =>
    [...playlists.value].sort((a, b) => b.updatedAt - a.updatedAt),
  )

  function playlistById(id: string): Playlist | undefined {
    return playlists.value.find((playlist) => playlist.id === id)
  }

  function normalizeIds(trackIds: readonly string[]): string[] {
    return [...new Set(trackIds)].filter((id) => library.byId.has(id))
  }

  function createPlaylist(name: string, trackIds: readonly string[] = []): Playlist | null {
    const trimmed = name.trim().slice(0, PLAYLIST_NAME_MAX)
    if (!trimmed || playlists.value.length >= MAX_PLAYLISTS) return null
    const now = Date.now()
    const playlist: Playlist = {
      id: makeId(),
      name: trimmed,
      description: '',
      trackIds: normalizeIds(trackIds),
      createdAt: now,
      updatedAt: now,
    }
    playlists.value = [playlist, ...playlists.value]
    persist()
    return playlist
  }

  function renamePlaylist(id: string, name: string): boolean {
    const playlist = playlistById(id)
    const trimmed = name.trim().slice(0, PLAYLIST_NAME_MAX)
    if (!playlist || !trimmed) return false
    playlist.name = trimmed
    playlist.updatedAt = Date.now()
    persist()
    return true
  }

  function updateDescription(id: string, description: string): boolean {
    const playlist = playlistById(id)
    if (!playlist) return false
    playlist.description = description.trim().slice(0, 240)
    playlist.updatedAt = Date.now()
    persist()
    return true
  }

  function deletePlaylist(id: string): boolean {
    const exists = playlists.value.some((playlist) => playlist.id === id)
    if (!exists) return false
    playlists.value = playlists.value.filter((playlist) => playlist.id !== id)
    persist()
    return true
  }

  function addTracks(id: string, trackIds: readonly string[]): number {
    const playlist = playlistById(id)
    if (!playlist) return 0
    const existing = new Set(playlist.trackIds)
    const additions = normalizeIds(trackIds).filter((trackId) => !existing.has(trackId))
    if (!additions.length) return 0
    playlist.trackIds = [...playlist.trackIds, ...additions]
    playlist.updatedAt = Date.now()
    persist()
    return additions.length
  }

  function removeTrack(id: string, trackId: string): boolean {
    const playlist = playlistById(id)
    if (!playlist?.trackIds.includes(trackId)) return false
    playlist.trackIds = playlist.trackIds.filter((item) => item !== trackId)
    playlist.updatedAt = Date.now()
    persist()
    return true
  }

  function removeTracks(id: string, trackIds: readonly string[]): number {
    const playlist = playlistById(id)
    if (!playlist) return 0
    const remove = new Set(trackIds)
    const before = playlist.trackIds.length
    playlist.trackIds = playlist.trackIds.filter((trackId) => !remove.has(trackId))
    const removed = before - playlist.trackIds.length
    if (removed > 0) {
      playlist.updatedAt = Date.now()
      persist()
    }
    return removed
  }

  function toggleTrack(id: string, trackId: string): boolean {
    const playlist = playlistById(id)
    if (!playlist) return false
    if (playlist.trackIds.includes(trackId)) {
      removeTrack(id, trackId)
      return false
    }
    addTracks(id, [trackId])
    return true
  }

  function hasTrack(id: string, trackId: string): boolean {
    return Boolean(playlistById(id)?.trackIds.includes(trackId))
  }

  function tracksOf(playlistOrId: Playlist | string): Track[] {
    const playlist =
      typeof playlistOrId === 'string' ? playlistById(playlistOrId) : playlistOrId
    if (!playlist) return []
    return playlist.trackIds
      .map((id) => library.byId.get(id))
      .filter((track): track is Track => Boolean(track))
  }

  function durationOf(playlistOrId: Playlist | string): number {
    return tracksOf(playlistOrId).reduce((sum, track) => sum + track.duration, 0)
  }

  function searchPlaylists(query: string): Playlist[] {
    if (!query.trim()) return []
    return orderedPlaylists.value
      .map((playlist) => ({ playlist, score: matchScore(playlist.name, query) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.playlist)
  }

  return {
    playlists,
    orderedPlaylists,
    playlistById,
    createPlaylist,
    renamePlaylist,
    updateDescription,
    deletePlaylist,
    addTracks,
    removeTrack,
    removeTracks,
    toggleTrack,
    hasTrack,
    tracksOf,
    durationOf,
    searchPlaylists,
  }
})
