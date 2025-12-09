# Production Readiness & Implementation Plan - Voiceagent V1

This document outlines the step-by-step actions required to finalize the Voiceagent V1 application for production.

## 1. Backend Service Implementation

### 1.1 Validation Service (Missing)
**Objective**: Ensure AI responses meet safety and quality standards (e.g., no forbidden words, minimum length).
*   [ ] **Create `backend/src/services/validationService.js`**:
    *   Implement function `validateResponse(text, stageConfig)` checking against `stageConfig.validation_rules`.
    *   Implement function `validateStageCompletion(summary, stageCriteria)` to ensure strict criteria are met for stage advancement.
*   [ ] **Integrate into `GeminiLiveService.js`**:
    *   Import `validationService`.
    *   In `handleGeminiMessage`: Before sending text to client, run `validateResponse`. If invalid, retry with Gemini or simple fallback.
    *   In `handleStageCompletion`: Validate the summary against stage goals before calling DB update.

### 1.2 Security & Authentication
**Objective**: Lock down admin routes and safe-guard WebSocket connections.
*   [ ] **Enhance Admin Middleware (`backend/src/routes/admin.js`)**:
    *   Current: Checks if `supabase.auth.getUser()` returns a user.
    *   **Action**: Query `admin_users` table to ensure the `user.id` or `user.email` is authorized as an admin.
*   [ ] **WebSocket Rate Limiting**:
    *   **Action**: In the Fastify server setup (e.g., `server.js`), implement connection rate limiting (e.g., max 5 connections per IP per minute) to prevent DoS.
    *   **Action**: Ensure payload size limits on WebSocket messages.

## 2. Database & Data Integrity

### 2.1 Analytics RPC
**Objective**: Efficiently track usage without race conditions.
*   [ ] **Create Supabase RPC `increment_analytics`**:
    *   **SQL Logic**:
        ```sql
        create or replace function increment_analytics(p_student_id uuid, p_duration int)
        returns void as $$
        begin
          insert into student_analytics (student_id, total_sessions, total_duration, last_active)
          values (p_student_id, 1, p_duration, now())
          on conflict (student_id) do update
          set total_sessions = student_analytics.total_sessions + 1,
              total_duration = student_analytics.total_duration + p_duration,
              last_active = now();
        end;
        $$ language plpgsql;
        ```
*   [ ] **Update `GeminiLiveService.js`**:
    *   Remove the raw update fallback and rely on the RPC call.

### 2.2 Row Level Security (RLS)
**Objective**: Prevent unauthorized data access.
*   [ ] **Apply Policies**:
    *   `conversations`: Enable RLS. Policy: `INSERT` for `anon` (if authenticated via student ID mechanism) or just `service_role` for backend. `SELECT` only for `admin` role.
    *   `students`: `SELECT` for their own ID.
    *   `admin_users`: No access for `anon`.

## 3. Frontend & User Experience

### 3.1 Payment Handoff
**Objective**: Provide a clear path for users to pay.
*   [ ] **Update `Dashboard.tsx` Handoff Logic**:
    *   Current: Shows a "Connecting Listener" popup then ends session.
    *   **Action**: Change popup to "Redirecting to Payment...".
    *   **Action**: After 3 seconds, `window.location.href = "PAYMENT_URL"` (or display a Stripe payment link/QR code).

### 3.2 Error Handling
*   [ ] **Review Error Toasts**: Ensure network dropouts display a persistent, clear message (already partially implemented with `isOffline`).

## 4. Deployment & DevOps

### 4.1 Environment Variables
*   [ ] **Audit**:
    *   Backend `final` check: `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`.
    *   Frontend `final` check: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

### 4.2 Build Scripts
*   [ ] **Frontend**: Verify `npm run build` produces a clean `dist/` folder.
*   [ ] **Backend**: Ensure `npm start` runs the fastify server in production mode.

### 4.3 Documentation
*   [ ] **Update README.md**: Include detailed env var setup and deployment commands.

## Implementation Order
1.  **Database**: Create RPC and RLS policies.
2.  **Backend Services**: Create Validation Service, update Admin Auth.
3.  **Frontend**: Polish Handoff UI.
4.  **Integration**: Test full flow.
