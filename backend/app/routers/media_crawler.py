"""MediaCrawler 代理路由

注意：MediaCrawler 是单任务服务，一次只能运行一个爬虫
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlmodel import Session, select
from app.database import get_session
from app.auth import get_current_user
from app.models import User, XiaohongshuPost, XiaohongshuImage, BilibiliVideo
from app.services.crawler_service import crawler_service
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import re
import asyncio

router = APIRouter(prefix="/api/crawler", tags=["crawler"])


class XhsCrawlRequest(BaseModel):
    """小红书抓取请求"""
    url: str  # 小红书帖子URL
    enable_comments: bool = False


class BiliCrawlRequest(BaseModel):
    """B站抓取请求"""
    url: str  # B站视频URL
    enable_comments: bool = False


class CrawlResponse(BaseModel):
    """抓取响应"""
    success: bool
    status: str  # pending, running, completed, failed, timeout
    message: Optional[str] = None
    data: Optional[Dict[str, Any]] = None


def parse_xhs_url(url: str) -> Optional[tuple]:
    """
    解析小红书URL，提取 note_id 和验证必要参数
    
    Returns:
        (note_id, xsec_token) 或 None（如果 URL 无效）
    """
    # 匹配格式：https://www.xiaohongshu.com/explore/{note_id} 或 https://www.xiaohongshu.com/discovery/item/{note_id}
    pattern = r"xiaohongshu\.com/(?:explore|discovery/item)/([a-f0-9]+)"
    match = re.search(pattern, url)
    if not match:
        return None
    
    note_id = match.group(1)
    
    # 提取 xsec_token（可选但推荐）
    xsec_token = None
    if "xsec_token=" in url:
        token_match = re.search(r"xsec_token=([^&]+)", url)
        if token_match:
            xsec_token = token_match.group(1)
    
    return (note_id, xsec_token)


def parse_bili_url(url: str) -> Optional[str]:
    """解析B站URL，提取视频ID"""
    # 匹配 BV 号
    bv_pattern = r"(BV[a-zA-Z0-9]+)"
    match = re.search(bv_pattern, url)
    if match:
        return match.group(1)
    
    # 匹配 AV 号
    av_pattern = r"av(\d+)"
    match = re.search(av_pattern, url)
    if match:
        return f"av{match.group(1)}"
    
    return None


async def crawl_xhs_task(note_id: str, user_id: int, xsec_token: Optional[str] = None, original_url: Optional[str] = None, enable_comments: bool = False):
    """后台任务：抓取小红书帖子"""
    from app.database import engine
    from sqlmodel import Session as SessionLocal
    
    # 启动爬虫 - 传递完整 URL 或 note_id
    result = await crawler_service.start_xhs_crawl(note_id, xsec_token, original_url, enable_comments=enable_comments)
    if not result.get("success"):
        return {"status": "failed", "message": result.get("error")}
    
    # 等待完成（最长 90 秒）
    status = await crawler_service.wait_for_completion(timeout=90)
    
    if status.get("status") == "failed":
        # 获取错误日志
        logs = await crawler_service.get_logs(20)
        error_msg = status.get("error", "抓取失败")
        for log in logs:
            if log.get("level") == "error":
                error_msg = log.get("message", error_msg)
                break
        return {"status": "failed", "message": error_msg}
    
    if status.get("status") == "timeout":
        return {"status": "timeout", "message": "抓取超时，请稍后重试"}
    
    # 查找并处理数据
    data = await crawler_service.find_xhs_data(note_id)
    if not data:
        # 检查日志获取具体原因
        logs = await crawler_service.get_logs(30)
        for log in logs:
            msg = log.get("message", "")
            if "Failed to get note detail" in msg:
                return {"status": "failed", "message": "帖子不存在或已被删除"}
            if "login" in msg.lower() and "fail" in msg.lower():
                return {"status": "failed", "message": "登录失败，请扫码登录"}
        return {"status": "failed", "message": "未找到抓取数据，请确认帖子链接有效"}
    
    # 保存到数据库
    with SessionLocal(engine) as session:
        result = await crawler_service.process_xhs_data(data, session)
        return {"status": "completed", "data": result}


async def crawl_bili_task(video_id: str, user_id: int, enable_comments: bool = False):
    """后台任务：抓取B站视频"""
    from app.database import engine
    from sqlmodel import Session as SessionLocal
    from app.models import BilibiliVideo
    
    bvid = video_id if video_id.startswith("BV") else None
    
    # 先检查数据库中是否已存在
    with SessionLocal(engine) as session:
        from sqlmodel import select
        existing = None
        if bvid:
            existing = session.exec(
                select(BilibiliVideo).where(BilibiliVideo.bvid == bvid)
            ).first()
        if not existing:
            existing = session.exec(
                select(BilibiliVideo).where(BilibiliVideo.video_id == video_id)
            ).first()
        
        if existing:
            return {
                "status": "completed", 
                "data": {
                    "video_id": existing.bvid or existing.video_id,
                    "title": existing.title,
                    "existing": True
                }
            }
    
    # 启动爬虫
    result = await crawler_service.start_bili_crawl(video_id, enable_comments=enable_comments)
    if not result.get("success"):
        return {"status": "failed", "message": result.get("error")}
    
    # 等待完成
    status = await crawler_service.wait_for_completion(timeout=90)
    
    if status.get("status") == "failed":
        logs = await crawler_service.get_logs(20)
        error_msg = status.get("error", "抓取失败")
        for log in logs:
            if log.get("level") == "error":
                error_msg = log.get("message", error_msg)
                break
        return {"status": "failed", "message": error_msg}
    
    if status.get("status") == "timeout":
        return {"status": "timeout", "message": "抓取超时，请稍后重试"}
    
    # 查找数据文件（使用最新的数据文件）
    files = await crawler_service.get_data_files("bili")
    files = sorted(files, key=lambda x: x.get("modified_at", 0), reverse=True)
    content_files = [f for f in files if "detail_contents" in f.get("name", "")]
    
    # 如果是 BV 号，通过 API 获取对应的 avid
    search_avid = None
    if video_id.startswith("BV"):
        search_avid = await crawler_service.get_bv_aid(video_id)
        print(f"[CrawlerService] BV {video_id} -> AVID {search_avid}")
    
    # 根据视频 ID 查找数据
    video_data = None
    for f in content_files:
        content = await crawler_service.get_file_content(f["path"])
        if content and isinstance(content, dict):
            data_list = content.get("data", [])
            for item in data_list:
                item_video_id = item.get("video_id")
                # 匹配 avid（MediaCrawler 存储的是 avid）
                if search_avid and item_video_id == search_avid:
                    video_data = item
                    break
                # 匹配 BV 号或 avid
                if item_video_id == video_id:
                    video_data = item
                    break
        if video_data:
            break
    
    if not video_data:
        logs = await crawler_service.get_logs(30)
        for log in logs:
            msg = log.get("message", "")
            if "Failed to get" in msg or "not found" in msg.lower():
                return {"status": "failed", "message": "视频不存在或已被删除"}
        return {"status": "failed", "message": "未找到抓取数据，请确认视频链接有效"}
    
    # 保存到数据库，传递原始 BV 号
    with SessionLocal(engine) as session:
        result = await crawler_service.process_bili_data([video_data], session, bvid=bvid)
        return {"status": "completed", "data": result}


@router.get("/check")
async def check_crawler_connection(current_user: User = Depends(get_current_user)):
    """检查 MediaCrawler 服务连接状态"""
    result = await crawler_service.check_connection()
    return result


@router.get("/status")
async def get_crawler_status(current_user: User = Depends(get_current_user)):
    """获取爬虫当前状态"""
    status = await crawler_service.get_status()
    return status


@router.post("/xhs", response_model=CrawlResponse)
async def crawl_xiaohongshu(
    request: XhsCrawlRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
):
    """
    抓取小红书帖子
    
    同步执行抓取，等待完成后返回结果
    支持解析小红书移动端分享短链接 (xhslink.com) 自动获取 xsec_token
    """
    url = request.url
    
    # 尝试解析分享短链接或无 xsec_token 的链接，获取重定向后的完整链接
    if "xhslink.com" in url or ("xiaohongshu.com" in url and "xsec_token" not in url):
        import httpx
        try:
            # 提取文本中的链接
            match = re.search(r"https?://[^\s]+", url)
            if match:
                fetch_url = match.group(0)
                async with httpx.AsyncClient(follow_redirects=True, timeout=10.0) as client:
                    headers = {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                    }
                    resp = await client.get(fetch_url, headers=headers)
                    url = str(resp.url)
                    print(f"Resolved XHS share link: {url}")
        except Exception as e:
            print(f"Failed to resolve share link: {e}")

    parsed = parse_xhs_url(url)
    
    if not parsed:
        raise HTTPException(status_code=400, detail="无效的小红书链接")
    
    note_id, xsec_token = parsed
    
    # 验证 xsec_token
    if not xsec_token:
        raise HTTPException(
            status_code=400, 
            detail="无法获取 xsec_token 参数，请尝试从浏览器地址栏复制完整链接"
        )
        
    # 构建干净的 URL，只保留 explore/xxx?xsec_token=xxx 供爬虫使用
    clean_url = f"https://www.xiaohongshu.com/explore/{note_id}?xsec_token={xsec_token}&xsec_source=pc_search"
    print(f"Cleaned XHS URL for crawler: {clean_url}")
    
    # 同步执行抓取
    result = await crawl_xhs_task(note_id, current_user.id, xsec_token, clean_url, enable_comments=request.enable_comments)
    
    return CrawlResponse(
        success=result.get("status") == "completed",
        status=result.get("status", "unknown"),
        message=result.get("message"),
        data=result.get("data")
    )


@router.post("/bili", response_model=CrawlResponse)
async def crawl_bilibili(
    request: BiliCrawlRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
):
    """
    抓取B站视频
    
    同步执行抓取，等待完成后返回结果
    """
    video_id = parse_bili_url(request.url)
    
    if not video_id:
        raise HTTPException(status_code=400, detail="无效的B站链接")
    
    # 同步执行抓取
    result = await crawl_bili_task(video_id, current_user.id, enable_comments=request.enable_comments)
    
    return CrawlResponse(
        success=result.get("status") == "completed",
        status=result.get("status", "unknown"),
        message=result.get("message"),
        data=result.get("data")
    )


@router.get("/xhs/{note_id}")
async def get_xhs_post(
    note_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """获取小红书帖子数据"""
    post = session.exec(
        select(XiaohongshuPost).where(XiaohongshuPost.note_id == note_id)
    ).first()
    
    if not post:
        raise HTTPException(status_code=404, detail="帖子未找到")
    
    images = session.exec(
        select(XiaohongshuImage).where(XiaohongshuImage.post_id == post.id).order_by(XiaohongshuImage.image_index)
    ).all()
    
    return {
        "note_id": post.note_id,
        "title": post.title,
        "desc": post.desc,
        "note_type": post.note_type,
        "video_url": post.video_url,
        "author": {
            "id": post.author_id,
            "name": post.author_name,
            "avatar": post.author_avatar
        },
        "stats": {
            "liked": post.liked_count,
            "collected": post.collected_count,
            "comment": post.comment_count,
            "share": post.share_count
        },
        "ip_location": post.ip_location,
        "tags": post.tags.split(",") if post.tags else [],
        "source_url": post.source_url,
        "comments": post.comments or [],
        "images": [
            {
                "index": img.image_index,
                "path": f"/{img.local_path}",
                "original_url": img.original_url
            }
            for img in images
        ],
        "created_at": post.created_at.isoformat() if post.created_at else None,
        "fetched_at": post.fetched_at.isoformat()
    }


@router.get("/bili/{video_id}")
async def get_bili_video(
    video_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """获取B站视频数据"""
    video = session.exec(
        select(BilibiliVideo).where(BilibiliVideo.video_id == video_id)
    ).first()
    
    if not video:
        raise HTTPException(status_code=404, detail="视频未找到")
    
    return {
        "video_id": video.video_id,
        "title": video.title,
        "desc": video.desc,
        "author": {
            "id": video.author_id,
            "name": video.author_name,
            "avatar": video.author_avatar
        },
        "stats": {
            "play": video.play_count,
            "like": video.like_count,
            "coin": video.coin_count,
            "favorite": video.favorite_count,
            "share": video.share_count,
            "danmaku": video.danmaku_count,
            "comment": video.comment_count
        },
        "cover": f"/{video.cover_local_path}" if video.cover_local_path else None,
        "source_url": video.source_url,
        "comments": video.comments or [],
        "created_at": video.created_at.isoformat() if video.created_at else None,
        "fetched_at": video.fetched_at.isoformat()
    }