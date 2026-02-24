from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlmodel import Session, select
from app.database import get_session
from app.models import User, Notebook, Diary, Task
from app.auth import get_current_user
from app.security import decrypt_data
from app.scheduler import reschedule_task
import httpx
from datetime import datetime, timezone
from pydantic import BaseModel
import json
import re

def markdown_to_prosemirror(text: str) -> list:
    """将 Markdown 文本转换为 ProseMirror JSON 内容数组"""
    nodes = []
    lines = text.split('\n')
    
    for line in lines:
        if not line.strip():
            continue
            
        # 检查是否是标题 (### heading, ## heading, # heading)
        heading_match = re.match(r'^(#{1,3})\s+(.+)$', line)
        if heading_match:
            level = len(heading_match.group(1))
            content = heading_match.group(2)
            nodes.append({
                "type": "heading",
                "attrs": {"level": level},
                "content": [{"type": "text", "text": content}]
            })
            continue
        
        # 处理普通段落，解析 **bold** 和 *italic*
        paragraph_content = parse_inline_markdown(line)
        nodes.append({
            "type": "paragraph",
            "content": paragraph_content
        })
    
    return nodes

def parse_inline_markdown(text: str) -> list:
    """解析行内 Markdown 格式（粗体、斜体）"""
    content = []
    # 匹配 **bold** 或 *italic* 或普通文本
    pattern = r'(\*\*(.+?)\*\*)|(\*(.+?)\*)|([^*]+)'
    
    for match in re.finditer(pattern, text):
        if match.group(1):  # **bold**
            content.append({
                "type": "text",
                "text": match.group(2),
                "marks": [{"type": "bold"}]
            })
        elif match.group(3):  # *italic*
            content.append({
                "type": "text",
                "text": match.group(4),
                "marks": [{"type": "italic"}]
            })
        elif match.group(5):  # plain text
            if match.group(5).strip():
                content.append({
                    "type": "text",
                    "text": match.group(5)
                })
    
    return content if content else [{"type": "text", "text": text}]

router = APIRouter(prefix="/api/tasks", tags=["tasks"])

@router.post("/trigger-daily-summary")
async def trigger_daily_summary(background_tasks: BackgroundTasks, session: Session = Depends(get_session)):
    # Trigger for all users
    users = session.exec(select(User)).all()
    started_count = 0
    for user in users:
        if user.karakeep_url and user.karakeep_api_key and user.ai_api_key:
            background_tasks.add_task(process_user_daily_summary, user.id)
            started_count += 1
    return {"status": "started", "count": started_count}


# === 任务管理 API ===

class TaskUpdate(BaseModel):
    is_enabled: bool = None
    cron_expr: str = None

class UserTaskToggle(BaseModel):
    enabled: bool

@router.get("/")
async def list_tasks(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """获取所有任务状态"""
    tasks = session.exec(select(Task)).all()
    user_configs = current_user.task_configs or {}
    
    result = []
    for task in tasks:
        user_task_config = user_configs.get(task.name, {})
        result.append({
            "id": task.id,
            "name": task.name,
            "display_name": task.display_name,
            "description": task.description,
            "is_enabled": task.is_enabled,
            "cron_expr": task.cron_expr,
            "last_run": task.last_run,
            "next_run": task.next_run,
            "user_enabled": user_task_config.get("enabled", True),
        })
    
    return result


@router.patch("/{task_name}")
async def update_task(
    task_name: str,
    update: TaskUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """更新任务全局配置（仅管理员）"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    task = session.exec(select(Task).where(Task.name == task_name)).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if update.is_enabled is not None:
        task.is_enabled = update.is_enabled
    if update.cron_expr is not None:
        task.cron_expr = update.cron_expr
    
    task.updated_at = datetime.now(timezone.utc)
    session.add(task)
    session.commit()
    session.refresh(task)
    
    # 重新调度任务
    reschedule_task(task_name)
    
    return {"status": "ok", "task": {"name": task.name, "is_enabled": task.is_enabled, "cron_expr": task.cron_expr}}


@router.patch("/{task_name}/toggle")
async def toggle_user_task(
    task_name: str,
    toggle: UserTaskToggle,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """切换用户的任务开关"""
    task = session.exec(select(Task).where(Task.name == task_name)).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # 创建新的字典对象以确保 SQLAlchemy 检测到变化
    task_configs = dict(current_user.task_configs or {})
    task_configs[task_name] = {"enabled": toggle.enabled}
    current_user.task_configs = task_configs
    
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    
    return {"status": "ok", "task_name": task_name, "enabled": toggle.enabled}


async def process_user_daily_summary(user_id: int):
    # Re-open session since this is async background task
    from app.database import engine
    with Session(engine) as session:
        user = session.get(User, user_id)
        if not user: return
        
        try:
            print(f"Processing daily summary for {user.username}")
            
            # 1. Fetch Bookmarks
            karakeep_key = decrypt_data(user.karakeep_api_key)
            headers = {"Authorization": f"Bearer {karakeep_key}"}
            base_url = user.karakeep_url.rstrip('/')
            
            # Fetch recent bookmarks (Karakeep uses /api/v1/bookmarks)
            async with httpx.AsyncClient(verify=False, timeout=30.0) as client:
                resp = await client.get(f"{base_url}/api/v1/bookmarks", headers=headers, params={"limit": 50})
                if resp.status_code != 200:
                    print(f"Failed to fetch bookmarks for {user.username}: {resp.status_code}")
                    return
                
                data = resp.json()
                bookmarks = data.get('bookmarks', [])
                
            # Filter for today (UTC) - Simplified logic: check if createdAt is today
            today_str = datetime.now(timezone.utc).strftime('%Y-%m-%d')
            today_bookmarks = []
            
            for b in bookmarks:
                # Karakeep returns createdAt in ISO format e.g., "2026-02-22T06:01:41.000Z"
                c_at = b.get('createdAt', '')
                if c_at.startswith(today_str):
                    today_bookmarks.append(b)
            
            if not today_bookmarks:
                print(f"No bookmarks for {user.username} today")
                return

            # 2. Summarize with AI
            summary = await generate_ai_summary(user, today_bookmarks)
            if not summary:
                print(f"Failed to generate summary for {user.username}")
                return

            # 3. Create/Get Notebook
            notebook = session.exec(select(Notebook).where(Notebook.user_id == user.id, Notebook.name == "Everyday Reading")).first()
            if not notebook:
                notebook = Notebook(name="Everyday Reading", user_id=user.id)
                session.add(notebook)
                session.commit()
                session.refresh(notebook)

            # 4. Create Diary Entry
            title = f"Reading Summary - {today_str}"
            
            # Build ProseMirror JSON content
            # 解析 AI 返回的 Markdown 格式 summary
            summary_nodes = markdown_to_prosemirror(summary)
            
            content_json = {
                "type": "doc",
                "content": [
                    {
                        "type": "heading",
                        "attrs": {"level": 2},
                        "content": [{"type": "text", "text": "Daily AI Summary"}]
                    },
                    *summary_nodes,
                    {
                        "type": "heading",
                        "attrs": {"level": 3},
                        "content": [{"type": "text", "text": "Bookmarks"}]
                    }
                ]
            }
            
            # Add bookmark cards instead of bullet list
            for b in today_bookmarks:
                content = b.get('content', {})
                b_title = b.get('title') or content.get('title') or "Untitled"
                b_url = content.get('url') or ''
                b_desc = content.get('description') or ''
                b_image = content.get('imageUrl') or ''
                b_id = b.get('id', '')  # Karakeep bookmark ID
                
                # 构建 karakeep 书签详情页 URL
                karakeep_bookmark_url = f"{base_url}/bookmarks/{b_id}" if b_id else b_url
                
                bookmark_node = {
                    "type": "bookmark",
                    "attrs": {
                        "url": b_url,
                        "title": b_title,
                        "description": b_desc,
                        "image": b_image
                        # "karakeepUrl": karakeep_bookmark_url
                    }
                }
                content_json["content"].append(bookmark_node)

            new_diary = Diary(
                notebook_id=notebook.id,
                title=title,
                content=content_json,
                date=datetime.now(timezone.utc),
                word_count=len(summary),
                stats={"ai_generated": True},
                image_count=0
            )
            session.add(new_diary)
            session.commit()
            print(f"Created summary diary for {user.username}")

        except Exception as e:
            print(f"Error processing summary for {user.username}: {e}")

async def generate_ai_summary(user: User, bookmarks: list) -> str:
    if not user.ai_api_key: return None
    
    # Extract data from Karakeep bookmark structure (content object contains title/description/url)
    def get_bookmark_info(b):
        content = b.get('content', {})
        title = b.get('title') or content.get('title') or 'No Title'
        desc = content.get('description') or ''
        url = content.get('url') or ''
        return f"- {title}: {desc} ({url})"
    
    links_text = "\n".join([get_bookmark_info(b) for b in bookmarks])
    
    # Multi-language prompt support
    language = user.ai_language or "zh"
    if language == "zh":
        prompt = f"""请将我今天收藏的书签总结成一篇连贯的阅读摘要。突出主要话题和有趣的观点。

{links_text}"""
        system_prompt = "你是一个有帮助的阅读助手。"
    else:
        prompt = f"""Please summarize the following bookmarks I added today into a cohesive reading summary. Highlight key topics and interesting points.

{links_text}"""
        system_prompt = "You are a helpful reading assistant."
    
    api_key = decrypt_data(user.ai_api_key)
    base_url = user.ai_base_url or "https://api.openai.com/v1"
    model = user.ai_model or "gpt-3.5-turbo"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    data = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ]
    }
    
    async with httpx.AsyncClient(verify=False, timeout=60.0) as client:
        try:
            resp = await client.post(f"{base_url}/chat/completions", headers=headers, json=data)
            if resp.status_code == 200:
                result = resp.json()
                return result['choices'][0]['message']['content']
            else:
                print(f"AI Error: {resp.status_code} {resp.text}")
                return None
        except Exception as e:
            print(f"AI Exception: {e}")
            return None
