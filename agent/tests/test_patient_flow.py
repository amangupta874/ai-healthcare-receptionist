import pytest
from unittest.mock import AsyncMock, patch
from app.graph.state import ReceptionistState
from app.graph.workflow import workflow_app

@pytest.mark.asyncio
async def test_start_command_returns_welcome_and_keyboard():
    with patch("app.graph.nodes.backend.resolve_identity", new_callable=AsyncMock) as mock_res:
        mock_res.return_value = {"role": "PATIENT", "clinicId": "11111111-1111-1111-1111-111111111111"}
        state = ReceptionistState(
            telegram_user_id="12345",
            chat_id=12345,
            user_text="/start"
        )
        result = await workflow_app.ainvoke(state, config={"configurable": {"thread_id": "test_start"}})
        assert result.get("reply_text") is not None
        assert "City Care Clinic" in result["reply_text"]
        assert result.get("reply_markup") is not None
        assert "inline_keyboard" in result["reply_markup"]

@pytest.mark.asyncio
async def test_doctor_discovery_flow():
    with patch("app.graph.nodes.backend.resolve_identity", new_callable=AsyncMock) as mock_res, \
         patch("app.graph.nodes.backend.get_doctors", new_callable=AsyncMock) as mock_docs:
        mock_res.return_value = {"role": "PATIENT", "clinicId": "11111111-1111-1111-1111-111111111111"}
        mock_docs.return_value = [
            {"id": "doc1", "name": "Dr. Priya Sharma", "specialty": "Cardiology", "consultationFee": 600}
        ]

        state = ReceptionistState(
            telegram_user_id="12345",
            chat_id=12345,
            user_text="Show doctors",
            intent="doctors"
        )
        result = await workflow_app.ainvoke(state, config={"configurable": {"thread_id": "test_doc"}})
        reply = result.get("reply_text")
        assert reply is not None
        assert "Dr. Priya Sharma" in reply
        assert "Cardiology" in reply
        assert "₹600" in reply

@pytest.mark.asyncio
async def test_talk_to_staff_escalation():
    with patch("app.graph.nodes.backend.resolve_identity", new_callable=AsyncMock) as mock_res, \
         patch("app.graph.nodes.backend.create_escalation", new_callable=AsyncMock) as mock_esc:
        mock_res.return_value = {"role": "PATIENT", "clinicId": "11111111-1111-1111-1111-111111111111"}
        mock_esc.return_value = {"id": "esc-123", "status": "OPEN"}

        state = ReceptionistState(
            telegram_user_id="12345",
            chat_id=12345,
            user_text="/staff"
        )
        result = await workflow_app.ainvoke(state, config={"configurable": {"thread_id": "test_staff"}})
        reply = result.get("reply_text")
        assert reply is not None
        assert "Staff Assistance" in reply or "notified" in reply or "sampark" in reply
