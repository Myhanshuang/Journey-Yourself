# Development Guide

> 面向后续开发、功能添加、重构与维护的工程说明书。
>
> 本文描述的是**当前代码真实状态**，不是理想蓝图。它的目标不是“宣传架构”，而是让后续开发者能快速回答以下问题：
> 1. 这个项目现在怎么跑？
> 2. 某个业务应该放在哪里？
> 3. 改某个功能会影响哪些层？
> 4. 应该新增什么接口、组件、状态、测试？
> 5. 哪些地方是历史债、哪些地方不能碰？

---

## 1. 文档目标与阅读方式

### 1.1 文档目标

本文档用于指导后续进行：

- 日常开发
- 新功能设计与实现
- 业务域拆分
- 前后端联动
- 测试与验证
- 技术债识别与收敛

### 1.2 建议阅读顺序

第一次接手项目时，建议按下面顺序阅读：

1. `第 2 章：项目总览`
2. `第 3 章：仓库结构`
3. `第 4 章：运行时架构`
4. `第 5 章：后端详解`
5. `第 6 章：前端详解`
6. `第 7 章：关键业务链路`
7. `第 10 章：如何添加新功能`
8. `第 11 章：测试与维护规则`

### 1.3 本文档和其他文件的关系

- `structure.md`
  - 目标结构设计文档
  - 说明“应该整理成什么样”
- `DEVELOPMENT_GUIDE.md`
  - 当前工程说明书
  - 说明“现在实际是什么样、应该怎么继续做”
- `ROADMAP.md`
  - 未来开发路线图
  - 说明“下一阶段做什么、先后顺序是什么”
- `docs/playbooks/`
  - 操作手册集合
  - 说明“具体怎么新增页面、接口、集成、编辑器能力、怎么验证”

### 1.4 文档分层规则

后续补充文档时，必须遵守下面的分层：

- `DEVELOPMENT_GUIDE.md`
  - 只放稳定事实
  - 当前架构、目录、数据流、代码组织、主链路、维护规则
- `ROADMAP.md`
  - 只放未来计划
  - 阶段目标、优先级、未完成项、推进顺序、风险
- `docs/playbooks/*.md`
  - 只放操作方法
  - 某类任务如何做、放在哪、如何验证、常见误区

禁止把三类内容重新混在一起：

- 不要把临时迭代计划塞进 `DEVELOPMENT_GUIDE.md`
- 不要把当前代码事实塞进 `ROADMAP.md`
- 不要把面向执行的步骤写成散落在大文档里的零碎说明

---

## 2. 项目总览

### 2.1 产品定位

这是一个以“日记/笔记本/个人知识输入”为核心的个人内容系统，具备以下产品能力：

- 多用户认证与管理
- 日记创建、编辑、更新、删除、置顶、移动
- 富文本编辑
- 标签、心情、位置、天气等元数据
- 笔记本管理与草稿本机制
- 首页聚合、时间线浏览、搜索
- 公开分享 diary / notebook
- 外部服务集成
  - Immich
  - Karakeep
  - Notion
  - AMap
  - MediaCrawler
- 自动任务与每日摘要
- 系统维护
  - 导入/导出数据库
  - 孤儿文件扫描/删除
  - 自动备份

### 2.2 技术栈

后端：

- FastAPI
- SQLModel / SQLAlchemy
- SQLite
- APScheduler
- httpx
- pydantic-settings

前端：

- React 19
- TypeScript
- Vite
- React Router
- TanStack Query
- Framer Motion
- TipTap
- Zustand
- Tailwind CSS 4

移动端：

- Capacitor Android

### 2.3 当前工程状态

当前项目已经完成了一轮较深的结构整理，重要结论如下：

- 后端旧的 `backend/app/routers/*.py` 兼容壳已基本全部移除，`backend/app/routers/` 只保留 `__init__.py`
- 后端 API 现在以两条主轨为核心：
  - `api/v1`
  - `api/app`
- 前端主读页面已经逐步切换到 `api/app`
- 前端基础 API 层已拆成：
  - `shared/api/client.ts`
  - `shared/api/legacy.ts`
  - `shared/api/appQuery.ts`

### 2.4 仍未完全收口的地方

截至当前状态，仍需注意：

- 全仓前端 `lint` 尚未收敛为全绿
- 多个历史大文件仍然过重
  - `Editor.tsx`
  - `SettingsView.tsx`
  - `JourneyUI.tsx`
- FastAPI 生命周期仍使用 `@app.on_event`
- 部分后端时间处理仍使用 `datetime.utcnow()`

这些都不是“架构方向错误”，但会影响长期维护成本。

---

## 3. 仓库结构

### 3.1 顶层目录

```text
/
  backend/
  frontend/
  test/
  production/
  structure.md
  DEVELOPMENT_GUIDE.md
```

### 3.2 目录职责

- `backend/`
  - 后端 API、数据库、调度器、业务域代码
- `frontend/`
  - Web UI、Capacitor 前端、组件与页面逻辑
- `test/`
  - 本地 Docker 测试环境、测试数据、脚本
- `production/`
  - 生产相关目录
  - **禁止擅自修改**

### 3.3 受保护区域

以下内容应视为保护区：

- `production/`
- 任意 `production.sh`

这不是代码风格建议，而是硬规则。

---

## 4. 运行时架构

### 4.1 运行形态

项目本质上是一个：

**模块化单体 + 前后端同仓部署**

它不是微服务，也不打算在当前阶段拆成多个独立服务。

### 4.2 后端运行入口

核心入口：

- `backend/app/main.py`

职责：

- 创建 FastAPI app
- 配置 CORS
- 配置静态资源挂载
- 启动数据库初始化
- 启动自动备份
- 启动任务调度器
- 挂载 `api/v1` 与 `api/app`
- 提供 SPA fallback

### 4.3 前端运行入口

核心入口：

- `frontend/src/main.tsx`
- `frontend/src/router.tsx`

职责：

- 初始化 React
- 初始化 QueryClient
- 初始化 Router
- 提供整体路由壳

### 4.4 前后端数据交互模式

当前分成两层：

1. `legacy resource api`
   - 资源式接口
   - 仍存在于兼容层
   - 供尚未迁移完成的页面和编辑/写入逻辑使用

2. `app query api`
   - 面向页面
   - 更轻量
   - 更强调卡片模型、分页模型、聚合结果

### 4.5 状态归属原则

后端：

- `Diary` 是条目真值
- `Notebook.stats_snapshot` 是派生值

前端：

- 服务端状态：React Query
- 工作流状态：组件局部 state / feature state
- 全局壳层状态：Zustand
- URL 状态：路由参数/查询参数

---

## 5. 后端详解

### 5.1 后端总体结构

当前后端主目录：

```text
backend/app/
  main.py
  config.py
  database.py
  auth.py
  security.py
  models.py
  schemas.py
  scheduler.py
  services/
  api/
    v1/
    app/
  modules/
    identity/
    journaling/
    notebooks/
    discovery/
    sharing/
    integrations/
    automation/
    system_admin/
```

### 5.2 后端基础文件说明

#### `config.py`

职责：

- 统一定义环境变量配置
- 数据库地址
- JWT 配置
- 初始化管理员
- MediaCrawler 地址

关键字段：

- `SECRET_KEY`
- `ACCESS_TOKEN_EXPIRE_MINUTES`
- `ENCRYPTION_KEY`
- `FIRST_ADMIN_USER`
- `FIRST_ADMIN_PASSWORD`
- `DATABASE_URL`
- `MEDIACRAWLER_URL`

#### `database.py`

职责：

- 创建 engine
- 配置 SQLite pragma
- 自动迁移新表/新列
- 初始化数据库与首个管理员
- 提供 `get_session`

重要函数：

- `migrate_database()`
- `create_db_and_tables()`
- `get_session()`

说明：

- 当前数据库迁移仍是“运行时探测 + ALTER TABLE”的方式
- 适合本项目当前体量，但不是长期最优方案

#### `auth.py`

职责：

- 密码哈希 / 验证
- JWT 生成
- 当前用户鉴权
- notebook / diary 所有权校验

重要函数：

- `verify_password`
- `get_password_hash`
- `create_access_token`
- `get_current_user`
- `verify_notebook_ownership`
- `verify_diary_ownership`

#### `security.py`

职责：

- 对第三方服务 API key 做加密/解密

重要函数：

- `encrypt_data`
- `decrypt_data`

#### `models.py`

职责：

- 定义当前全部 SQLModel 模型

当前核心模型：

- `User`
- `Notebook`
- `Diary`
- `Tag`
- `DiaryTagLink`
- `ShareToken`
- `Task`
- `XiaohongshuPost`
- `XiaohongshuImage`
- `BilibiliVideo`

#### `schemas.py`

职责：

- 旧资源接口与部分共享 schema

当前仍然重要，因为：

- `api/v1` 和部分模块仍直接复用这里的 schema

#### `scheduler.py`

职责：

- APScheduler 调度
- 任务表初始化
- 任务注册与重调度

核心函数：

- `start_scheduler()`
- `shutdown_scheduler()`
- `reschedule_task()`
- `run_daily_summary()`

### 5.3 API 轨道

#### 5.3.1 `api/v1`

入口：

- `backend/app/api/v1/router.py`

职责：

- 聚合传统业务路由
- 维持兼容
- 不作为新页面查询的主出口

当前聚合的模块：

- identity
- notebooks
- journaling
- discovery
- sharing
- automation
- integrations
- system_admin

#### 5.3.2 `api/app`

入口：

- `backend/app/api/app/router.py`

定位：

- 面向前端页面
- 更轻量
- 更适合列表、详情、聚合、公开内容分页

当前已提供接口：

- `GET /api/app/home`
- `GET /api/app/timeline`
- `GET /api/app/entries/{entry_id}`
- `GET /api/app/notebooks/{notebook_id}`
- `GET /api/app/notebooks/{notebook_id}/entries`
- `GET /api/app/search/entries`
- `GET /api/app/search/bookmarks`
- `GET /api/app/stats`
- `GET /api/app/public/shares/{token}`
- `GET /api/app/public/shares/{token}/entries`

---

## 6. 后端业务域

### 6.1 `identity`

目录：

```text
backend/app/modules/identity/
  auth_router.py
  users_router.py
  router.py
```

职责：

- 登录与注册
- 当前用户信息
- 用户资料
- 用户密码
- 管理员用户管理

关键路由：

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/users/me`
- `PATCH /api/users/me`
- `PATCH /api/users/me/password`
- `GET /api/users/`
- `POST /api/users/`
- `PATCH /api/users/{user_id}/role`
- `PATCH /api/users/{user_id}/password`
- `DELETE /api/users/{user_id}`

实现特点：

- 目前仍是 router 内直接编排数据库读写
- 已完成从混合 `users.py` 中拆出身份逻辑

### 6.2 `journaling`

目录：

```text
backend/app/modules/journaling/
  diaries_router.py
  tags_router.py
  helpers/
    content_stats.py
    cover_image.py
  router.py
```

职责：

- 日记 CRUD
- 标签同步
- 字数与图片数统计
- 首图封面提取
- 封面图片缓存路径生成
- pin/unpin

关键路由：

- `POST /api/diaries/`
- `GET /api/diaries/recent`
- `GET /api/diaries/pinned`
- `GET /api/diaries/last-year-today`
- `GET /api/diaries/notebook/{notebook_id}`
- `GET /api/diaries/{diary_id}`
- `PUT /api/diaries/{diary_id}`
- `POST /api/diaries/{diary_id}/toggle-pin`
- `DELETE /api/diaries/{diary_id}`
- `GET /api/tags/`

关键函数：

- `sync_tags`
- `walk_content`
- `extract_first_image_src`
- `resolve_cover_image_url`
- `cache_remote_cover_image`

当前设计重点：

- `Diary.content` 是正文真值
- `Diary.cover_image_url` 是展示派生字段
- 写入时提取封面
- 远程图可缓存到本地 `cover_cache`

### 6.3 `notebooks`

目录：

```text
backend/app/modules/notebooks/
  notebooks_router.py
  helpers/
    default_cover.py
    stats_snapshot.py
  router.py
```

职责：

- notebook CRUD
- 草稿本创建/确保存在
- notebook 统计快照维护

关键路由：

- `POST /api/notebooks/`
- `PUT /api/notebooks/{notebook_id}`
- `DELETE /api/notebooks/{notebook_id}`
- `GET /api/notebooks/{notebook_id}`
- `GET /api/notebooks/`
- `GET /api/notebooks/drafts/ensure`

关键函数：

- `build_default_cover`
- `update_stats_snapshot`

### 6.4 `discovery`

目录：

```text
backend/app/modules/discovery/
  timeline_router.py
  search_router.py
  stats_router.py
  router.py
```

职责：

- timeline 浏览
- 搜索
- stats 聚合

注意：

- 这里有两层实现
  - 旧资源接口：`/api/timeline`, `/api/search/unified`, `/api/stats`
  - 新页面查询接口：`/api/app/*`

### 6.5 `sharing`

目录：

```text
backend/app/modules/sharing/
  share_router.py
  router.py
```

职责：

- 创建分享
- 修改过期
- 删除分享
- 公开 diary/notebook 展示

关键路由：

- `POST /api/share/`
- `GET /api/share/`
- `PATCH /api/share/{share_id}`
- `DELETE /api/share/{share_id}`
- `GET /api/share/{token}`

### 6.6 `integrations`

目录：

```text
backend/app/modules/integrations/
  assets_router.py
  amap_router.py
  proxy_router.py
  karakeep_router.py
  notion_router.py
  media_crawler_router.py
  *_settings_router.py
  router.py
```

职责：

- 按 provider 隔离第三方服务

子能力分组：

#### 6.6.1 Provider 设置路由

- `immich_settings_router.py`
- `karakeep_settings_router.py`
- `ai_settings_router.py`
- `geo_settings_router.py`
- `notion_settings_router.py`

作用：

- 用户配置验证
- 保存 API key / base URL / provider 设置

#### 6.6.2 Provider 业务路由

- `proxy_router.py`
  - Immich 资源浏览、导入、原图/视频代理
- `assets_router.py`
  - 本地上传媒体
- `amap_router.py`
  - 地理搜索、逆地理编码、天气
- `karakeep_router.py`
  - bookmark 拉取
- `notion_router.py`
  - notion page search / page / block children
- `media_crawler_router.py`
  - 小红书 / B站抓取

### 6.7 `automation`

目录：

```text
backend/app/modules/automation/
  tasks_router.py
  router.py
```

职责：

- 任务列表
- 任务全局配置
- 用户任务开关
- 每日摘要

关键路由：

- `POST /api/tasks/trigger-daily-summary`
- `GET /api/tasks/`
- `PATCH /api/tasks/{task_name}`
- `PATCH /api/tasks/{task_name}/toggle`

关键函数：

- `process_user_daily_summary`
- `generate_ai_summary`
- `markdown_to_prosemirror`

### 6.8 `system_admin`

目录：

```text
backend/app/modules/system_admin/
  router.py
```

职责：

- 导出 DB
- 导入 DB
- 扫描孤儿文件
- 删除孤儿文件

关键路由：

- `GET /api/users/system/export`
- `POST /api/users/system/import`
- `GET /api/users/system/orphan-files`
- `DELETE /api/users/system/orphan-files`

---

## 7. `api/app` 查询层详解

### 7.1 设计目标

`api/app` 的目标不是替换所有资源接口，而是提供：

- 页面更容易消费的模型
- 轻量列表
- 详情分离
- 聚合结果
- 游标分页

### 7.2 共享 schema

位置：

- `backend/app/api/app/schemas.py`

关键模型：

- `EntryCard`
- `EntryDetailPayload`
- `NotebookDetailPayload`
- `HomePayload`
- `TimelinePayload`
- `PublicTimelinePayload`
- `PublicShareSummaryPayload`
- `StatsSummaryPayload`

### 7.3 共享 cursor

位置：

- `backend/app/api/app/cursor.py`

作用：

- 游标编码
- 游标解码

关键函数：

- `encode_cursor`
- `decode_cursor`

### 7.4 当前查询接口说明

#### `GET /api/app/home`

文件：

- `home_router.py`

返回：

- pinned
- recent
- on_this_day

#### `GET /api/app/timeline`

文件：

- `timeline_router.py`

返回：

- `items`
- `page.next_cursor`
- `page.has_more`

支持：

- `notebook_id`
- cursor 分页

#### `GET /api/app/entries/{entry_id}`

文件：

- `entry_detail_router.py`

返回完整 `EntryDetailPayload`

#### `GET /api/app/notebooks/{notebook_id}`

文件：

- `notebook_detail_router.py`

返回 notebook 头部信息

#### `GET /api/app/notebooks/{notebook_id}/entries`

文件：

- `notebook_entries_router.py`

返回 notebook 下的条目流

#### `GET /api/app/search/entries`

文件：

- `search_entries_router.py`

支持：

- `q`
- `tag`
- `mood`
- `weather`
- `notebook_id`

#### `GET /api/app/search/bookmarks`

文件：

- `search_bookmarks_router.py`

作用：

- Karakeep bookmark 搜索结果的页面消费接口

#### `GET /api/app/stats`

文件：

- `stats_router.py`

作用：

- Insights 页面数据

#### `GET /api/app/public/shares/{token}`

文件：

- `public_share_summary_router.py`

作用：

- 公开 share 摘要

#### `GET /api/app/public/shares/{token}/entries`

文件：

- `public_share_entries_router.py`

作用：

- notebook 分享内容分页

---

## 8. 数据模型与数据语义

### 8.1 `User`

核心字段：

- 认证
  - `username`
  - `hashed_password`
  - `role`
- 时区
  - `timezone`
  - `time_offset_mins`
- integrations
  - `immich_*`
  - `karakeep_*`
  - `ai_*`
  - `geo_*`
  - `notion_*`
- automation
  - `task_configs`

### 8.2 `Notebook`

核心字段：

- `name`
- `description`
- `cover_url`
- `user_id`
- `stats_snapshot`

语义：

- notebook 是容器真值
- `stats_snapshot` 是派生值，不是绝对真值

### 8.3 `Diary`

核心字段：

- `title`
- `content`
- `cover_image_url`
- `date`
- `updated_at`
- `word_count`
- `image_count`
- `mood`
- `location_snapshot`
- `weather_snapshot`
- `is_favorite`
- `is_pinned`

语义：

- `content` 是正文真值
- `cover_image_url` 是展示派生资产

### 8.4 `Tag`

语义：

- 全局 tag 池
- diary 通过 `DiaryTagLink` 关联

### 8.5 `ShareToken`

语义：

- 指向 diary 或 notebook 的公开访问令牌
- 支持过期时间
- 支持失效

### 8.6 `Task`

语义：

- 全局任务定义与调度配置

---

## 9. 前端详解

### 9.1 前端总体结构

```text
frontend/src/
  main.tsx
  router.tsx
  views/
  views/diary/
  views/discovery/
  views/notebooks/
  views/settings/
  features/
  components/
  hooks/
  lib/
  shared/
```

### 9.2 路由层

位置：

- `frontend/src/router.tsx`

特点：

- 主应用壳走 `AppLayout`
- 编辑页 `WriteView/EditView` 为全屏页面
- 其余页面挂在主壳下
- 部分重页面已迁入域目录
  - `views/diary/DiaryDetailView.tsx`
  - `views/discovery/TimelineView.tsx`
  - `views/notebooks/NotebookDetailView.tsx`
  - `views/settings/SettingsView.tsx`

### 9.3 应用壳

位置：

- `components/AppLayout.tsx`

职责：

- 桌面侧边栏
- 移动底部导航
- 顶部搜索入口
- 主滚动容器
- NotebookModal 挂载
- 向子页面注入：
  - notebooks
  - setNotebookModal
  - handleWriteClick
  - restorePosition

### 9.4 编辑器

位置：

- `components/Editor.tsx`

这是前端最复杂的文件之一。

职责包括：

- TipTap 编辑器初始化
- 标题 / notebook / mood / location / weather / tags 管理
- 媒体上传
- 外部资源插入
  - Immich
  - Karakeep
  - Notion
  - 小红书
  - B站
- 自动缓存
- 恢复缓存
- 保存/发布
- 退出确认
- 移动端双顶栏布局
- 主编辑区安全留白

关键接口：

- `EditorRef`
  - `getCurrentData`
  - `hasUnsavedChanges`
  - `clearCache`
  - `saveCacheNow`

关键状态：

- `title`
- `selectedNotebookId`
- `mood`
- `location`
- `weather`
- `tags`
- `activeModal`
- `uploading`

### 9.5 共享 UI 层

#### `JourneyUI.tsx`

当前是一个“混合型 UI 聚合文件”。

它做了几件事：

- 聚合并 re-export 多个 UI 工具
- 提供 `DiaryItemCard`
- 提供 `DiaryListItem`
- 提供 `SidebarNavItem`
- 提供 `ActionButton`
- 提供 `OptionButton`
- 提供 `GlassHeader`

当前风险：

- 文件职责过多
- 仍然是后续重点拆分对象

#### `modal.tsx`

作用：

- 全站共享 modal primitive
- 控制：
  - dialog
  - sheet
  - fullscreen
- 负责：
  - backdrop
  - z-index
  - 动画
  - 内容盒子尺寸
  - 裁剪

当前状态：

- 已统一提高 z-index，避免被编辑页双顶栏压住
- 已统一收紧尺寸
- 已调整桌面态比例

#### `selection-modal.tsx`

作用：

- 基于 `Modal` 的选择式弹窗壳
- 统一 header/content/footer 结构

### 9.6 API 层

#### `shared/api/client.ts`

职责：

- axios client
- base URL
- token 注入
- 401 处理

#### `shared/api/legacy.ts`

职责：

- 旧资源 API 封装
- 仍供写入与未完全迁移功能使用

#### `shared/api/appQuery.ts`

职责：

- 新页面查询 API

当前包含：

- `home`
- `timelinePage`
- `timelineAll`
- `entryDetail`
- `notebookDetail`
- `notebookEntriesPage`
- `notebookEntriesAll`
- `publicShareSummary`
- `publicShareEntriesPage`
- `publicShareEntriesAll`
- `searchEntries`
- `searchBookmarks`
- `statsSummary`

### 9.7 业务 feature 层

当前已落地的 feature：

- `features/journaling/entry-actions`
  - `useTogglePin`
  - `useDeleteDiary`
- `features/integrations/...`
  - location picker
  - weather picker
  - immich picker
  - karakeep picker
  - notion picker

说明：

- 这层还不是最终形态
- 但已经是后续新增功能的推荐落点

### 9.8 hooks 层

关键 hooks：

- `useAdjustedTime`
- `useConfirm`
- `useDeleteDiary`
- `useJourneyNavigation`
- `useMobile`
- `useScrollPreservation`
- `useToast`
- `useTogglePin`

注意：

- 其中不少 hook 仍有 lint 债
- `useAdjustedTime` / `useMobile` 等与 React Compiler 规则存在冲突

---

## 10. 关键业务链路

### 10.1 登录

链路：

1. 前端 `LoginView`
2. `authApi.login`
3. `POST /api/auth/login`
4. `create_access_token`
5. token 存入 localStorage
6. axios request interceptor 自动携带 token

### 10.2 新建 diary

链路：

1. 前端 `WriteView -> Editor`
2. 选择 notebook、标题、正文、元数据
3. `diaryApi.create`
4. `POST /api/diaries/`
5. 后端：
   - notebook 所有权校验
   - `walk_content`
   - `resolve_cover_image_url`
   - `sync_tags`
   - 更新 `Notebook.stats_snapshot`
6. 前端 invalidate

### 10.3 更新 diary

链路：

1. `EditView`
2. 读详情：`appQueryApi.entryDetail`
3. 编辑器缓存、恢复、保存
4. `PUT /api/diaries/{diary_id}`
5. 后端：
   - 重算字数/图片数
   - 更新封面图
   - notebook move 时同步调整旧/新 notebook 统计

### 10.4 首页聚合

链路：

1. `HomeView`
2. `appQueryApi.home`
3. `GET /api/app/home`
4. 后端：
   - pinned
   - recent
   - on_this_day
5. 前端用 `DiaryItemCard` 直接渲染

### 10.5 时间线

链路：

1. `TimelineView`
2. `appQueryApi.timelineAll`
3. 后端分页 `GET /api/app/timeline`
4. 前端合并页数据
5. 前端本地做 year/month grouping

### 10.6 分享

链路：

1. `shareApi.create`
2. `POST /api/share/`
3. `ShareToken`
4. 公共访问：
   - `GET /api/app/public/shares/{token}`
   - `GET /api/app/public/shares/{token}/entries`

### 10.7 搜索

链路：

1. `SearchView`
2. 分两类 query
   - `searchEntries`
   - `searchBookmarks`
3. 前端合并展示

### 10.8 每日摘要任务

链路：

1. `scheduler.py` 调度
2. `run_daily_summary`
3. `process_user_daily_summary`
4. 拉取 Karakeep bookmarks
5. 调 AI 生成摘要
6. 写入 `Everyday Reading` notebook

---

## 11. 封面图与卡片视觉

### 11.1 当前设计

`DiaryItemCard` 会尝试使用：

1. `diary.cover_image_url`
2. 回退到 `getFirstImage(diary.content)`

即：

- 新读模型优先
- 旧内容解析为兜底

### 11.2 后端封面图处理

位置：

- `backend/app/modules/journaling/helpers/cover_image.py`

职责：

- 提取正文第一张图
- 如果是本地路径，直接使用
- 如果是远程 URL，可缓存到 `cover_cache`

关键函数：

- `extract_first_image_src`
- `get_cover_cache_dir`
- `infer_extension`
- `cache_remote_cover_image`
- `resolve_cover_image_url`

### 11.3 前端视觉实现

位置：

- `frontend/src/components/ui/JourneyUI.tsx`

当前卡片效果由 3 层构成：

1. 底层图片
2. 半透明白遮罩
3. 渐变覆盖层

这不是后端模糊图，而是：

- 后端提供稳定的底图资产
- 前端负责玻璃态视觉层

---

## 12. 如何新增功能

### 12.1 如果新增一个读页面

推荐顺序：

1. 先定义前端页面需要的轻量模型
2. 在 `backend/app/api/app/` 新增 query router
3. 在 `frontend/src/shared/api/appQuery.ts` 新增 query 方法
4. 页面直接消费新 query
5. 如有 mutation，继续沿用 legacy resource api 或对应 command api

### 12.2 如果新增一个写入功能

推荐顺序：

1. 先确定属于哪个业务域
2. 在对应 `modules/<domain>/..._router.py` 增加路由
3. 把逻辑尽量收进 helper / service
4. 前端优先从 feature 层调用
5. 成功后统一 invalidate React Query 缓存

### 12.3 如果新增一个 integration provider

推荐结构：

```text
backend/app/modules/integrations/<provider>_settings_router.py
backend/app/modules/integrations/<provider>_router.py
frontend/src/features/integrations/<provider>/
```

原则：

- 配置与验证一条线
- 资源浏览/插入一条线
- 不要再塞回 `users` 或 `Editor` 的大文件里

### 12.4 如果新增一个编辑器插入块

需要同时考虑：

- TipTap extension
- 只读渲染 view
- editor modal/picker
- 数据 schema
- 公共分享是否支持显示

### 12.5 如果新增一个卡片展示字段

优先做法：

1. 后端在 `api/app/schemas.py` 中补字段
2. 后端 query router 填值
3. 前端 `appQuery.ts` 补类型
4. `JourneyUI.tsx` / 具体卡片消费

不要做法：

- 前端从 `content` 临时拼凑一切
- 把重型 detail 数据塞回列表接口

---

## 13. 测试与维护

### 13.1 后端测试

当前主要有两层：

1. 结构兼容测试
- 路由路径是否保持
- 模块是否承接旧语义

2. E2E smoke
- 登录
- notebook
- diary
- home
- timeline
- detail
- search
- share

关键命令：

```bash
cd backend
./.venv/bin/python -m unittest discover tests -v
```

### 13.2 前端测试

当前主要是 node 层面的结构/回归测试：

- 弹窗层级
- 弹窗尺寸
- 编辑器安全区
- query 使用
- API client 布局

命令：

```bash
cd frontend
node --test tests/*.test.mjs
```

### 13.3 构建验证

```bash
cd frontend
npm run build
```

### 13.4 当前未通过项

当前全仓前端 lint 仍未收敛为全绿。

重灾区：

- `components/Editor.tsx`
- `views/settings/SettingsView.tsx`
- `components/ui/JourneyUI.tsx`
- `shared/api/legacy.ts`
- 多个 `extensions/*`

### 13.5 本地 Docker 测试

已有：

- `test/local_test.sh`

注意：

- 该脚本假设在 `test/` 目录中执行

---

## 14. 已知风险与技术债

### 14.1 后端

- `main.py` 仍使用 `@app.on_event`
- `datetime.utcnow()` 尚未完全替换
- `database.py` 仍是运行时迁移方案
- `models.py` 仍为集中式大模型文件
- `crawler_service` 导入副作用仍然存在

### 14.2 前端

- `Editor.tsx` 过重
- `SettingsView.tsx` 过重
- `JourneyUI.tsx` 过重
- 全仓 lint 未收敛
- 若要做浏览器级 E2E，还没有 Playwright/Cypress 基础设施

### 14.3 视觉层

- 卡片背景、玻璃态、弹窗尺寸都已经收敛到共享层
- 但这也意味着任何共享层改动都会影响大量页面

---

## 15. 开发原则

未来计划、阶段目标、优先级和未完成项已迁移到：

- [ROADMAP.md](/home/acacia/proj-dairy/ROADMAP.md)
- [docs/README.md](/home/acacia/proj-dairy/docs/README.md)

本节只保留长期有效的开发原则。

### 15.1 开发原则

- 读接口优先走 `api/app`
- 写接口优先放对应业务域 router / helper
- 列表页不要重新塞回完整 `content`
- 共享层只放真正跨域能力
- 不要碰 `production/` 和 `production.sh`

---

## 16. 一句话总结

这个项目现在已经从“路由堆功能”转成了：

**模块化单体后端 + 页面查询 API + 逐步 feature 化前端**

它已经有足够清晰的主骨架，可以继续加功能，但仍然需要在：

- 历史大文件拆分
- 前端 lint 收敛
- 生命周期与时间处理标准化

这三个方向继续收尾。
