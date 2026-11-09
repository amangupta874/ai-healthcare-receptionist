import httpx
import uuid
from typing import Optional, Dict, Any, List
from app.config import settings

class BackendClient:
    def __init__(self, base_url: Optional[str] = None, service_key: Optional[str] = None):
        self.base_url = base_url or settings.BACKEND_BASE_URL
        self.service_key = service_key or settings.SERVICE_API_KEY

    def _headers(self, telegram_user_id: Optional[str] = None) -> Dict[str, str]:
        headers = {
            "x-service-api-key": self.service_key,
            "x-request-id": str(uuid.uuid4())
        }
        if telegram_user_id:
            headers["x-telegram-user-id"] = str(telegram_user_id)
        return headers

    async def resolve_identity(self, telegram_user_id: str) -> Dict[str, Any]:
        url = f"{self.base_url}/v1/identity/resolve"
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(url, headers=self._headers(telegram_user_id))
            resp.raise_for_status()
            return resp.json()

    async def link_invite(self, telegram_user_id: str, invite_code: str, name: Optional[str] = None) -> Dict[str, Any]:
        url = f"{self.base_url}/v1/identity/link-invite"
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(
                url,
                headers=self._headers(telegram_user_id),
                json={"inviteCode": invite_code, "name": name}
            )
            return resp.json()

    async def get_clinic_profile(self, clinic_id: str) -> Dict[str, Any]:
        url = f"{self.base_url}/v1/clinics/{clinic_id}/profile"
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url, headers=self._headers())
            resp.raise_for_status()
            return resp.json()

    async def get_clinic_knowledge(self, clinic_id: str, type_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        url = f"{self.base_url}/v1/clinics/{clinic_id}/knowledge"
        params = {"type": type_filter} if type_filter else {}
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url, headers=self._headers(), params=params)
            resp.raise_for_status()
            data = resp.json()
            return data.get("items", [])

    async def get_doctors(self, clinic_id: str, specialty: Optional[str] = None) -> List[Dict[str, Any]]:
        url = f"{self.base_url}/v1/clinics/{clinic_id}/doctors"
        params = {"specialty": specialty} if specialty else {}
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url, headers=self._headers(), params=params)
            resp.raise_for_status()
            data = resp.json()
            return data.get("doctors", [])

    async def get_availability(self, doctor_id: str, date_str: str) -> Dict[str, Any]:
        url = f"{self.base_url}/v1/doctors/{doctor_id}/availability"
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url, headers=self._headers(), params={"date": date_str})
            resp.raise_for_status()
            return resp.json()

    async def book_appointment(
        self,
        telegram_user_id: str,
        clinic_id: str,
        doctor_id: str,
        starts_at: str,
        patient_name: str,
        patient_phone: str,
        confirmation_id: str,
        idempotency_key: Optional[str] = None
    ) -> Dict[str, Any]:
        url = f"{self.base_url}/v1/appointments"
        headers = self._headers(telegram_user_id)
        if idempotency_key:
            headers["idempotency-key"] = idempotency_key

        payload = {
            "clinicId": clinic_id,
            "doctorId": doctor_id,
            "startsAt": starts_at,
            "patientName": patient_name,
            "patientPhone": patient_phone,
            "confirmation": {
                "confirmed": True,
                "confirmationId": confirmation_id
            }
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            return resp.json()

    async def verify_appointment(self, telegram_user_id: str, booking_code: str, phone_or_name: Optional[str] = None) -> Dict[str, Any]:
        url = f"{self.base_url}/v1/appointments/verify"
        payload: Dict[str, Any] = {"bookingCode": booking_code}
        if phone_or_name:
            if phone_or_name.isdigit():
                payload["phone"] = phone_or_name
            else:
                payload["name"] = phone_or_name

        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(url, headers=self._headers(telegram_user_id), json=payload)
            return resp.json()

    async def cancel_appointment(
        self,
        telegram_user_id: str,
        appointment_id: str,
        confirmation_id: str,
        reason: Optional[str] = None
    ) -> Dict[str, Any]:
        url = f"{self.base_url}/v1/appointments/{appointment_id}/cancel"
        payload = {
            "confirmation": {
                "confirmed": True,
                "confirmationId": confirmation_id
            },
            "reason": reason or "Cancelled by patient via Telegram"
        }
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(url, headers=self._headers(telegram_user_id), json=payload)
            return resp.json()

    async def reschedule_appointment(
        self,
        telegram_user_id: str,
        appointment_id: str,
        new_starts_at: str,
        confirmation_id: str
    ) -> Dict[str, Any]:
        url = f"{self.base_url}/v1/appointments/{appointment_id}/reschedule"
        payload = {
            "newStartsAt": new_starts_at,
            "confirmation": {
                "confirmed": True,
                "confirmationId": confirmation_id
            }
        }
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(url, headers=self._headers(telegram_user_id), json=payload)
            return resp.json()

    async def create_escalation(
        self,
        clinic_id: str,
        reason: str,
        summary: str,
        telegram_user_id: Optional[str] = None,
        patient_name: Optional[str] = None,
        patient_phone: Optional[str] = None
    ) -> Dict[str, Any]:
        url = f"{self.base_url}/v1/escalations"
        payload = {
            "clinicId": clinic_id,
            "reason": reason,
            "summary": summary,
            "patientName": patient_name,
            "patientPhone": patient_phone
        }
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(url, headers=self._headers(telegram_user_id), json=payload)
            return resp.json()

    async def create_draft(
        self,
        telegram_user_id: str,
        clinic_id: str,
        file_name: str,
        extracted_json: Dict[str, Any],
        issues_json: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        url = f"{self.base_url}/v1/drafts"
        payload = {
            "clinicId": clinic_id,
            "fileName": file_name,
            "extractedJson": extracted_json,
            "issuesJson": issues_json or {}
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, headers=self._headers(telegram_user_id), json=payload)
            return resp.json()

    async def approve_draft(self, telegram_user_id: str, draft_id: str) -> Dict[str, Any]:
        url = f"{self.base_url}/v1/drafts/{draft_id}/approve"
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, headers=self._headers(telegram_user_id), json={"approve": True})
            return resp.json()

    async def reject_draft(self, telegram_user_id: str, draft_id: str) -> Dict[str, Any]:
        url = f"{self.base_url}/v1/drafts/{draft_id}/reject"
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(url, headers=self._headers(telegram_user_id))
            return resp.json()
