# Warranty Care Portal - Implementation Tracker

## 🏗️ Technical Architecture Analysis (Current State)
* **Framework:** Next.js 16+ (App Router, Turbopack) with React 19.
* **Database:** Supabase PostgreSQL managed via Prisma 7.
* **Authentication:** Custom JWT/Context-based role system (ADMIN, STAFF, HOMEOWNER).
* **AI & Chat Integration:** Integrated Botpress Webchat dynamically via client-side script injection and iframe containers, replacing local LLM servers.
* **ERP Integration:** `erp-service.ts` features a production-ready HTTP Fetch client for Builtopia with Bearer token authentication, fully replacing the mock timeout simulations.

---

## ✅ Phase 0: Foundation (Complete)
- [x] **Database Schema**: Supabase + Prisma 7 with User, Company, Ticket, AgentConfig, and KB models.
- [x] **Authentication**: Secure login/signup system with role-based access.
- [x] **Ticket Dashboard (FR-10)**: Real-time KPI cards and recent tickets list.
- [x] **Ticket Management (FR-07)**: Full list view and individual ticket detail view.
- [x] **Company Configuration (FR-14)**: UI and API for managing builder profile and warranty policy.
- [x] **Agent Configuration (FR-12)**: Deprecated/removed local `/agent-config` admin panels and API endpoints. AI prompts, greeting parameters, and escalation flows are now fully offloaded to **Botpress Studio** in the cloud.
- [x] **Knowledge Base Management (FR-13)**: Document tracking system.
- [x] **ERP/CRM Connectors (FR-06/FR-11)**: Implemented robust REST `fetch` client in `erp-service.ts` for Builtopia integration.
- [x] **Advanced Ticket Filters (SRS 4.3.1)**: Add date range and specific property filters to the Warranty Ticket Dashboard.

---

## 🚧 Phase 1: Core Intelligence & Handoff Integration (Complete)
- [x] **Homeowner Property Support (FR-18)**: Refactored schema to support multiple properties per user.
- [x] **Warranty Year Logic (FR-02)**: Automated Year 1/2/10 calculation based on Property COE Date.
- [x] **Embedded Inline Chat Screen (FR-17/FR-18)**: Integrated Botpress Webchat v3.6 in embedded/inline mode using container ID `bp-embedded-webchat`. Formatted to automatically open on load, constrained within a centered responsive container (`max-w-4xl`), and cleaned up all floating bubble widgets.
- [x] **DIY Guidance Engine (FR-05)**: Offloaded to Botpress Studio; step-by-step instructions are provided natively during the chat experience.
- [x] **Emergency Detection (FR-03)**: Offloaded to Botpress Studio; life-safety issues are flagged automatically by Botpress and sent to the escalation webhook.
- [x] **Human Escalation Handoff (FR-09)**: Displays the full handoff context (including chat summary and specific issue details) extracted by Botpress and received via integration webhooks.
- [x] **Conversation Transcript Storage (FR-17)**: Preserved conversational data models and ticket links to support external webhook integrations.
- [x] **Detailed KPI Reporting (FR-15)**: Real-time resolution time, weekly trends, and token consumption analytics.
- [x] **Status Notifications (FR-16)**: Integrated Brevo for automated email updates on ticket status changes.
- [x] **Secure Password Recovery**: Implemented stateless client-side OTP validation flow using Brevo to protect resources without database persistence.
- [x] **Botpress Ticket Escalation**: Created dedicated secure webhook integration API to receive Botpress escalations and conversation transcripts.
- [x] **Dynamic ERP Integrations**: Created a 3-card Admin management dashboard to save credentials directly to DB rather than `.env`.
- [x] **Role-Based Access Control (RBAC)**: Enforced strict role-based scopes (Admin, Staff, Homeowner) in backend APIs (Tickets, Dashboard, Company, Config, KB) and custom homeowner-focused dashboard client UI.
- [x] **Property Management Hub**: Implemented a comprehensive property management dashboard including a role-scoped client page (`/properties`), dynamic backend APIs (`/api/properties`), search filters, and an interactive property creation modal.
- [x] **Anti-Litigation Guardrails (FR-08)**: Handled via Botpress system prompt constraints and portal-synced Agent Configurations.
- [x] **Issue Diagnosis Repair Groups (FR-04)**: Handled natively within the Botpress agent workflows based on David Dell IP logic.
- [x] **KB Document Utilization Display (SRS 4.3.4)**: Update the ticket or conversation view to show which knowledge base documents were referenced by the agent.

---

## 🔮 Phase 2: Botpress-Driven Multi-Agent System (Integration & APIs)
- [x] **Agent Action Webhooks**: Removed local endpoints (Diagnostics, ERP/Builtopia lookup, Policy validation) as all diagnostics/actions are handled natively by Botpress backend.
- [x] **Botpress Orchestration Sync**: Support multi-turn routing and handoffs driven entirely within the Botpress agent workflows.
- [x] **Webchat Integration Env Variables**: Stored v3.6 integration scripts (`NEXT_PUBLIC_BOTPRESS_INJECT_URL` and `NEXT_PUBLIC_BOTPRESS_CONFIG_URL`) inside `.env` and loaded them dynamically with React lifecycle unmount cleanups.
- [x] **Obsolete UI Cleanup**: Removed the unused local `/agent-config` admin pages, routes, API endpoints, and sidebar layout link references.
- [x] **Human-in-the-Loop Approval**: Create a dashboard interface for staff to approve/edit draft responses compiled by Botpress agents before sending.
- [x] **Token & Cost Monitoring**: Managed and monitored directly within Botpress backend analytics platforms (no local implementation required).
- [x] **Agent Traceability**: Tracked and logged directly in Botpress backend conversation logs.
- [x] **MAS Trigger Routing Configuration**: Configured and executed directly within Botpress workflow orchestrator.
- [x] **Reviewer Agent Toggle**: Orchestrated directly inside Botpress workspace settings.
- [x] **Dynamic User KB Mapping**: Add `knowledgeBaseId` field to User and Company models.
- [x] **Shared/Common Knowledge Base Files**: Support uploading and tagging documents as "Shared/Common" (all communities) via UI and bulk ZIP uploads.

---

## 🛠️ Testing & Workflow
### Current Workflow
1. **Admin Setup**: Configure Company, Integrations, and Knowledge Base.
2. **Homeowner Claim**: User chats with AI -> AI checks Property COE -> AI injects KB -> AI provides DIY -> If unresolved/emergency, AI automatically generates Ticket + links Conversation.
3. **Staff Action**: Review tickets + transcript in Dashboard -> Update status -> Brevo emails Homeowner -> Syncs to ERP.

### Testing Plan
- [x] **Database Connectivity**: Verified Prisma schema sync and User authentication hashing.
- [x] **AI Intelligence Flow**: Verified Botpress integration webhooks and database persistence.
- [ ] **Multi-Property**: Verify tickets link to correct property when homeowner has multiple.
- [ ] **Integration**: Test full loop of Builtopia sync status via external webhook.
- [ ] **Notifications**: Verify Brevo email delivery on status change.

---

## 📅 Upcoming Features (Backlog)
- [x] **AI Assistant Embed & Multi-Tenancy Architecture**
  - [x] Create script embed option so users can integrate the AI assistant into their own websites.
  - [x] **Dynamic Widget Generation**: Modify embed script to automatically inject the specific builder's `companyId` into the Botpress `userData` payload.

---

## 🚀 Sales Workspace Extension (SRS v1.1)

### 🏗️ Planned Architecture Additions
* **Workflow Orchestration:** Inngest (durable execution for CRM syncs, campaigns, CSV imports, sequences, AI agents).
* **CRM Connector Interface:** Pluggable connector architecture starting with Salesforce v1 (REST + Bulk API 2.0).
* **Conversational AI Agent Runtime:** Swappable engine abstraction (Inngest + Claude native tool-calling vs. Botpress).
* **Database & Vector Isolation:** Scoped schemas/tables and Pinecone/Weaviate namespaces to isolate Sales from Warranty.

### 📅 Phase 3: Workspace Hub & Lead Foundation (Core Coexistence)
- [x] **Workspace Selection & Routing (HUB-001, HUB-002, HUB-005, HUB-006)**: Create a `/hub` selector page after login, persistent switcher inside global shell navigation, distinct route prefixes (`/warranty/...` and `/sales/...`), and default last-workspace memory.
- [x] **Context Isolation & Deployability (HUB-003, HUB-004, HUB-007, HUB-008, HUB-009)**: Add database-level scoping, tagged notifications, no Warranty logic regression, and per-tenant Sales workspace feature flag gating.
- [x] **Lead Data Model (SW-LEAD-001 - SW-LEAD-006)**: Add PostgreSQL schemas for canonical `Lead`, custom fields, dynamic `LeadSegment`, and `LeadTimeline` (activity logger).
- [x] **CSV Import Pipeline (SW-CSV-001 - SW-CSV-006)**: Set up CSV parser, column mapping UI, data validation/preview screen, asynchronous Inngest execution, homeowner rate limits (500 leads), and consent attestation requirement.
- [x] **Sales Dashboard (SW-DSH-001 - SW-DSH-002)**: Build initial dashboard displaying lead statistics, sync status, and exportable CSV reporting views.

### 📅 Phase 4: Integrations, Nurturing & Compliance
- [ ] **Salesforce v1 Connector (SW-CRM-001 - SW-CRM-009)**: Implement OAuth 2.0 connection management, field mapping config UI, Bulk API initial import, incremental sync cron jobs (Inngest), write-back logs, and consent mapping.
- [ ] **Central Compliance Layer (SW-NUR-006, NFR-S-005)**: Build centralized checks for SMS quiet hours, opt-in/opt-out status, suppression lists, and auto STOP/HELP handler hook.
- [ ] **Lead Nurturing Sequences (SW-NUR-001 - SW-NUR-008)**: Develop sequence builder (1-50 steps, delay logic, send windows), automated enrollment triggers, webhook reply detection, AI content assist UI, and sequence analytics.

### 📅 Phase 5: Announcements, Calendar & Appointment Scheduling
- [ ] **Builder Announcements (SW-ANN-001 - SW-ANN-007)**: Build announcement authoring UI, multi-channel batch delivery engine (email/SMS, chunking, throttling, automatic retry, DLQ), and geo-targeting logic.
- [ ] **Content Calendar (SW-CAL-001 - SW-CAL-005)**: Implement calendar views (month, week, list) showing scheduled announcements, blog posts, and campaigns with drag-and-drop rescheduling.
- [ ] **Appointment Scheduling - Simple Mode (SW-APT-001 - SW-APT-005, SW-APT-007)**: Set up user availability configuration (hours, buffer times, time zone) and link-based booking flow with double-booking prevention.

### 📅 Phase 6: Advanced AI Agents & Automations
- [ ] **Conversational AI Booking Agent (SW-APT-002 - SW-APT-006)**: Build Next.js / Inngest / Claude-driven tool-calling scheduling agent responding to inbound emails/SMS, proposing slots, and handling counter-proposals with a 4-turn human escalation threshold.
- [ ] **News Scraping Agent (SW-NEWS-001 - SW-NEWS-006)**: Create RSS/Atom web scraper with daily collection schedules, AI deduplication/summarization, and compliance logic.
- [ ] **Blog Post Drafting Pipeline (SW-BLOG-001 - SW-BLOG-006)**: Set up LLM blog generator using scraped news feed, rich-text editor for manual review, and export/publishing endpoints.
- [ ] **Campaign Automation Rules (SW-AMK-001 - SW-AMK-005)**: Implement trigger-condition-action workflow engine, drag-and-drop builder with validation, rate limits, and loop-prevention cooldowns.
- [ ] **Sales Agent Knowledge Base (SW-KB-001 - SW-KB-007)**: Support drag-and-drop PDF/DOCX indexing to Sales namespace in Pinecone/Weaviate (RAG), category tagging, citation visibility, and company voice profile injection.
