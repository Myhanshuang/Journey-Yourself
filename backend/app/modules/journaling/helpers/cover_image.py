import hashlib
import mimetypes
from pathlib import Path
from typing import Any, Optional
from urllib.parse import urlparse

import httpx

from app.config import settings


def extract_first_image_src(content: dict[str, Any] | None) -> str | None:
    if not content or not isinstance(content, dict):
        return None

    def walk(nodes: list[dict[str, Any]]) -> str | None:
        for node in nodes:
            if node.get("type") == "image":
                src = node.get("attrs", {}).get("src")
                if isinstance(src, str) and src:
                    return src
            children = node.get("content")
            if isinstance(children, list):
                nested = walk(children)
                if nested:
                    return nested
        return None

    nodes = content.get("content")
    if not isinstance(nodes, list):
        return None
    return walk(nodes)


def get_cover_cache_dir() -> Path:
    sqlite_url = settings.DATABASE_URL
    db_path = sqlite_url.replace("sqlite:///", "")
    data_dir = Path(db_path).parent if db_path else Path("data")
    cache_dir = data_dir / "cover_cache"
    cache_dir.mkdir(parents=True, exist_ok=True)
    return cache_dir


def infer_extension(source_url: str, content_type: str | None) -> str:
    if content_type:
        guessed = mimetypes.guess_extension(content_type.split(";")[0].strip())
        if guessed:
            return guessed
    parsed = urlparse(source_url)
    suffix = Path(parsed.path).suffix
    return suffix if suffix else ".img"


def cache_remote_cover_image(source_url: str, cache_dir: Path | None = None) -> str | None:
    if not source_url.startswith(("http://", "https://")):
        return None

    cache_dir = cache_dir or get_cover_cache_dir()
    response = httpx.get(source_url, follow_redirects=True, timeout=5.0)
    response.raise_for_status()

    content_type = response.headers.get("content-type", "")
    if not content_type.startswith("image/"):
        return None

    suffix = infer_extension(source_url, content_type)
    hashed_name = hashlib.sha256(source_url.encode()).hexdigest()
    target = cache_dir / f"{hashed_name}{suffix}"
    target.write_bytes(response.content)
    return f"/cover_cache/{target.name}"


def resolve_cover_image_url(content: dict[str, Any] | None, cache_remote: bool = True) -> Optional[str]:
    source = extract_first_image_src(content)
    if not source:
        return None
    if source.startswith("/"):
        return source
    if source.startswith(("http://", "https://")):
        if cache_remote:
            try:
                return cache_remote_cover_image(source)
            except Exception:
                return source
        return source
    return None
