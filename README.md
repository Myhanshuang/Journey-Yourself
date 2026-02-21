# 📔 Journey

> This project is a pure manifestation of **LLM-Driven Development**. It was built to satisfy a specific personal utility. I am not a frontend expert; instead, I guide Large Language Models (LLMs) to bring my imagination to life.  
> **Note**: While it started as a fun experiment, the codebase has evolved. We now strive for high quality.

---

## 📖 Introduction

**Journey** is a modern diary application designed for the self-hoster. With deep integrations for **Immich** (photos/videos) and **AMap** (location), it transforms journaling into a rich, multimedia experience.

## ✨ Key Features

- **📝 Rich Text Editor**: A powerful editor powered by **TipTap**, supporting Markdown, tables, task lists, math formulas, and embedded media.
- **🖼️ Immich Integration**: Seamlessly browse your self-hosted **Immich** library within the diary and import photos or videos directly into your entries.
- **📍 Location**: Automatically fetch precise location data using **AMap** (Gaode Map) to tag your memories with context.
- **📊 Stats & Insights**: Visualize your writing habits with Github-style calendar heatmaps and detailed word count statistics.
- **🔗 Sharing**: Share specific diary entries or entire notebooks via public links .

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19 + Vite 7
- **Styling**: Tailwind CSS v4 + Framer Motion
- **State Management**: Zustand + TanStack Query
- **Editor**: TipTap (Headless wrapper around ProseMirror)
- **Charts**: Recharts
- **Icons**: Lucide React

### Backend
- **Framework**: FastAPI (Python 3.12+)
- **Database**: SQLite + SQLModel (SQLAlchemy)
- **Authentication**: JWT (Python-Jose) + Passlib (Bcrypt)
- **Package Manager**: uv (Fast Python package installer)

---

## 🚀 Detailed Development Guide

If you want to hack on the code and vibe with it, follow these detailed steps.

### Prerequisites
- **Python**: Version 3.12 or higher.
- **Node.js**: Version 20 or higher.
- **Git**: For version control.
- **Docker** (Optional): If you prefer containerized deployment.

### 1. Backend Setup

The backend uses `uv` for lightning-fast package management.

1.  **Install `uv`** (if you haven't already):
    ```bash
    pip install uv
    ```

2.  **Navigate to the backend directory**:
    ```bash
    cd backend
    ```

3.  **Sync dependencies**:
    This creates a virtual environment and installs all required packages defined in `pyproject.toml`.
    ```bash
    uv sync
    ```

4.  **Configure Environment Variables**:
    Copy the example configuration file.
    
    ```bash
    cp ../.env.example .env
    ```
    *Note: You need to generate a secure `ENCRYPTION_KEY`. You can do this by running:*
    
    ```bash
    python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    ```
    Paste the output into your `.env` file for `ENCRYPTION_KEY`.
    
5.  **Run the Development Server**:
    
    ```bash
    uv run fastapi dev app/main.py
    ```
    - The API will be available at `http://localhost:8000`.
    - Interactive API Docs (Swagger UI) at `http://localhost:8000/docs`.

### 2. Frontend Setup

1.  **Navigate to the frontend directory**:
    
    ```bash
    cd frontend
    ```
    
2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Run the Development Server**:
    ```bash
    npm run dev
    ```
    - The UI will be available at `http://localhost:5173`.
    - It is configured to proxy API requests to `http://localhost:8000`.

### 3. Docker Deployment (Recommended for Usage)

For a stable "production" setup or just to use the app without coding.

1.  **Root Directory Setup**:
    Ensure you are in the project root and have your `.env` file configured.

2.  **Build and Run**:
    
    ```bash
    docker-compose up -d --build
    ```
    
3.  **Access**:
    Open `http://localhost:8000` in your browser.

---

## ⚙️ Configuration & Integrations

### Initial Login
- **Default User**: Configured in `.env` (Default: `admin`)
- **Default Password**: Configured in `.env` (Default: `admin`)
- *Please change these immediately after logging in.*

### Setting up Integrations
You do **not** need to put your Immich or AMap keys in the `.env` file. These are configured via the UI - Setting.

1.  **Log in** to the application.
2.  Go to **Settings**.
3.  **Immich**: Enter your self-hosted Immich URL and API Key.
4.  **AMap (Gaode)**: Enter your AMap Web API Key (for and location search).

## 🤝 **Contribution Guidelines**

We absolutely love and welcome contributions! We want to ensure everything works together harmoniously. To help your Pull Requests get reviewed and merged smoothly, we kindly ask you to keep the following principles in mind:

### **✨ Reusability** 

We love clean and DRY code! Whenever possible, try to avoid duplicating logic. It’s highly encouraged to extract common patterns into reusable hooks, components, or utility functions. If you find a component being used in multiple places, `src/components/common` or `src/components/ui` would be its perfect home.

### **🧩 Decoupling** 

Let's try to keep our UI components as pure as possible. A great rule of thumb is to place business logic (like API calls and data transformations) into custom hooks or services, rather than directly inside UI components. Similarly, we aim to keep our backend routers thin by delegating complex logic to services or models.

### **🏗️ Architectural Consistency**

To keep the codebase easy for everyone to navigate, please align with our existing folder structure:

- **Frontend:** `views` -> `components` -> `hooks` -> `lib`
- **Backend:** `routers` -> `models` -> `schemas` We also prefer to keep our dependencies lean. If you feel a new framework or library is necessary, let's open an issue and discuss it together first!
