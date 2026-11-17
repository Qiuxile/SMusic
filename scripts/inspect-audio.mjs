import { parseFile } from 'music-metadata'
import { readdir } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve('music')

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const out = []
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...(await walk(full)))
    else if (/\.mp3$/i.test(e.name)) out.push(full)
  }
  return out
}

const files = await walk(root)
console.log('count:', files.length)

for (const f of files) {
  const rel = path.relative(root, f).replaceAll('\\', '/')
  try {
    const md = await parseFile(f, { duration: true, skipPostHeaders: false })
    const c = md.common
    const fmt = md.format
    const pic = c.picture?.[0]
    const lyrics = c.lyrics ?? []
    const lyricText = lyrics.map((l) => (typeof l === 'string' ? l : l.text ?? '')).join('\n')
    console.log(
      JSON.stringify({
        rel,
        title: c.title ?? null,
        artist: c.artist ?? null,
        artists: c.artists ?? null,
        album: c.album ?? null,
        year: c.year ?? null,
        genre: c.genre ?? null,
        track: c.track?.no ?? null,
        duration: fmt.duration ? Math.round(fmt.duration) : null,
        bitrate: fmt.bitrate ? Math.round(fmt.bitrate / 1000) : null,
        codec: fmt.codec ?? null,
        cover: pic ? { mime: pic.format, bytes: pic.data.length } : null,
        lyrics: lyrics.length ? { count: lyrics.length, chars: lyricText.length, hasTime: /\[\d{1,2}:\d{2}/.test(lyricText), sample: lyricText.slice(0, 40) } : null,
        tagTypes: md.format.tagTypes ?? null,
      }),
    )
  } catch (err) {
    console.log(JSON.stringify({ rel, error: String(err) }))
  }
}
