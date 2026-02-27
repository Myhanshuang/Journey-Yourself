from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE xiaohongshu_post ADD COLUMN comments JSON;"))
        conn.commit()
        print("Added comments to xiaohongshu_post")
    except Exception as e:
        print("Could not add comments to xiaohongshu_post (might already exist):", e)
    
    try:
        conn.execute(text("ALTER TABLE bilibili_video ADD COLUMN comments JSON;"))
        conn.commit()
        print("Added comments to bilibili_video")
    except Exception as e:
        print("Could not add comments to bilibili_video (might already exist):", e)
