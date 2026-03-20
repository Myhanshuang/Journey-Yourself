from base64 import urlsafe_b64decode, urlsafe_b64encode
from datetime import datetime


def encode_cursor(date: datetime, entity_id: int) -> str:
    return urlsafe_b64encode(f"{date.isoformat()}|{entity_id}".encode()).decode()


def decode_cursor(cursor: str) -> tuple[datetime, int]:
    raw = urlsafe_b64decode(cursor.encode()).decode()
    date_raw, entity_id_raw = raw.rsplit("|", 1)
    return datetime.fromisoformat(date_raw), int(entity_id_raw)
