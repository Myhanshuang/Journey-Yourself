# --- Stage 1: Frontend Build ---
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend

# 利用构建缓存：仅在 package.json 变更时运行 npm ci
COPY frontend/package*.json ./
RUN npm ci --legacy-peer-deps

# 复制源码并构建静态产物
COPY frontend/ .
RUN npm run build

# --- Stage 2: Runtime Stage ---
FROM python:3.12-slim AS runtime
WORKDIR /app

# 安装系统级依赖 (curl 用于健康检查, libsqlite3 用于数据库)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 从官方镜像安装 uv (极速 Python 包管理器)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# 仅在依赖描述变更时执行安装
COPY backend/pyproject.toml backend/uv.lock* ./
RUN uv pip install --system --no-cache -r pyproject.toml

# 从构建阶段复制前端产物至 backend 的 static 目录
COPY --from=frontend-builder /app/frontend/dist ./static

# 复制后端业务核心代码
COPY backend/app ./app

# 环境与持久化目录配置
RUN mkdir -p /app/data && chmod 777 /app/data
ENV DATABASE_URL=sqlite:///./data/journey.db
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

EXPOSE 8000

# 生产环境启动指令
# 默认 host 需设为 0.0.0.0 以允许外部访问
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
