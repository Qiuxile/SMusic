# SMusic · 本地音乐库

一个部署在 Cloudflare Pages 上的纯静态本地音乐库：**曲目、专辑、歌手、封面、歌词全部来自 `music/` 目录里的音频文件标签**，不需要维护任何 JSON 清单。

## 特性

- **零配置曲库**：构建时递归扫描 `music/**/*.{mp3,flac,m4a,aac,ogg,opus,wav}`，用 `music-metadata` 读取 ID3/Vorbis 标签，生成内存清单（虚拟模块），不落地业务 JSON。
- **播放器**：播放/暂停、进度拖动、音量、上一首/下一首、列表循环/单曲循环/顺序、随机播放、播放队列（可移除、可插播）。
- **曲库视图**：全部歌曲、专辑、歌手、搜索、我的收藏、最近播放；专辑与歌手按标签自动归集。
- **歌词**：优先读取同名 `.lrc`，其次读取音频内嵌歌词（`USLT`/`SYLT`）；逐行同步高亮，点击某行跳转播放位置。
- **可视化**：Web Audio `AnalyserNode` 频谱柱状图。
- **本地数据**：收藏、最近播放、队列、音量、播放模式保存在 `localStorage`，不需要登录。
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

> 当前曲库实测：21 首音频中 **2 首带内嵌封面、0 首带内嵌歌词**；其中 `bgmusices/Pegato…` 文件头为 `fLaC`，已按实际格式改名为 `.flac`。其余 20 首为 ID3v2.3 标签的 MP3。

## 键盘快捷键

| 按键 | 功能 |
| --- | --- |
| `空格` | 播放 / 暂停 |
| `←` / `→` | 后退 / 前进 5 秒 |
| `↑` / `↓` | 音量 ±5% |
| `N` / `P` | 下一首 / 上一首 |
| `M` | 静音切换 |
| `L` | 打开/关闭歌词 |
| `V` | 打开/关闭可视化 |
| `Q` | 打开/关闭播放队列 |
| `/` | 聚焦搜索框 |
| `Esc` | 关闭浮层 |

## 架构

```
music/**.mp3|flac
      │
      ▼  构建期（plugins/music-manifest.ts）
music-metadata 解析标签 / 封面 / 歌词
      │  · 封面写入 music-cache/covers/<id>.<ext>
      │  · 清单以虚拟模块 virtual:music-manifest 注入
      ▼
Pinia: library（曲库/专辑/歌手/搜索/收藏/最近）
       player（队列/播放状态/循环随机/持久化）
      ▼
Vue Router 视图 + 自研组件（CSS 变量主题，无 UI 框架）
```

- 音频 URL 形如 `/music/<相对路径>`，构建后由 `closeBundle` 原样复制到 `dist/music/`，开发与生产路径一致。
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

1. **Cloudflare Pages 单文件上限 25 MiB**：当前最大文件约 23.2 MiB（那首 FLAC），不能再放更大的无损文件，否则部署会失败。构建时会检查并告警。
2. **新增歌曲需要重新构建部署**：纯静态站点无法在运行时列目录；若需要「丢进文件夹即出现」，要改为 R2 + Worker 列表接口（本项目按你的要求只使用 Pages）。
3. **PWA 只缓存界面与封面**，音频不拦截，避免破坏 Range 拖动进度条；离线时无法播放未缓存音频。
4. 内嵌歌词依赖文件本身带 `USLT`/`SYLT`，当前曲库没有；推荐使用同名 `.lrc`。
5. 101 MB 音频随仓库提交，首次构建/部署上传体积较大。如果仓库公开，请注意音乐版权。
6. `music-cache/` 是构建期生成的封面缓存，已在 `.gitignore` 中忽略。

## 目录结构

```
plugins/music-manifest.ts   构建期扫描与清单生成
src/
├─ types.ts                 共享领域类型
├─ router.ts / main.ts / App.vue
├─ stores/                  library.ts / player.ts
├─ composables/             useMediaSession.ts / useShortcuts.ts
├─ audio/analyser.ts        Web Audio 频谱分析器
├─ components/
│  ├─ layout/               Sidebar / TopBar
│  ├─ track/TrackList.vue
│  ├─ player/               PlayerBar / LyricsPanel / QueueDrawer / Visualizer
│  └─ ui/                   Icon / CoverArt / EmptyState
├─ views/                   8 个路由视图
└─ styles/base.css          CSS 变量、重置、通用控件
public/                     favicon / manifest / sw.js / _redirects / _headers
scripts/inspect-audio.mjs   音频标签体检脚本（npm run inspect:audio）
```

## 其他脚本

```bash
npm run typecheck     # vue-tsc 类型检查
npm run inspect:audio # 打印每首音频的标签、封面、歌词与时长
```
