import pytest
from unittest.mock import AsyncMock, patch

@pytest.fixture(autouse=True)
def mock_external_services():
    with patch("app.telegram.client.TelegramClient.send_message", new_callable=AsyncMock) as mock_send, \
         patch("app.telegram.client.TelegramClient.edit_message_text", new_callable=AsyncMock) as mock_edit, \
         patch("app.telegram.client.TelegramClient.answer_callback_query", new_callable=AsyncMock) as mock_answer, \
         patch("app.telegram.client.TelegramClient.get_file", new_callable=AsyncMock) as mock_get_file, \
         patch("app.telegram.client.TelegramClient.download_file", new_callable=AsyncMock) as mock_download, \
         patch("app.graph.nodes.backend.resolve_identity", new_callable=AsyncMock) as mock_res, \
         patch("app.graph.nodes.backend.get_doctors", new_callable=AsyncMock) as mock_docs, \
         patch("app.graph.nodes.backend.get_clinic_knowledge", new_callable=AsyncMock) as mock_know, \
         patch("app.graph.nodes.backend.create_escalation", new_callable=AsyncMock) as mock_esc:

        mock_send.return_value = {"ok": True, "result": {"message_id": 123}}
        mock_edit.return_value = {"ok": True}
        mock_answer.return_value = {"ok": True}

        mock_res.return_value = {
            "userId": "usr-1",
            "role": "PATIENT",
            "clinicId": "11111111-1111-1111-1111-111111111111"
        }
        mock_docs.return_value = [
            {"id": "doc1", "name": "Dr. Priya Sharma", "specialty": "Cardiology", "consultationFee": 600},
            {"id": "doc2", "name": "Dr. Rajesh Verma", "specialty": "General Physician", "consultationFee": 400}
        ]
        mock_know.return_value = [
            {
                "id": "k1",
                "type": "TIMING",
                "question": "What are the clinic timings?",
                "content": "Monday to Saturday 09:00 AM - 06:00 PM. Closed on Sundays."
            },
            {
                "id": "k2",
                "type": "FEE",
                "question": "Consultation fees",
                "content": "Consultation fee for Dr. Sharma is ₹600, General fee is ₹400."
            }
        ]
        mock_esc.return_value = {"id": "esc-1", "status": "OPEN"}

        yield
