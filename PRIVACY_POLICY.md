# Privacy Policy — Auris AI

**Effective Date:** June 1, 2026
**Last Updated:** June 1, 2026

**Developer:** Ahmet Selim Fedakar
**Contact:** a.selimfedakar@gmail.com
**Application:** Auris AI (iOS mobile application + ESP32 wearable pendant)

---

## 1. Introduction

Auris AI ("the App", "we", "our") is an AI-powered personal assistant that runs on an iOS device and communicates with a companion wearable pendant (ESP32-based hardware). The App uses voice, camera, calendar, and email data to deliver intelligent, context-aware assistance.

We take your privacy seriously. This Privacy Policy explains what data we collect, why we collect it, how it is processed, where it is stored, and what rights you have over it. Please read it carefully before using the App.

By using Auris AI, you agree to the practices described in this policy.

---

## 2. Who This Policy Applies To

This policy applies to all users of the Auris AI iOS application and its companion backend services. The App is intended for users **13 years of age and older**. We do not knowingly collect personal data from children under the age of 13. If you believe a child under 13 has provided us with personal information, please contact us at a.selimfedakar@gmail.com and we will take steps to delete that information promptly.

---

## 3. Data We Collect

### 3.1 Audio Data

**What we collect:** Voice input captured through the iOS device microphone and/or the ESP32 pendant microphone. This includes voice commands directed at the assistant and, in ambient listening sessions, environmental audio.

**How it is used:**
- Raw audio is sent to **Groq's Whisper API** solely for the purpose of speech-to-text transcription.
- The resulting transcript is then processed by the AI language model to generate a response.
- Raw audio files are **never stored** on our servers or in Cloudflare KV storage. Only the text transcript and AI-generated reply are retained as part of your conversation history.

**Retention:** Transcripts are stored as part of conversation history (see Section 3.7). Raw audio is discarded immediately after transcription.

**Why we need it:** Voice input is the core interaction method of the App. Without microphone access, the App cannot function.

---

### 3.2 Camera and Photos

**What we collect:** Photos captured through the iOS device camera when you explicitly trigger the Vision Analysis feature.

**How it is used:**
- The photo is encoded as Base64 and sent to the backend for AI visual analysis.
- The image is processed by the AI model to generate a contextual response.
- Images are **never stored** on our servers or in Cloudflare KV storage. They are processed in transit and immediately discarded after the AI response is generated.

**Retention:** None. Photos are not persisted anywhere after the analysis response is returned.

**Why we need it:** Camera access is required only for the optional Vision Analysis feature. You can use the App without ever granting camera permission.

---

### 3.3 Calendar Data

**What we collect:** Read-only access to your iOS Calendar events via the EventKit framework.

**How it is used:**
- Calendar data is accessed only when you explicitly ask the assistant a question that requires calendar context (e.g., "What do I have tomorrow?").
- Calendar events are included in the AI prompt to generate a relevant response.
- Calendar data is **never stored** on our servers. It is used in-memory for the duration of a single request and then discarded.

**Retention:** None. Calendar data is not persisted on any server.

**Why we need it:** Calendar access allows the AI to provide scheduling-aware assistance. It is entirely optional — you can deny calendar permission and still use all other features of the App.

---

### 3.4 Email Data (Gmail)

**What we collect:** Read-only access to your Gmail inbox via Google's OAuth 2.0 protocol. This includes email subjects, senders, timestamps, and body content of recent messages.

**How it is used:**
- Gmail access is only activated when you explicitly enable the **Email Intel** module in the App settings.
- Email content is used as context for the AI assistant to help you manage, summarize, or act on your emails.
- Your **Gmail OAuth token is stored exclusively on your device** (iOS Keychain / AsyncStorage). It is never transmitted to or stored on our backend servers (Cloudflare Workers or KV).
- Email content fetched during a session is sent to the AI processing pipeline for that specific request only, and is not retained after the response is generated.

**Retention:** None on the server side. The OAuth token lives only on your device and can be revoked at any time from your Google Account settings at [myaccount.google.com](https://myaccount.google.com/permissions).

**Why we need it:** The Email Intel module is an optional, opt-in feature. You must explicitly enable it and complete the Google OAuth flow. The App functions fully without Gmail access.

**Google API Disclosure:** Auris AI's use of information received from Google APIs adheres to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements.

---

### 3.5 Notifications

**What we collect:** Device push notification token (local notifications only).

**How it is used:**
- The App sends local push notifications to your device to deliver results from ambient listening sessions and other assistant summaries.
- No notification token is sent to a third-party push notification service. All notifications are generated locally on your device.

**Retention:** Not applicable — no notification data leaves your device.

---

### 3.6 User Profile Data

**What we collect:** Your name, occupation, and AI personality preference (e.g., tone settings for the assistant).

**How it is used:**
- This information is used to personalize your AI assistant interactions (e.g., addressing you by name, tailoring response style).
- This data is stored **only on your device** using AsyncStorage.
- Profile data is included in AI prompts as context to improve response quality.

**Retention:** On-device only. Profile data is deleted when you uninstall the App or clear App data. It is not synced to our servers.

---

### 3.7 Conversation History

**What we collect:** A record of messages exchanged between you and the AI assistant — including your transcribed voice input and the AI's text/audio responses.

**How it is used:**
- The last 20 messages in your conversation history are stored in **Cloudflare KV** under a unique, pseudonymous user ID generated at first launch.
- This history is used to give the AI context about your recent conversations, enabling coherent multi-turn dialogue.
- No name, email address, or other directly identifying information is associated with the conversation record on the server side unless you have chosen to include it in your messages.

**Retention:** Stored in Cloudflare KV indefinitely until you request deletion. Only the most recent 20 messages per user are kept at any given time; older messages are automatically replaced as new ones arrive.

**Deletion:** You can request deletion of your conversation history at any time by emailing a.selimfedakar@gmail.com. We will process deletion requests within 30 days.

---

## 4. Data We Do NOT Collect

To be explicit, the following data is **never collected** by Auris AI:

- Raw audio files (only transcripts are kept)
- Photos or images (not stored after processing)
- Calendar events (not stored on any server)
- Gmail OAuth tokens (not sent to our servers)
- Gmail email content (not stored after generating a response)
- Device location / GPS coordinates
- Contact list / address book data
- Browsing history
- Financial or payment information
- Advertising identifiers (IDFA)
- Health or biometric data

---

## 5. Third-Party Services and Data Processing

To provide the App's functionality, certain data is transmitted to trusted third-party services for processing. These third parties receive data strictly for the purpose of serving you, not for their own marketing or commercial purposes.

| Service | Purpose | Data Sent | Their Privacy Policy |
|---|---|---|---|
| **Groq** | Speech-to-text transcription (Whisper API) | Raw audio (per request, not stored) | [groq.com/privacy](https://groq.com/privacy) |
| **Anthropic Claude** | AI language model — generating responses | Conversation transcript, profile context | [anthropic.com/privacy](https://www.anthropic.com/privacy) |
| **OpenAI** | Text-to-speech (TTS) — AI voice output | AI-generated text responses | [openai.com/policies/privacy-policy](https://openai.com/policies/privacy-policy) |
| **Cloudflare Workers & KV** | Backend infrastructure, API routing, conversation storage | Conversation history (last 20 messages), API requests in transit | [cloudflare.com/privacypolicy](https://www.cloudflare.com/privacypolicy/) |
| **Google (Gmail API)** | Email access for Email Intel module (opt-in only) | OAuth token (device only), email content per request | [policies.google.com/privacy](https://policies.google.com/privacy) |

**Cloudflare data center locations:** Cloudflare's network spans US and EU data centers. Data in transit and KV storage may reside in either region depending on routing. Cloudflare complies with GDPR standard contractual clauses (SCCs) for cross-border data transfers.

**Important:** We do not sell, rent, lease, or share your personal data with any third parties for advertising, analytics, or commercial purposes. Data shared with the services above is used exclusively to operate the features of Auris AI.

---

## 6. How We Protect Your Data

We implement the following technical and organizational measures to protect your information:

- **Encryption in transit:** All communication between the App and our backend (Cloudflare Workers) uses HTTPS/TLS.
- **Pseudonymous storage:** Conversation history in Cloudflare KV is keyed by a randomly generated user ID, not by your name or email address.
- **Minimal data principle:** We collect only what is necessary to deliver the feature you are actively using. Raw audio, images, calendar data, and email content are never persisted on our servers.
- **On-device storage:** Sensitive credentials (Gmail OAuth token) and personal profile data are stored on-device, never transmitted to our servers.
- **Third-party vetting:** All third-party AI and infrastructure providers we use maintain their own enterprise-grade security practices and comply with industry standards.

Despite these measures, no system is 100% secure. In the event of a data breach that affects your personal information, we will notify affected users promptly in accordance with applicable law.

---

## 7. Your Rights and Choices

Depending on where you live, you may have the following rights regarding your personal data:

### 7.1 Access
You may request a copy of the personal data we hold about you (specifically: your conversation history in Cloudflare KV). Contact us at a.selimfedakar@gmail.com.

### 7.2 Deletion
You may request deletion of your conversation history stored in Cloudflare KV at any time. We will process the request within 30 days. Send your deletion request to a.selimfedakar@gmail.com with the subject line: **"Data Deletion Request – Auris AI"**.

Note: On-device data (profile, OAuth token) can be deleted by uninstalling the App or clearing App data in iOS Settings.

### 7.3 Withdrawal of Consent
You may withdraw permissions at any time through iOS Settings > Auris AI:
- **Microphone:** Disables voice commands and pendant audio input.
- **Camera:** Disables the Vision Analysis feature.
- **Calendars:** Disables calendar-aware responses.
- **Notifications:** Disables ambient session push summaries.

Gmail access can be revoked at [myaccount.google.com/permissions](https://myaccount.google.com/permissions).

### 7.4 Objection / Restriction
You may object to or request restriction of certain processing. Contact us at a.selimfedakar@gmail.com.

### 7.5 Portability
You may request an export of your conversation history in a machine-readable format. Contact us at a.selimfedakar@gmail.com.

---

## 8. GDPR Compliance (European Users)

If you are located in the European Economic Area (EEA) or the United Kingdom, the General Data Protection Regulation (GDPR) or UK GDPR applies to your personal data.

**Legal bases for processing:**

| Processing Activity | Legal Basis |
|---|---|
| Voice transcription and AI response generation | Contractual necessity (performing the App's core service) |
| Conversation history storage | Legitimate interest (multi-turn AI context) |
| User profile (name, occupation, preferences) | Consent (you provide this voluntarily) |
| Calendar access | Consent (you grant permission via iOS prompt) |
| Gmail access | Consent (you explicitly opt-in to Email Intel) |
| Push notifications | Consent (you grant permission via iOS prompt) |

**Data Controller:** Ahmet Selim Fedakar, a.selimfedakar@gmail.com

**International transfers:** Data is processed by Groq (US), Anthropic (US), OpenAI (US), and Cloudflare (US/EU). For transfers from the EEA, we rely on Standard Contractual Clauses (SCCs) and/or adequacy decisions where applicable, consistent with each provider's GDPR compliance documentation.

**Right to lodge a complaint:** If you are in the EEA, you have the right to lodge a complaint with your national Data Protection Authority (DPA) if you believe we have processed your data unlawfully.

---

## 9. CCPA Compliance (California Residents)

If you are a California resident, the California Consumer Privacy Act (CCPA) and the California Privacy Rights Act (CPRA) grant you additional rights:

- **Right to Know:** You may request information about the categories and specific pieces of personal data we have collected about you.
- **Right to Delete:** You may request deletion of your personal data (see Section 7.2).
- **Right to Opt-Out of Sale:** We do **not** sell your personal information. We do not have a "Do Not Sell My Personal Information" link because no sale takes place.
- **Right to Non-Discrimination:** We will not discriminate against you for exercising your CCPA rights.

**Categories of personal information collected under CCPA:**
- Identifiers (pseudonymous user ID)
- Audio / voice recordings (processed in transit, not stored)
- Professional information (occupation, provided voluntarily)
- Internet or electronic network activity (conversation history, in transit)

To exercise your California privacy rights, contact: a.selimfedakar@gmail.com

---

## 10. Data Retention

| Data Type | Retention Period |
|---|---|
| Raw audio | Not retained (discarded after transcription) |
| Photos / images | Not retained (discarded after analysis) |
| Calendar data | Not retained (used in-memory per request only) |
| Gmail email content | Not retained (used in-memory per request only) |
| Gmail OAuth token | On-device only, until revoked or App deleted |
| User profile data | On-device only, until App is deleted |
| Conversation history | Cloudflare KV: last 20 messages, retained until deletion request |

---

## 11. Changes to This Policy

We may update this Privacy Policy from time to time to reflect changes in the App's features, applicable law, or our data practices.

**How we notify you:**
- For significant changes: We will notify you via an in-app prompt or push notification at your next App launch, and/or by email if you have provided your contact address.
- For minor changes: The updated policy will be published with a revised "Last Updated" date. Continued use of the App after the effective date of a change constitutes acceptance of the updated policy.

We encourage you to review this policy periodically.

---

## 12. Contact Us

If you have any questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact:

**Ahmet Selim Fedakar**
Developer, Auris AI
Email: a.selimfedakar@gmail.com

We aim to respond to all privacy-related inquiries within **14 business days**.

---

## 13. Definitions

- **App:** The Auris AI iOS application and its companion ESP32 wearable pendant system.
- **We / Our / Us:** Ahmet Selim Fedakar, the individual developer of Auris AI.
- **You / Your / User:** Any person who installs or uses the Auris AI application.
- **Backend:** The server-side infrastructure running on Cloudflare Workers.
- **Cloudflare KV:** Cloudflare's key-value data store used for conversation history.
- **Personal Data / Personal Information:** Any information that identifies or can reasonably be used to identify an individual.
- **Processing:** Any operation performed on personal data, including collection, storage, transmission, analysis, or deletion.

---

*This Privacy Policy was drafted to reflect the actual technical architecture of Auris AI as of its initial release. It is not a template — the data flows, storage decisions, and third-party integrations described here correspond directly to how the App is built and operates.*

*Last updated: June 1, 2026*
