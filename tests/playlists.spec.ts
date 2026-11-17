import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { usePlaylistsStore } from '../src/stores/playlists'

describe('playlists store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('创建歌单并去重添加曲目', () => {
    const store = usePlaylistsStore()
    const playlist = store.createPlaylist(' 晚间循环 ', ['a1', 'a1', 'missing'])

    expect(playlist?.name).toBe('晚间循环')
    expect(playlist?.trackIds).toEqual(['a1'])
    expect(store.orderedPlaylists).toHaveLength(1)

    expect(store.addTracks(playlist!.id, ['a1', 'a2', 'a2'])).toBe(1)
    expect(store.tracksOf(playlist!.id).map((track) => track.id)).toEqual(['a1', 'a2'])
  })

  it('重命名、移除曲目与删除歌单', () => {
    const store = usePlaylistsStore()
    const playlist = store.createPlaylist('旧名字', ['a1', 'b1'])!

    expect(store.renamePlaylist(playlist.id, '新名字')).toBe(true)
    expect(store.playlistById(playlist.id)?.name).toBe('新名字')
    expect(store.removeTrack(playlist.id, 'a1')).toBe(true)
    expect(store.playlistById(playlist.id)?.trackIds).toEqual(['b1'])
    expect(store.deletePlaylist(playlist.id)).toBe(true)
    expect(store.playlists).toHaveLength(0)
  })

  it('拒绝空名称与空白名称', () => {
    const store = usePlaylistsStore()
    expect(store.createPlaylist('   ')).toBeNull()
    expect(store.playlists).toHaveLength(0)
  })

  it('支持切换曲目收藏状态与搜索歌单名', () => {
    const store = usePlaylistsStore()
    const playlist = store.createPlaylist('通勤', ['a1'])!

    expect(store.hasTrack(playlist.id, 'a1')).toBe(true)
    expect(store.toggleTrack(playlist.id, 'a1')).toBe(false)
    expect(store.hasTrack(playlist.id, 'a1')).toBe(false)
    expect(store.toggleTrack(playlist.id, 'a1')).toBe(true)

    expect(store.searchPlaylists('通勤').map((item) => item.id)).toEqual([playlist.id])
    expect(store.searchPlaylists('不存在')).toEqual([])
  })

  it('批量移除曲目并返回移除数量', () => {
    const store = usePlaylistsStore()
    const playlist = store.createPlaylist('批量', ['a1', 'a2', 'b1'])!
    expect(store.removeTracks(playlist.id, ['a1', 'b1', 'missing'])).toBe(2)
    expect(store.playlistById(playlist.id)?.trackIds).toEqual(['a2'])
  })
})
