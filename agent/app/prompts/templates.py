import re
from typing import Dict, Any, List

# Common Hinglish terms in Roman script
HINGLISH_KEYWORDS = {
    'karna', 'karo', 'karde', 'kardo', 'hai', 'hain', 'kripya', 'chahiye',
    'kaunsi', 'dawai', 'bukhar', 'subah', 'sham', 'kal', 'parso', 'aaj',
    'fees', 'kitni', 'meri', 'mera', 'mujhe', 'batao', 'namaste', 'shukriya',
    'milna', 'dikhana', 'taklif', 'dard', 'se', 'ko', 'aur', 'nahi', 'kya',
    'kab', 'kaha', 'kahan', 'doctor', 'apni', 'hoga', 'hogi'
}

def detect_language(text: str) -> str:
    """
    Detects language style:
    - 'hi' for Hindi in Devanagari script
    - 'hinglish' for Hindi in Roman/Latin script
    - 'en' for English
    """
    if not text:
        return 'en'

    # Check for Devanagari script characters (\u0900 to \u097F)
    devanagari_count = len(re.findall(r'[\u0900-\u097F]', text))
    if devanagari_count >= 2:
        return 'hi'

    # Check for Hinglish keywords
    tokens = set(re.findall(r'\b[a-zA-Z]+\b', text.lower()))
    hinglish_matches = tokens.intersection(HINGLISH_KEYWORDS)
    if len(hinglish_matches) >= 1:
        return 'hinglish'

    return 'en'

# Main Menu UI strings
MESSAGES = {
    'welcome': {
        'en': (
            "Welcome to *City Care Clinic*! 🏥\n"
            "I am your AI Receptionist. I can help you find doctors, check timings & fees, and book or manage appointments.\n\n"
            "🔒 *Privacy Notice*: We only collect your name and phone number for appointment bookings. "
            "Please do not share sensitive medical records or symptom details over chat."
        ),
        'hi': (
            "*सिटी केयर क्लिनिक* में आपका स्वागत है! 🏥\n"
            "मैं आपका एआई रिसेप्शनिस्ट हूँ। मैं डॉक्टर खोजने, क्लिनिक का समय/शुल्क जानने और अपॉइंटमेंट बुक करने में आपकी सहायता कर सकता हूँ।\n\n"
            "🔒 *गोपनीयता सूचना*: हम केवल अपॉइंटमेंट के लिए आपका नाम और फोन नंबर लेते हैं। "
            "कृपया चैट पर कोई मेडिकल रिपोर्ट या बीमारी की जानकारी न भेजें।"
        ),
        'hinglish': (
            "*City Care Clinic* me aapka swagat hai! 🏥\n"
            "Main aapka AI Receptionist hu. Main doctor search karne, clinic timings/fees janne aur appointment book ya manage karne me aapki madad kar sakta hu.\n\n"
            "🔒 *Privacy Notice*: Hum sirf aapka naam aur phone number lete hain. "
            "Kripya chat par koi medical report ya symptoms share na karein."
        )
    },
    'medical_refusal': {
        'en': (
            "⚕️ *Medical Disclaimer*: I am an administrative receptionist and cannot provide diagnoses, prescriptions, "
            "or medical advice. Only a licensed physician can evaluate health symptoms.\n\n"
            "Would you like to book an appointment with a doctor?"
        ),
        'hi': (
            "⚕️ *चिकित्सा अस्वीकरण*: मैं एक प्रशासनिक सहायक हूँ और कोई डॉक्टरी सलाह, जांच या दवा नहीं बता सकता। "
            "इसके लिए केवल योग्य चिकित्सक ही परामर्श दे सकते हैं।\n\n"
            "क्या आप डॉक्टर से मिलने के लिए अपॉइंटमेंट बुक करना चाहते हैं?"
        ),
        'hinglish': (
            "⚕️ *Medical Disclaimer*: Main ek administrative receptionist hu aur koi medical advice, bimari ki janch ya "
            "dawai suggest nahi kar sakta. Kripya kisi certified doctor se consult karein.\n\n"
            "Kya aap doctor se appointment book karna chahte hain?"
        )
    },
    'emergency_alert': {
        'en': (
            "🚨 *EMERGENCY ALERT* 🚨\n"
            "If you or someone nearby is experiencing a medical emergency (severe chest pain, breathing difficulty, heavy bleeding, or unconsciousness), "
            "please do not wait for chat replies!\n\n"
            "📞 Immediately call **112** or **108** or visit the nearest hospital emergency department."
        ),
        'hi': (
            "🚨 *आपातकालीन सूचना* 🚨\n"
            "यदि यह एक आपातकालीन स्थिति (गंभीर सीने में दर्द, सांस लेने में तकलीफ, अत्यधिक रक्तस्राव या बेहोशी) है, तो कृपया चैट के उत्तर की प्रतीक्षा न करें!\n\n"
            "📞 तुरंत **112** या **108** पर कॉल करें या नजदीकी अस्पताल के इमरजेंसी विभाग में जाएँ।"
        ),
        'hinglish': (
            "🚨 *EMERGENCY ALERT* 🚨\n"
            "Agar yeh koi medical emergency (chest pain, saans lene me dikkat, heavy bleeding ya behoshi) hai, toh kripya chat me wait na karein!\n\n"
            "📞 Turant **112** ya **108** par call karein ya paas ke hospital emergency room me jayein."
        )
    },
    'unknown_query_escalate': {
        'en': (
            "I do not have verified information on that from our clinic management. "
            "I have forwarded your question to our clinic reception staff who will assist you shortly."
        ),
        'hi': (
            "क्लिनिक से इस विषय में हमारे पास सत्यापित जानकारी उपलब्ध नहीं है। "
            "मैंने आपका प्रश्न रिसेप्शन स्टाफ को भेज दिया है, वे जल्द ही आपसे संपर्क करेंगे।"
        ),
        'hinglish': (
            "Is bare me clinic ki taraf se koi verified information available nahi hai. "
            "Maine aapki query reception team ko forward kar di hai."
        )
    }
}

def get_main_menu_keyboard(lang: str = 'en') -> Dict[str, Any]:
    if lang == 'hi':
        return {
            "inline_keyboard": [
                [{"text": "👨‍⚕️ डॉक्टर खोजें", "callback_data": "menu_doctors"}],
                [{"text": "📅 अपॉइंटमेंट बुक करें", "callback_data": "menu_book"}],
                [{"text": "📋 मेरी अपॉइंटमेंट", "callback_data": "menu_lookup"}],
                [{"text": "ℹ️ क्लिनिक जानकारी व सवाल", "callback_data": "menu_faq"}],
                [{"text": "💬 स्टाफ से बात करें", "callback_data": "menu_staff"}]
            ]
        }
    elif lang == 'hinglish':
        return {
            "inline_keyboard": [
                [{"text": "👨‍⚕️ Doctor Khojein", "callback_data": "menu_doctors"}],
                [{"text": "📅 Appointment Book Karein", "callback_data": "menu_book"}],
                [{"text": "📋 Meri Appointment", "callback_data": "menu_lookup"}],
                [{"text": "ℹ️ Clinic Info aur FAQs", "callback_data": "menu_faq"}],
                [{"text": "💬 Staff se Baat Karein", "callback_data": "menu_staff"}]
            ]
        }
    else:
        return {
            "inline_keyboard": [
                [{"text": "👨‍⚕️ Find a Doctor", "callback_data": "menu_doctors"}],
                [{"text": "📅 Book Appointment", "callback_data": "menu_book"}],
                [{"text": "📋 My Appointment", "callback_data": "menu_lookup"}],
                [{"text": "ℹ️ Clinic Info & FAQs", "callback_data": "menu_faq"}],
                [{"text": "💬 Talk to Staff", "callback_data": "menu_staff"}]
            ]
        }

