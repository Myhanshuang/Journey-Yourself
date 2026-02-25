"""
MediaCrawler 服务封装

注意：MediaCrawler 是单任务服务，一次只能运行一个爬虫任务
"""
import httpx
import os
import json
import asyncio
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from pathlib import Path

from app.config import settings

# MediaCrawler API 基础 URL（自动添加 http:// 前缀）
MEDIACRAWLER_API_BASE = settings.MEDIACRAWLER_URL
if not MEDIACRAWLER_API_BASE.startswith("http://") and not MEDIACRAWLER_API_BASE.startswith("https://"):
    MEDIACRAWLER_API_BASE = f"http://{MEDIACRAWLER_API_BASE}"

print(f"[CrawlerService] MediaCrawler URL: {MEDIACRAWLER_API_BASE}")

# 数据存储路径
DATA_DIR = Path(__file__).parent.parent.parent / "data"
XHS_MEDIA_DIR = DATA_DIR / "xhs"
BILI_MEDIA_DIR = DATA_DIR / "bilibili"


# BV 号转换表
BV_TABLE = 'fZodR9XQDSUm21yCkr6zBqiveYah8bt4xsWpHnJE7jL5VG3guMTKNPAwcF'
BV_S = [11, 10, 3, 8, 4, 6]
BV_XOR = 177451812
BV_ADD = 8728348608


def bv_to_av(bv: str) -> int:
    """将 BV 号转换为 avid（本地算法，可能不准确）"""
    if not bv or not bv.startswith('BV'):
        return 0
    
    tr = {c: i for i, c in enumerate(BV_TABLE)}
    
    r = 0
    for i in range(6):
        r += tr.get(bv[BV_S[i]], 0) * (58 ** i)
    
    return (r - BV_ADD) ^ BV_XOR


class CrawlerService:
    """MediaCrawler 服务封装（单任务模式）"""
    
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=120.0)
        self._ensure_directories()
    
    async def get_bv_aid(self, bvid: str) -> Optional[str]:
        """通过 B 站 API 获取 BV 号对应的 avid"""
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Referer": "https://www.bilibili.com/"
            }
            resp = await self.client.get(
                f"https://api.bilibili.com/x/web-interface/view?bvid={bvid}",
                headers=headers,
                timeout=10.0
            )
            resp.raise_for_status()
            data = resp.json()
            if data.get("data") and data["data"].get("aid"):
                return str(data["data"]["aid"])
        except Exception as e:
            print(f"[CrawlerService] Failed to get aid for {bvid}: {e}")
        return None
    
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=120.0)
        self._ensure_directories()
    
    def _ensure_directories(self):
        """确保媒体存储目录存在"""
        XHS_MEDIA_DIR.mkdir(parents=True, exist_ok=True)
        BILI_MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    
    async def close(self):
        """关闭客户端"""
        await self.client.aclose()
    
    async def check_connection(self) -> Dict[str, Any]:
        """检查 MediaCrawler 服务连接状态"""
        try:
            resp = await self.client.get(
                f"{MEDIACRAWLER_API_BASE}/api/crawler/status",
                timeout=5.0
            )
            return {
                "connected": True,
                "status_code": resp.status_code,
                "url": MEDIACRAWLER_API_BASE,
                "status": resp.json()
            }
        except httpx.ConnectError as e:
            return {
                "connected": False,
                "error": f"Connection refused - {MEDIACRAWLER_API_BASE}",
                "detail": str(e)
            }
        except httpx.TimeoutException:
            return {
                "connected": False,
                "error": f"Connection timeout - {MEDIACRAWLER_API_BASE}",
            }
        except Exception as e:
            return {
                "connected": False,
                "error": str(e),
            }
    
    async def get_status(self) -> Dict[str, Any]:
        """获取爬虫当前状态"""
        try:
            resp = await self.client.get(
                f"{MEDIACRAWLER_API_BASE}/api/crawler/status"
            )
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    async def start_xhs_crawl(self, note_id: str, xsec_token: str = None, original_url: str = None) -> Dict[str, Any]:
        """
        启动小红书帖子抓取任务
        
        Args:
            note_id: 小红书帖子ID
            xsec_token: 小红书 xsec_token（必需）
            original_url: 完整的帖子 URL
        
        Returns:
            启动结果
        """
        # 先检查当前状态
        status = await self.get_status()
        if status.get("status") == "running":
            return {
                "success": False,
                "error": "爬虫正在运行其他任务，请稍后再试",
                "current_status": status
            }
        
        # 构建完整的 URL（MediaCrawler 需要完整 URL 来获取 xsec_token）
        if original_url and "xsec_token" in original_url:
            specified_url = original_url
        elif xsec_token:
            specified_url = f"https://www.xiaohongshu.com/explore/{note_id}?xsec_token={xsec_token}&xsec_source=pc_search"
        else:
            return {
                "success": False,
                "error": "缺少 xsec_token，请提供完整的帖子链接"
            }
        
        payload = {
            "platform": "xhs",
            "login_type": "qrcode",
            "crawler_type": "detail",
            "specified_ids": specified_url,  # 传递完整 URL
            "enable_comments": False,
            "save_option": "json",
            "headless": True
        }
        
        url = f"{MEDIACRAWLER_API_BASE}/api/crawler/start"
        print(f"[CrawlerService] Starting XHS crawl: {note_id}")
        print(f"[CrawlerService] Full URL: {specified_url}")
        
        try:
            resp = await self.client.post(url, json=payload)
            if resp.status_code == 400:
                # 已经有任务在运行
                return {
                    "success": False,
                    "error": resp.json().get("detail", "爬虫正在运行"),
                }
            resp.raise_for_status()
            return {"success": True, "message": "Crawler started"}
        except httpx.ConnectError:
            return {"success": False, "error": f"无法连接 MediaCrawler 服务 ({MEDIACRAWLER_API_BASE})"}
        except httpx.TimeoutException:
            return {"success": False, "error": "连接超时"}
        except httpx.HTTPStatusError as e:
            return {"success": False, "error": f"HTTP {e.response.status_code}"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def start_bili_crawl(self, video_id: str) -> Dict[str, Any]:
        """
        启动B站视频抓取任务
        
        Args:
            video_id: B站视频ID (BV号)
        
        Returns:
            启动结果
        """
        status = await self.get_status()
        if status.get("status") == "running":
            return {
                "success": False,
                "error": "爬虫正在运行其他任务，请稍后再试",
                "current_status": status
            }
        
        payload = {
            "platform": "bili",
            "login_type": "qrcode",
            "crawler_type": "detail",
            "specified_ids": video_id,
            "enable_comments": False,
            "save_option": "json",
            "headless": True
        }
        
        url = f"{MEDIACRAWLER_API_BASE}/api/crawler/start"
        print(f"[CrawlerService] Starting Bili crawl: {video_id}")
        
        try:
            resp = await self.client.post(url, json=payload)
            if resp.status_code == 400:
                return {
                    "success": False,
                    "error": resp.json().get("detail", "爬虫正在运行"),
                }
            resp.raise_for_status()
            return {"success": True, "message": "Crawler started"}
        except httpx.ConnectError:
            return {"success": False, "error": f"无法连接 MediaCrawler 服务 ({MEDIACRAWLER_API_BASE})"}
        except httpx.TimeoutException:
            return {"success": False, "error": "连接超时"}
        except httpx.HTTPStatusError as e:
            return {"success": False, "error": f"HTTP {e.response.status_code}"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def stop_crawler(self) -> Dict[str, Any]:
        """停止当前爬虫任务"""
        try:
            resp = await self.client.post(f"{MEDIACRAWLER_API_BASE}/api/crawler/stop")
            resp.raise_for_status()
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def get_logs(self, limit: int = 50) -> List[Dict[str, Any]]:
        """获取爬虫日志"""
        try:
            resp = await self.client.get(
                f"{MEDIACRAWLER_API_BASE}/api/crawler/logs",
                params={"limit": limit}
            )
            resp.raise_for_status()
            return resp.json().get("logs", [])
        except Exception:
            return []
    
    async def get_data_files(self, platform: str) -> List[Dict[str, Any]]:
        """获取数据文件列表"""
        try:
            resp = await self.client.get(
                f"{MEDIACRAWLER_API_BASE}/api/data/files",
                params={"platform": platform}
            )
            resp.raise_for_status()
            return resp.json().get("files", [])
        except Exception:
            return []
    
    async def get_file_content(self, file_path: str) -> Optional[Any]:
        """获取文件内容"""
        try:
            resp = await self.client.get(
                f"{MEDIACRAWLER_API_BASE}/api/data/files/{file_path}"
            )
            resp.raise_for_status()
            return resp.json()
        except Exception:
            return None
    
    async def wait_for_completion(self, timeout: int = 120) -> Dict[str, Any]:
        """
        等待爬虫完成
        
        Args:
            timeout: 超时时间（秒）
        
        Returns:
            最终状态
        """
        start_time = asyncio.get_event_loop().time()
        
        while True:
            status = await self.get_status()
            current_status = status.get("status", "unknown")
            
            if current_status == "idle":
                # 爬虫完成
                return {"status": "completed", "message": "Crawl completed"}
            
            if current_status == "error":
                return {"status": "failed", "error": status.get("error_message")}
            
            # 检查超时
            elapsed = asyncio.get_event_loop().time() - start_time
            if elapsed > timeout:
                return {"status": "timeout", "message": f"Timeout after {timeout}s"}
            
            await asyncio.sleep(2)
    
    async def find_xhs_data(self, note_id: str) -> Optional[List[Dict]]:
        """查找小红书数据
        
        数据文件格式: {"data": [...], "total": n}
        文件名是日期格式，需要在 data 数组中搜索 note_id
        优先搜索 detail_contents 文件（帖子内容），排除评论文件
        """
        files = await self.get_data_files("xhs")
        # 按修改时间倒序，优先查找最新的文件
        files = sorted(files, key=lambda x: x.get("modified_at", 0), reverse=True)
        
        # 优先搜索帖子内容文件，排除评论文件
        content_files = [f for f in files if "detail_contents" in f.get("name", "")]
        other_files = [f for f in files if "detail_contents" not in f.get("name", "") and "comment" not in f.get("name", "")]
        
        for f in content_files + other_files:
            content = await self.get_file_content(f["path"])
            if content and isinstance(content, dict):
                data_list = content.get("data", [])
                for item in data_list:
                    if item.get("note_id") == note_id and "title" in item:
                        return [item]
        return None
    
    def bv_to_av(self, bv_id: str) -> Optional[str]:
        """
        将 B站 BV 号转换为 avid
        
        B站的 BV 号和 avid 是一一对应的，使用特定的编码算法转换
        参考：https://www.zhihu.com/question/381784377/answer/1099438784
        """
        if not bv_id.startswith("BV"):
            return bv_id  # 已经是 avid
        
        # BV 号转换表
        table = "fZodR9XQDSUm21yCkr6zBqiveYah8bt4xsWpHnJE7jL5VG3guMTKNPAwcF"
        tr = {c: i for i, c in enumerate(table)}
        
        # 转换用的索引位置
        s = [11, 10, 3, 8, 4, 6]
        xor = 177451812
        add = 8728348608
        
        try:
            r = sum(tr[bv_id[s[i]]] * 58 ** i for i in range(6))
            avid = (r - add) ^ xor
            return str(avid)
        except (KeyError, IndexError):
            return None
    
    async def find_bili_data(self, video_id: str) -> Optional[List[Dict]]:
        """查找B站数据
        
        数据文件格式: {"data": [...], "total": n}
        文件名是日期格式，需要在 data 数组中搜索
        注意：MediaCrawler 将 BV 号转换为 avid（数字 ID）存储
        所以需要先将 BV 号转换为 avid 再搜索
        """
        # 如果是 BV 号，先转换为 avid
        search_id = self.bv_to_av(video_id) if video_id.startswith("BV") else video_id
        print(f"[CrawlerService] Searching bili data: {video_id} -> {search_id}")
        
        files = await self.get_data_files("bili")
        # 按修改时间倒序，优先查找最新的文件
        files = sorted(files, key=lambda x: x.get("modified_at", 0), reverse=True)
        
        # 优先搜索 detail_contents 文件
        content_files = [f for f in files if "detail_contents" in f.get("name", "")]
        other_files = [f for f in files if "detail_contents" not in f.get("name", "")]
        
        for f in content_files + other_files:
            content = await self.get_file_content(f["path"])
            if content and isinstance(content, dict):
                data_list = content.get("data", [])
                for item in data_list:
                    # 匹配 video_id (avid)
                    if item.get("video_id") == search_id:
                        return [item]
        return None
    
    async def download_image(self, url: str, save_path: Path) -> bool:
        """下载图片到本地"""
        try:
            resp = await self.client.get(url, follow_redirects=True, timeout=30.0)
            resp.raise_for_status()
            
            save_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(save_path, "wb") as f:
                f.write(resp.content)
            
            return True
        except Exception as e:
            print(f"Failed to download image {url}: {e}")
            return False
    
    async def process_xhs_data(self, data: List[Dict], session) -> Optional[Dict[str, Any]]:
        """处理小红书数据：保存到数据库并下载图片"""
        from app.models import XiaohongshuPost, XiaohongshuImage
        from sqlmodel import select
        
        if not data:
            return None
        
        post_data = data[0]
        note_id = post_data.get("note_id")
        
        if not note_id:
            return None
        
        # 检查是否已存在
        existing = session.exec(
            select(XiaohongshuPost).where(XiaohongshuPost.note_id == note_id)
        ).first()
        
        if existing:
            return {"note_id": existing.note_id, "existing": True}
        
        # 创建帖子记录
        post = XiaohongshuPost(
            note_id=note_id,
            title=post_data.get("title", ""),
            desc=post_data.get("desc", ""),
            note_type=post_data.get("type", "normal"),
            video_url=post_data.get("video_url", "") or None,
            author_id=post_data.get("user_id", ""),
            author_name=post_data.get("nickname", ""),
            author_avatar=post_data.get("avatar", ""),
            liked_count=int(post_data.get("liked_count", 0) or 0),
            collected_count=int(post_data.get("collected_count", 0) or 0),
            comment_count=int(post_data.get("comment_count", 0) or 0),
            share_count=int(post_data.get("share_count", 0) or 0),
            ip_location=post_data.get("ip_location", ""),
            tags=post_data.get("tag_list", ""),
            source_url=post_data.get("note_url", ""),
            created_at=datetime.fromtimestamp(post_data.get("time", 0) / 1000, tz=timezone.utc) if post_data.get("time") else None
        )
        session.add(post)
        session.commit()
        session.refresh(post)
        
        # 下载图片
        image_list = post_data.get("image_list", "").split(",") if post_data.get("image_list") else []
        saved_images = []
        
        post_dir = XHS_MEDIA_DIR / note_id
        
        for idx, img_url in enumerate(image_list):
            if img_url.strip():
                ext = ".jpg"
                if ".png" in img_url.lower():
                    ext = ".png"
                elif ".webp" in img_url.lower():
                    ext = ".webp"
                
                local_path = f"xhs/{note_id}/{idx}{ext}"
                save_path = DATA_DIR / local_path
                
                success = await self.download_image(img_url.strip(), save_path)
                if success:
                    image = XiaohongshuImage(
                        post_id=post.id,
                        image_index=idx,
                        local_path=local_path,
                        original_url=img_url.strip()
                    )
                    session.add(image)
                    saved_images.append(local_path)
        
        session.commit()
        
        return {
            "note_id": note_id,
            "title": post.title,
            "images": saved_images,
            "note_type": post.note_type,
            "existing": False
        }
    
    async def process_bili_data(self, data: List[Dict], session, bvid: str = None) -> Optional[Dict[str, Any]]:
        """处理B站数据：保存到数据库并下载封面
        
        Args:
            data: 爬取的视频数据
            session: 数据库会话
            bvid: 原始 BV 号（用户输入的）
        """
        from app.models import BilibiliVideo
        from sqlmodel import select
        
        if not data:
            return None
        
        video_data = data[0]
        video_id = video_data.get("video_id")  # avid
        
        if not video_id:
            return None
        
        # 检查是否已存在（通过 avid 或 bvid）
        existing = session.exec(
            select(BilibiliVideo).where(BilibiliVideo.video_id == video_id)
        ).first()
        
        if not existing and bvid:
            existing = session.exec(
                select(BilibiliVideo).where(BilibiliVideo.bvid == bvid)
            ).first()
        
        if existing:
            return {"video_id": existing.bvid or existing.video_id, "existing": True}
        
        # 创建视频记录
        video = BilibiliVideo(
            video_id=video_id,
            bvid=bvid,  # 保存原始 BV 号
            title=video_data.get("title", ""),
            desc=video_data.get("desc", ""),
            author_id=video_data.get("user_id", ""),
            author_name=video_data.get("nickname", ""),
            author_avatar=video_data.get("avatar", ""),
            duration=None,
            play_count=int(video_data.get("video_play_count", 0) or 0),
            like_count=int(video_data.get("liked_count", 0) or 0),
            coin_count=int(video_data.get("video_coin_count", 0) or 0),
            favorite_count=int(video_data.get("video_favorite_count", 0) or 0),
            share_count=int(video_data.get("video_share_count", 0) or 0),
            danmaku_count=int(video_data.get("video_danmaku", 0) or 0),
            comment_count=int(video_data.get("video_comment", 0) or 0),
            source_url=video_data.get("video_url", ""),
            created_at=datetime.fromtimestamp(video_data.get("create_time", 0), tz=timezone.utc) if video_data.get("create_time") else None
        )
        
        # 下载封面
        cover_url = video_data.get("video_cover_url", "")
        if cover_url:
            video_dir = BILI_MEDIA_DIR / video_id
            local_path = f"bilibili/{video_id}/cover.jpg"
            save_path = DATA_DIR / local_path
            
            success = await self.download_image(cover_url, save_path)
            if success:
                video.cover_local_path = local_path
        
        session.add(video)
        session.commit()
        
        # 返回 BV 号（优先）或 avid
        return_id = bvid or video_id
        return {
            "video_id": return_id,
            "title": video.title,
            "cover": video.cover_local_path,
            "existing": False
        }


# 全局服务实例
crawler_service = CrawlerService()