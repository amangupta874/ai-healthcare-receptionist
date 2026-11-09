import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "agent"

def test_webhook_rejects_missing_or_invalid_secret_token():
    payload = {
        "update_id": 1001,
        "message": {
            "message_id": 1,
            "chat": {"id": 12345, "type": "private"},
            "date": 1700000000,
            "text": "Hello"
        }
    }

    # Request with invalid secret token
    res = client.post(
        "/webhook",
        headers={"x-telegram-bot-api-secret-token": "WRONG_SECRET_TOKEN"},
        json=payload
    )
    assert res.status_code == 401

def test_webhook_accepts_valid_secret_token():
    payload = {
        "update_id": 1002,
        "message": {
            "message_id": 2,
            "chat": {"id": 12345, "type": "private"},
            "from": {"id": 99999, "first_name": "TestUser"},
            "date": 1700000000,
            "text": "/start"
        }
    }

    res = client.post(
        "/webhook",
        headers={"x-telegram-bot-api-secret-token": settings.TELEGRAM_WEBHOOK_SECRET},
        json=payload
    )
    assert res.status_code == 200

