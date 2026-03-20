# Mutation Cache Playbook

## 目标

统一 mutation 后的缓存策略，避免页面迁移到 `api/app` 后出现新旧 query key 同步不一致。

## 原则

### 1. 新页面优先失效 `app` 查询键

典型键：

- `['app', 'home']`
- `['app', 'timeline']`
- `['app', 'entry', id]`
- `['app', 'notebook', id, 'detail']`
- `['app', 'notebook', id, 'entries']`

### 2. 仍有 legacy 消费方时，同时失效旧键

典型键：

- `['diary', id]`
- `['diaries']`
- `['timeline']`
- `['notebook']`

### 3. 高频强感知操作允许 optimistic update

例如：

- pin / unpin

但要求：

- 只更新 React Query 缓存
- 最终仍要 invalidate / revalidate
- 不要把这类业务状态抬到全局 Zustand/Redux

## 典型操作

### Toggle Pin

至少要考虑：

- entry detail
- home
- timeline
- notebook entries

### Delete Entry

至少要考虑：

- entry detail
- home
- timeline
- notebook entries
- notebook summary

### Update Notebook

至少要考虑：

- notebook detail
- notebook list
- 相关 notebook entries 视图
