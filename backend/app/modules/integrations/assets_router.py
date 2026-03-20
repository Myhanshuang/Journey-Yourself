from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from app.auth import get_current_user
from app.models import User
import uuid
import os
import struct

router = APIRouter(prefix="/api/assets", tags=["assets"])

# 确保目录存在
UPLOAD_DIR = "data/uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

# 文件大小限制 (bytes)
MAX_IMAGE_SIZE = 20 * 1024 * 1024 * 5  # 100MB
MAX_VIDEO_SIZE = 500 * 1024 * 1024 * 5 # 2500MB
MAX_AUDIO_SIZE = 100 * 1024 * 1024 * 5 # 500MB

# 文件签名 (magic bytes) - 用于验证真实文件类型
FILE_SIGNATURES = {
    # 图片
    b'\xff\xd8\xff': 'image/jpeg',  # JPEG
    b'\x89PNG\r\n\x1a\n': 'image/png',  # PNG
    b'GIF87a': 'image/gif',  # GIF87a
    b'GIF89a': 'image/gif',  # GIF89a
    b'RIFF': 'image/webp',  # WebP (需要进一步验证)
    b'<?xml': 'image/svg+xml',  # SVG
    b'<svg': 'image/svg+xml',  # SVG
    b'\x00\x00\x01\x00': 'image/x-icon',  # ICO
    b'BM': 'image/bmp',  # BMP
    b'\x00\x00\x00\x1cftyp': 'image/heic',  # HEIC (前12字节含ftyp)
    b'\x00\x00\x00\x20ftyp': 'image/heic',  # HEIC
    # 视频
    b'\x00\x00\x00\x1cftypisom': 'video/mp4',  # MP4
    b'\x00\x00\x00\x18ftypisom': 'video/mp4',  # MP4
    b'\x00\x00\x00\x14ftypisom': 'video/mp4',  # MP4
    b'ftyp': 'video/mp4',  # MP4 (通用检测)
    b'\x1a\x45\xdf\xa3': 'video/webm',  # WebM/MKV
    b'\x00\x00\x01\xba': 'video/mpeg',  # MPEG
    b'\x00\x00\x01\xb3': 'video/mpeg',  # MPEG
    b'moov': 'video/quicktime',  # MOV
    # 音频
    b'ID3': 'audio/mpeg',  # MP3 with ID3 tag
    b'\xff\xfb': 'audio/mpeg',  # MP3
    b'\xff\xfa': 'audio/mpeg',  # MP3
    b'\xff\xf3': 'audio/mpeg',  # MP3
    b'\xff\xf2': 'audio/mpeg',  # MP3
    b'RIFF': 'audio/wav',  # WAV (需要进一步验证)
    b'OggS': 'audio/ogg',  # OGG
    b'fLaC': 'audio/flac',  # FLAC
    b'\x00\x00\x00\x20ftypM4A': 'audio/mp4',  # M4A
}

# 允许的文件扩展名
ALLOWED_EXTENSIONS = {
    'image': {'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico', 'bmp', 'heic', 'heif', 'avif'},
    'video': {'mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'm4v', '3gp'},
    'audio': {'mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma', 'opus'}
}

# 允许的 MIME 类型
ALLOWED_MIME_TYPES = {
    'image': {
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        'image/x-icon', 'image/bmp', 'image/heic', 'image/heif', 'image/avif'
    },
    'video': {
        'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime',
        'video/x-msvideo', 'video/x-matroska', 'video/x-m4v', 'video/3gpp'
    },
    'audio': {
        'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac',
        'audio/aac', 'audio/mp4', 'audio/x-ms-wma', 'audio/opus'
    }
}


def verify_file_signature(content: bytes, declared_type: str) -> bool:
    """验证文件签名是否与声明的类型匹配"""
    if len(content) < 12:
        return False
    
    header = content[:32]  # 取前32字节用于检测
    
    # 检查已知签名
    for sig, mime_type in FILE_SIGNATURES.items():
        if header.startswith(sig):
            # WebP/RIFF 需要额外验证
            if sig == b'RIFF':
                if len(content) >= 12:
                    webp_check = content[8:12]
                    if webp_check == b'WEBP':
                        return declared_type.startswith('image/')
                    elif webp_check == b'WAVE':
                        return declared_type.startswith('audio/')
            return True
    
    # SVG 特殊处理 (XML格式)
    if declared_type == 'image/svg+xml':
        try:
            text_start = content[:100].decode('utf-8', errors='ignore').lower()
            return '<svg' in text_start or '<?xml' in text_start
        except:
            return False
    
    # AVIF 特殊处理 (ftyp 在第4-8字节)
    if len(content) >= 12:
        ftyp = content[4:12]
        if b'avif' in ftyp or b'avis' in ftyp:
            return declared_type in ('image/avif', 'image/heic', 'image/heif')
    
    return False


def get_safe_extension(filename: str, content_type: str) -> str:
    """根据 MIME 类型获取安全的扩展名"""
    ext_map = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp',
        'image/svg+xml': 'svg',
        'image/x-icon': 'ico',
        'image/bmp': 'bmp',
        'image/heic': 'heic',
        'image/heif': 'heif',
        'image/avif': 'avif',
        'video/mp4': 'mp4',
        'video/webm': 'webm',
        'video/ogg': 'ogv',
        'video/quicktime': 'mov',
        'video/x-msvideo': 'avi',
        'video/x-matroska': 'mkv',
        'audio/mpeg': 'mp3',
        'audio/wav': 'wav',
        'audio/ogg': 'ogg',
        'audio/flac': 'flac',
        'audio/aac': 'aac',
        'audio/mp4': 'm4a',
        'audio/opus': 'opus',
    }
    return ext_map.get(content_type, filename.rsplit('.', 1)[-1] if '.' in filename else 'bin')


def validate_media_file(content: bytes, content_type: str, filename: str, max_size: int) -> tuple[str, str]:
    """
    验证媒体文件安全性
    返回: (media_type, safe_extension)
    抛出异常如果验证失败
    """
    # 1. 大小检查
    if len(content) > max_size:
        raise HTTPException(400, f"File too large. Max {max_size // (1024*1024)}MB")
    
    if len(content) == 0:
        raise HTTPException(400, "Empty file")
    
    # 2. 确定 media 类型
    media_type = None
    for mt in ['image', 'video', 'audio']:
        if content_type.startswith(mt + '/'):
            media_type = mt
            break
    
    if not media_type:
        raise HTTPException(400, "Unsupported media type")
    
    # 3. MIME 类型白名单检查
    if content_type not in ALLOWED_MIME_TYPES.get(media_type, set()):
        raise HTTPException(400, f"Invalid {media_type} type: {content_type}")
    
    # 4. 扩展名白名单检查
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
    if ext not in ALLOWED_EXTENSIONS.get(media_type, set()):
        raise HTTPException(400, f"Invalid file extension: .{ext}")
    
    # 5. 文件签名验证 (防止伪装攻击)
    if not verify_file_signature(content, content_type):
        raise HTTPException(400, "File signature verification failed. Possible malicious file.")
    
    # 6. 获取安全扩展名
    safe_ext = get_safe_extension(filename, content_type)
    
    return media_type, safe_ext


def validate_image(content: bytes, content_type: str, filename: str) -> str:
    """验证图片文件"""
    _, safe_ext = validate_media_file(content, content_type, filename, MAX_IMAGE_SIZE)
    return safe_ext


def validate_video(content: bytes, content_type: str, filename: str) -> str:
    """验证视频文件"""
    _, safe_ext = validate_media_file(content, content_type, filename, MAX_VIDEO_SIZE)
    return safe_ext


def validate_audio(content: bytes, content_type: str, filename: str) -> str:
    """验证音频文件"""
    _, safe_ext = validate_media_file(content, content_type, filename, MAX_AUDIO_SIZE)
    return safe_ext


@router.post("/upload-cover")
async def upload_cover(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    """上传封面图片"""
    content = await file.read()
    
    try:
        safe_ext = validate_image(content, file.content_type, file.filename or "image.jpg")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, f"Validation failed: {str(e)}")
    
    file_name = f"{uuid.uuid4()}.{safe_ext}"
    file_path = os.path.join(UPLOAD_DIR, file_name)
    
    with open(file_path, "wb") as buffer:
        buffer.write(content)
        
    return {"url": f"/uploads/{file_name}", "type": file.content_type, "size": len(content)}


@router.post("/upload-video")
async def upload_video(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    """上传视频文件"""
    content = await file.read()
    
    try:
        safe_ext = validate_video(content, file.content_type, file.filename or "video.mp4")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, f"Validation failed: {str(e)}")
    
    file_name = f"{uuid.uuid4()}.{safe_ext}"
    file_path = os.path.join(UPLOAD_DIR, file_name)
    
    with open(file_path, "wb") as buffer:
        buffer.write(content)
    
    return {
        "url": f"/uploads/{file_name}",
        "type": file.content_type,
        "size": len(content)
    }


@router.post("/upload-audio")
async def upload_audio(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    """上传音频文件"""
    content = await file.read()
    
    try:
        safe_ext = validate_audio(content, file.content_type, file.filename or "audio.mp3")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, f"Validation failed: {str(e)}")
    
    file_name = f"{uuid.uuid4()}.{safe_ext}"
    file_path = os.path.join(UPLOAD_DIR, file_name)
    
    with open(file_path, "wb") as buffer:
        buffer.write(content)
    
    return {
        "url": f"/uploads/{file_name}",
        "type": file.content_type,
        "size": len(content)
    }


@router.post("/upload-media")
async def upload_media(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    """通用多媒体上传接口（自动检测类型）"""
    content = await file.read()
    content_type = file.content_type or ""
    
    # 确定最大大小
    if content_type.startswith("image/"):
        max_size = MAX_IMAGE_SIZE
    elif content_type.startswith("video/"):
        max_size = MAX_VIDEO_SIZE
    elif content_type.startswith("audio/"):
        max_size = MAX_AUDIO_SIZE
    else:
        raise HTTPException(400, "Unsupported media type")
    
    try:
        media_type, safe_ext = validate_media_file(content, content_type, file.filename or "media.bin", max_size)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, f"Validation failed: {str(e)}")
    
    file_name = f"{uuid.uuid4()}.{safe_ext}"
    file_path = os.path.join(UPLOAD_DIR, file_name)
    
    with open(file_path, "wb") as buffer:
        buffer.write(content)
    
    return {
        "url": f"/uploads/{file_name}",
        "type": content_type,
        "mediaType": media_type,
        "size": len(content)
    }
