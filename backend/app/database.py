from sqlmodel import create_engine, SQLModel, Session, select
from sqlalchemy import event
import os
from app.config import settings
from app.models import User, UserRole

# 动态获取数据库路径并确保目录存在
sqlite_url = settings.DATABASE_URL
db_path = sqlite_url.replace("sqlite:///", "")
if not os.path.exists(os.path.dirname(db_path)) and os.path.dirname(db_path):
    os.makedirs(os.path.dirname(db_path))

connect_args = {"check_same_thread": False}
engine = create_engine(sqlite_url, connect_args=connect_args)

@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.close()

def create_db_and_tables():
    # 导入为了避免循环依赖
    from app.auth import get_password_hash
    
    SQLModel.metadata.create_all(engine)
    
    # 初始化管理员
    with Session(engine) as session:
        admin_exists = session.exec(select(User).where(User.role == UserRole.ADMIN)).first()
        if not admin_exists:
            print(f"Creating first admin: {settings.FIRST_ADMIN_USER}")
            admin = User(
                username=settings.FIRST_ADMIN_USER,
                hashed_password=get_password_hash(settings.FIRST_ADMIN_PASSWORD),
                role=UserRole.ADMIN
            )
            session.add(admin)
            session.commit()

def get_session():
    with Session(engine) as session:
        yield session
