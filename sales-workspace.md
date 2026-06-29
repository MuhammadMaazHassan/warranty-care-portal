### 📅 Phase 4: Integrations & Campaigns *(UI Built — Functionality Pending)*
- [x] **Salesforce Connection** *(UI done)*:
  - [ ] **OAuth 2.0 flow (SW-CRM-002)**: Implement authorization code flow; store access/refresh tokens in secrets vault (never in `.env` or logs)
  - [ ] **Connection management API** (`/api/sales/crm`): Connect, reauthorize, pause, disconnect; expose connection state, last sync time, last error
  - [ ] **Field mapping UI wiring (SW-CRM-004)**: Map Salesforce fields → canonical lead fields; support custom fields; version mappings so changes only affect future syncs
  - [ ] **Initial import job (SW-CRM-005)**: Filtered import via Salesforce list view / record type / SOQL builder; use Bulk API 2.0 for >2,000 records; report progress and per-record errors
  - [ ] **Incremental sync cron via Inngest (SW-CRM-006)**: Poll every 15 min (configurable 5min–24hr) using `LastModifiedDate` watermarks; archive (not delete) removed records
  - [ ] **Rate limit & idempotent backoff (SW-CRM-007)**: Respect Salesforce API limits; exponential backoff on 429/5xx; surface failures as actionable notifications; never partially corrupt lead state
  - [ ] **Write-back to Salesforce (SW-CRM-008)**: Optional push of lead status changes, appointment booked events, unsubscribe flags to mapped SF fields (off by default, per tenant)
  - [ ] **Consent on import (SW-CRM-009)**: Default imported leads to "consent unknown"; exclude from sends where opt-in is required unless a mapped field provides explicit opt-in
- [x] **Compliance Rules** *(UI done)*:
  - [ ] **Central compliance service**: Before every outbound send check: (1) per-channel consent flag, (2) suppression list, (3) SMS quiet hours 8am–9pm lead-local time (TCPA), (4) unsubscribe mechanism present
  - [ ] **Suppression list management**: Global per-tenant suppression; auto-add on STOP/unsubscribe/bounce/complaint
  - [ ] **Inbound webhook handlers**: ESP and SMS provider webhooks for delivery receipts, opens, clicks, bounces, complaints, replies, STOP/HELP keywords
  - [ ] **STOP/HELP auto-processing**: Detect STOP/HELP keywords in inbound SMS and immediately update lead consent flags
- [x] **Drip Campaigns / Nurture Sequences** *(UI done — see Nurture Agent below)*

---

### 📅 Phase 5: Announcements & Calendar *(UI Built — Functionality Pending)*
- [x] **Content Calendar** *(UI done)*:
  - [ ] **Calendar data API** (`/api/sales/calendar`): Return scheduled items (nurture sends aggregate, announcements, blog posts, campaign sends) with status and owner
  - [x] **Drag-and-drop reschedule API** *(implemented 2026-06-29)*: `PATCH /api/sales/calendar/:id` updates schedule/content; enforces SMS quiet-hours window (8am–9pm) on the new date and returns a suggested valid time. ⚠️ Window uses `DEFAULT_SEND_TIMEZONE` (items are company-level, not per-lead).
  - [ ] **AI content slot suggestions (SW-CAL-002)**: Call the Content Assist Agent to generate suggested slots from tenant profile, seasonal events, scraped news, and schedule gaps
  - [ ] **Accept / edit / dismiss suggestion API**: Creating draft item on accept; feed dismissals back into suggestion ranking
  - [x] **Item status workflow** *(implemented 2026-06-29)*: `PATCH /api/sales/calendar/:id/status` with full lifecycle state machine (Suggested → Draft → Approved → Scheduled → Sent/Published → Failed, + Dismissed); illegal transitions rejected (409); ADMIN-only approval gate; create now enters as Draft/Suggested instead of forcing Scheduled. ❌ **Executor still missing** — nothing dispatches Scheduled items, so Scheduled→Sent/Published is manual-only.
- [x] **Basic Appointment Booking** *(UI done — see Scheduling Agent below)*

---

### 📅 Phase 6: Advanced AI Features *(UI Built — Functionality Pending)*
- [ ] **AI Booking Agent** *(see Scheduling Agent in Agents Registry below)*
- [x] **News Fetcher** *(UI done — see News Scraping Agent below)*
- [x] **AI Blog Writer** *(UI done — see Blog Drafting Agent below)*
- [x] **Smart Automations** *(UI done — see Automated Marketing Rules Agent below)*
- [x] **Sales AI Knowledge Base** *(UI done — see KB & Brand Voice Agent below)*


- [ ] **5.3 — Simple Appointment Automation Trigger**
  - Extract/detect reply event inside webhook processing
  - If originating campaign has simple scheduling enabled, auto-reply to lead:
    - Email: Send auto-reply with personalized scheduling link `/sales/scheduling?leadId={leadId}` using `MailService.sendEmail`
    - SMS: Send auto-reply with scheduling link using `sendSms`
  - Files: `server/src/controllers/compliance.controller.js`, `server/src/services/mail-service.js`


  
## 🤖 AI Agents Registry

The Sales workspace is powered by **9 specialized AI agents**. All agents use Claude (via the platform AI service) + Inngest as the durable automation tier. Agents share the platform LLM and vector store but maintain strict per-workspace, per-tenant namespace isolation from Warranty data.


### 2. 📅 Appointment Scheduling Agent *(SW-APT)*
> Conversational AI agent (Claude + Inngest) that reads lead replies and books appointments automatically.

- [ ] **Reply trigger (SW-APT-001)**: Detect when a lead replies to email/SMS (via ESP/SMS webhook → Inngest event) and initiate appointment scheduling flow per the configuration of the originating sequence/announcement
- [ ] **Simple booking mode**: Auto-send a booking-link response to the lead pointing to the assigned user's availability page; lead self-books
- [ ] **AI conversational mode (SW-APT-002)**: Run a Claude tool-calling loop via Inngest steps — interpret reply in natural language, propose available time slots, handle counter-proposals, confirm and book on agreement
- [ ] **Availability management UI wiring (SW-APT-003)**: Let agents set working hours, buffer times, appointment types/durations, and time zone in the `/sales/scheduling/settings` page; wire to backend API
- [ ] **Google Calendar / Microsoft 365 integration (SW-APT-003)**: Two-way busy/free sync; fall back to native availability management if calendar integration not connected
- [ ] **Atomic slot reservation (SW-APT-007)**: Prevent double bookings with DB-level atomic reservation; concurrent attempts for the same slot must result in exactly one success plus a graceful re-offer for the other
- [ ] **Booking record creation (SW-APT-004)**: Create appointment record linked to lead, native calendar entries, confirmation messages to both parties, configurable reminders (default 24h and 1h before)
- [ ] **Reschedule & cancel (SW-APT-005)**: Lead can reschedule/cancel via a tokenized link; staff can do so from the lead detail view; update lead timeline and calendars on change
- [ ] **Agent guardrails (SW-APT-006)**: Only offer genuinely available slots; deflect off-topic questions politely and offer human follow-up; escalate to human after 4 unresolved turns; identify itself as an automated assistant where required by law or tenant policy; log full transcript to lead timeline
- [ ] **Inngest step function**: Entire booking conversation runs as retriable durable Inngest steps; reply event starts flow; atomic reservation is a separate step

---

### 3. 📰 News Scraping Agent *(SW-NEWS)*
> Automatically collects and AI-summarizes housing market news on a scheduled cadence.

- [ ] **Configurable news sources (SW-NEWS-001)**: Support RSS/Atom feeds, public APIs, and permitted web pages per tenant; seed with platform defaults for housing/mortgage content
- [ ] **Scheduled scraping via Inngest cron (SW-NEWS-002)**: Daily, weekly, and monthly digests; mortgage rate updates at minimum daily; per-source isolation so one failing source doesn't affect others
- [ ] **AI summarization & tagging (SW-NEWS-003)**: Deduplicate collected items; summarize with Claude; tag by topic, geography, and date; store with source attribution (publisher, URL, retrieved-at timestamp)
- [ ] **robots.txt & rate-limit compliance (SW-NEWS-005)**: Honor robots.txt; identify with proper user agent; rate-limit per domain; store summaries + links only (no full-text republication)
- [ ] **Failure isolation (SW-NEWS-006)**: Quarantine a failing source after repeated errors without affecting others; surface quarantine status to Platform Admin
- [ ] **News feed page** (`/sales/news`): Display collected items in daily/weekly/monthly views; connect to real backend data
- [ ] **Feed to calendar suggestions**: Pass news items to the Content Assist Agent as input for AI calendar slot suggestions (SW-CAL-002)
- [ ] **Feed to blog drafter**: Expose news items as selectable source material in the Blog Drafting Agent pipeline

---

### 4. ✍️ Blog Drafting Agent *(SW-BLOG)*
> AI pipeline (Claude + Inngest) that generates blog post drafts from news items for human review and publishing.

- [ ] **News-to-draft pipeline (SW-BLOG-001)**: User selects news items from the news feed (or agent proposes them) → Claude generates draft → human reviews and edits → approves → publish or export
- [ ] **Draft generation with brand voice (SW-BLOG-002)**: Pull tenant brand profile (tone, target audience, markets) and relevant KB documents (brand voice, product info) at generation time (RAG); include SEO title, meta description, and suggested headings; cite source news items explicitly
- [ ] **Rich text editor (SW-BLOG-003)**: Full editing of AI-generated drafts in the `/sales/blog` editor; allow AI to regenerate individual sections without losing manual edits elsewhere
- [ ] **Human approval gate (SW-BLOG-004)**: No post can be published or exported without an explicit human approval action; clearly label all drafts as "pending review"
- [ ] **Publish to workspace blog (SW-BLOG-005)**: Support publishing to the tenant's workspace-hosted blog page; export as HTML or Markdown for external CMS use; WordPress integration is a stretch goal
- [ ] **Calendar integration (SW-BLOG-006)**: Schedule approved blog posts via the content calendar; cross-promote via announcement or campaign link distribution
- [ ] **Inngest pipeline**: Run the entire select → draft (LLM) → await-human-approval (event) → publish/export flow as durable Inngest steps; support restart after approval event arrives

---

### 5. 📣 Announcements Agent *(SW-ANN)*
> Handles mass email/SMS broadcasts to lead segments with compliant batch delivery.

- [ ] **Announcement authoring wiring**: Connect the `/sales/announcements` form to backend API; support rich text body (email), plain-text variant (SMS), optional images (email), optional CTA link, and target audience (segment, geographic filter, or all leads)
- [ ] **Batch delivery pipeline via Inngest (SW-ANN-002)**: Audience snapshot at send time → chunk into provider-appropriate batches → queue → throttle to provider rate limits → auto-retry transient failures → dead-letter permanent failures
- [ ] **Geographic targeting (SW-ANN-004)**: Filter recipients by state, city, or zip list; radius targeting is a stretch goal
- [ ] **Scheduling API (SW-ANN-003)**: Send immediately or schedule (surface in content calendar); allow cancellation until the batch pipeline starts processing
- [ ] **Per-announcement reporting (SW-ANN-005)**: Audience size, sent, delivered, failed, opened, clicked, replied, unsubscribed — broken down by channel; update in near real-time as batch progresses
- [ ] **Compliance enforcement (SW-ANN-007)**: Every announcement send passes the central compliance gate (consent per channel, suppression, quiet hours, unsubscribe mechanism)
- [ ] **Role restriction (SW-ANN-006)**: Only Builder Admin and authorized Builder Member can publish; homeowners have no access to announcement authoring; enforce at API level

---

### 6. 🤖 Automated Marketing Rules Agent *(SW-AMK)*
> Event-driven automation engine — define trigger → conditions → actions rules to run asynchronously.

- [ ] **Visual rule builder wiring (SW-AMK-002)**: Connect the `/sales/automations` drag-and-drop UI to backend; validate rules before activation (e.g. block SMS actions without consent filter)
- [ ] **Trigger support**: Lead created/imported, segment entry, lead replied, link clicked, appointment booked/cancelled, status changed, date-based (anniversary of inquiry), news event published
- [ ] **Condition evaluation**: Lead field comparisons, consent state, engagement history, time constraints
- [ ] **Action execution**: Enroll in/remove from sequence, send single email/SMS, update status or tags, notify a user, create a task, schedule announcement draft
- [ ] **Idempotent at-least-once execution (SW-AMK-003)**: Apply each action at most once per lead per trigger event; prevent automation loops with a configurable cooldown per lead per rule (default 24 hours)
- [ ] **Per-tenant rate caps & kill switch (SW-AMK-004)**: Platform Admin-configurable daily message cap; instant kill switch that pauses all automations for a tenant immediately
- [ ] **Audit log & analytics (SW-AMK-005)**: Log every automation run (trigger event, conditions evaluated, actions taken, outcome); aggregate analytics: runs, actions, messages generated, appointment conversions attributable to the automation
- [ ] **Inngest event-driven backend**: Run all automation executions as idempotent Inngest event-driven steps with cooldown keys; concurrency scoped per tenant

---

### 7. 💬 AI Content Assist Agent *(SW-NUR-005 / SW-CAL-002)*
> Embedded AI helper for writing nurture step content and generating content calendar suggestions.

- [ ] **Sequence step content drafting (SW-NUR-005)**: In the sequence editor, call Claude to draft email/SMS copy per step; inputs: sequence goal, audience description, brand voice settings, and relevant KB documents; output requires explicit user approval before being set as active step content
- [ ] **Calendar slot suggestions (SW-CAL-002)**: Generate AI-proposed content slots from tenant profile (markets, communities), seasonal events, scraped news items, and gaps in the existing calendar schedule; include proposed date, channel, topic, and draft outline
- [ ] **Accept / edit / dismiss flow (SW-CAL-003)**: Accept creates a draft calendar item; edit opens the item for modification; dismiss is recorded to inform future suggestion ranking
- [ ] **KB-aware RAG generation**: Pull relevant documents from the Sales Knowledge Base (brand voice, FAQs, product info) at generation time using the per-tenant vector namespace
- [ ] **Citation tracking (SW-KB-005)**: For every AI output, record and display which KB documents were referenced; mirror the Warranty workspace's "documents referenced in a ticket" behavior
- [ ] **Streaming / progress indication**: AI draft generation must return within 30 seconds at p95 with streaming or progress UI feedback (NFR-P-006)

---

### 8. 🔍 CRM Sync Agent *(SW-CRM)*
> Background agent that keeps Salesforce leads continuously in sync with the local lead database.

- [ ] **OAuth 2.0 Salesforce connection (SW-CRM-002)**: Implement authorization code flow in the settings page; store access/refresh tokens in secrets vault; support reauthorization on token expiry
- [ ] **Connection management API** (`/api/sales/crm/connect`, `/pause`, `/disconnect`): Expose connection state, last sync time, last sync error; disconnecting stops future syncs but retains existing leads
- [ ] **Field mapping API (SW-CRM-004)**: Store versioned field mappings; apply changes to subsequent syncs only; support mapping custom Salesforce fields to tenant custom fields
- [ ] **Initial bulk import (SW-CRM-005)**: Run filtered initial import via Salesforce list view / record type / SOQL-equivalent filter; use Salesforce Bulk API 2.0 for volumes >2,000 records; emit progress events to Inngest; capture per-record errors
- [ ] **Incremental sync cron (SW-CRM-006)**: Inngest cron job (default every 15 min, configurable 5min–24hr) using `LastModifiedDate` watermarks; idempotent upserts; archive local record when deleted in Salesforce (never hard-delete)
- [ ] **Rate limit & failure handling (SW-CRM-007)**: Respect Salesforce API daily/concurrent limits; exponential backoff on 429/5xx; surface persistent failures as actionable admin notifications; ensure syncs never partially corrupt lead state
- [ ] **Write-back to Salesforce (SW-CRM-008)**: Optionally push lead status changes, appointment booked events, and unsubscribe flags to mapped Salesforce fields; off by default; gated per tenant
- [ ] **Consent on import (SW-CRM-009)**: Default all imported leads to "consent unknown" unless a mapped Salesforce field provides explicit opt-in; exclude unknown-consent leads from SMS and opt-in-required email per tenant compliance profile

---

### 9. 📚 Sales KB & Brand Voice Agent *(SW-KB / SW-AGT)*
> Manages the Sales workspace knowledge base and injects brand context into all AI feature calls.

- [ ] **Document upload UI wiring (SW-KB-001)**: Connect drag-and-drop upload in `/sales/settings` to backend API; enforce per-file 50 MB and per-tenant 10 GB limits; show real-time indexing status
- [ ] **Chunking, embedding & vector indexing (SW-KB-002)**: Process uploaded documents via Inngest step function: chunk → embed (platform embedding model) → upsert to vector store under a Sales-workspace per-tenant namespace; re-index automatically on document update
- [ ] **KB lifecycle management (SW-KB-003)**: Add, update, soft-delete through list view API; soft-delete removes from active retrieval but retains in storage for rollback and audit
- [ ] **Document category tagging (SW-KB-004)**: Tag documents by purpose (brand voice, community/product info, sales FAQs, pricing/policy, compliance); each AI feature queries only the relevant category subset
- [ ] **Citation visibility (SW-KB-005)**: Record and display which KB documents were referenced for every AI output (blog drafts, scheduling-agent answers, nurture content)
- [ ] **Brand voice & company profile (SW-KB-006)**: Configurable structured profile (company name, logo, markets/communities, tone, signature, contact and unsubscribe details); injected into Claude prompts at runtime; edited through forms (not raw prompt editing)
- [ ] **Configuration versioning & sandbox (SW-KB-007)**: Version all prompt-affecting config (brand profile, agent behavior toggles) with rollback; support preview/sandbox mode to test AI behavior before it affects live sends
- [ ] **Agent runtime abstraction (SW-AGT-001)**: Sales AI features run behind a pluggable agent-runtime interface; scheduling agent can run on native Claude + Inngest (recommended v1) or BotPress; choice does not change lead-facing behavior or compliance guarantees
- [ ] **Shared LLM & vector services (SW-AGT-002)**: Reuse platform Claude service and vector store (Pinecone/Weaviate); do not introduce parallel providers; enforce strict namespace isolation from Warranty data

---

## 🏗️ Backend Infrastructure (Sales Workspace)

### Inngest Automation Tier
- [ ] **Install & configure Inngest**: Add `inngest` package to Node.js backend; set `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY`; create Inngest client and HTTP serve handler
- [ ] **Tenant-scoped event context**: Every Inngest event must carry `tenantId`; every step must enforce tenant-scoped DB access
- [ ] **Per-tenant concurrency keys & throttling**: Configure per-tenant concurrency limits to prevent workload starvation across tenants (NFR-SC-002)
- [ ] **Dead-letter queue handling**: Surface permanently-failed jobs to Platform Admin with actionable notifications

### Email & SMS Provider Integration
- [ ] **Select and integrate ESP** (e.g. Resend, Postmark, or SendGrid): Configure sending domains with SPF/DKIM/DMARC per tenant; support inbound reply parsing via webhooks
- [ ] **Select and integrate SMS provider** (e.g. Twilio): E.164 normalization; per-country sender rules; delivery receipts and inbound STOP/HELP
- [ ] **Unified send interface**: All outbound sends go through the compliance gate first, then the unified send service

---

## 🔐 Security & Compliance
- [ ] **Tenant isolation audit**: Verify every new Sales API route is scoped by `tenantId` at the DB query layer — not just at RBAC level (NFR-S-002)
- [ ] **Secrets vault for OAuth tokens**: Store Salesforce OAuth tokens and ESP/SMS API keys in a secrets manager; never in `.env` or logs; must be revocable (NFR-S-003)
- [ ] **Audit log table**: Log CRM connect/disconnect, imports, exports, bulk deletes, automation activations, announcement sends, permission changes, Platform Admin access to tenant data; 12-month retention (NFR-S-004)
- [ ] **GDPR/CCPA data subject request flow**: Export all lead data for a subject on request; delete lead PII on request propagating to derived stores and vector namespaces
- [ ] **CSV virus scanning (NFR-S-006)**: Scan uploaded CSVs before processing; auto-delete raw CSV files 30 days post-import
- [ ] **Merge field injection safety (NFR-S-008)**: Render email merge fields in a sandboxed context; prevent script execution in HTML email preview (OWASP ASVS level 2)
- [ ] **AI PII minimization (NFR-S-007)**: Prompts containing lead PII must be minimized to only the fields needed for the task; AI inputs/outputs must not be used to train external models

---

## 🔎 Implementation Status & Remaining Work — Audited 2026-06-29 (code vs SRS v1.1)

> Authoritative status from a backend code audit against `sales-workspace-srs.pdf`. Where this conflicts with the inline checkboxes above (many of which only reflect *UI* completion), **this section wins**. Legend: ✅ implemented · 🟡 partial · ❌ missing — all referring to **backend functionality**, not UI.

### A. CRM Sync Agent (SW-CRM) — 🟡 connect works, sync automation missing
Implemented: OAuth 2.0 auth-code + refresh (`salesforce-service.js`), encrypted token storage, field mapping CRUD, bulk import (Bulk API 2.0 + REST fallback) with per-record errors, manual sync with `SystemModstamp` watermark, sync logs.
- [ ] **SW-CRM-006 incremental sync cron** — no Inngest scheduled function exists; only 3 functions registered (nurture, campaign-exit, csv-import). `syncInterval` is stored but never consumed. Sync only runs on a manual button.
- [ ] **SW-CRM-006 deletion handling** — removed Salesforce records are never detected or archived (soft-deleted).
- [ ] **SW-CRM-007 rate-limit & backoff** — no 429/5xx retry, no exponential backoff, no `Sforce-Limit-Info` handling, no actionable admin notifications.
- [ ] **SW-CRM-008 write-back** — `SalesforceClient.updateRecord()` exists but is never called; no per-tenant toggle, no status/appointment/unsubscribe push.
- [ ] **SW-CRM-005 filtered import** — SOQL hardcoded `FROM Lead`; no list-view/record-type/SOQL builder; runs synchronously in the HTTP request (60s poll) instead of a background Inngest job; Contact object unsupported.
- [ ] **SW-CRM-004 mapping versioning** — mappings are upserted in place; no versioning, so changes affect interpretation retroactively.
- [ ] **SW-CRM-003 pause/reauthorize** — no dedicated pause/resume/reauthorize endpoints (only connect/disconnect); routes mounted at `/api/sales/salesforce`, SRS says `/api/sales/crm`.
- [ ] **SW-CRM-009 consent-on-import** — imported leads default to `optIn:false` (explicit opt-out) rather than a tri-state "consent unknown"; recording an opt-out never obtained.
- [ ] **SW-CRM-002 hardening** — fail-closed when `SALESFORCE_ENCRYPTION_KEY` is the default placeholder; stop passing the client secret through the OAuth `state` param; derive token expiry from `expires_in` instead of hardcoded 2h.

### B. Compliance & messaging spine — ✅ core gate + event ingestion done
Implemented: central `validateOutboundMessage` (consent/suppression/quiet-hours/unsubscribe), STOP/HELP/START keyword processing, manual + STOP/unsubscribe suppression, Twilio + Brevo inbound reply webhooks.
- [x] **Inbound SMS reply webhook fixed (2026-06-29)** — registered `express.urlencoded()` (Twilio posts form-encoded; the endpoint was 400-ing on every inbound SMS because only `express.json()` was mounted).
- [x] **Brevo inbound email body fixed (2026-06-29)** — handler now reads `RawTextBody`/`RawHtmlBody`/`ExtractedMarkdownMessage` (Brevo's real field names) instead of the non-existent `TextBody`/`HtmlBody`, so reply bodies are captured on the timeline.
- [x] **ESP/SMS event webhooks (2026-06-29)** — `ComplianceService.handleMessageEvent` maps provider events (delivered/opened/clicked/soft-bounce/hard-bounce/complaint/unsubscribe/failed) to lead-timeline entries. New routes: `POST /events/email` (Brevo), `POST /events/sms` (Brevo SMS), `POST /status/sms` (Twilio status callback, signature-verified).
- [x] **Auto-suppress on bounce/complaint (2026-06-29)** — `suppressAndOptOut` upserts the contact onto the suppression list (BOUNCE/COMPLAINT/UNSUBSCRIBE), flips the channel opt-out flag, logs `CONSENT_CHANGE`, and fires `campaign.exit`. Twilio error codes mapped: 21610 → unsubscribe, 30007 → complaint.
- [x] **Webhook authentication** *(fixed 2026-06-29)* — added `verifyTwilioSignature` (X-Twilio-Signature on `/inbound/sms` + `/status/sms`) and `verifyWebhookSecret` (shared `INBOUND_WEBHOOK_SECRET` via `X-Webhook-Token`/`?token=` on `/inbound`, `/inbound/email`, `/unsubscribe`, `/events/*`). Guards are no-ops until their env vars are set, so dev is unaffected.
- [x] **Unified send service (2026-06-29)** — new `MessagingService` (`sendEmail`/`sendSms`/`sendTicketStatusUpdate`) gates outbound on the suppression list before hitting the provider. Warranty ticket-status emails now route through it (previously bypassed the gate). Auth OTP/password-reset stay direct (transactional exemption); nurture keeps its richer per-lead `validateOutboundMessage` gate.
- [x] **Complaint-rate alerting (NFR-O-001) (2026-06-29)** — `checkComplaintRate` runs after every complaint event: complaints/sent over a rolling window (defaults 0.1% threshold, 24h, ≥100-msg min volume; tunable via `COMPLAINT_RATE_*` env). Over threshold → `console.error` ALERT + email to `COMPLIANCE_ALERT_EMAIL` if set.

### C. Nurture Agent (SW-NUR) — ✅ functional; durability bugs fixed 2026-06-29
- [x] **Inngest determinism (C1)** *(fixed)* — all sleeps (`wait-for-delay`, `wait-for-window`, `wait-for-quiet-hours`) now use stable ids (no timestamp); wake times are computed inside `calc-*` durable steps so they're memoized and can't extend the delay on replay.
- [x] **Duplicate-send risk (C2)** *(fixed)* — send is now an isolated `send-step-<pos>` that does no DB writes and never throws; a separate `record-step-<pos>` does the timeline + position writes, so a bookkeeping retry can't re-send.
- [x] **Quiet-hours retry (H1)** *(fixed)* — replaced the `continue`-after-sleep with an attempt-scoped re-check `while` loop; sleeps until the lead-local TCPA window opens and re-evaluates the same step.
- [x] **Idempotency/concurrency key** *(fixed)* — function now sets `idempotency: "event.data.enrollmentId"` and `concurrency: [{ key: "event.data.enrollmentId", limit: 1 }]`.
- [ ] **SW-NUR-008 analytics** — delivered/opened/clicked/bounced metrics require the ESP event webhooks (B).
- [ ] **SW-NUR-007 versioning** — verify version-on-edit + mid-sequence migration policy (marked done in UI list).

### D. Content Calendar (SW-CAL) — 🟡 reschedule + workflow now done
- [x] SW-CAL-004 reschedule API and SW-CAL-005 status workflow + approval gate *(implemented 2026-06-29)*.
- [ ] **Calendar executor** — Inngest job to dispatch `Scheduled` items → `Sent`/`Published`/`Failed`. Nothing currently sends calendar items.
- [ ] **`owner` field (SW-CAL-005)** — not on `ContentCalendar`; needs a migration.
- [ ] **SW-CAL-002 real signals** — feed seasonal events, scraped news, and schedule-gap analysis into AI suggestions (currently only `voiceProfile`).
- [ ] **SW-CAL-003 dismiss-into-ranking** — persist suggestions and record dismissals.
- [ ] **SW-CAL-001 sources** — surface announcements & blog posts as first-class items; make the campaign projection authoritative (it ignores send windows and re-simulates from `createdAt`).

### E. Announcements Agent (SW-ANN) — ❌ backend entirely missing (UI only)
No Announcement model, controller, or route exists; only the `"Announcement"` channel string on `ContentCalendar`.
- [ ] Announcement model + authoring API (rich email / plain SMS / images / CTA / audience)
- [ ] **SW-ANN-002** batch delivery via Inngest (audience snapshot → chunk → throttle → retry → dead-letter)
- [ ] **SW-ANN-004** geographic targeting (state/city/zip)
- [ ] **SW-ANN-003** schedule + cancel-until-processing; surface on calendar
- [ ] **SW-ANN-005** per-announcement reporting by channel
- [ ] **SW-ANN-006/007** role restriction (Admin/Member only) + compliance gate on every send

### F. Appointment Scheduling Agent (SW-APT) — 🟡 basic booking only
Implemented: `getAppointments`, `bookAppointment`, `getSlots`, `triggerCta`.
- [ ] **SW-APT-007** atomic slot reservation (DB-level, no double-book) — verify/implement
- [ ] **SW-APT-001** reply-triggered flow (webhook → Inngest event)
- [ ] **SW-APT-002/006** AI conversational booking (Claude tool-loop in Inngest) with guardrails + transcript logging
- [ ] **SW-APT-003** availability settings API (hours/buffers/types/tz) + Google/MS365 two-way busy-free
- [ ] **SW-APT-004/005** confirmations + 24h/1h reminders; tokenized reschedule/cancel

### G. AI agents not yet built on the backend — ❌ (UI only)
- [ ] **News Scraping Agent (SW-NEWS)** — sources config, Inngest cron, robots.txt-respecting scraper, AI summarize/tag/dedupe, feed page data, failure quarantine
- [ ] **Blog Drafting Agent (SW-BLOG)** — news→draft Inngest pipeline, brand-voice RAG, rich editor wiring, human-approval gate, publish/export, calendar integration
- [ ] **Automated Marketing Rules (SW-AMK)** — rule builder API, trigger/condition/action engine, idempotent at-least-once + cooldown, per-tenant rate caps + kill switch, audit/analytics
- [ ] **Content Assist RAG (SW-NUR-005 / SW-CAL-002)** — KB-aware RAG drafting with citation tracking + streaming
- [ ] **Sales KB & Brand Voice (SW-KB / SW-AGT)** — document upload→chunk→embed→vector namespace, soft-delete lifecycle, category tagging, citation visibility, versioned brand profile/sandbox, pluggable agent runtime, shared LLM/vector services

### H. Cross-cutting infrastructure & security
- [ ] **Tenant-scoped Inngest context + per-tenant concurrency/throttling** (NFR-SC-002); **dead-letter** surfaced to Platform Admin
- [ ] **Real secrets vault** for OAuth/provider keys (currently DB + env key) (NFR-S-003)
- [ ] **Audit log table** (connect/disconnect, imports, exports, sends, automation activations, admin access), 12-mo retention (NFR-S-004)
- [ ] **GDPR/CCPA** export + delete propagating to vector namespaces (NFR-S-005)
- [ ] **CSV virus scan** + 30-day raw retention (NFR-S-006)
- [ ] **Merge-field injection-safe rendering** (NFR-S-008)
- [ ] **Per-tenant daily message caps + kill switch** (SW-AMK-004)
