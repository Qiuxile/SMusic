import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { parseFile } from 'music-metadata'
import type { Plugin } from 'vite'
import type { LyricLine, Lyrics, LyricSource, MusicManifest, Track } from '../src/types'

const VIRTUAL_ID = 'virtual:music-manifest'
const RESOLVED_ID = '\0' + VIRTUAL_ID
const CACHE_DIR = 'music-cache'
const AUDIO_EXT = new Set(['.mp3', '.flac', '.m4a', '.aac', '.ogg', '.opus', '.wav'])
/** Cloudflare Pages 单文件上限 */
const MAX_FILE_BYTES = 25 * 1024 * 1024

interface RawLyricsTag {
  text?: string
  syncText?: Array<{ timestamp?: number; text?: string }>
}

function sha1(input: string, length = 10): string {
  return createHash('sha1').update(input).digest('hex').slice(0, length)
}

function toPosix(input: string): string {
  return input.split(path.sep).join('/')
}

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return []
  const out: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else out.push(full)
  }
  return out
}

function splitArtists(raw: string): string[] {
  const parts = raw
    .split(/\s*(?:&|＆|、|,|，|;|；|\/)\s*|\s+(?:feat\.?|ft\.?)\s+/i)
    .map((s) => s.trim())
    .filter(Boolean)
  return parts.length ? parts : [raw.trim() || '未知歌手']
}

/** 无标签时的文件名兜底：「周杰伦-稻香」→ artist=周杰伦, title=稻香 */
function guessFromFilename(file: string): { artist: string; title: string } {
  const base = path.basename(file).replace(/\.[^.]+$/, '').trim()
  const matched = base.match(/^(.{1,80}?)\s*[-–—]\s*(.+)$/)
  if (matched && matched[1].trim() && matched[2].trim()) {
    return { artist: matched[1].trim(), title: matched[2].trim() }
  }
  return { artist: '', title: base }
}

function lrcTimestamp(seconds: number): string {
  const total = Math.max(0, seconds)
  const min = Math.floor(total / 60)
  const sec = Math.floor(total % 60)
  const cs = Math.round((total - Math.floor(total)) * 100)
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
}

/** 解析 LRC：支持多时间戳、[offset:] 与纯文本降级 */
function parseLrcText(raw: string, source: LyricSource): Lyrics | null {
  const text = raw.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')
  let offset = 0
  const offsetTag = text.match(/\[offset:\s*([+-]?\d+)\s*\]/i)
  if (offsetTag) offset = Number(offsetTag[1]) / 1000

  const lines: LyricLine[] = []
  for (const rawLine of text.split('\n')) {
    const stamps = [...rawLine.matchAll(/\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g)]
    if (!stamps.length) continue
    const content = rawLine.replace(/\[[^\]]*\]/g, '').trim()
    if (!content) continue
    for (const stamp of stamps) {
      const fractionRaw = stamp[3] ?? ''
      const fraction = fractionRaw
        ? Number(fractionRaw.length === 3 ? fractionRaw : fractionRaw.padEnd(3, '0').slice(0, 3)) / 1000
        : 0
      lines.push({
        time: Math.max(0, Number(stamp[1]) * 60 + Number(stamp[2]) + fraction + offset),
        text: content,
      })
    }
  }

  if (lines.length) {
    lines.sort((a, b) => a.time - b.time)
    return { raw: text, lines, synced: true, source }
  }

  const plain = text
    .split('\n')
    .map((line) => line.replace(/\[[^\]]*\]/g, '').trim())
    .filter(Boolean)
    .join('\n')
  if (!plain) return null
  return { raw: plain, lines: [], synced: false, source }
}

function fromEmbedded(tags?: RawLyricsTag[]): Lyrics | null {
  if (!tags?.length) return null
  const withSync = tags.find((tag) => (tag.syncText?.length ?? 0) > 0)
  if (withSync?.syncText?.length) {
    const lines = withSync.syncText
      .map((item) => ({ time: Math.max(0, (item.timestamp ?? 0) / 1000), text: (item.text ?? '').trim() }))
      .filter((line) => line.text)
      .sort((a, b) => a.time - b.time)
    if (lines.length) {
      return {
        raw: lines.map((line) => `[${lrcTimestamp(line.time)}]${line.text}`).join('\n'),
        lines,
        synced: true,
        source: 'embedded',
      }
    }
  }
  const text = tags
    .map((tag) => tag.text ?? '')
    .filter(Boolean)
    .join('\n')
  if (!text.trim()) return null
  return parseLrcText(text, 'embedded')
}

/** LRC 常见 GBK 编码，用替换字符启发式判断后回退解码 */
function decodeText(buffer: Buffer): string {
  const utf8 = new TextDecoder('utf-8').decode(buffer)
  if (!utf8.includes('\uFFFD')) return utf8
  try {
    return new TextDecoder('gbk').decode(buffer)
  } catch {
    return utf8
  }
}

export default function musicManifestPlugin(): Plugin {
  let root = process.cwd()
  let outDir = 'dist'
  let isBuild = false
  let cached: MusicManifest | null = null
  let pending: Promise<MusicManifest> | null = null

  const musicDir = (): string => path.join(root, 'music')
  const cacheRoot = (): string => path.join(root, CACHE_DIR)

  async function scan(): Promise<MusicManifest> {
    const dir = musicDir()
    const coversDir = path.join(cacheRoot(), 'covers')
    fs.rmSync(coversDir, { recursive: true, force: true })
    fs.mkdirSync(coversDir, { recursive: true })

    const warnings: string[] = []
    if (!fs.existsSync(dir)) {
      warnings.push('未找到 music/ 目录，曲库为空')
      return { generatedAt: new Date().toISOString(), tracks: [], warnings }
    }

    const allFiles = walk(dir)
    const lrcByBase = new Map<string, string>()
    for (const file of allFiles) {
      if (file.toLowerCase().endsWith('.lrc')) {
        lrcByBase.set(file.slice(0, -4).toLowerCase(), file)
      }
    }

    const audioFiles = allFiles
      .filter((file) => AUDIO_EXT.has(path.extname(file).toLowerCase()))
      .sort((a, b) =>
        toPosix(path.relative(dir, a)).localeCompare(toPosix(path.relative(dir, b)), 'zh-Hans-CN'),
      )

    const tracks: Track[] = []

    for (const file of audioFiles) {
      const rel = toPosix(path.relative(dir, file))
      const id = sha1(rel)
      const size = fs.statSync(file).size
      if (size > MAX_FILE_BYTES) {
        warnings.push(
          `${rel} 体积 ${(size / 1024 / 1024).toFixed(1)} MiB，超过 Cloudflare Pages 单文件 25 MiB 上限，部署会失败`,
        )
      }

      let meta: Awaited<ReturnType<typeof parseFile>> | undefined
      try {
        meta = await parseFile(file, { duration: true })
      } catch (error) {
        warnings.push(`${rel} 标签解析失败：${error instanceof Error ? error.message : String(error)}`)
      }

      const common = meta?.common
      const guess = guessFromFilename(file)
      const title = common?.title?.trim() || guess.title
      const artist = common?.artist?.trim() || guess.artist || '未知歌手'
      const album = common?.album?.trim() || '未知专辑'
      const artists = splitArtists(artist)

      let cover: string | undefined
      const picture = common?.picture?.[0]
      if (picture?.data) {
        const mime = picture.format ?? 'image/jpeg'
        const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg'
        const name = `${id}.${ext}`
        fs.writeFileSync(path.join(coversDir, name), picture.data)
        cover = `/${CACHE_DIR}/covers/${name}`
      }

      const lrcPath = lrcByBase.get(file.slice(0, -path.extname(file).length).toLowerCase())
      let lyrics: Lyrics | null = null
      if (lrcPath) {
        try {
          lyrics = parseLrcText(decodeText(fs.readFileSync(lrcPath)), 'lrc')
          if (!lyrics) warnings.push(`${toPosix(path.relative(dir, lrcPath))} 内容为空，已忽略`)
        } catch (error) {
          warnings.push(`读取歌词失败 ${toPosix(path.relative(dir, lrcPath))}：${String(error)}`)
        }
      }
      if (!lyrics) lyrics = fromEmbedded(common?.lyrics as unknown as RawLyricsTag[] | undefined)

      tracks.push({
        id,
        file: rel,
        // 对外 URL 只用曲目 id，避免源文件名中的 &、·、空格、全角符号在 URL 中出问题
        url: `/music/${id}${path.extname(file).toLowerCase()}`,
        title,
        artist,
        artists,
        album,
        albumKey: sha1(`${album}|${artists[0] ?? '未知歌手'}`, 8),
        duration: Math.round((meta?.format.duration ?? 0) * 10) / 10,
        bitrate: meta?.format.bitrate ? Math.round(meta.format.bitrate / 1000) : undefined,
        format: path.extname(file).slice(1).toUpperCase(),
        size,
        cover,
        coverHue: parseInt(id.slice(0, 4), 16) % 360,
        lyrics: lyrics ?? undefined,
        trackNo: common?.track?.no ?? null,
        year: common?.year ?? null,
      })
    }

    tracks.sort(
      (a, b) =>
        a.album.localeCompare(b.album, 'zh-Hans-CN') ||
        (a.trackNo ?? 999) - (b.trackNo ?? 999) ||
        a.title.localeCompare(b.title, 'zh-Hans-CN'),
    )

    const manifest: MusicManifest = {
      generatedAt: new Date().toISOString(),
      tracks,
      warnings,
    }
    fs.writeFileSync(path.join(cacheRoot(), 'manifest.json'), JSON.stringify(manifest, null, 2))
    return manifest
  }

  async function generate(): Promise<MusicManifest> {
    if (cached) return cached
    if (!pending) {
      pending = scan()
        .then((result) => {
          cached = result
          return result
        })
        .finally(() => {
          pending = null
        })
    }
    return pending
  }

  function invalidate(): void {
    cached = null
    pending = null
  }

  function copyDir(from: string, to: string): void {
    if (!fs.existsSync(from)) return
    fs.mkdirSync(to, { recursive: true })
    fs.cpSync(from, to, { recursive: true })
  }

  return {
    name: 'scnet:music-manifest',
    enforce: 'pre',

    configResolved(config) {
      root = config.root
      outDir = path.resolve(config.root, config.build.outDir)
      isBuild = config.command === 'build'
    },

    async buildStart() {
      const manifest = await generate()
      for (const warning of manifest.warnings) this.warn(warning)
      this.info(`曲库扫描完成：${manifest.tracks.length} 首`)
    },

    configureServer(server) {
      const dir = musicDir()
      const MIME: Record<string, string> = {
        '.mp3': 'audio/mpeg',
        '.flac': 'audio/flac',
        '.m4a': 'audio/mp4',
        '.aac': 'audio/aac',
        '.ogg': 'audio/ogg',
        '.opus': 'audio/ogg',
        '.wav': 'audio/wav',
      }

      // 开发期按 id 提供音频，并自行处理 Range，保证进度条拖动与生产一致
      server.middlewares.use((req, res, next) => {
        if (!req.url) return next()
        const pathname = decodeURI(req.url.split('?')[0])
        if (!pathname.startsWith('/music/')) return next()
        const track = cached?.tracks.find((item) => item.url === pathname)
        if (!track) return next()
        const file = path.join(musicDir(), track.file)
        let stat: fs.Stats
        try {
          stat = fs.statSync(file)
        } catch {
          return next()
        }

        res.setHeader('Content-Type', MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream')
        res.setHeader('Accept-Ranges', 'bytes')

        const range = req.headers.range
        const matched = range ? /^bytes=(\d*)-(\d*)$/.exec(range) : null
        let start = 0
        let end = stat.size - 1
        if (matched) {
          if (matched[1]) {
            start = Number(matched[1])
            end = matched[2] ? Math.min(Number(matched[2]), stat.size - 1) : stat.size - 1
          } else if (matched[2]) {
            start = Math.max(0, stat.size - Number(matched[2]))
          }
          if (start > end || start >= stat.size) {
            res.statusCode = 416
            res.setHeader('Content-Range', `bytes */${stat.size}`)
            res.end()
            return
          }
          res.statusCode = 206
          res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`)
        } else {
          res.statusCode = 200
        }
        res.setHeader('Content-Length', end - start + 1)
        if (req.method === 'HEAD') {
          res.end()
          return
        }
        fs.createReadStream(file, { start, end }).pipe(res)
      })

      server.watcher.add(dir)
      let timer: NodeJS.Timeout | null = null
      const refresh = (file: string): void => {
        if (!file.startsWith(dir)) return
        if (!AUDIO_EXT.has(path.extname(file).toLowerCase()) && !file.toLowerCase().endsWith('.lrc')) return
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => {
          invalidate()
          void generate().then((manifest) => {
            server.config.logger.info(`曲库已更新：${manifest.tracks.length} 首`)
            server.ws.send({ type: 'full-reload' })
          })
        }, 200)
      }
      server.watcher.on('add', refresh)
      server.watcher.on('unlink', refresh)
      server.watcher.on('change', refresh)
      void generate()
    },

    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID
      return null
    },

    async load(id) {
      if (id !== RESOLVED_ID) return null
      const manifest = await generate()
      return `export default ${JSON.stringify(manifest)}`
    },

    async closeBundle() {
      if (!isBuild) return
      const manifest = await generate()
      // 音频按曲目 id 复制进部署产物，URL 与源文件名解耦；封面同样进入产物
      const mediaDir = path.join(outDir, 'music')
      fs.mkdirSync(mediaDir, { recursive: true })
      for (const track of manifest.tracks) {
        const from = path.join(musicDir(), track.file)
        const to = path.join(mediaDir, `${track.id}${path.extname(track.file).toLowerCase()}`)
        fs.copyFileSync(from, to)
      }
      copyDir(path.join(cacheRoot(), 'covers'), path.join(outDir, CACHE_DIR, 'covers'))
      const oversized = manifest.tracks.filter((track) => track.size > MAX_FILE_BYTES)
      if (oversized.length) {
        console.warn(`[music] ${oversized.length} 个音频超过 25 MiB，Cloudflare Pages 会拒绝部署`)
      }
      console.log(
        `[music] 已复制 ${manifest.tracks.length} 首音频到 ${path.relative(root, outDir)}/music（按曲目 id 命名）`,
      )
    },
  }
}
