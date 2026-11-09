import asyncio
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent.parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.telegram.client import TelegramClient
from app.config import settings

async def main():
    tg = TelegramClient()
    webhook_url = f"{settings.PUBLIC_BASE_URL.rstrip('/')}/webhook"
    secret_token = settings.TELEGRAM_WEBHOOK_SECRET

    print(f"Setting Telegram webhook to: {webhook_url}")
    res = await tg.set_webhook(webhook_url, secret_token)
    print("setWebhook response:", res)

    info = await tg.get_webhook_info()
    print("getWebhookInfo response:", info)

if __name__ == '__main__':
    asyncio.run(main())
