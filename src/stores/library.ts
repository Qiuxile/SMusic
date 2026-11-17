import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import manifest from 'virtual:music-manifest'
import type { Track } from '../types'
import { loadJSON, saveJSON } from '../utils/storage'
import { rankByName, rankTracks } from '../utils/search'

export interface Album {
  key: string
  name: string
  artist: string
  year: number | null
  cover?: string
  hue: number
  tracks: Track[]
  duration: number
}

export interface Artist {
  key: string
  name: string
  tracks: Track[]
  albumCount: number
  hue: number
}

interface RecentEntry {
  id: string
  at: number
}

const FAV_KEY = 'mp.favorites.v1'
const RECENT_KEY = 'mp.recent.v1'
const SEARCH_KEY = 'mp.search-history.v1'
const MAX_RECENT = 200
const MAX_SEARCH_HISTORY = 8

export const useLibraryStore = defineStore('library', () => {
  const tracks = manifest.tracks
  const warnings = manifest.warnings
  const generatedAt = manifest.generatedAt
  const byId = new Map(tracks.map((track) => [track.id, track]))

  const favorites = ref<string[]>(
    loadJSON<string[]>(FAV_KEY, []).filter((id) => byId.has(id)),
  )
  const recent = ref<RecentEntry[]>(
    loadJSON<RecentEntry[]>(RECENT_KEY, []).filter((entry) => byId.has(entry.id)),
  )
  const searchHistory = ref<string[]>(
    loadJSON<string[]>(SEARCH_KEY, [])
      .filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
      .slice(0, MAX_SEARCH_HISTORY),
  )

  const albums = computed<Album[]>(() => {
    const map = new Map<string, Album>()
    for (const track of tracks) {
      let album = map.get(track.albumKey)
      if (!album) {
        album = {
          key: track.albumKey,
          name: track.album,
          artist: track.artists[0] ?? '未知歌手',
          year: track.year ?? null,
          cover: track.cover,
          hue: track.coverHue,
          tracks: [],
          duration: 0,
        }
        map.set(track.albumKey, album)
      }
      album.tracks.push(track)
      album.duration += track.duration
      if (!album.cover && track.cover) album.cover = track.cover
    }
    const list = [...map.values()]
    for (const album of list) {
      album.tracks.sort(
        (a, b) =>
          (a.trackNo ?? 999) - (b.trackNo ?? 999) ||
          a.title.localeCompare(b.title, 'zh-Hans-CN'),
      )
    }
    return list.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'))
  })

  const artists = computed<Artist[]>(() => {
    const map = new Map<string, Artist>()
    for (const track of tracks) {
      const names = track.artists.length ? track.artists : ['未知歌手']
      for (const name of names) {
        let artist = map.get(name)
        if (!artist) {
          artist = { key: name, name, tracks: [], albumCount: 0, hue: track.coverHue }
          map.set(name, artist)
        }
        artist.tracks.push(track)
      }
    }
    const list = [...map.values()]
    for (const artist of list) {
      artist.albumCount = new Set(artist.tracks.map((track) => track.albumKey)).size
      artist.tracks.sort((a, b) => a.title.localeCompare(b.title, 'zh-Hans-CN'))
    }
    return list.sort(
      (a, b) => b.tracks.length - a.tracks.length || a.name.localeCompare(b.name, 'zh-Hans-CN'),
    )
  })

  const favoriteTracks = computed<Track[]>(() =>
    favorites.value.map((id) => byId.get(id)).filter((track): track is Track => Boolean(track)),
  )

  const recentTracks = computed<Track[]>(() =>
    recent.value.map((entry) => byId.get(entry.id)).filter((track): track is Track => Boolean(track)),
  )

  const totalDuration = computed(() =>
    tracks.reduce((sum, track) => sum + (track.duration || 0), 0),
  )

  const favoriteSet = computed(() => new Set(favorites.value))
  const recentIds = computed(() => recent.value.map((entry) => entry.id))

  function isFavorite(id: string): boolean {
    return favorites.value.includes(id)
  }

  function setFavorite(id: string, favorite: boolean): boolean {
    const exists = favorites.value.includes(id)
    if (favorite === exists) return favorite
    favorites.value = favorite
      ? [id, ...favorites.value.filter((item) => item !== id)]
      : favorites.value.filter((item) => item !== id)
    saveJSON(FAV_KEY, favorites.value)
    return favorite
  }

  function setFavorites(ids: readonly string[], favorite: boolean): number {
    const unique = [...new Set(ids)].filter((id) => byId.has(id))
    if (!unique.length) return 0
    const target = new Set(unique)
    if (favorite) {
      favorites.value = [
        ...unique,
        ...favorites.value.filter((id) => !target.has(id)),
      ]
    } else {
      favorites.value = favorites.value.filter((id) => !target.has(id))
    }
    saveJSON(FAV_KEY, favorites.value)
    return unique.length
  }

  function toggleFavorite(id: string): boolean {
    return setFavorite(id, !favorites.value.includes(id))
  }

  function pushRecent(id: string): void {
    recent.value = [{ id, at: Date.now() }, ...recent.value.filter((entry) => entry.id !== id)].slice(
      0,
      MAX_RECENT,
    )
    saveJSON(RECENT_KEY, recent.value)
  }

  function clearRecent(): void {
    recent.value = []
    saveJSON(RECENT_KEY, [])
  }

  function pushSearch(query: string): void {
    const keyword = query.trim().replace(/\s+/g, ' ')
    if (!keyword) return
    const normalized = keyword.toLowerCase()
    searchHistory.value = [
      keyword,
      ...searchHistory.value.filter((item) => item.toLowerCase() !== normalized),
    ].slice(0, MAX_SEARCH_HISTORY)
    saveJSON(SEARCH_KEY, searchHistory.value)
  }

  function removeSearch(query: string): void {
    const normalized = query.trim().toLowerCase()
    searchHistory.value = searchHistory.value.filter(
      (item) => item.toLowerCase() !== normalized,
    )
    saveJSON(SEARCH_KEY, searchHistory.value)
  }

  function clearSearchHistory(): void {
    searchHistory.value = []
    saveJSON(SEARCH_KEY, [])
  }

  function albumByKey(key: string): Album | undefined {
    return albums.value.find((album) => album.key === key)
  }

  function artistByName(name: string): Artist | undefined {
    return artists.value.find((artist) => artist.name === name)
  }

  function search(query: string): { tracks: Track[]; albums: Album[]; artists: Artist[] } {
    if (!query.trim()) return { tracks: [], albums: [], artists: [] }
    return {
      tracks: rankTracks(tracks, query).map((entry) => entry.track),
      albums: rankByName(albums.value, query, (album) => album.name, (album) => album.artist).map(
        (entry) => entry.item,
      ),
      artists: rankByName(artists.value, query, (artist) => artist.name).map(
        (entry) => entry.item,
      ),
    }
  }

  return {
    tracks,
    warnings,
    generatedAt,
    byId,
    favorites,
    recent,
    searchHistory,
    albums,
    artists,
    favoriteTracks,
    recentTracks,
    totalDuration,
    favoriteSet,
    recentIds,
    isFavorite,
    setFavorite,
    setFavorites,
    toggleFavorite,
    pushRecent,
    clearRecent,
    pushSearch,
    removeSearch,
    clearSearchHistory,
    albumByKey,
    artistByName,
    search,
  }
})
