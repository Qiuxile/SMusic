# SMusic · 本地音乐库

一个部署在 Cloudflare Pages 上的纯静态本地音乐库：**曲目、专辑、歌手、封面、歌词全部来自 `music/` 目录里的音频文件标签**，不需要维护任何 JSON 清单。

## 特性

- **零配置曲库**：构建时递归扫描 `music/**/*.{mp3,flac,m4a,aac,ogg,opus,wav}`，用 `music-metadata` 读取 ID3/Vorbis 标签，生成内存清单（虚拟模块），不落地业务 JSON。
- **播放器**：播放/暂停、进度拖动、音量、上一首/下一首、列表循环/单曲循环/顺序、随机播放（维护独立随机顺序）、播放队列（可移除、可插播）；刷新后恢复队列与播放位置。
- **全屏播放页**：大尺寸封面、曲目信息、进度、音量、随机/循环、歌词与队列双标签，桌面与移动端均可使用。
- **首页**：继续收听、收藏/歌单/最近/专辑快捷入口、本地每日推荐、最近播放、常听歌手、专辑精选与曲库预览；所有分区都由本机数据派生。
- **搜索**：顶部搜索建议支持歌曲/专辑/歌手/歌单混排、`↑/↓/Enter/Esc` 键盘操作；搜索页按分类展示结果，保留最近 8 条搜索历史，并支持一次编辑距离的拼写容错。
- **曲库视图**：全部歌曲、专辑、歌手、搜索、我的收藏、最近播放；专辑与歌手按标签自动归集。
- **曲目管理**：全部歌曲页支持按歌曲名/歌手/专辑/时长/发行年份排序、升序降序、收藏/封面/歌词/无损筛选、歌手与专辑过滤；批量选择后可批量收藏、入队或加入歌单，偏好保存在本机。
- **本地歌单**：创建、重命名、删除歌单，添加/移除曲目，2×2 封面、时长统计、播放全部与随机播放；歌单只保存在当前浏览器。
- **歌词**：优先读取同名 `.lrc`，其次读取音频内嵌歌词（`USLT`/`SYLT`）；全屏歌词界面逐行同步高亮，点击某行跳转播放位置，可导出歌词文件。
- **下载**：歌曲列表与播放条可下载音频，文件名按「歌手 - 歌名」生成；歌词界面支持把同步歌词导出为 `.lrc`、纯文本导出为 `.txt`。
- **可视化**：Web Audio `AnalyserNode` 频谱柱状图。
- **本地数据**：收藏、最近播放、搜索历史、歌单、曲库筛选偏好、队列、音量、播放模式保存在 `localStorage`，不需要登录。
- **桌面与移动端**：响应式布局、底部播放条、移动端顶部导航。
- **系统集成**：Media Session（锁屏/耳机按键/系统媒体面板）、键盘快捷键、PWA 应用外壳离线。

## 快速开始

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # 类型检查 + 构建（音频与封面会复制到 dist/）
npm run preview    # 本地预览构建产物
```

## 曲库约定

```
music/
├─ 周杰伦-稻香.mp3
├─ 蔡健雅-Letting Go.mp3
└─ bgmusices/
   └─ Pegato、Zedd、Selena Gomez - I Want You To Know (remix：Hella x Pegato).flac
```

- 文件放在 `music/` 下任意子目录即可，构建时自动递归扫描；新增/删除文件在 `npm run dev` 下会自动刷新。
- 标题、歌手、专辑、时长、码率、封面、内嵌歌词均直接读取标签，**不需要额外配置**。
- 标签缺失时回退解析文件名：`歌手-歌名`，仍无法识别则歌手记为「未知歌手」、专辑记为「未知专辑」。
- 封面缺失时用确定性渐变 + 首字母占位，不伪造图片。
- 歌词：把与音频同名的 `.lrc` 放在同一目录（UTF-8 或 GBK 均可），或在音频中写入内嵌歌词。没有歌词时播放器会显示提示，而不是空白。

> 曲库规模完全由 `music/` 目录决定，构建结束会打印实际复制的音频数量；`npm run inspect:audio` 可逐首查看标签、封面、歌词与时长。音频文件增删后重新构建即可更新清单。

## 键盘快捷键

| 按键 | 功能 |
| --- | --- |
| `空格` | 播放 / 暂停 |
| `←` / `→` | 后退 / 前进 5 秒 |
| `↑` / `↓` | 音量 ±5% |
| `N` / `P` | 下一首 / 上一首 |
| `M` | 静音切换 |
| `L` | 打开/关闭全屏播放页（歌词标签） |
| `V` | 打开/关闭可视化 |
| `Q` | 打开/关闭全屏播放页（队列标签） |
| `/` | 聚焦搜索框 |
| `Esc` | 关闭播放页 / 浮层 / 搜索建议 |
| `↑` / `↓`（搜索框内） | 选择上一条/下一条搜索建议 |
| `Enter`（搜索框内） | 打开选中建议；未选中时提交搜索 |

## 架构

```
music/**.mp3|flac
      │
      ▼  构建期（plugins/music-manifest.ts）
music-metadata 解析标签 / 封面 / 歌词
      │  · 封面写入 music-cache/covers/<id>.<ext>
      │  · 清单以虚拟模块 virtual:music-manifest 注入
      ▼
Pinia: library（曲库/专辑/歌手/搜索/收藏/最近/搜索历史）
       player（播放状态机/队列管理/循环随机/会话持久化）
       playlists（本地歌单/批量增删/搜索）
      ▼
Vue Router 视图 + 自研组件（设计令牌主题，无 UI 框架）
```

- 搜索、排序筛选与每日推荐分别位于 `src/utils/search.ts`、`track-view.ts`、`recommend.ts`，不把规则塞进页面组件。
- 本地歌单只保存曲目 id，通过曲库索引解析，不复制元数据。
- 首页每日推荐只使用收藏、最近播放、日期种子与曲库统计，同一天结果稳定，不伪造运营内容。
- 播放状态由显式状态机驱动（`idle/loading/ready/playing/paused/buffering/seeking/ended/error`），UI 不自行推断。
- 随机播放维护独立顺序，不是每次随机取下标；队列与循环模式可组合使用。
- 设计令牌与分层说明见 `docs/architecture.md`。

- 音频 URL 形如 `/music/<id>.<ext>`，构建后由 `closeBundle` 按 id 复制到 `dist/music/`，开发与生产路径一致。
- 标签解析失败不会中断构建，会记录到 `manifest.warnings`，并在「全部歌曲」页以「曲库提示」折叠展示。

## 部署到 Cloudflare Pages

方式一（命令行）：

```bash
npm run build
npx wrangler pages deploy dist --project-name smusic
```

首次部署需要 `npx wrangler login`（或提供 `CLOUDFLARE_API_TOKEN` 环境变量，**不要把 token 写进仓库**）。

方式二（控制台 Git 集成）：仓库连接到 Pages，构建命令 `npm run build`，输出目录 `dist`。

已包含的部署配置：

- `public/_redirects`：`/* /index.html 200`，支持 SPA 深链接（如 `/album/xxx` 直接刷新）。
- `public/_headers`：`assets` 长期强缓存、封面 7 天缓存、音频 1 小时缓存、`sw.js` 不缓存。
- `wrangler.toml`：`pages_build_output_dir = "dist"`。

## 已知限制

1. **Cloudflare Pages 单文件上限 25 MiB**：曲库中超过 25 MiB 的音频会被 Pages 拒绝，构建时会检查并告警。请压缩、转码或把超大文件移出 `music/`。
2. **新增歌曲需要重新构建部署**：纯静态站点无法在运行时列目录；若需要「丢进文件夹即出现」，要改为 R2 + Worker 列表接口（本项目按你的要求只使用 Pages）。
3. **PWA 只缓存界面与封面**，音频不拦截，避免破坏 Range 拖动进度条；离线时无法播放未缓存音频。
4. 内嵌歌词依赖文件本身带 `USLT`/`SYLT`，当前曲库没有；推荐使用同名 `.lrc`。
5. 音频随仓库提交并随部署上传，体积以实际曲库为准。如果仓库公开，请注意音乐版权。
6. 下载为单曲逐个下载，暂未提供专辑/整库打包 ZIP。
7. TTML/逐词歌词尚未实现，目前支持 LRC 与内嵌歌词。
8. `music-cache/` 是构建期生成的封面缓存，已在 `.gitignore` 中忽略。

## 目录结构

```
plugins/music-manifest.ts   构建期扫描与清单生成
src/
├─ types.ts                 共享领域类型
├─ router.ts / main.ts / App.vue
├─ stores/                  library.ts / player.ts / playlists.ts
├─ composables/             useMediaSession.ts / useShortcuts.ts
├─ audio/                   analyser.ts / state-machine.ts / queue.ts
├─ utils/                   search.ts / track-view.ts / recommend.ts / download.ts / format.ts
├─ components/
│  ├─ layout/               Sidebar / TopBar
│  ├─ track/TrackList.vue
│  ├─ library/              AlbumCard / ArtistCard / TrackCard
│  ├─ playlist/             AddToPlaylistMenu / PlaylistCover
│  ├─ player/               PlayerBar / NowPlayingView / Visualizer
│  └─ ui/                   Icon / CoverArt / EmptyState
├─ views/                   首页 / 全部歌曲 / 搜索 / 专辑 / 歌手 / 歌单 / 收藏 / 最近
└─ styles/                  tokens.css（设计令牌）/ base.css（重置与共享控件）
public/                     favicon / manifest / sw.js / _redirects / _headers
scripts/inspect-audio.mjs   音频标签体检脚本（npm run inspect:audio）
```

## 其他脚本

```bash
npm run typecheck     # vue-tsc 类型检查
npm test              # Vitest 单元测试
npm run inspect:audio # 打印每首音频的标签、封面、歌词与时长
```
