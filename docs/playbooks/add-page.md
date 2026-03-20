# Add Page Playbook

## 目标

指导如何在当前项目中新增一个页面，并确保：

- 路由位置正确
- 数据来源正确
- 页面状态边界清晰
- 验证路径完整

## 适用范围

适用于：

- 新增一级页面
- 新增 detail 页面
- 新增只读聚合页面

不适用于：

- 纯弹窗
- 单个小组件
- editor extension

## 步骤

### 1. 先决定页面属于哪个业务域

放置规则：

- diary 详情：`views/diary/`
- timeline / search：`views/discovery/`
- notebook 详情：`views/notebooks/`
- settings：`views/settings/`

如果是新业务域：

- 先在 `views/` 下加子目录
- 再考虑是否需要对应 `features/<domain>/`

### 2. 先定义页面用什么数据

优先顺序：

1. `api/app`
2. 已有 `shared/api/appQuery.ts`
3. 必要时新增新的 `api/app` 路由

不要先从 `legacy` 接口拼一堆大对象再说。

### 3. 决定页面壳和 feature 的边界

页面壳负责：

- 路由参数
- 页面布局
- 主 query 调用
- 把数据传给 feature/UI

不要在页面壳里做：

- 复杂可复用业务流程
- 太多 mutation 协调
- 第三方 provider 细节

### 4. 路由接入

位置：

- `frontend/src/router.tsx`

要求：

- 保持现有路由风格
- lazy load 页面
- 放到正确的路由壳下

### 5. 状态设计

优先级：

1. 服务端状态：React Query
2. URL 状态：query params / path params
3. 局部 UI 状态：component state
4. 全局 store：只有真的跨页面壳层状态才放

### 6. 验证

至少做：

- 页面路由可进入
- query 正常
- build 通过
- 相关 node test 或新增小回归测试

如果页面是主链路：

- 补到浏览器级 E2E 计划中
