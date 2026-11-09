import pytest
from unittest.mock import AsyncMock, patch
from app.graph.state import ReceptionistState
from app.graph.workflow import workflow_app

@pytest.mark.asyncio
async def test_booking_prompts_confirmation_interrupt():
    state = ReceptionistState(
        telegram_user_id="user_book_1",
        chat_id=5555,
        user_text="Ravi Kumar, 9876543210",
        doctor_id="doc-123",
        doctor_name="Priya Sharma",
        specialty="Cardiology",
        consultation_fee=600,
        selected_date="2026-11-20",
        selected_slot="2026-11-20T04:30:00Z",
        selected_slot_time="10:00 AM"
    )

    result = await workflow_app.ainvoke(state, config={"configurable": {"thread_id": "thread_book_test"}})
    reply = result.get("reply_text")
    assert reply is not None
    assert "Please Confirm Your Appointment" in reply or "confirm karein" in reply
    assert "Dr. Priya Sharma" in reply
    assert "₹600" in reply

    # Verify Yes/No buttons present
    markup = result.get("reply_markup")
    assert markup is not None
    buttons = markup.get("inline_keyboard", [])
    flattened = [btn["text"] for row in buttons for btn in row]
    assert any("Yes" in b for b in flattened)
    assert any("No" in b for b in flattened)

@pytest.mark.asyncio
async def test_booking_executes_only_after_confirmation():
    with patch("app.graph.nodes.backend.book_appointment", new_callable=AsyncMock) as mock_book:
        mock_book.return_value = {
            "appointmentId": "appt-999",
            "bookingCode": "APT-8F2B",
            "doctorName": "Priya Sharma",
            "startsAt": "2026-11-20T04:30:00Z",
            "status": "BOOKED"
        }

        state = ReceptionistState(
            telegram_user_id="user_book_1",
            chat_id=5555,
            callback_data="confirm_yes",
            doctor_id="doc-123",
            selected_date="2026-11-20",
            selected_slot="2026-11-20T04:30:00Z",
            selected_slot_time="10:00 AM",
            patient_name="Ravi Kumar",
            patient_phone="9876543210",
            confirmation_id="conf-token-xyz"
        )

        result = await workflow_app.ainvoke(state, config={"configurable": {"thread_id": "thread_book_exec"}})
        reply = result.get("reply_text")
        assert reply is not None
        assert "APT-8F2B" in reply
        assert "Confirmed" in reply or "Confirm ho gayi" in reply
        mock_book.assert_called_once()
