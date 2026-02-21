from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select, func
from app.database import get_session
from app.models import Diary, Notebook, User
from app.auth import get_current_user
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List

router = APIRouter(prefix="/api/stats", tags=["stats"])

@router.get("/")
async def get_stats(days: int = Query(30), user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    # 1. Total Aggregates
    total_words = session.exec(select(func.sum(Diary.word_count)).join(Notebook).where(Notebook.user_id == user.id)).one() or 0
    total_entries = session.exec(select(func.count(Diary.id)).join(Notebook).where(Notebook.user_id == user.id)).one() or 0

    # 2. Complete Data Scan for Moods & Streaks (Scoped to user)
    all_diaries = session.exec(select(Diary).join(Notebook).where(Notebook.user_id == user.id).order_by(Diary.date.desc())).all()
    
    mood_counts: Dict[str, int] = {}
    for d in all_diaries:
        if d.mood and "label" in d.mood:
            label = d.mood["label"]
            mood_counts[label] = mood_counts.get(label, 0) + 1

    # 3. Dynamic Activity Trend
    start_date = datetime.now(timezone.utc) - timedelta(days=days)
    trend_stmt = (
        select(func.date(Diary.date).label("day"), func.count(Diary.id).label("count"))
        .join(Notebook).where(Notebook.user_id == user.id, Diary.date >= start_date)
        .group_by("day").order_by("day")
    )
    trend_map = {r.day: r.count for r in session.exec(trend_stmt).all()}
    activity_trend = []
    for i in range(days + 1):
        d = (start_date + timedelta(days=i)).strftime("%Y-%m-%d")
        activity_trend.append({"day": d, "count": trend_map.get(d, 0)})

    # 4. Streak Calculation
    streak = 0
    if all_diaries:
        dates = sorted({d.date.date() for d in all_diaries}, reverse=True)
        today = datetime.now(timezone.utc).date()
        check = today
        if dates[0] < today: check -= timedelta(days=1)
        for d in dates:
            if d == check: streak += 1; check -= timedelta(days=1)
            elif d > check: continue
            else: break

    return {
        "summary": { "total_words": total_words, "total_entries": total_entries, "streak": streak },
        "mood_distribution": [{"label": k, "count": v} for k, v in mood_counts.items()],
        "activity_trend": activity_trend
    }
