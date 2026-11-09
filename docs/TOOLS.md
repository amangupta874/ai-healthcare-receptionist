# Agent Tools Specification (docs/TOOLS.md)

This document defines the strict Pydantic schemas, input/output structures, and error contracts for all tools invoked by the LangGraph agent. Each tool represents a single, authorized HTTP call to the Express backend system of record.

---

## Shared Security Headers
Every tool request sent to the Express backend includes:
- `x-service-api-key`: Pre-shared service authentication key from `SERVICE_API_KEY`.
- `x-telegram-user-id`: Telegram User ID of the interacting user.
- `x-request-id`: Unique UUID for request tracking and audit correlation.

---

## 1. `get_clinic_knowledge_tool`
- **Purpose**: Fetch manager-approved FAQs, timings, fees, and rules for a clinic.
- **Input Schema**:
  ```python
  class GetClinicKnowledgeInput(BaseModel):
      clinic_id: str = Field(description="UUID of the clinic")
      type: Optional[Literal["FAQ", "POLICY", "TIMING", "FEE"]] = Field(
          default=None, description="Optional filter by knowledge category"
      )
  ```
- **Output Schema**:
  ```python
  class KnowledgeItem(BaseModel):
      id: str
      type: str
      question: Optional[str]
      content: str
      version: int

  class GetClinicKnowledgeOutput(BaseModel):
      items: List[KnowledgeItem]
  ```
- **Error Codes**: `CLINIC_NOT_FOUND`, `SERVICE_UNAVAILABLE`.

---

## 2. `get_doctors_tool`
- **Purpose**: Discover active doctors for a clinic, with optional specialty filter.
- **Input Schema**:
  ```python
  class GetDoctorsInput(BaseModel):
      clinic_id: str = Field(description="UUID of the clinic")
      specialty: Optional[str] = Field(default=None, description="Specialty to filter by, e.g. Cardiology")
  ```
- **Output Schema**:
  ```python
  class DoctorProfile(BaseModel):
      id: str
      name: str
      specialty: str
      consultation_fee: float

  class GetDoctorsOutput(BaseModel):
      doctors: List[DoctorProfile]
  ```
- **Error Codes**: `CLINIC_NOT_FOUND`.

---

## 3. `get_doctor_availability_tool`
- **Purpose**: Compute non-booked, non-past available appointment slots for a doctor on a specific date.
- **Input Schema**:
  ```python
  class GetDoctorAvailabilityInput(BaseModel):
      doctor_id: str = Field(description="UUID of the doctor")
      date: str = Field(description="Target date in YYYY-MM-DD format")
  ```
- **Output Schema**:
  ```python
  class SlotItem(BaseModel):
      starts_at: str  # ISO 8601
      ends_at: str    # ISO 8601
      formatted_time: str # e.g. "10:00 AM"

  class GetDoctorAvailabilityOutput(BaseModel):
      doctor_id: str
      doctor_name: str
      specialty: str
      consultation_fee: float
      date: str
      slots: List[SlotItem]
  ```
- **Error Codes**: `DOCTOR_NOT_FOUND`, `DOCTOR_ON_LEAVE`, `NO_SCHEDULE_FOR_DAY`.

---

## 4. `book_appointment_tool`
- **Purpose**: Execute an appointment booking transaction. Mandatory explicit confirmation token required.
- **Input Schema**:
  ```python
  class ConfirmationPayload(BaseModel):
      confirmed: bool = Field(description="Must be True")
      confirmation_id: str = Field(description="Unique confirmation event token from interrupt")

  class BookAppointmentInput(BaseModel):
      clinic_id: str
      doctor_id: str
      starts_at: str # ISO 8601
      patient_name: str
      patient_phone: str
      confirmation: ConfirmationPayload
      idempotency_key: Optional[str] = None
  ```
- **Output Schema**:
  ```python
  class BookAppointmentOutput(BaseModel):
      appointment_id: str
      booking_code: str
      doctor_name: str
      starts_at: str
      status: str # "BOOKED"
  ```
- **Error Codes**: `CONFIRMATION_REQUIRED`, `SLOT_ALREADY_BOOKED`, `DOUBLE_BOOKING_CONFLICT`, `INVALID_PATIENT_DATA`.

---

## 5. `verify_appointment_tool`
- **Purpose**: Authenticate patient access for lookup, cancellation, or rescheduling using booking code and phone or name.
- **Input Schema**:
  ```python
  class VerifyAppointmentInput(BaseModel):
      booking_code: str = Field(description="6-character alphanumeric booking code")
      phone: Optional[str] = Field(default=None, description="Patient mobile number")
      name: Optional[str] = Field(default=None, description="Patient name entered at booking")
  ```
- **Output Schema**:
  ```python
  class VerifiedAppointmentDetails(BaseModel):
      id: str
      booking_code: str
      doctor_id: str
      doctor_name: str
      starts_at: str
      ends_at: str
      status: str

  class VerifyAppointmentOutput(BaseModel):
      verified: bool
      attempts_remaining: int
      appointment: Optional[VerifiedAppointmentDetails] = None
  ```
- **Error Codes**: `ATTEMPTS_EXCEEDED_LOCKED`, `NOT_FOUND`.

---

## 6. `cancel_appointment_tool`
- **Purpose**: Cancel a verified appointment and free its slot. Mandatory explicit confirmation token required.
- **Input Schema**:
  ```python
  class CancelAppointmentInput(BaseModel):
      appointment_id: str
      confirmation: ConfirmationPayload
      reason: Optional[str] = None
  ```
- **Output Schema**:
  ```python
  class CancelAppointmentOutput(BaseModel):
      success: bool
      appointment_id: str
      booking_code: str
      status: str # "CANCELLED"
  ```
- **Error Codes**: `CONFIRMATION_REQUIRED`, `APPOINTMENT_NOT_FOUND`, `ALREADY_CANCELLED`.

---

## 7. `reschedule_appointment_tool`
- **Purpose**: Atomically release old slot and claim new slot. Mandatory explicit confirmation token required.
- **Input Schema**:
  ```python
  class RescheduleAppointmentInput(BaseModel):
      appointment_id: str
      new_starts_at: str # ISO 8601
      confirmation: ConfirmationPayload
  ```
- **Output Schema**:
  ```python
  class RescheduleAppointmentOutput(BaseModel):
      success: bool
      appointment_id: str
      booking_code: str
      new_starts_at: str
      status: str # "RESCHEDULED"
  ```
- **Error Codes**: `CONFIRMATION_REQUIRED`, `NEW_SLOT_UNAVAILABLE`.

---

## 8. `create_escalation_tool`
- **Purpose**: Create a staff attention ticket when queries exceed administrative scope or verification locks out.
- **Input Schema**:
  ```python
  class CreateEscalationInput(BaseModel):
      clinic_id: str
      reason: str # "MEDICAL_ADVICE_REQUEST", "VERIFICATION_FAILURE", "UNKNOWN_QUERY", "PATIENT_REQUEST"
      summary: str
      patient_name: Optional[str] = None
      patient_phone: Optional[str] = None
  ```
- **Output Schema**:
  ```python
  class CreateEscalationOutput(BaseModel):
      escalation_id: str
      status: str # "OPEN"
  ```

---

## 9. `link_manager_invite_tool`
- **Purpose**: Redeem a single-use invite code to link the Telegram User ID to a clinic manager role.
- **Input Schema**:
  ```python
  class LinkManagerInviteInput(BaseModel):
      invite_code: str
      name: Optional[str] = None
  ```
- **Output Schema**:
  ```python
  class LinkManagerInviteOutput(BaseModel):
      success: bool
      role: str # "MANAGER"
      clinic_id: str
      clinic_name: str
  ```
- **Error Codes**: `INVALID_OR_EXPIRED_CODE`, `ALREADY_LINKED`.

---

## 10. `draft_lifecycle_tools` (`create_draft`, `approve_draft`, `reject_draft`)
- **Purpose**: Manage the ingestion and activation of document policies.
- **Approve Input**:
  ```python
  class ApproveDraftInput(BaseModel):
      draft_id: str
      approve: bool = True
  ```
- **Output**:
  ```python
  class ApproveDraftOutput(BaseModel):
      draft_id: str
      status: str # "APPROVED"
      activated_items_count: int
  ```
- **Security Check**: Enforces role == `MANAGER` and clinic ownership check on the backend.

