# Add Integration Playbook

## 目标

指导如何新增或扩展一个第三方集成能力。

## 目录规则

后端：

- `backend/app/modules/integrations/<provider>_settings_router.py`
- `backend/app/modules/integrations/<provider>_router.py`

前端：

- `frontend/src/features/integrations/<provider>/`

## 拆分原则

一个 provider 至少分两类能力：

1. 设置/验证
2. 浏览/查询/插入/代理

不要把两类能力塞回 `users` 或 `Editor` 大文件。

## 后端步骤

1. 定义 provider 设置更新接口
2. 定义 provider 业务接口
3. 需要密钥时统一走 `security.py`
4. 明确当前用户校验

## 前端步骤

1. 做 feature 级 picker / modal / action
2. settings 页面接 provider 配置
3. editor 或页面内只引用 feature，不直接引用 provider 细节

## 验证

- provider 配置成功/失败路径
- 未配置时的提示
- 业务接口能否返回预期数据
- 前端 build 通过
