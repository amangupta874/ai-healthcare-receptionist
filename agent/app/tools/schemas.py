from typing import Optional, List, Literal, Dict, Any
from pydantic import BaseModel, Field

class ConfirmationPayload(BaseModel):
    confirmed: bool = Field(description="Must be True")
    confirmation_id: str = Field(description="Unique confirmation event token from interrupt")

class DoctorProfile(BaseModel):
    id: str
    name: str
    specialty: str
    consultation_fee: float

class SlotItem(BaseModel):
    starts_at: str
    ends_at: str
    formatted_time: str

class BookAppointmentInput(BaseModel):
    clinic_id: str
    doctor_id: str
    starts_at: str
    patient_name: str
    patient_phone: str
    confirmation: ConfirmationPayload
    idempotency_key: Optional[str] = None

class BookAppointmentOutput(BaseModel):
    appointment_id: str
    booking_code: str
    doctor_name: str
    starts_at: str
    status: str

class VerifyAppointmentInput(BaseModel):
    booking_code: str
    phone: Optional[str] = None
    name: Optional[str] = None

class CancelAppointmentInput(BaseModel):
    appointment_id: str
    confirmation: ConfirmationPayload
    reason: Optional[str] = None

class RescheduleAppointmentInput(BaseModel):
    appointment_id: str
    new_starts_at: str
    confirmation: ConfirmationPayload

class CreateEscalationInput(BaseModel):
    clinic_id: str
    reason: str
    summary: str
    patient_name: Optional[str] = None
    patient_phone: Optional[str] = None
