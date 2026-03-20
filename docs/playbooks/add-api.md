# Add API Playbook

## 目标

指导如何在当前 backend 中新增 API，并保持当前架构方向。

## 先判断 API 属于哪条轨

### 用 `api/app` 的情况

- 页面聚合查询
- 轻量列表
- 详情读取
- 公开内容分页

### 用业务域 router 的情况

- 写操作
- 传统资源接口
- provider-specific 操作
- 管理类操作

## 新增 API 的标准流程

### 1. 先确定业务域

候选：

- `identity`
- `journaling`
- `notebooks`
- `discovery`
- `sharing`
- `integrations`
- `automation`
- `system_admin`

### 2. 如果是读接口，优先走 `api/app`

需要回答：

- 页面真正需要哪些字段
- 是否需要分页
- 是否需要 cursor

### 3. schema 先行

位置：

- `backend/app/api/app/schemas.py`

要求：

- 先定义响应模型
- 不要默认把 ORM 整个吐出去

### 4. query router 实现

位置：

- `backend/app/api/app/*.py`

原则：

- 明确 response model
- 明确 query params
- 明确所有权校验

### 5. 挂到聚合入口

位置：

- `backend/app/api/app/router.py`
- 或 `backend/app/api/v1/router.py`

### 6. 前端同步

位置：

- `frontend/src/shared/api/appQuery.ts`

然后切对应页面消费。

### 7. 验证

至少做：

- backend 路由测试
- backend 全量测试
- 前端 node 测试
- 前端 build
