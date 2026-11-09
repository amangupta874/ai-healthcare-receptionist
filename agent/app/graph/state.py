from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class ReceptionistState(BaseModel):
    # Session identity
    telegram_user_id: str = ""
    chat_id: int = 0
    user_role: str = "PATIENT" # PATIENT, MANAGER, STAFF
    clinic_id: str = "11111111-1111-1111-1111-111111111111"
    clinic_name: str = "City Care Clinic"
    language: str = "en" # en, hi, hinglish

    # Current turn input
    user_text: str = ""
    callback_data: Optional[str] = None
    document_file_id: Optional[str] = None
    document_file_name: Optional[str] = None

    # Routing and safety
    intent: Optional[str] = None
    is_safe: bool = True
    safety_violation_type: Optional[str] = None # "medical_advice", "emergency", "injection"

    # Multi-turn booking flow data
    doctor_id: Optional[str] = None
    doctor_name: Optional[str] = None
    specialty: Optional[str] = None
    consultation_fee: Optional[float] = None
    selected_date: Optional[str] = None # YYYY-MM-DD
    selected_slot: Optional[str] = None # ISO string
    selected_slot_time: Optional[str] = None # e.g. "10:30 AM"
    patient_name: Optional[str] = None
    patient_phone: Optional[str] = None

    # Multi-turn management / lookup data
    booking_code: Optional[str] = None
    appointment_id: Optional[str] = None
    pending_draft_id: Optional[str] = None
    verification_attempts: int = 0

    # Human-in-the-loop explicit confirmation state
    pending_action: Optional[str] = None # "book", "cancel", "reschedule", "approve_draft"
    confirmation_id: Optional[str] = None
    is_confirmed: Optional[bool] = None

    # Outgoing response
    reply_text: Optional[str] = None
    reply_markup: Optional[Dict[str, Any]] = None
    escalate_to_staff: bool = False
    escalation_reason: Optional[str] = None

