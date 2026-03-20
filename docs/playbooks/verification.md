# Verification Playbook

## 目标

统一每次较大改动后的验证方式。

## 后端最低验证

```bash
cd backend
env -u ALL_PROXY -u HTTPS_PROXY -u HTTP_PROXY -u all_proxy -u https_proxy -u http_proxy ./.venv/bin/python -m unittest discover tests -v
```

## 后端 API smoke E2E

```bash
cd backend
env -u ALL_PROXY -u HTTPS_PROXY -u HTTP_PROXY -u all_proxy -u https_proxy -u http_proxy ./.venv/bin/python -m unittest tests.test_e2e_api_smoke -v
```

## 前端 node 测试

```bash
cd frontend
node --test tests/*.test.mjs
```

## 前端构建

```bash
cd frontend
npm run build
```

## 前端 lint

```bash
cd frontend
npm run lint
```

## 当前现实约束

截至目前：

- backend 全量测试可通过
- backend API smoke E2E 可通过
- frontend node 测试可通过
- frontend build 可通过
- frontend 全仓 lint 仍未全绿

所以在汇报验证结果时，必须把 `lint` 单独说明，不要把“构建通过”说成“全部通过”。
