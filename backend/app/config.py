from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    # 核心安全配置
    SECRET_KEY: str = "please-change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    
    # 系统内部加密密钥 (用于保护用户 API Keys)
    # 生产环境必须通过环境变量覆盖此值
    ENCRYPTION_KEY: str = ""
    
    # 部署初始化配置 (仅在数据库为空时生效)
    FIRST_ADMIN_USER: str = ""
    FIRST_ADMIN_PASSWORD: str = ""
    
    # 数据库路径 (默认指向容器内的持久化目录)
    DATABASE_URL: str = "sqlite:///./data/journey.db"

    # Pydantic V2 推荐配置方式：
    # 1. 优先读取系统环境变量 (Docker / OS env)
    # 2. 如果存在 .env 文件，则从中读取
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore" # 忽略多余的环境变量
    )

settings = Settings()
