import os
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent.parent.parent / '.env'
if env_path.exists():
    load_dotenv(dotenv_path=env_path)

class Settings:
    NODE_ENV: str = os.getenv('NODE_ENV', 'development')
    TZ: str = os.getenv('TZ', 'Asia/Kolkata')

    # Backend
    BACKEND_BASE_URL: str = os.getenv('BACKEND_BASE_URL', 'http://localhost:3000')
    SERVICE_API_KEY: str = os.getenv('SERVICE_API_KEY', '')
    AGENT_PORT: int = int(os.getenv('AGENT_PORT', '8000'))

    # Telegram
    TELEGRAM_BOT_TOKEN: str = os.getenv('TELEGRAM_BOT_TOKEN', '')
    TELEGRAM_WEBHOOK_SECRET: str = os.getenv('TELEGRAM_WEBHOOK_SECRET', '')
    PUBLIC_BASE_URL: str = os.getenv('PUBLIC_BASE_URL', 'https://localhost')

    # LLM
    LLM_PROVIDER: str = os.getenv('LLM_PROVIDER', 'gemini')
    LLM_API_KEY: str = os.getenv('LLM_API_KEY', '')
    LLM_MODEL: str = os.getenv('LLM_MODEL', 'gemini-3.8-flash')

    # Documents / OCR
    MAX_UPLOAD_MB: int = int(os.getenv('MAX_UPLOAD_MB', '10'))
    OCR_LANGS: str = os.getenv('OCR_LANGS', 'eng+hin')

    # Default Demo Clinic ID
    DEFAULT_CLINIC_ID: str = '11111111-1111-1111-1111-111111111111'

settings = Settings()
