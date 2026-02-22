from sqlmodel import create_engine, SQLModel, Session, select
from sqlalchemy import event, text, inspect
import os
from app.config import settings
from app.models import User, UserRole

# 动态获取数据库路径并确保目录存在
sqlite_url = settings.DATABASE_URL
db_path = sqlite_url.replace("sqlite:///", "")
if not os.path.exists(os.path.dirname(db_path)) and os.path.dirname(db_path):
    os.makedirs(os.path.dirname(db_path))

connect_args = {"check_same_thread": False}
engine = create_engine(
    sqlite_url, 
    connect_args=connect_args,
    pool_size=20,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=1800
)

@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.close()


def get_existing_tables() -> set:
    """获取数据库中已存在的表名"""
    inspector = inspect(engine)
    return set(inspector.get_table_names())


def get_existing_columns(table_name: str) -> set:
    """获取表中已存在的列名"""
    inspector = inspect(engine)
    try:
        columns = inspector.get_columns(table_name)
        return {col['name'] for col in columns}
    except Exception:
        return set()


def migrate_database():
    """
    自动迁移数据库：
    - 检测并添加新表
    - 检测并添加新列
    - 保留现有数据
    """
    existing_tables = get_existing_tables()
    
    # 获取所有模型对应的表
    for table in SQLModel.metadata.sorted_tables:
        table_name = table.name
        
        if table_name not in existing_tables:
            # 表不存在，创建新表
            print(f"[Migration] Creating new table: {table_name}")
            table.create(engine, checkfirst=True)
        else:
            # 表存在，检查是否需要添加新列
            existing_columns = get_existing_columns(table_name)
            new_columns = []
            
            for column in table.columns:
                if column.name not in existing_columns:
                    new_columns.append(column)
            
            if new_columns:
                print(f"[Migration] Adding new columns to {table_name}: {[c.name for c in new_columns]}")
                with engine.connect() as conn:
                    for column in new_columns:
                        # 构建 ALTER TABLE 语句
                        col_type = column.type.compile(engine.dialect)
                        col_def = f'"{column.name}" {col_type}'
                        
                        # 处理默认值
                        if column.default is not None:
                            col_def += f" DEFAULT '{column.default.arg}'"
                        elif column.nullable:
                            col_def += " DEFAULT NULL"
                        
                        sql = f'ALTER TABLE "{table_name}" ADD COLUMN {col_def}'
                        try:
                            conn.execute(text(sql))
                            conn.commit()
                            print(f"[Migration] Added column {column.name} to {table_name}")
                        except Exception as e:
                            print(f"[Migration] Warning: Could not add column {column.name}: {e}")


def create_db_and_tables():
    # 导入为了避免循环依赖
    from app.auth import get_password_hash
    
    # 先执行自动迁移
    migrate_database()
    
    # 确保所有表存在
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
