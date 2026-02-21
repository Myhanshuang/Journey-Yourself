# 📔 Journey

> 本项目是 **LLM 驱动开发** 。它的诞生起初只是为了满足个人的特定需求。我并非前端专家，而是通过用大语言模型实现。
> **注**：虽然它最初只是一个尝试，但随着代码库的不断演进，我们现在正致力于打造高标准、高质量的代码。

---

## 📖 简介

**Journey** 是一款自托管现代化日记应用。它集成了 **Immich**（照片/视频管理）和 **高德地图 (AMap)**（位置服务）。

## ✨ 核心特性

- **📝 富文本编辑器**：基于 **TipTap** 构建的强大编辑器，支持 Markdown、表格、任务列表、数学公式以及内嵌多媒体。
- **🖼️ 深度集成 Immich**：在日记中无缝浏览你私有部署的 **Immich** 媒体库，并将照片或视频直接导入到日记条目中。
- **📍 位置与天气**：利用**高德地图 (AMap)** 自动获取精准的位置数据，为你的回忆打上真实的情境标签。
- **📊 统计与洞察**：通过 Github 风格的日历热力图和详细的字数统计，直观展示你的写作习惯。
- **🔗 分享功能**：可以通过公开链接分享单篇日记或整个笔记本。

## 🛠️ 技术栈

### 前端
- **框架**: React 19 + Vite 7
- **样式**: Tailwind CSS v4 + Framer Motion
- **状态管理**: Zustand + TanStack Query
- **编辑器**: TipTap (ProseMirror 的 Headless 封装)
- **图表**: Recharts
- **图标**: Lucide React

### 后端
- **框架**: FastAPI (Python 3.12+)
- **数据库**: SQLite + SQLModel (SQLAlchemy)
- **身份认证**: JWT (Python-Jose) + Passlib (Bcrypt)
- **包管理器**: uv 

---

## 🚀 详细开发指南

如果你想上手折腾一下代码或参与开发，请参照以下详细步骤。

### 前置要求
- **Python**: 3.12 或更高版本。
- **Node.js**: 20 或更高版本。
- **Git**: 用于版本控制。
- **Docker** (可选): 如果你更倾向于容器化部署。

### 1. 后端设置

1.  **安装 `uv`**（如果你尚未安装）：
    
    ```bash
    pip install uv
    ```
    
2.  **进入后端目录**：
    ```bash
    cd backend
    ```

3.  **同步依赖**：
    此操作会创建一个虚拟环境，并安装 `pyproject.toml` 中定义的所有必需依赖包。
    
    ```bash
    uv sync
    ```
    
4.  **配置环境变量**：
    复制配置文件示例。

    ```bash
    cp ../.env.example .env
    ```
    *注：你需要生成一个安全的 `ENCRYPTION_KEY`。可以通过运行以下命令来生成：*

    ```bash
    python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    ```
    将输出的结果粘贴到你 `.env` 文件中的 `ENCRYPTION_KEY` 字段里。

5.  **启动开发服务器**：

    ```bash
    uv run fastapi dev app/main.py
    ```
    - API 访问地址为 `http://localhost:8000`。
    - 交互式 API 文档 (Swagger UI) 地址为 `http://localhost:8000/docs`。

### 2. 前端设置

1.  **进入前端目录**：

    ```bash
    cd frontend
    ```

2.  **安装依赖**：
    ```bash
    npm install
    ```

3.  **启动开发服务器**：
    ```bash
    npm run dev
    ```
    - 前端 UI 的访问地址为 `http://localhost:5173`。
    - 开发环境已配置好将 API 请求代理至 `http://localhost:8000`。

### 3. Docker 部署（推荐日常使用）

如果你需要一个稳定的“生产”环境，或者只想直接使用应用而不想配置开发环境。

1.  **准备根目录**：
    确保你在项目根目录下，并且已经配置好了 `.env` 文件。

2.  **构建并运行**：

    ```bash
    docker-compose up -d --build
    ```

3.  **访问应用**：
    在浏览器中打开 `http://localhost:8000`。

---

## ⚙️ 配置与集成

### 初次登录
- **默认用户**：在 `.env` 中配置（默认值：`admin`）
- **默认密码**：在 `.env` 中配置（默认值：`admin`）
- *请在成功登录后立即修改这些信息。*

### 设置集成服务
你**不需要**将 Immich 或高德地图的密钥硬编码在 `.env` 文件中。这些配置将在 UI 界面中完成。

1.  **登录**应用。
2.  前往**设置**页面。
3.  **Immich**：输入你私有部署的 Immich URL 及其 API Key。
4.  **高德地图**：输入你的高德 Web API Key（用于进行位置搜索）。

## 🤝 **贡献指南**

我们非常欢迎并感谢大家的贡献！为了确保各个模块和谐运作，也为了让你的 Pull Request 能够被顺利审查和合并，我们希望你遵循以下开发原则。

### ✨ 可复用性

我们崇尚整洁和 DRY (Don't Repeat Yourself) 的代码！请尽量避免重复编写相同的逻辑。强烈建议将通用的模式提取为可复用的 hook、组件或工具函数。如果你发现一个组件在多个地方被用到，就把它归入 `src/components/common` 或 `src/components/ui` 。

### 🧩 解耦

尽量保持 UI 组件的纯粹性。一个很好的经验法则是：将业务逻辑（比如 API 调用和数据转换）放在自定义 hooks 或 services 中，而不是直接写在 UI 组件里。同样地，在后端层面，我们也致力于保持路由的精简，将复杂的逻辑下放给 services 或 models 去处理。

### 🏗️ 架构一致性

为了让所有人都能轻松读懂和导航代码库，请与我们现有的目录结构保持一致：

- **前端：** `views` -> `components` -> `hooks` -> `lib`
- **后端：** `routers` -> `models` -> `schemas`

项目倾向于保持精简的依赖项。如果你觉得非常有必要引入一个新的框架或库，可以先开一个 Issue 讨论。
