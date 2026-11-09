import pytest
from app.prompts.templates import detect_language

def test_detect_hindi_devanagari():
    samples = [
        "मुझे कल सुबह डॉक्टर से मिलना है",
        "क्लिनिक कब खुलता है?",
        "डॉक्टर की फीस कितनी है?",
        "अपॉइंटमेंट रद्द करें"
    ]
    for sample in samples:
        assert detect_language(sample) == "hi", f"Failed for '{sample}'"

def test_detect_hinglish_roman():
    samples = [
        "kal subah ke liye appointment chahiye",
        "Dr Sharma ki fees kitni hai?",
        "meri appointment cancel kardo",
        "mujhe bukhar hai kaunsi dawai lu?",
        "kya kal doctor available hai?"
    ]
    for sample in samples:
        assert detect_language(sample) == "hinglish", f"Failed for '{sample}'"

def test_detect_english():
    samples = [
        "I want to book an appointment with a cardiologist tomorrow",
        "Can I reschedule my booking to Friday?",
        "What are the clinic timings?",
        "Is parking available?"
    ]
    for sample in samples:
        assert detect_language(sample) == "en", f"Failed for '{sample}'"

