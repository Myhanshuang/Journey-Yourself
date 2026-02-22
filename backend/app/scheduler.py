"""
任务调度器模块
使用 APScheduler 实现定时任务管理
"""

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime, timezone
from sqlmodel import Session, select
import asyncio
import logging

from app.database import engine
from app.models import Task, User

logger = logging.getLogger(__name__)

# 创建调度器实例
scheduler = AsyncIOScheduler(timezone="UTC")


# 任务注册表 - 存储所有可用任务的定义
TASK_REGISTRY = {
    "daily_summary": {
        "display_name": "每日阅读摘要",
        "description": "每天自动从 Karakeep 获取书签并使用 AI 生成阅读摘要",
        "cron_expr": "0 0 * * *",  # 每日 UTC 0点
        "handler": None,  # 将在下面设置
    }
}


async def run_daily_summary():
    """
    执行每日阅读摘要任务
    为所有启用此任务的用户生成摘要
    """
    logger.info("[Scheduler] Starting daily summary task")
    
    from app.routers.tasks import process_user_daily_summary
    
    with Session(engine) as session:
        # 获取所有配置了 Karakeep 和 AI 的用户
        users = session.exec(select(User)).all()
        
        for user in users:
            # 检查用户是否启用了此任务
            task_configs = user.task_configs or {}
            user_task_config = task_configs.get("daily_summary", {})
            
            # 如果用户没有显式启用，默认启用（向后兼容）
            if not user_task_config.get("enabled", True):
                logger.info(f"[Scheduler] User {user.username} has disabled daily summary, skipping")
                continue
            
            # 检查用户是否有必要的配置
            if not (user.karakeep_url and user.karakeep_api_key and user.ai_api_key):
                logger.info(f"[Scheduler] User {user.username} missing required config, skipping")
                continue
            
            logger.info(f"[Scheduler] Processing daily summary for {user.username}")
            try:
                await process_user_daily_summary(user.id)
            except Exception as e:
                logger.error(f"[Scheduler] Error processing summary for {user.username}: {e}")
    
    # 更新任务状态
    with Session(engine) as session:
        task = session.exec(select(Task).where(Task.name == "daily_summary")).first()
        if task:
            task.last_run = datetime.now(timezone.utc)
            session.add(task)
            session.commit()
    
    logger.info("[Scheduler] Daily summary task completed")


# 设置任务处理器
TASK_REGISTRY["daily_summary"]["handler"] = run_daily_summary


def initialize_tasks():
    """
    初始化任务表，确保所有注册的任务都有对应的数据库记录
    """
    with Session(engine) as session:
        for task_name, task_def in TASK_REGISTRY.items():
            existing = session.exec(select(Task).where(Task.name == task_name)).first()
            if not existing:
                logger.info(f"[Scheduler] Creating task record: {task_name}")
                task = Task(
                    name=task_name,
                    display_name=task_def["display_name"],
                    description=task_def["description"],
                    is_enabled=True,
                    cron_expr=task_def["cron_expr"],
                )
                session.add(task)
                session.commit()


def schedule_all_tasks():
    """
    根据数据库中的任务配置，调度所有已启用的任务
    """
    with Session(engine) as session:
        tasks = session.exec(select(Task).where(Task.is_enabled == True)).all()
        
        for task in tasks:
            task_def = TASK_REGISTRY.get(task.name)
            if not task_def:
                logger.warning(f"[Scheduler] Unknown task: {task.name}")
                continue
            
            try:
                # 解析 cron 表达式
                parts = task.cron_expr.split()
                if len(parts) == 5:
                    trigger = CronTrigger(
                        minute=parts[0],
                        hour=parts[1],
                        day=parts[2],
                        month=parts[3],
                        day_of_week=parts[4],
                        timezone="UTC"
                    )
                else:
                    logger.error(f"[Scheduler] Invalid cron expression: {task.cron_expr}")
                    continue
                
                # 添加任务到调度器
                scheduler.add_job(
                    task_def["handler"],
                    trigger=trigger,
                    id=task.name,
                    name=task.display_name,
                    replace_existing=True
                )
                
                logger.info(f"[Scheduler] Scheduled task: {task.name}")
                
            except Exception as e:
                logger.error(f"[Scheduler] Failed to schedule task {task.name}: {e}")
        
        session.commit()


def start_scheduler():
    """
    启动任务调度器
    """
    logger.info("[Scheduler] Initializing tasks")
    initialize_tasks()
    
    logger.info("[Scheduler] Scheduling tasks")
    schedule_all_tasks()
    
    logger.info("[Scheduler] Starting scheduler")
    scheduler.start()
    
    # 启动后更新下次运行时间
    update_next_run_times()
    
    logger.info("[Scheduler] Scheduler started")


def update_next_run_times():
    """
    调度器启动后更新所有任务的下次运行时间
    """
    with Session(engine) as session:
        for task_name in TASK_REGISTRY.keys():
            try:
                job = scheduler.get_job(task_name)
                if job and hasattr(job, 'next_run_time') and job.next_run_time:
                    task = session.exec(select(Task).where(Task.name == task_name)).first()
                    if task:
                        task.next_run = job.next_run_time
                        session.add(task)
                        logger.info(f"[Scheduler] Updated next_run for {task_name}: {job.next_run_time}")
            except Exception as e:
                logger.warning(f"[Scheduler] Could not update next_run for {task_name}: {e}")
        session.commit()


def shutdown_scheduler():
    """
    关闭任务调度器
    """
    logger.info("[Scheduler] Shutting down scheduler")
    scheduler.shutdown()
    logger.info("[Scheduler] Scheduler shut down")


def reschedule_task(task_name: str):
    """
    重新调度指定任务
    """
    with Session(engine) as session:
        task = session.exec(select(Task).where(Task.name == task_name)).first()
        if not task:
            return
        
        task_def = TASK_REGISTRY.get(task_name)
        if not task_def:
            return
        
        # 先移除现有任务
        try:
            scheduler.remove_job(task_name)
        except Exception:
            pass
        
        # 如果任务启用，重新添加
        if task.is_enabled:
            parts = task.cron_expr.split()
            if len(parts) == 5:
                trigger = CronTrigger(
                    minute=parts[0],
                    hour=parts[1],
                    day=parts[2],
                    month=parts[3],
                    day_of_week=parts[4],
                    timezone="UTC"
                )
                scheduler.add_job(
                    task_def["handler"],
                    trigger=trigger,
                    id=task_name,
                    name=task.display_name,
                    replace_existing=True
                )
                
                # 更新下次运行时间（调度器已启动时）
                try:
                    job = scheduler.get_job(task_name)
                    if job and hasattr(job, 'next_run_time') and job.next_run_time:
                        task.next_run = job.next_run_time
                        session.add(task)
                except Exception as e:
                    logger.warning(f"[Scheduler] Could not update next_run for {task_name}: {e}")
                
                session.commit()
