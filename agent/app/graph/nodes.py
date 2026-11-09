import uuid
import re
from typing import Dict, Any, Optional
from app.graph.state import ReceptionistState
from app.tools.backend_client import BackendClient
from app.prompts.templates import detect_language, MESSAGES, get_main_menu_keyboard
from app.config import settings

backend = BackendClient()

# Medical keywords for safety filtering (English, Hinglish, Hindi Devanagari)
MEDICAL_KEYWORDS = [
    'bukhar', 'fever', 'dawai', 'medicine', 'tablet', 'headache', 'dard', 'pain',
    'symptom', 'cough', 'cold', 'vomit', 'ulti', 'infection', 'prescription',
    'treatment', 'ilaj', 'dawa', 'dose', 'mg', 'disease', 'bimari',
    'बुखार', 'दवाई', 'दवा', 'गोली', 'दर्द', 'सिरदर्द', 'उल्टी', 'इलाज', 'बीमारी', 'नुस्खा'
]

EMERGENCY_KEYWORDS = [
    'chest pain', 'heart attack', 'unconscious', 'behosh', 'heavy bleeding',
    'severe bleeding', 'choking', 'saans nahi aa rahi', 'breathless', 'stroke',
    'emergency', 'poison', 'trauma',
    'सीने में दर्द', 'बेहोश', 'सांस', 'खून', 'इमरजेंसी', 'आपातकालीन', 'दिल का दौरा'
]

INJECTION_KEYWORDS = [
    'ignore previous instructions', 'ignore all instructions', 'system prompt',
    'developer mode', 'jailbreak', 'disregard rules', 'new system prompt'
]

async def ingest_node(state: ReceptionistState) -> Dict[str, Any]:
    updates: Dict[str, Any] = {}

    # Detect language if user text provided
    if state.user_text:
        detected_lang = detect_language(state.user_text)
        updates["language"] = detected_lang

    # Resolve user role and clinic tenancy from backend
    if state.telegram_user_id:
        try:
            identity = await backend.resolve_identity(state.telegram_user_id)
            updates["user_role"] = identity.get("role", "PATIENT")
            if identity.get("clinicId"):
                updates["clinicId"] = identity["clinicId"]
        except Exception:
            pass

    # Check for direct slash commands
    text = (state.user_text or "").strip().lower()
    if text.startswith('/start'):
        updates["intent"] = "start"
    elif text.startswith('/menu'):
        updates["intent"] = "menu"
    elif text.startswith('/cancel'):
        updates["intent"] = "cancel_flow"
    elif text.startswith('/staff'):
        updates["intent"] = "talk_to_staff"
    elif text.startswith('/manager'):
        updates["intent"] = "manager_menu"
    elif text.startswith('/link'):
        updates["intent"] = "link_invite"

    return updates

async def safety_gate_node(state: ReceptionistState) -> Dict[str, Any]:
    text = (state.user_text or "").lower()

    # 1. Prompt Injection Filter
    if any(k in text for k in INJECTION_KEYWORDS):
        return {
            "is_safe": False,
            "safety_violation_type": "injection"
        }

    # 2. Emergency Alert Filter
    if any(k in text for k in EMERGENCY_KEYWORDS):
        return {
            "is_safe": False,
            "safety_violation_type": "emergency"
        }

    # 3. Medical Advice Refusal Filter
    # Only trigger if user is asking for medical recommendation, not merely finding a doctor for illness
    if any(k in text for k in MEDICAL_KEYWORDS):
        # Exclude administrative queries like "Dr. Sharma ki fees kitni hai"
        if not any(admin_word in text for admin_word in ['book', 'appointment', 'fee', 'fees', 'timing', 'schedule', 'doctor', 'dr.', 'milna']):
            return {
                "is_safe": False,
                "safety_violation_type": "medical_advice"
            }

    return {"is_safe": True, "safety_violation_type": None}

async def intent_router_node(state: ReceptionistState) -> Dict[str, Any]:
    # 1. Check if safety violated
    if not state.is_safe:
        return {"intent": "safety_refusal"}

    # 2. Check callback query
    cb = state.callback_data
    if cb:
        if cb.startswith("menu_"):
            return {"intent": cb.replace("menu_", "")}
        elif cb.startswith("doc_"):
            return {"intent": "select_doctor", "doctor_id": cb.replace("doc_", "")}
        elif cb.startswith("date_"):
            return {"intent": "select_date", "selected_date": cb.replace("date_", "")}
        elif cb.startswith("slot_"):
            # Format: slot_{iso_string}_{formatted_time}
            parts = cb.replace("slot_", "").split("|")
            return {
                "intent": "select_slot",
                "selected_slot": parts[0],
                "selected_slot_time": parts[1] if len(parts) > 1 else parts[0]
            }
        elif cb.startswith("confirm_"):
            return {"intent": "confirm_booking", "is_confirmed": (cb == "confirm_yes")}
        elif cb.startswith("cancel_confirm_"):
            return {"intent": "execute_cancel", "is_confirmed": (cb == "cancel_confirm_yes")}
        elif cb.startswith("draft_"):
            action = cb.replace("draft_", "")
            return {"intent": f"draft_{action}"}

    # 3. Check if in active multi-turn booking flow
    if state.doctor_id and (state.selected_slot or state.selected_date):
        return {"intent": "book"}

    # 4. Text intent classification
    if state.intent:
        return {} # Keep existing command intent

    text = (state.user_text or "").lower()

    if any(w in text for w in ['book', 'appointment', 'milna hai', 'slot', 'chahiye', 'booking']):
        return {"intent": "book"}
    elif any(w in text for w in ['doctor', 'dr.', 'specialist', 'specialty', 'cardiologist', 'dentist']):
        return {"intent": "doctors"}
    elif any(w in text for w in ['cancel', 'radd', 'hata do']):
        return {"intent": "cancel"}
    elif any(w in text for w in ['reschedule', 'change', 'badal do', 'agla time']):
        return {"intent": "reschedule"}
    elif any(w in text for w in ['status', 'my appointment', 'check', 'meri appointment']):
        return {"intent": "lookup"}
    elif any(w in text for w in ['staff', 'human', 'receptionist', 'baat karni hai', 'help']):
        return {"intent": "talk_to_staff"}
    elif any(w in text for w in ['timing', 'open', 'fee', 'fees', 'cost', 'parking', 'insurance', 'address', 'kaha']):
        return {"intent": "faq"}

    return {"intent": "unknown"}

async def safety_refusal_node(state: ReceptionistState) -> Dict[str, Any]:
    lang = state.language or "en"
    v_type = state.safety_violation_type

    if v_type == "emergency":
        return {
            "reply_text": MESSAGES["emergency_alert"][lang],
            "reply_markup": None
        }
    elif v_type == "injection":
        refusal = "⚠️ Security Notice: System commands and prompt overrides are disallowed."
        return {"reply_text": refusal, "reply_markup": None}
    else:
        return {
            "reply_text": MESSAGES["medical_refusal"][lang],
            "reply_markup": {
                "inline_keyboard": [
                    [{"text": "📅 Book Appointment", "callback_data": "menu_book"}],
                    [{"text": "💬 Talk to Staff", "callback_data": "menu_staff"}]
                ]
            }
        }

async def start_menu_node(state: ReceptionistState) -> Dict[str, Any]:
    lang = state.language or "en"
    welcome_text = MESSAGES["welcome"][lang]
    keyboard = get_main_menu_keyboard(lang)
    return {
        "reply_text": welcome_text,
        "reply_markup": keyboard
    }

async def doctor_discovery_node(state: ReceptionistState) -> Dict[str, Any]:
    clinic_id = state.clinic_id or settings.DEFAULT_CLINIC_ID
    try:
        doctors = await backend.get_doctors(clinic_id)
        if not doctors:
            return {"reply_text": "No active doctors currently available at this clinic.", "reply_markup": None}

        lang = state.language or "en"
        title = "👨‍⚕️ *Available Doctors & Consultation Fees:*\n"
        if lang == 'hi':
            title = "👨‍⚕️ *उपलब्ध डॉक्टर एवं परामर्श शुल्क:*\n"
        elif lang == 'hinglish':
            title = "👨‍⚕️ *Available Doctors aur Fees:*\n"

        buttons = []
        for doc in doctors:
            title += f"\n• *{doc['name']}* ({doc['specialty']}) - ₹{doc['consultationFee']}"
            buttons.append([{"text": f"Book with {doc['name']}", "callback_data": f"doc_{doc['id']}"}])

        buttons.append([{"text": "🔙 Back to Menu", "callback_data": "menu_start"}])

        return {
            "reply_text": title,
            "reply_markup": {"inline_keyboard": buttons}
        }
    except Exception as e:
        return {
            "reply_text": "Sorry, unable to load doctor profiles. Please try again.",
            "reply_markup": None
        }

async def faq_node(state: ReceptionistState) -> Dict[str, Any]:
    clinic_id = state.clinic_id or settings.DEFAULT_CLINIC_ID
    lang = state.language or "en"
    user_query = (state.user_text or "").lower()

    try:
        items = await backend.get_clinic_knowledge(clinic_id)
        if not items:
            return {
                "reply_text": MESSAGES["unknown_query_escalate"][lang],
                "escalate_to_staff": True,
                "escalation_reason": "NO_KNOWLEDGE_AVAILABLE"
            }

        # 1. If general FAQ requested from menu without a specific question
        if not user_query or user_query in ['menu_faq', 'faq', 'info']:
            summary = "ℹ️ *Clinic Policies & FAQs:*\n"
            seen = set()
            count = 0
            for item in items:
                content = item.get('content', '').strip()
                if content and content not in seen and not content.startswith("Q:") and not content.startswith("A:"):
                    seen.add(content)
                    title = item.get('question') or item.get('type')
                    summary += f"\n• *{title}*: {content}"
                    count += 1
                    if count >= 5:
                        break
            return {
                "reply_text": summary,
                "reply_markup": {"inline_keyboard": [[{"text": "🔙 Back to Menu", "callback_data": "menu_start"}]]}
            }

        # 2. Intelligent semantic/keyword scoring across all approved knowledge items
        stopwords = {'the', 'a', 'an', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'do', 'does', 'how', 'what', 'can', 'i', 'you', 'my', 'your', 'kya', 'hai', 'hain', 'kaise', 'hoga', 'chahiye'}
        import re
        tokens = [w for w in re.findall(r'\b\w+\b', user_query) if w not in stopwords and len(w) > 1]

        intent_synonyms = {
            'pay': ['pay', 'paid', 'payment', 'upi', 'cash', 'card', 'online', 'mode'],
            'payment': ['pay', 'paid', 'payment', 'upi', 'cash', 'card', 'online', 'mode'],
            'fee': ['fee', 'fees', 'cost', 'charge', 'charges', 'rate', 'rates', 'price', 'pricing'],
            'fees': ['fee', 'fees', 'cost', 'charge', 'charges', 'rate', 'rates', 'price', 'pricing'],
            'timing': ['timing', 'timings', 'time', 'hours', 'open', 'close', 'schedule', 'working'],
            'timings': ['timing', 'timings', 'time', 'hours', 'open', 'close', 'schedule', 'working'],
            'time': ['timing', 'timings', 'time', 'hours', 'open', 'close', 'schedule', 'working'],
            'khulta': ['timing', 'timings', 'time', 'hours', 'open', 'close', 'schedule', 'working'],
            'insurance': ['insurance', 'cashless', 'tpa', 'claim', 'claims'],
            'parking': ['park', 'parking', 'vehicle', 'car', 'bike', 'scooter'],
            'emergency': ['emergency', 'urgent', 'casualty', 'trauma'],
            'doctor': ['doctor', 'dr', 'specialist', 'physician', 'cardiologist'],
            'cancel': ['cancel', 'cancellation', 'refund'],
            'wheelchair': ['wheelchair', 'ramp', 'disabled', 'accessible', 'lift']
        }

        expanded_tokens = set(tokens)
        for t in tokens:
            if t in intent_synonyms:
                expanded_tokens.update(intent_synonyms[t])

        scored = []
        for item in items:
            q_text = (item.get("question") or "").lower()
            c_text = (item.get("content") or "").lower()
            combined = f"{q_text} {c_text}"
            score = 0
            if ('pay' in tokens or 'payment' in tokens or 'kaise' in tokens) and any(w in c_text for w in ['paid', 'pay', 'payment', 'upi', 'card', 'cash']):
                score += 15
            if ('parking' in tokens or 'park' in tokens) and 'parking' in c_text:
                score += 15
            if ('insurance' in tokens or 'cashless' in tokens) and 'insurance' in c_text:
                score += 15
            if ('wheelchair' in tokens or 'ramp' in tokens) and 'wheelchair' in c_text:
                score += 15

            for token in expanded_tokens:
                if token in combined:
                    score += 2
                if token in q_text:
                    score += 3
                if token in c_text:
                    score += 2

            if "is missing" in c_text or "incomplete" in c_text or "does not state" in c_text:
                score -= 10

            if score > 0:
                scored.append((score, item))

        scored.sort(key=lambda x: x[0], reverse=True)

        if scored and scored[0][0] >= 3:
            top_item = scored[0][1]
            content = top_item['content'].strip()
            response_text = f"ℹ️ *Clinic Information:*\n\n{content}"

            # Complement payment method with fee schedule if query mentions fees
            if ('fee' in tokens or 'fees' in tokens) and any(w in content.lower() for w in ['upi', 'cash', 'card']):
                for _, other in scored[1:]:
                    if other.get('type') == 'FEE' and '₹' in other.get('content', ''):
                        response_text += f"\n\n*Consultation Fees:*\n{other['content']}"
                        break

            return {
                "reply_text": response_text,
                "reply_markup": {
                    "inline_keyboard": [
                        [{"text": "📅 Book Appointment", "callback_data": "menu_book"}],
                        [{"text": "🔙 Back to Menu", "callback_data": "menu_start"}]
                    ]
                }
            }

        # Fallback to standard category items if query words match broad type
        for item in items:
            c_text = (item.get("content") or "").lower()
            if any(term in user_query for term in ['fee', 'cost', 'charge']) and item.get("type") == 'FEE':
                return {
                    "reply_text": f"ℹ️ *Clinic Information:*\n\n{item['content']}",
                    "reply_markup": {
                        "inline_keyboard": [
                            [{"text": "📅 Book Appointment", "callback_data": "menu_book"}],
                            [{"text": "🔙 Back to Menu", "callback_data": "menu_start"}]
                        ]
                    }
                }
            elif any(term in user_query for term in ['time', 'timing', 'open', 'close', 'hours']) and item.get("type") == 'TIMING':
                return {
                    "reply_text": f"ℹ️ *Clinic Information:*\n\n{item['content']}",
                    "reply_markup": {
                        "inline_keyboard": [
                            [{"text": "📅 Book Appointment", "callback_data": "menu_book"}],
                            [{"text": "🔙 Back to Menu", "callback_data": "menu_start"}]
                        ]
                    }
                }

        # Unknown query -> escalate to staff per rules
        return {
            "reply_text": MESSAGES["unknown_query_escalate"][lang],
            "escalate_to_staff": True,
            "escalation_reason": f"UNKNOWN_FAQ_QUERY: {user_query}"
        }
    except Exception:
        return {
            "reply_text": MESSAGES["unknown_query_escalate"][lang],
            "escalate_to_staff": True,
            "escalation_reason": "FAQ_FETCH_ERROR"
        }

async def booking_flow_node(state: ReceptionistState) -> Dict[str, Any]:
    clinic_id = state.clinic_id or settings.DEFAULT_CLINIC_ID
    lang = state.language or "en"

    # Step 1: Doctor selection
    if not state.doctor_id:
        doctors = await backend.get_doctors(clinic_id)
        buttons = [[{"text": f"Dr. {d['name']} ({d['specialty']}) - ₹{d['consultationFee']}", "callback_data": f"doc_{d['id']}"}] for d in doctors]
        buttons.append([{"text": "❌ Cancel", "callback_data": "menu_cancel_flow"}])
        prompt = "Please choose a doctor for your consultation:" if lang == 'en' else "Kripya doctor select karein:"
        return {"reply_text": f"📅 *Book Appointment*\n\n{prompt}", "reply_markup": {"inline_keyboard": buttons}}

    # Step 2: Date selection (Today, Tomorrow, Day After)
    if not state.selected_date:
        import datetime
        today = datetime.date.today()
        d_today = today.strftime("%Y-%m-%d")
        d_tmrw = (today + datetime.timedelta(days=1)).strftime("%Y-%m-%d")
        d_next = (today + datetime.timedelta(days=2)).strftime("%Y-%m-%d")

        buttons = [
            [{"text": f"Today ({d_today})", "callback_data": f"date_{d_today}"}],
            [{"text": f"Tomorrow ({d_tmrw})", "callback_data": f"date_{d_tmrw}"}],
            [{"text": f"Day After ({d_next})", "callback_data": f"date_{d_next}"}],
            [{"text": "❌ Cancel", "callback_data": "menu_cancel_flow"}]
        ]
        prompt = "Select a visit date:" if lang == 'en' else "Apni visit ke liye date chunein:"
        return {"reply_text": f"📅 *Select Date for Appointment*\n\n{prompt}", "reply_markup": {"inline_keyboard": buttons}}

    # Step 3: Slot selection
    if not state.selected_slot:
        availability = await backend.get_availability(state.doctor_id, state.selected_date)
        slots = availability.get("slots", [])
        if not slots:
            return {
                "reply_text": f"⚠️ No available slots found on {state.selected_date}. Please choose another date.",
                "reply_markup": {
                    "inline_keyboard": [
                        [{"text": "📅 Pick Another Date", "callback_data": f"doc_{state.doctor_id}"}],
                        [{"text": "🔙 Main Menu", "callback_data": "menu_start"}]
                    ]
                }
            }

        # Show first 8 slots as buttons
        slot_buttons = []
        row = []
        for s in slots[:8]:
            row.append({"text": s["formattedTime"], "callback_data": f"slot_{s['startsAt']}|{s['formattedTime']}"})
            if len(row) == 2:
                slot_buttons.append(row)
                row = []
        if row:
            slot_buttons.append(row)
        slot_buttons.append([{"text": "❌ Cancel", "callback_data": "menu_cancel_flow"}])

        prompt = "Select your preferred time slot:" if lang == 'en' else "Apna preferred time slot chunein:"
        return {
            "reply_text": f"⏰ *Available Slots on {state.selected_date}*\n\n{prompt}",
            "reply_markup": {"inline_keyboard": slot_buttons}
        }

    # Step 4: Patient Name & Phone collection
    # If not provided yet, ask for contact
    if not state.patient_name or not state.patient_phone:
        text = (state.user_text or "").strip()
        # Parse name and phone from text like "Ravi Kumar, 9876543210" or "Ravi 9876543210"
        phone_match = re.search(r'\b\d{10}\b', text)
        if phone_match:
            phone = phone_match.group(0)
            name = re.sub(r'\b\d{10}\b', '', text).replace(',', '').strip() or "Patient"
            state.patient_name = name
            state.patient_phone = phone
        else:
            prompt = (
                "Please reply with your **Full Name** and **10-digit Mobile Number** to proceed:\n"
                "(Example: `Ravi Kumar, 9876543210`)"
            ) if lang == 'en' else (
                "Kripya apna **Full Name** aur **10-digit Mobile Number** likh kar bhejein:\n"
                "(Example: `Ravi Kumar, 9876543210`)"
            )
            return {"reply_text": prompt, "reply_markup": None}

    # Step 5: Explicit confirmation summary (HUMAN INTERRUPT POINT)
    conf_id = str(uuid.uuid4())
    state.confirmation_id = conf_id
    summary = (
        f"📋 *Please Confirm Your Appointment:*\n"
        f"• Doctor: Dr. {state.doctor_name or 'Specialist'}\n"
        f"• Date & Time: {state.selected_date} at {state.selected_slot_time}\n"
        f"• Consultation Fee: ₹{state.consultation_fee or 500}\n"
        f"• Patient: {state.patient_name} ({state.patient_phone})\n\n"
        f"Do you confirm this booking?"
    ) if lang == 'en' else (
        f"📋 *Kripya apni appointment confirm karein:*\n"
        f"• Doctor: Dr. {state.doctor_name or 'Specialist'}\n"
        f"• Date aur Time: {state.selected_date}, {state.selected_slot_time}\n"
        f"• Consultation Fee: ₹{state.consultation_fee or 500}\n"
        f"• Patient: {state.patient_name} ({state.patient_phone})\n\n"
        f"Kya aap booking confirm karte hain?"
    )

    confirm_keyboard = {
        "inline_keyboard": [
            [{"text": "✅ Yes, Book It", "callback_data": "confirm_yes"}],
            [{"text": "❌ No, Cancel", "callback_data": "confirm_no"}]
        ]
    }
    return {
        "reply_text": summary,
        "reply_markup": confirm_keyboard,
        "pending_action": "book",
        "confirmation_id": conf_id
    }

async def booking_execute_node(state: ReceptionistState) -> Dict[str, Any]:
    lang = state.language or "en"
    if not state.is_confirmed:
        return {
            "reply_text": "Booking cancelled. No appointment was scheduled." if lang == 'en' else "Booking cancel kar di gayi hai.",
            "reply_markup": {"inline_keyboard": [[{"text": "🔙 Main Menu", "callback_data": "menu_start"}]]}
        }

    try:
        conf_id = state.confirmation_id or str(uuid.uuid4())
        resp = await backend.book_appointment(
            telegram_user_id=state.telegram_user_id,
            clinic_id=state.clinic_id,
            doctor_id=state.doctor_id or "",
            starts_at=state.selected_slot or "",
            patient_name=state.patient_name or "Patient",
            patient_phone=state.patient_phone or "9876543210",
            confirmation_id=conf_id
        )

        if resp.get("bookingCode"):
            code = resp["bookingCode"]
            success_msg = (
                f"✅ *Appointment Confirmed!*\n\n"
                f"• Booking Code: `{code}`\n"
                f"• Doctor: Dr. {resp.get('doctorName')}\n"
                f"• Time: {state.selected_slot_time} on {state.selected_date}\n\n"
                f"Please save this booking code and show it at the reception when you arrive."
            ) if lang == 'en' else (
                f"✅ *Appointment Confirm ho gayi!*\n\n"
                f"• Booking Code: `{code}`\n"
                f"• Doctor: Dr. {resp.get('doctorName')}\n"
                f"• Time: {state.selected_slot_time}, {state.selected_date}\n\n"
                f"Yeh code note kar lein aur clinic aane par reception par dikhayein."
            )
            return {
                "reply_text": success_msg,
                "reply_markup": {"inline_keyboard": [[{"text": "🔙 Main Menu", "callback_data": "menu_start"}]]},
                "booking_code": code
            }
        else:
            err = resp.get("error", {}).get("message", "Unable to complete booking.")
            return {
                "reply_text": f"⚠️ Could not complete booking: {err}",
                "reply_markup": {"inline_keyboard": [[{"text": "🔙 Main Menu", "callback_data": "menu_start"}]]}
            }
    except Exception as e:
        return {
            "reply_text": "⚠️ Error connecting to clinic booking service. Please try again.",
            "reply_markup": {"inline_keyboard": [[{"text": "🔙 Main Menu", "callback_data": "menu_start"}]]}
        }

async def appointment_support_node(state: ReceptionistState) -> Dict[str, Any]:
    lang = state.language or "en"
    text = (state.user_text or "").strip()

    # Look for booking code in text (e.g. APT-ABCD)
    code_match = re.search(r'\b(APT-[A-Z0-9]{4})\b', text.upper())
    if not code_match and not state.booking_code:
        prompt = (
            "To view or manage your appointment, please enter your **6-character Booking Code** (e.g. `APT-1234`) "
            "and your registered mobile number:\n(Example: `APT-ABCD 9876543210`)"
        ) if lang == 'en' else (
            "Apni appointment check ya change karne ke liye, apna **Booking Code** (jaise `APT-1234`) "
            "aur phone number bhejein:\n(Example: `APT-ABCD 9876543210`)"
        )
        return {"reply_text": prompt, "reply_markup": None}

    booking_code = code_match.group(1) if code_match else state.booking_code
    phone_match = re.search(r'\b\d{10}\b', text)
    phone = phone_match.group(0) if phone_match else None

    # Verify against backend
    verify_resp = await backend.verify_appointment(state.telegram_user_id, booking_code or "", phone)

    if verify_resp.get("verified"):
        appt = verify_resp["appointment"]
        details = (
            f"📋 *Your Appointment Details:*\n"
            f"• Code: `{appt['bookingCode']}`\n"
            f"• Doctor: Dr. {appt['doctorName']} ({appt['specialty']})\n"
            f"• Status: *{appt['status']}*\n"
            f"• Time: {appt['startsAt']}\n"
        )
        buttons = [
            [{"text": "❌ Cancel Appointment", "callback_data": f"cancel_confirm_yes"}],
            [{"text": "🔙 Main Menu", "callback_data": "menu_start"}]
        ]
        return {
            "reply_text": details,
            "reply_markup": {"inline_keyboard": buttons},
            "appointment_id": appt["id"],
            "booking_code": appt["bookingCode"]
        }
    elif verify_resp.get("locked"):
        return {
            "reply_text": "🔒 Too many failed verification attempts. Automated lookup is locked for security. Staff has been notified to assist you.",
            "reply_markup": None,
            "escalate_to_staff": True
        }
    else:
        rem = verify_resp.get("attemptsRemaining", 2)
        return {
            "reply_text": f"❌ Verification failed. No appointment matched that code and phone. (Attempts remaining: {rem})",
            "reply_markup": None
        }

async def execute_cancel_node(state: ReceptionistState) -> Dict[str, Any]:
    if not state.appointment_id:
        return {"reply_text": "No appointment selected for cancellation.", "reply_markup": None}

    conf_id = str(uuid.uuid4())
    resp = await backend.cancel_appointment(
        telegram_user_id=state.telegram_user_id,
        appointment_id=state.appointment_id,
        confirmation_id=conf_id
    )

    if resp.get("success"):
        return {
            "reply_text": f"✅ Your appointment `{resp['bookingCode']}` has been successfully cancelled.",
            "reply_markup": {"inline_keyboard": [[{"text": "🔙 Main Menu", "callback_data": "menu_start"}]]}
        }
    else:
        err = resp.get("error", {}).get("message", "Could not cancel appointment.")
        return {"reply_text": f"⚠️ Cancellation error: {err}", "reply_markup": None}

async def escalation_node(state: ReceptionistState) -> Dict[str, Any]:
    clinic_id = state.clinic_id or settings.DEFAULT_CLINIC_ID
    lang = state.language or "en"
    reason = state.escalation_reason or "PATIENT_REQUEST"
    summary = f"Patient {state.patient_name or state.telegram_user_id} requested staff assistance: {state.user_text or ''}"

    try:
        await backend.create_escalation(
            clinic_id=clinic_id,
            reason=reason,
            summary=summary,
            telegram_user_id=state.telegram_user_id,
            patient_name=state.patient_name,
            patient_phone=state.patient_phone
        )
    except Exception:
        pass

    msg = (
        "📞 *Staff Assistance Request Logged*\n\n"
        "Our clinic reception team has been notified of your query and will assist you shortly.\n"
        "You can also reach clinic reception directly at **+91 98765 43210** during OPD hours."
    ) if lang == 'en' else (
        "📞 *Staff Assistance Request Logged*\n\n"
        "Aapki request clinic reception team ko forward kar di gayi hai.\n"
        "Aap clinic hours me direct **+91 98765 43210** par bhi sampark kar sakte hain."
    )

    return {
        "reply_text": msg,
        "reply_markup": {"inline_keyboard": [[{"text": "🔙 Main Menu", "callback_data": "menu_start"}]]}
    }
