from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, func, select
from datetime import datetime, timedelta, timezone

from app.auth import get_current_user
from app.database import get_session
from app.models import Diary, Notebook, User

router = APIRouter(prefix="/api/app", tags=["app"])


@router.get("/stats")
async def get_stats_summary(
    days: int = Query(30),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    total_words = session.exec(select(func.sum(Diary.word_count)).join(Notebook).where(Notebook.user_id == user.id)).one() or 0
    total_entries = session.exec(select(func.count(Diary.id)).join(Notebook).where(Notebook.user_id == user.id)).one() or 0

    all_diaries = session.exec(select(Diary).join(Notebook).where(Notebook.user_id == user.id).order_by(Diary.date.desc())).all()

    mood_counts: dict[str, int] = {}
    for diary in all_diaries:
        if diary.mood and "label" in diary.mood:
            label = diary.mood["label"]
            mood_counts[label] = mood_counts.get(label, 0) + 1

    start_date = datetime.now(timezone.utc) - timedelta(days=days)
    trend_stmt = (
        select(func.date(Diary.date).label("day"), func.count(Diary.id).label("count"))
        .join(Notebook)
        .where(Notebook.user_id == user.id, Diary.date >= start_date)
        .group_by("day")
        .order_by("day")
    )
    trend_map = {row.day: row.count for row in session.exec(trend_stmt).all()}
    activity_trend = []
    for index in range(days + 1):
        day = (start_date + timedelta(days=index)).strftime("%Y-%m-%d")
        activity_trend.append({"day": day, "count": trend_map.get(day, 0)})

    streak = 0
    if all_diaries:
        dates = sorted({diary.date.date() for diary in all_diaries}, reverse=True)
        today = datetime.now(timezone.utc).date()
        check = today
        if dates[0] < today:
            check -= timedelta(days=1)
        for day in dates:
            if day == check:
                streak += 1
                check -= timedelta(days=1)
            elif day > check:
                continue
            else:
                break

    return {
        "summary": {"total_words": total_words, "total_entries": total_entries, "streak": streak},
        "mood_distribution": [{"label": label, "count": count} for label, count in mood_counts.items()],
        "activity_trend": activity_trend,
    }
