import logging
from typing import Optional
from fastapi import FastAPI, Request, Header, HTTPException, status
from fastapi.responses import JSONResponse
from app.config import settings
from app.telegram.client import TelegramClient
from app.telegram.types import TelegramUpdate
from app.graph.state import ReceptionistState
from app.graph.workflow import workflow_app
from app.documents.extractor import DocumentExtractor, DocumentExtractionError
from app.documents.parser import DocumentParser
from app.tools.backend_client import BackendClient

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger("agent")

app = FastAPI(title="AI Healthcare Receptionist Agent", version="1.0.0")
tg_client = TelegramClient()
backend = BackendClient()

@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "agent",
        "llm_provider": settings.LLM_PROVIDER,
        "llm_model": settings.LLM_MODEL
    }

@app.post("/webhook")
async def telegram_webhook(
    request: Request,
    x_telegram_bot_api_secret_token: Optional[str] = Header(None)
):
    # 1. Enforce Webhook Secret Token validation (S-01)
    if settings.TELEGRAM_WEBHOOK_SECRET:
        if x_telegram_bot_api_secret_token != settings.TELEGRAM_WEBHOOK_SECRET:
            logger.warning("Rejected webhook request with invalid secret token")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Telegram secret token"
            )

    body = await request.json()
    try:
        update = TelegramUpdate.model_validate(body)
    except Exception as e:
        logger.error(f"Error parsing Telegram update: {e}")
        return JSONResponse(status_code=200, content={"status": "ignored_malformed_update"})

    # Extract chat and user
    chat_id = None
    telegram_user_id = None
    user_text = None
    callback_data = None
    callback_id = None

    if update.message:
        chat_id = update.message.chat.id
        telegram_user_id = str(update.message.from_user.id) if update.message.from_user else None
        user_text = update.message.text
    elif update.callback_query:
        chat_id = update.callback_query.message.chat.id if update.callback_query.message else update.callback_query.from_user.id
        telegram_user_id = str(update.callback_query.from_user.id)
        callback_data = update.callback_query.data
        callback_id = update.callback_query.id

    if not chat_id or not telegram_user_id:
        return {"status": "no_chat"}

    # Acknowledge callback query immediately if present
    if callback_id:
        try:
            await tg_client.answer_callback_query(callback_id)
        except Exception:
            pass

    # 2. Check for Document Upload (Manager Flow Phase 4.5)
    if update.message and update.message.document:
        doc = update.message.document
        file_name = doc.file_name or "document.pdf"

        # Check role: manager only
        try:
            identity = await backend.resolve_identity(telegram_user_id)
            if identity.get("role") != "MANAGER":
                await tg_client.send_message(
                    chat_id,
                    "⚠️ Only authorized clinic managers can upload policy documents. "
                    "Please link your manager account first via `/link <INVITE_CODE>`."
                )
                return {"status": "unauthorized_doc_upload"}

            clinic_id = identity.get("clinicId") or settings.DEFAULT_CLINIC_ID
            await tg_client.send_message(chat_id, f"📄 Received `{file_name}`. Reading and extracting clinic information...")

            # Download file from Telegram
            file_info = await tg_client.get_file(doc.file_id)
            file_path = file_info.get("result", {}).get("file_path")
            file_bytes = await tg_client.download_file(file_path)

            # Extract text
            raw_text, used_ocr = DocumentExtractor.extract_text(file_bytes, file_name)
            ocr_note = " (processed with OCR)" if used_ocr else ""

            # Structured LLM extraction
            draft_json = DocumentParser.parse_with_llm(raw_text)

            # Save draft in backend
            draft_resp = await backend.create_draft(
                telegram_user_id=telegram_user_id,
                clinic_id=clinic_id,
                file_name=file_name,
                extracted_json=draft_json,
                issues_json=draft_json.get("issues", {})
            )
            draft_id = draft_resp.get("id")

            # Format draft preview for manager
            preview = f"📋 *Extracted Draft Information{ocr_note}:*\n"
            if draft_json.get("timings"):
                preview += f"\n• *Timings*: {draft_json['timings']}"
            if draft_json.get("rules"):
                preview += f"\n• *Rules*: {len(draft_json['rules'])} policies extracted"
            if draft_json.get("faqCandidates"):
                preview += f"\n• *FAQs*: {len(draft_json['faqCandidates'])} questions extracted"

            issues = draft_json.get("issues", {})
            if issues.get("missing"):
                preview += f"\n\n⚠️ *Missing Info*: {', '.join(issues['missing'])}"
            if issues.get("conflicts"):
                preview += f"\n\n⚠️ *Conflicts Detected*: {', '.join(issues['conflicts'])}"

            preview += "\n\nDo you want to approve and activate this draft, or reject it?"

            keyboard = {
                "inline_keyboard": [
                    [{"text": "✅ Approve & Activate", "callback_data": f"draft_approve_{draft_id}"}],
                    [{"text": "❌ Reject Draft", "callback_data": f"draft_reject_{draft_id}"}]
                ]
            }
            await tg_client.send_message(chat_id, preview, reply_markup=keyboard)
            return {"status": "draft_created"}

        except DocumentExtractionError as de:
            await tg_client.send_message(chat_id, f"❌ File Error: {str(de)}")
            return {"status": "doc_extraction_error"}
        except Exception as e:
            logger.error(f"Error processing uploaded document: {e}")
            await tg_client.send_message(chat_id, "⚠️ Error processing document. Please try again or upload a standard PDF.")
            return {"status": "doc_error"}

    # 3. Check for Manager Draft Approval / Rejection Callbacks
    if callback_data and callback_data.startswith("draft_approve_"):
        draft_id = callback_data.replace("draft_approve_", "")
        approve_resp = await backend.approve_draft(telegram_user_id, draft_id)
        if approve_resp.get("success"):
            count = approve_resp.get("activatedItemsCount", 0)
            await tg_client.send_message(
                chat_id,
                f"🎉 *Draft Approved & Activated!*\n\n{count} clinic policies/FAQs are now live for patient inquiries."
            )
        else:
            await tg_client.send_message(chat_id, "⚠️ Failed to approve draft. Please check manager permissions.")
        return {"status": "draft_approved"}

    if callback_data and callback_data.startswith("draft_reject_"):
        draft_id = callback_data.replace("draft_reject_", "")
        await backend.reject_draft(telegram_user_id, draft_id)
        await tg_client.send_message(chat_id, "❌ Draft has been rejected and discarded.")
        return {"status": "draft_rejected"}

    # 4. Check for Manager Invite Code Linking Command: /link <CODE>
    if user_text and user_text.strip().lower().startswith('/link'):
        parts = user_text.strip().split()
        if len(parts) >= 2:
            code = parts[1].strip()
            user_name = None
            if update.message and update.message.from_user:
                first = update.message.from_user.first_name or ""
                last = update.message.from_user.last_name or ""
                full = f"{first} {last}".strip()
                user_name = full or update.message.from_user.username

            link_resp = await backend.link_invite(telegram_user_id, code, name=user_name)
            if link_resp.get("success"):
                await tg_client.send_message(
                    chat_id,
                    f"🎉 *Account Successfully Linked!*\n\nYou are now registered as a Manager for *{link_resp.get('clinicName')}*.\n"
                    "You can now upload clinic policy documents (PDF/DOCX) or configure clinic details."
                )
            else:
                err = link_resp.get("error", {}).get("message", "Invalid or expired invite code.")
                await tg_client.send_message(chat_id, f"❌ Linking Failed: {err}")
        else:
            await tg_client.send_message(chat_id, "Usage: `/link <INVITE_CODE>`\nExample: `/link MANAGER1`")
        return {"status": "invite_processed"}

    # 5. LangGraph Workflow Execution for Patient & General Interactions
    state_input = ReceptionistState(
        telegram_user_id=telegram_user_id,
        chat_id=chat_id,
        user_text=user_text or "",
        callback_data=callback_data
    )

    thread_config = {"configurable": {"thread_id": str(chat_id)}}

    try:
        final_state = await workflow_app.ainvoke(state_input, config=thread_config)

        reply_text = final_state.get("reply_text")
        reply_markup = final_state.get("reply_markup")

        if reply_text:
            await tg_client.send_message(
                chat_id=chat_id,
                text=reply_text,
                reply_markup=reply_markup
            )
    except Exception as e:
        logger.error(f"Error during LangGraph workflow execution: {e}")
        await tg_client.send_message(
            chat_id=chat_id,
            text="Sorry, I encountered a temporary problem. Please try again or contact clinic reception at +91 98765 43210."
        )

    return {"status": "success"}

