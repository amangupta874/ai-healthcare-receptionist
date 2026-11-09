# CONVERSATION DESIGN - Trilingual Patient & Manager Experience

This document details the conversational flows, inline keyboard structures, and response strings across **English**, **Hindi (Devanagari)**, and **Hinglish (Latin script)**.

---

## 1. Global Commands & Entry Points
- `/start`: Initializes the session, displays the mandatory privacy & administrative scope notice, and renders the main menu.
- `/menu`: Returns to the main navigation menu at any point.
- `/cancel`: Aborts any in-progress multi-step flow (booking, verification, document review) and returns to the main menu.
- `/staff`: Immediately creates an escalation ticket and prompts staff contact information.
- `/manager`: Opens the manager management menu (available only to linked Telegram IDs).
- `/link <CODE>`: Redeems an invite code to link the current Telegram account to a clinic manager role.

---

## 2. Main Menu Matrix

| Element | English | Hindi (Devanagari) | Hinglish (Roman Script) |
|---|---|---|---|
| **Welcome Notice** | "Welcome to {clinic_name} Reception! 🏥\nI can help you find doctors, check timings/fees, and book or manage appointments.\n\n🔒 *Privacy Notice: We only collect your name and phone number for appointment bookings. Please do not send medical records or symptom details.*" | "{clinic_name} रिसेप्शन में आपका स्वागत है! 🏥\nमैं डॉक्टर खोजने, क्लिनिक का समय/फीस जानने और अपॉइंटमेंट बुक या मैनेज करने में आपकी मदद कर सकता हूँ।\n\n🔒 *गोपनीयता सूचना: हम अपॉइंटमेंट के लिए केवल आपका नाम और फोन नंबर लेते हैं। कृपया कोई मेडिकल रिपोर्ट या बीमारी की जानकारी न भेजें।*" | "{clinic_name} Reception me aapka swagat hai! 🏥\nMain doctor search karne, clinic timings/fees janne, aur appointment book ya manage karne me aapki madad kar sakta hu.\n\n🔒 *Privacy Notice: Hum sirf aapka naam aur phone number lete hain. Kripya koi medical report ya symptoms share na karein.*" |
| **Button 1** | 👨‍⚕️ Find a Doctor | 👨‍⚕️ डॉक्टर खोजें | 👨‍⚕️ Doctor Khojein |
| **Button 2** | 📅 Book Appointment | 📅 अपॉइंटमेंट बुक करें | 📅 Appointment Book Karein |
| **Button 3** | 📋 My Appointment | 📋 मेरी अपॉइंटमेंट | 📋 Meri Appointment |
| **Button 4** | ℹ️ Clinic Info & FAQs | ℹ️ क्लिनिक जानकारी व सवाल | ℹ️ Clinic Info aur FAQs |
| **Button 5** | 💬 Talk to Staff | 💬 स्टाफ से बात करें | 💬 Staff se Baat Karein |

---

## 3. Flow A: Doctor Discovery & Appointment Booking

### Step A1: Select Specialty or Doctor
- **Bot Prompt**:
  - *EN*: "Please choose a medical specialty or select a doctor:"
  - *HI*: "कृपया किसी विशेषज्ञता या डॉक्टर का चयन करें:"
  - *Hinglish*: "Kripya specialty ya doctor select karein:"
- **Inline Buttons**:
  - `[Cardiology / हृदय रोग]` `[Dental / दंत रोग]` `[General / सामान्य चिकित्सा]` `[Show All Doctors]`

### Step A2: Doctor Selected & Date Options
- **Bot Prompt**:
  - *EN*: "Dr. {name} ({specialty}) - Consultation Fee: ₹{fee}\nSelect a date for your visit:"
  - *HI*: "डॉ. {name} ({specialty}) - परामर्श शुल्क: ₹{fee}\nकृपया अपॉइंटमेंट की तारीख चुनें:"
  - *Hinglish*: "Dr. {name} ({specialty}) - Consultation Fee: ₹{fee}\nVisit ke liye date select karein:"
- **Inline Buttons**:
  - `[Today / आज]` `[Tomorrow / कल]` `[Day After / परसों]` `[Cancel / रद्द]`

### Step A3: Slot Selection
- **Bot Prompt**:
  - *EN*: "Available slots for {date}:"
  - *HI*: "{date} के लिए उपलब्ध समय (स्लॉट):"
  - *Hinglish*: "{date} ke liye available slots:"
- **Inline Buttons (Example)**:
  - `[10:00 AM]` `[10:30 AM]` `[11:00 AM]` `[11:30 AM]`
  - `[04:00 PM]` `[04:30 PM]` `[05:00 PM]` `[05:30 PM]`

### Step A4: Patient Contact Collection (if not stored)
- **Bot Prompt**:
  - *EN*: "Please enter your Full Name and 10-digit Mobile Number (e.g., Ravi Kumar, 9876543210):"
  - *HI*: "कृपया अपना पूरा नाम और 10 अंकों का मोबाइल नंबर दर्ज करें (उदा. रवि कुमार, 9876543210):"
  - *Hinglish*: "Kripya apna Full Name aur 10-digit Mobile Number enter karein (jaise: Ravi Kumar, 9876543210):"

### Step A5: Explicit Confirmation Prompt (Mandatory Interrupt)
- **Bot Prompt**:
  - *EN*: "📋 *Please Confirm Your Appointment:*\n• Doctor: Dr. {name}\n• Date & Time: {date} at {time}\n• Fee: ₹{fee}\n• Patient: {patient_name} ({patient_phone})\n\nDo you want to confirm this booking?"
  - *HI*: "📋 *कृपया अपनी अपॉइंटमेंट की पुष्टि करें:*\n• डॉक्टर: डॉ. {name}\n• तारीख व समय: {date}, {time}\n• परामर्श शुल्क: ₹{fee}\n• मरीज: {patient_name} ({patient_phone})\n\nक्या आप इस बुकिंग की पुष्टि करते हैं?"
  - *Hinglish*: "📋 *Kripya apni appointment confirm karein:*\n• Doctor: Dr. {name}\n• Date aur Time: {date}, {time}\n• Fee: ₹{fee}\n• Patient: {patient_name} ({patient_phone})\n\nKya aap booking confirm karte hain?"
- **Inline Buttons**:
  - `[✅ Yes, Book It]` `[❌ No, Cancel]`

### Step A6: Booking Result
- **Success Prompt**:
  - *EN*: "✅ *Appointment Confirmed!*\nYour Booking Code is: `{booking_code}`\nPlease save this code. Show it at the reception when you arrive."
  - *HI*: "✅ *अपॉइंटमेंट सफलतापूर्वक बुक हो गई!*\nआपका बुकिंग कोड है: `{booking_code}`\nकृपया यह कोड संभाल कर रखें और क्लिनिक पहुँचने पर रिसेप्शन पर दिखाएँ।"
  - *Hinglish*: "✅ *Appointment Confirm ho gayi!*\nAapka Booking Code hai: `{booking_code}`\nYeh code save kar lein aur clinic aane par reception par dikhayein."
- **Double Booking / Taken Slot Edge Case**:
  - *EN*: "⚠️ Sorry, that slot was just booked by another patient. Here are the remaining open slots:"
  - *HI*: "⚠️ क्षमा करें, वह समय अभी किसी अन्य मरीज द्वारा बुक कर लिया गया है। शेष उपलब्ध समय:"
  - *Hinglish*: "⚠️ Sorry, yeh slot abhi kisi aur ne book kar liya. Yeh baaki available slots hain:"

---

## 4. Flow B: Appointment Verification, Lookup, Reschedule & Cancel

### Step B1: Identification
- **Bot Prompt**:
  - *EN*: "To look up or manage your appointment, please enter your 6-character Booking Code (e.g. `APT-1234`) and your registered phone number:"
  - *HI*: "अपनी अपॉइंटमेंट देखने या बदलने के लिए, कृपया अपना 6-अक्षरों का बुकिंग कोड (उदा. `APT-1234`) और फोन नंबर दर्ज करें:"
  - *Hinglish*: "Apni appointment check ya change karne ke liye, apna 6-digit Booking Code (jaise `APT-1234`) aur phone number likhein:"

### Step B2: Verification Outcome
- **Success View**:
  - *EN*: "📋 *Your Appointment Details:*\n• Code: `{booking_code}`\n• Doctor: Dr. {name}\n• Date: {date} at {time}\n• Status: {status}"
  - Inline Buttons: `[🔄 Reschedule]` `[❌ Cancel Appointment]` `[🔙 Back to Menu]`
- **Failure View (Attempts < 3)**:
  - *EN*: "❌ No active appointment matched those details. Please check your booking code. (Attempts remaining: {remaining})"
  - *HI*: "❌ इस जानकारी से कोई सक्रिय अपॉइंटमेंट नहीं मिली। कृपया बुकिंग कोड दोबारा जांचें। (शेष प्रयास: {remaining})"
  - *Hinglish*: "❌ Is details se koi appointment nahi mili. Kripya booking code check karein. (Attempts baaki: {remaining})"
- **Lockout View (3 Failures)**:
  - *EN*: "🔒 Too many failed attempts. For security, automated lookup is temporarily locked. I have notified our clinic staff to assist you."
  - *HI*: "🔒 गलत प्रयासों की सीमा समाप्त। सुरक्षा कारणों से यह सुविधा अस्थायी रूप से बंद है। हमने क्लिनिक स्टाफ को सूचना भेज दी है।"
  - *Hinglish*: "🔒 Bahut zyada failed attempts ho gaye. Security ke liye yeh band kar diya gaya hai. Humne staff ko notify kar diya hai."

### Step B3: Cancellation Confirmation (Interrupt)
- **Bot Prompt**:
  - *EN*: "Are you sure you want to cancel appointment `{booking_code}` with Dr. {name} on {date} at {time}?"
  - *HI*: "क्या आप सचमुच डॉ. {name} के साथ {date} को {time} बजे वाली अपॉइंटमेंट `{booking_code}` रद्द करना चाहते हैं?"
  - *Hinglish*: "Kya aap sach me Dr. {name} ke saath {date} {time} wali appointment `{booking_code}` cancel karna chahte hain?"
- **Inline Buttons**:
  - `[✅ Yes, Cancel]` `[🔙 No, Keep It]`
- **After Cancellation**:
  - *EN*: "✅ Your appointment `{booking_code}` has been cancelled. The slot has been released."
  - *HI*: "✅ आपकी अपॉइंटमेंट `{booking_code}` रद्द कर दी गई है।"
  - *Hinglish*: "✅ Aapki appointment `{booking_code}` cancel ho gayi hai."

---

## 5. Flow C: Safety, Medical Boundary & Emergency Interventions

### Medical Advice Refusal
- *Trigger*: Questions regarding symptoms, illnesses, medications, dosages (*"mujhe bukhar hai kaunsi dawai lu?"*, *"what medicine should I take for headache?"*).
- *EN*: "⚕️ I am an administrative assistant and cannot give medical advice, diagnoses, or prescriptions. Only a qualified doctor can advise you.\n\nWould you like to book an appointment with a doctor?"
- *HI*: "⚕️ मैं केवल एक प्रशासनिक सहायक हूँ और कोई डॉक्टरी सलाह, जांच या दवा नहीं बता सकता। इसके लिए केवल योग्य डॉक्टर ही परामर्श दे सकते हैं।\n\nक्या आप डॉक्टर से मिलने के लिए अपॉइंटमेंट बुक करना चाहते हैं?"
- *Hinglish*: "⚕️ Main administrative assistant hu aur koi medical advice, bimari ki janch ya dawai nahi bata sakta. Kripya kisi doctor se consult karein.\n\nKya aap doctor se appointment book karna chahte hain?"

### Emergency Trigger
- *Trigger*: Keywords like *chest pain*, *severe bleeding*, *unconscious*, *heart attack*, *saans nahi aa rahi*, *behosh*.
- *EN*: "🚨 *EMERGENCY ALERT:*\nIf you or someone nearby is experiencing a medical emergency, please do not wait for chat replies.\n\n📞 Call **112 / 108** immediately or proceed to the nearest hospital emergency room."
- *HI*: "🚨 *आपातकालीन सूचना:*\nयदि यह एक आपातकालीन स्थिति (इमरजेंसी) है, तो कृपया चैट के उत्तर की प्रतीक्षा न करें।\n\n📞 तुरंत **112 / 108** पर कॉल करें या नजदीकी अस्पताल के आपातकालीन विभाग में जाएँ।"
- *Hinglish*: "🚨 *EMERGENCY ALERT:*\nAgar yeh koi medical emergency hai, toh kripya chat me wait na karein.\n\n📞 Turant **112 / 108** par call karein ya paas ke hospital emergency me jayein."

### Unknown Query Escalation
- *EN*: "I don't have verified information regarding your question from our clinic manager. I have forwarded your query to our reception team, who will assist you shortly."
- *HI*: "क्लिनिक से इस बारे में हमारे पास स्वीकृत जानकारी उपलब्ध नहीं है। मैंने आपका प्रश्न क्लिनिक स्टाफ को भेज दिया है, वे जल्द ही आपसे संपर्क करेंगे।"
- *Hinglish*: "Is bare me clinic ki taraf se koi verified information available nahi hai. Maine aapki query reception team ko forward kar di hai."

---

## 6. Flow D: Manager Document Ingestion & Approval

1. **Document Received**:
   - *Bot*: "📄 Document received (`{file_name}`). Extracting clinic policies, timings, and fee structures..."
2. **Draft Preview with Gap Surfacing**:
   - *Bot*: "📋 *Extracted Draft Information:*\n• Timings: Mon-Sat 09:00 AM - 06:00 PM\n• Doctors Identified: Dr. Sharma (Cardiology, ₹500), Dr. Verma (Dentistry)\n• Policies: Sunday closed, Free follow-up within 7 days.\n\n⚠️ *Gaps / Clarifications Needed:*\n1. Consultation fee for Dr. Verma is missing in the document.\n\nDo you want to approve this draft as-is, edit, or reject?"
   - Inline Buttons: `[✅ Approve & Activate]` `[✏️ Edit Items]` `[❌ Reject Draft]`
3. **Activation**:
   - *Bot*: "🎉 *Draft Approved!* 4 FAQs, 2 doctor profiles, and clinic timings are now LIVE for patient inquiries."
