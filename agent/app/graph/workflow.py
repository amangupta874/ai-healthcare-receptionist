from typing import Dict, Any, Literal
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from app.graph.state import ReceptionistState
from app.graph.nodes import (
    ingest_node,
    safety_gate_node,
    safety_refusal_node,
    intent_router_node,
    start_menu_node,
    doctor_discovery_node,
    faq_node,
    booking_flow_node,
    booking_execute_node,
    appointment_support_node,
    execute_cancel_node,
    escalation_node
)

def route_after_safety(state: ReceptionistState) -> str:
    if not state.is_safe:
        return "safety_refusal"
    return "intent_router"

def route_intent(state: ReceptionistState) -> str:
    intent = state.intent or "unknown"

    if intent == "safety_refusal":
        return "safety_refusal"
    elif intent in ["start", "menu", "cancel_flow"]:
        return "start_menu"
    elif intent in ["doctors", "select_doctor"]:
        return "doctor_discovery"
    elif intent == "faq":
        return "faq"
    elif intent in ["book", "select_date", "select_slot"]:
        return "booking_flow"
    elif intent == "confirm_booking":
        return "booking_execute"
    elif intent in ["lookup", "cancel", "reschedule"]:
        return "appointment_support"
    elif intent == "execute_cancel":
        return "execute_cancel"
    elif intent in ["talk_to_staff", "staff", "menu_staff", "unknown"]:
        return "escalation"
    return "start_menu"

def route_after_faq(state: ReceptionistState) -> str:
    if state.escalate_to_staff:
        return "escalation"
    return END

def build_workflow():
    builder = StateGraph(ReceptionistState)

    # Add nodes
    builder.add_node("ingest", ingest_node)
    builder.add_node("safety_gate", safety_gate_node)
    builder.add_node("safety_refusal", safety_refusal_node)
    builder.add_node("intent_router", intent_router_node)
    builder.add_node("start_menu", start_menu_node)
    builder.add_node("doctor_discovery", doctor_discovery_node)
    builder.add_node("faq", faq_node)
    builder.add_node("booking_flow", booking_flow_node)
    builder.add_node("booking_execute", booking_execute_node)
    builder.add_node("appointment_support", appointment_support_node)
    builder.add_node("execute_cancel", execute_cancel_node)
    builder.add_node("escalation", escalation_node)

    # Add edges
    builder.add_edge(START, "ingest")
    builder.add_edge("ingest", "safety_gate")

    builder.add_conditional_edges(
        "safety_gate",
        route_after_safety,
        {
            "safety_refusal": "safety_refusal",
            "intent_router": "intent_router"
        }
    )

    builder.add_conditional_edges(
        "intent_router",
        route_intent,
        {
            "safety_refusal": "safety_refusal",
            "start_menu": "start_menu",
            "doctor_discovery": "doctor_discovery",
            "faq": "faq",
            "booking_flow": "booking_flow",
            "booking_execute": "booking_execute",
            "appointment_support": "appointment_support",
            "execute_cancel": "execute_cancel",
            "escalation": "escalation"
        }
    )

    builder.add_conditional_edges(
        "faq",
        route_after_faq,
        {
            "escalation": "escalation",
            END: END
        }
    )

    builder.add_edge("safety_refusal", END)
    builder.add_edge("start_menu", END)
    builder.add_edge("doctor_discovery", END)
    builder.add_edge("booking_flow", END)
    builder.add_edge("booking_execute", END)
    builder.add_edge("appointment_support", END)
    builder.add_edge("execute_cancel", END)
    builder.add_edge("escalation", END)

    checkpointer = MemorySaver()
    return builder.compile(checkpointer=checkpointer)

workflow_app = build_workflow()

