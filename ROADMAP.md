# Roadmap

> 面向未来开发的路线图。
>
> 本文档只回答三类问题：
> 1. 接下来优先做什么
> 2. 哪些问题已知但还没做
> 3. 推进某个阶段前需要满足什么门槛

---

## 1. 使用规则

- 本文件只写未来计划，不写当前代码事实
- 当前代码事实请看 [DEVELOPMENT_GUIDE.md](/home/acacia/proj-dairy/DEVELOPMENT_GUIDE.md)
- 具体执行方法请看 [docs/README.md](/home/acacia/proj-dairy/docs/README.md)

---

## 2. 当前阶段

当前项目处于：

**“模块化单体骨架已建立，主读页面已迁移到 `api/app`，旧 backend router 壳已移除，开始进入质量收尾阶段。”**

已经完成的关键里程碑：

- backend 旧 router 壳移除完成
- `api/v1` 聚合稳定
- `api/app` 已覆盖主要读页面
- 前端主页面已基本切到 `api/app`
- 共享弹窗、编辑器安全区、封面图数据流已有统一基础层

尚未收口的关键问题：

- frontend 全仓 lint 未收敛
- 多个大文件仍然过重
- backend 生命周期与时间处理存在 deprecation
- 浏览器级 E2E 仍未建立

---

## 3. Now

### 3.1 质量收敛

优先级最高：

1. 收敛 `frontend lint`
2. 修复 backend deprecation
3. 统一时间处理为 timezone-aware

原因：

- 这三项会直接影响持续开发效率和置信度
- 它们不会改变产品能力，但会显著降低维护成本

### 3.2 前端大文件拆分

优先顺序：

1. `frontend/src/components/Editor.tsx`
2. `frontend/src/views/settings/SettingsView.tsx`
3. `frontend/src/components/ui/JourneyUI.tsx`

目标：

- 明确 feature ownership
- 降低文件体积
- 减少“改一点动很多”的风险

### 3.3 backend 基础设施收尾

优先顺序：

1. `main.py` 迁移到 lifespan
2. `datetime.utcnow()` 全量替换
3. `database.py` 的迁移方式至少补上更明确的保护与日志

---

## 4. Next

### 4.1 浏览器级 E2E

建议引入：

- Playwright

第一批覆盖：

1. 登录
2. 新建 notebook
3. 新建 diary
4. 编辑 diary
5. 首页/时间线/搜索
6. notebook detail
7. 分享 notebook / diary

### 4.2 API 契约继续收敛

重点：

- 继续减少 `shared/api/legacy.ts` 的使用面
- 对写接口做更明确的 domain/command 收口
- 对 `EntryCard`/`EntryDetail`/`NotebookDetail` 等契约做进一步稳定化

### 4.3 集成能力治理

重点：

- Immich / Karakeep / Notion / AMap / MediaCrawler 的调用边界再清晰一点
- 避免编辑器里直接散落过多 provider-specific 逻辑

---

## 5. Later

### 5.1 数据与基础设施升级

候选项：

- 更正式的数据库迁移工具
- 更明确的文件缓存与清理策略
- 封面图缓存的刷新/失效策略

### 5.2 观测性

候选项：

- 请求日志规范化
- 任务执行监控
- 文件缓存命中率观察

### 5.3 视觉与性能优化

候选项：

- 列表虚拟化
- 组件级 memo/拆分
- 更细粒度的页面骨架屏和懒加载

---

## 6. 禁止事项

在未来开发过程中，以下规则保持有效：

- 不要修改 `production/`
- 不要修改任何 `production.sh`
- 不要把未来计划写回 `DEVELOPMENT_GUIDE.md`
- 不要为了图省事把大列表重新退回“完整 content 直出”
- 不要重新把第三方 provider 配置逻辑塞回单一大文件

---

## 7. 阶段门槛

### 7.1 进入“可发布”状态前的最低要求

必须满足：

- backend 全量测试通过
- backend API smoke E2E 通过
- frontend node 测试通过
- frontend build 通过
- frontend lint 通过

推荐满足：

- 至少一轮浏览器级 E2E
- 关键主流程手工回归清单通过

### 7.2 进入下一轮重构前的最低要求

必须满足：

- 当前分支功能不回归
- 主链路验证结果保持稳定
- 新旧路径边界清楚

---

## 8. 决策记录

### 8.1 已确认决策

- backend 采用模块化单体，不拆微服务
- 顶层按业务域分，不按技术层分
- 读接口优先迁移到 `api/app`
- 旧 backend router 壳已移除
- 前端保留 `views`，同时逐步引入 `features`
- 远程首图可以缓存为本地 `cover_image_url`
- 毛玻璃视觉由前端承担，后端只提供稳定展示资产

### 8.2 尚未确认决策

- 是否引入 Playwright
- 是否继续拆 `models.py`
- 是否引入正式 migration tool
- 是否进一步拆 `shared/api/legacy.ts`

---

## 9. 一句话路线图

接下来的正确方向不是继续大规模结构迁移，而是：

**收敛质量门槛，拆大文件，补浏览器级验证，再考虑更深层的长期优化。**
