from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlmodel import Session, select
from app.database import get_session
from app.models import User, Notebook, Diary
from app.security import decrypt_data
import httpx
from datetime import datetime, timezone
import json

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
            
            # Fetch recent bookmarks
            async with httpx.AsyncClient(verify=False, timeout=30.0) as client:
                resp = await client.get(f"{base_url}/api/bookmarks", headers=headers, params={"limit": 50})
                if resp.status_code != 200:
                    print(f"Failed to fetch bookmarks for {user.username}: {resp.status_code}")
                    return
                
                data = resp.json()
                bookmarks = data if isinstance(data, list) else data.get('data', [])
                
            # Filter for today (UTC) - Simplified logic: check if created_at is today
            today_str = datetime.now(timezone.utc).strftime('%Y-%m-%d')
            today_bookmarks = []
            
            for b in bookmarks:
                # Assuming created_at is ISO string e.g., "2023-10-27T10:00:00.000000Z"
                c_at = b.get('created_at', '')
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
            content_json = {
                "type": "doc",
                "content": [
                    {
                        "type": "heading",
                        "attrs": {"level": 2},
                        "content": [{"type": "text", "text": "Daily AI Summary"}]
                    },
                    {
                        "type": "paragraph",
                        "content": [{"type": "text", "text": summary}]
                    },
                    {
                        "type": "heading",
                        "attrs": {"level": 3},
                        "content": [{"type": "text", "text": "Bookmarks"}]
                    }
                ]
            }
            
            ul = {"type": "bulletList", "content": []}
            for b in today_bookmarks:
                li = {
                    "type": "listItem",
                    "content": [{
                        "type": "paragraph",
                        "content": [
                            {
                                "type": "text", 
                                "text": b.get('title') or b.get('url') or "Untitled", 
                                "marks": [{"type": "link", "attrs": {"href": b.get('url')}}]
                            }
                        ]
                    }]
                }
                ul["content"].append(li)
            content_json["content"].append(ul)

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
    
    links_text = "
".join([f"- {b.get('title', 'No Title')}: {b.get('description', '')} ({b.get('url')})" for b in bookmarks])
    prompt = f"Please summarize the following bookmarks I added today into a cohesive reading summary. Highlight key topics and interesting points.

{links_text}"
    
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
            {"role": "system", "content": "You are a helpful reading assistant."},
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
