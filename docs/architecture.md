# SMusic 架构与实施说明

本文把 `docs/design.md` 的产品规范落到当前项目的真实约束上，并记录实现范围、架构决策与阶段计划。`design.md` 仍是设计目标与验收标准的来源；本文解释“如何实现”和“哪些能力按本地曲库降级”。

## 1. 产品约束与降级原则

SMusic 是部署在 Cloudflare Pages 上的纯静态本地音乐库：没有账号体系、没有服务端 API、没有在线曲库，所有曲目与封面来自构建期的 `music/` 标签扫描。

因此：

- **不做虚假功能**。没有数据源的能力不放置装饰性入口。
- **推荐必须可解释**。首页“今日推荐”只使用本机收藏、最近播放、日期种子与曲库统计，不构造用户画像、编辑精选或情绪标签；同一天结果稳定。
- **首页只展示本地信号**。继续收听、最近播放、常听歌手、专辑与曲库预览均由已有数据派生，不伪造运营栏目。
- **歌单只做本地歌单**（`localStorage`），不承诺跨设备同步。
- **播放设备切换**不支持；Media Session 只做系统媒体控制。
- **Gapless / Crossfade** 需要后续基于 Web Audio 单独实现，不能把“预加载”冒充无缝播放。
- **下载**为单曲下载；专辑/整库 ZIP 打包未实现。

## 2. 分层架构

```
UI Layer
  views/            路由页面（首页、全部歌曲、搜索、专辑、歌手、歌单、收藏、最近）
  components/       布局、播放器、曲目列表、专辑/歌手卡、歌单菜单与基础控件
        │ 只发送播放意图
        ▼
Application Layer
  stores/library.ts 曲库派生数据、收藏、最近播放、搜索历史、搜索排序
  stores/player.ts  播放会话编排（对外 API）
  stores/playlists.ts 本地歌单 CRUD、批量增删、搜索
  utils/search.ts   搜索归一化、字段加权与一次编辑距离容错
  utils/track-view.ts 曲目筛选/排序
  utils/recommend.ts 本地每日推荐
        │
        ├── Playback Core      <audio>、状态机、Media Session
        ├── Queue Manager      队列、顺序/随机顺序、循环
        └── Session Storage    队列、索引、位置、音量、模式
        ▼
Lyrics Engine
  plugins/music-manifest.ts  LRC / 内嵌歌词解析（构建期）
  components/player/*        同步渲染与 seek
        ▼
Data / Media Layer
  virtual:music-manifest     构建期生成的只读清单
  /music/<id>.<ext>          静态音频（支持 Range）
  /music-cache/covers/*      构建期导出的封面
```

UI 不直接操作 `HTMLAudioElement`；所有播放、跳转、队列变更都通过 `usePlayerStore`。播放器实例由 store 持有，跨路由不重建。

## 3. 播放状态机

状态定义：

| 状态 | 含义 | 主要入口 |
| --- | --- | --- |
| `idle` | 无音源 | 初始、清空队列 |
| `loading` | 已设置音源，等待元数据/可播放 | `load()` |
| `ready` | 元数据就绪但未播放 | `loadedmetadata` / `canplay` |
| `playing` | 正在输出音频 | `playing` 事件 |
| `paused` | 用户暂停 | `pause` 事件 |
| `buffering` | 播放中等待数据 | `waiting` 事件 |
| `seeking` | 跳转中 | `seek()`，`seeked` 后回到播放/暂停 |
| `ended` | 当前曲目结束 | `ended` 事件 |
| `error` | 加载/解码失败 | `error` 事件、`play()` 拒绝 |

合法转换（摘要）：

```
idle → loading → ready → playing ⇄ paused
                 │         │  ↘ buffering → playing
                 │         ├─ seeking → playing | paused
                 │         └─ ended → loading（下一首）| ended
                 └─ error ← 任意加载/播放失败
任意状态 → idle（清空队列）
```

约束：

- `playing` 与 `status` 必须由同一组音频事件驱动，避免 UI 各自维护布尔值。
- `play()` 被浏览器拒绝时进入 `paused` 并给出可读错误，不伪装成播放成功。
- 快速切歌通过 `src` 重置与 `AbortError` 忽略处理，不把中断当失败。

## 4. 队列与随机播放

- 队列是“当前播放顺序”的唯一来源；`queue[index]` 始终是当前曲目。
- 随机播放维护独立的 `shuffleOrder`（队列位置排列）与游标，而不是每次 `Math.random()` 取下标：
  - 开启随机时以当前曲目为首生成排列；
  - 下一首按排列前进，走完后重新生成；
  - 上一首按排列回退；
  - 关闭随机时回到原始队列顺序。
- 循环模式 `off | all | one` 与随机顺序正交：`one` 优先重播当前曲目。
- 队列变更（插播、移除、清空）后重建随机顺序，保持当前曲目不变。
- 批量入队通过 `enqueueTracks()` 去重后一次写入，避免连续切换造成队列抖动；“下一首播放”仍复用插播语义。

## 5. 会话持久化

持久化键 `mp.player.v1`：

```json
{
  "queue": ["trackId"],
  "index": 0,
  "position": 42.5,
  "volume": 0.8,
  "muted": false,
  "repeat": "all",
  "shuffle": false,
  "showVisualizer": false
}
```

- 播放位置按节流写入（约 5 秒），暂停、切歌、页面隐藏时立即写入。
- 恢复时只加载音源与位置，不自动播放（遵守自动播放策略）。
- 恢复位置在 `loadedmetadata` 后应用，并夹在 `[0, duration]` 内。
- 失效曲目 id 在读取时过滤，避免旧清单造成空队列。

本地持久化键：

| 键 | 内容 | 失效策略 |
| --- | --- | --- |
| `mp.player.v1` | 队列、索引、位置、音量、模式 | 过滤当前曲库不存在的曲目 id |
| `mp.favorites.v1` | 收藏曲目 id | 过滤未知 id |
| `mp.recent.v1` | 最近播放 id，最多 50 条 | 过滤未知 id |
| `mp.search-history.v1` | 搜索历史，最多 8 条 | 忽略空串，去重后保留最近项 |
| `mp.playlists.v1` | 歌单名称、描述、`trackIds` | 过滤未知曲目；最多 100 个歌单 |
| `mp.library.view.v1` | 全部歌曲页的筛选、排序、方向、歌手/专辑过滤 | 非法枚举回退默认值 |

歌单只保存曲目 id，展示时通过 `library.byId` 解析，不复制曲目元数据；曲库变化后自动忽略已删除曲目。

## 6. 设计系统落地

`src/styles/tokens.css` 定义三层令牌：

1. **Primitive**：中性色阶、品牌绿、语义红。
2. **Semantic**：`--bg`、`--surface-*`、`--text-*`、`--accent*`、`--border*`。
3. **Component/Layout**：间距 `--space-*`、圆角 `--radius-*`、字号 `--text-*`、动效 `--motion-*`、布局尺寸。

规则：

- 组件不得新增品牌色；只使用语义令牌。
- 强调色只用于主操作、当前播放状态、焦点与进度。
- 普通卡片不使用重阴影；浮层使用克制的黑色阴影。
- 圆角语义：封面/卡片 6px、面板 8px、按钮/搜索框胶囊、播放按钮圆形。
- 动画 120–260ms，`prefers-reduced-motion` 下缩短到近乎即时。
- 全屏播放页使用 `role="dialog"` + `aria-modal="true"`，打开时给 `#app` 加 `inert`，关闭后恢复触发按钮焦点。
- 移动端曲目操作保留加入歌单、下载与收藏；队列类操作在大屏常显，避免窄屏一行放不下。
- 批量选择时点击曲目行切换选中状态，不会误触播放；复选框使用 `role="checkbox"` 与 `aria-checked`。

## 7. 目录结构

```
docs/
  design.md                 产品与设计规范（目标）
  architecture.md           本文件（实现约束与阶段）
src/
  styles/tokens.css         设计令牌
  styles/base.css           重置、排版、共享控件
  audio/state-machine.ts    合法状态转换
  audio/queue.ts            随机顺序与下一首/上一首计算
  audio/analyser.ts         频谱分析
  stores/library.ts         曲库派生数据、收藏、最近播放、搜索历史
  stores/player.ts          播放会话编排
  stores/playlists.ts       本地歌单
  utils/search.ts           搜索归一化、加权与容错
  utils/track-view.ts       曲目筛选与排序
  utils/recommend.ts        本地每日推荐
  components/layout/        Sidebar / TopBar（含搜索建议）
  components/player/        PlayerBar / NowPlayingView / Visualizer
  components/track/         TrackList（选择、歌单、下载）
  components/library/       AlbumCard / ArtistCard / TrackCard
  components/playlist/      AddToPlaylistMenu / PlaylistCover
  components/ui/            Icon / CoverArt / EmptyState
  views/                    首页 / 全部歌曲 / 搜索 / 专辑 / 歌手 / 歌单 / 收藏 / 最近
```

## 8. 阶段计划

| 阶段 | 内容 | 状态 |
| --- | --- | --- |
| Phase 1 | 设计令牌、全局视觉基础、全屏播放页、播放状态机、队列随机顺序、位置恢复 | 已完成 |
| Phase 2 | 首页分区、搜索历史/建议/分组结果、曲目排序筛选、本地歌单与批量管理 | 已完成 |
| Phase 3 | TTML/逐词歌词、翻译与音译开关、歌词虚拟化 | 待开始 |
| Phase 4 | 预加载与 Crossfade、队列拖拽排序、长列表虚拟化 | 待开始 |
| Phase 5 | 无障碍审计、错误恢复、性能指标与自动化测试扩充 | 待开始 |

Phase 2 路由：`/`（首页）、`/library`（全部歌曲与管理）、`/search`、`/playlists`、`/playlist/:id`。原 `/` 的全部歌曲列表迁移到 `/library`，侧栏与移动端导航同步调整。

Phase 2 验证：`vue-tsc` 通过；Vitest 9 个文件、40 个用例通过；生产构建通过。真实浏览器在约 600px 窄视口检查了首页、全部歌曲、批量工具栏与持久化布局；桌面宽屏与搜索/歌单完整点击链路仍需在可用浏览器中复查。

每个阶段完成后执行：`npm run typecheck`、`npm test`、`npm run build`，并在浏览器中检查桌面与移动端实际交互。
