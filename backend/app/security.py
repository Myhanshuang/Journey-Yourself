from cryptography.fernet import Fernet
from app.config import settings

def encrypt_data(data: str) -> str:
    f = Fernet(settings.ENCRYPTION_KEY.encode())
    return f.encrypt(data.encode()).decode()

def decrypt_data(encrypted_data: str) -> str:
    f = Fernet(settings.ENCRYPTION_KEY.encode())
    return f.decrypt(encrypted_data.encode()).decode()
