# WhatsApp Integration Documentation - SmartCare

This document provides a detailed, step-by-step technical breakdown of how the WhatsApp integration is implemented in the SmartCare application using the `@whiskeysockets/baileys` library.

---

## 1. Session Storage & Persistence (Database-Level)

Unlike standard implementations that store sessions in local JSON files, SmartCare uses a **PostgreSQL database** to ensure persistence across deployments and horizontal scaling.

### File: `backend/src/services/whatsapp.auth.js`
- **`usePostgresAuthState(sessionId)`**: A custom implementation of the Baileys auth state.
- **Table**: `whatsapp_sessions` (Columns: `id` (Text), `data` (Text)).
- **Mechanism**:
    - **`writeData`**: Serializes session data using `BufferJSON.replacer` (to handle binary data) and performs an `UPSERT` into the database.
    - **`readData`**: Retrieves and deserializes data using `BufferJSON.reviver`.
    - **`creds`**: The core authentication credentials required to bypass QR scanning after the first time.
    - **`keys`**: Stores cryptographic keys, app state sync keys, and pre-keys.

---

## 2. The Core Service (Baileys Implementation)

The heart of the integration lies in the backend service which manages the socket connection and message sending.

### File: `backend/src/services/whatsapp.service.js`
- **Initialization (`initWhatsApp`)**:
    1. Ensures the `whatsapp_sessions` table exists.
    2. Loads the auth state from the database via `usePostgresAuthState('default-session')`.
    3. **Socket Creation**: Calls `makeWASocket({ auth: state, browser: [...] })` to create the connection.
    4. **Event Listeners**:
        - `creds.update`: Automatically saves updated credentials to the database whenever they change.
        - `connection.update`: 
            - If a `qr` string is received, it converts it to a DataURL (Base64 image) using the `qrcode` library.
            - Updates the global `connectionStatus` (e.g., `awaiting_qr`, `connected`, `disconnected`).
            - Handles reconnection logic if the connection is closed unexpectedly.

---

## 3. Communication Layer (API & Streaming)

To provide a real-time experience on the frontend (viewing the QR code as it's generated), the backend uses **Server-Sent Events (SSE)**.

### File: `backend/src/routes/whatsapp.routes.js`
- **`POST /api/whatsapp/connect`**: Triggers the `initWhatsApp()` sequence.
- **`GET /api/whatsapp/qr-stream`**: 
    - Establishes an SSE connection.
    - Every 1.5 seconds, it sends a JSON packet containing the current status and the latest QR code.
    - Automatically closes once the status becomes `connected`.

---

## 4. Frontend Implementation (QR & UI)

The user interacts with the integration through the "Integrations" tab in the Settings page.

### File: `frontend/src/pages/Settings.tsx`
- **State Management**: Uses `waStatus` to store the status and QR code string.
- **Connection Logic (`handleWaToggle`)**:
    1. Calls the `/connect` API.
    2. Opens a modal (`Dialog`) to show the QR code.
    3. Initializes `EventSource` (SSE) to listen for updates from `/qr-stream`.
- **UI Feedback**:
    - Displays a "Generating QR code..." loader until the first QR is received.
    - Once the QR is received, it renders an `<img>` tag with the Base64 data.
    - Upon successful connection, it shows a "WhatsApp connected successfully!" toast and closes the modal.

---

## 5. Automated Messaging (Queues & Workers)

To ensure that sending a message doesn't slow down the main API response (and to handle retries), the system uses a queue.

### Workflow:
1. **Queueing**: When a patient is registered or an invoice is generated, the backend calls `addWhatsAppJob(jobType, data)` (in `backend/src/queues/whatsapp.queue.js`).
2. **Persistence**: The job is stored in **Redis** via BullMQ.
3. **Processing**: The **WhatsApp Worker** (`backend/src/workers/whatsapp.worker.js`) picks up the job.
4. **Execution**:
    - The worker calls the appropriate method in `whatsappService` (e.g., `sendInvoice`).
    - The service generates the required PDF (if needed) using `pdf.service.js`.
    - Finally, `sock.sendMessage(jid, { ... })` is called to deliver the message to the patient.

---

## Summary of Steps to Connect
1. User clicks **Toggle** in Settings.
2. Backend starts Baileys socket; Baileys generates a QR code.
3. Backend sends QR code to Frontend via SSE.
4. User scans QR code with WhatsApp Mobile App.
5. Baileys triggers `connection.update` -> `connected`.
6. Session credentials are saved to **PostgreSQL**.
7. Backend sends "Connected" status via SSE; Frontend closes modal.
8. System is now ready to send automated messages.
