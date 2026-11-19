# Elite Revision: Architecture

> **Stack revised on 2026-11-19 (see [DECISIONS.md](DECISIONS.md), ADR-011 to ADR-017).** The backend is **Node.js + TypeScript + Fastify + Prisma** (SQLite in dev, PostgreSQL in prod), not Laravel. The frontend is a **React PWA**. The module boundaries, database design (section 5), payment flow and security rules below still apply: read "Laravel module" as `backend/src/modules/<module>/`, "Policy" as a policy function, and "Sanctum" as session-cookie auth. The live schema is [backend/prisma/schema.prisma](../backend/prisma/schema.prisma).

## 1. Shape of the system

A **modular monolith**: one Laravel API and one React SPA, deployed together on one VPS.

```
 Browser (React SPA)
     │  HTTPS, same origin: https://elite-revision.com
     ▼
 Nginx ── /            → frontend/dist (static files)
       └─ /api, /sanctum → PHP-FPM → Laravel (backend/public)
                                   │
                    ┌──────────────┼───────────────┬──────────────┐
                PostgreSQL       Redis        Queue workers     Private file storage
                (data)        (cache, queues,  (Supervisor)     (storage/app/private,
                               rate limits)                       served via signed URLs)
                                   │
                  External: M-Pesa Daraja, card gateway, email (SMTP/API), SMS
```

**Same-origin deployment** lets Sanctum use **cookie-based SPA authentication** (HttpOnly session cookie plus CSRF token). Tokens are never stored in `localStorage`, which limits the damage an XSS bug can do. See ADR-003.

## 2. Repository structure

```
LMS/                              (git root)
├── backend/                      Laravel API
│   ├── app/
│   │   ├── Modules/
│   │   │   ├── Identity/         users, roles, permissions, profiles, parent-learner links, consent
│   │   │   ├── Curriculum/       curricula, levels, subjects, units, topics, objectives
│   │   │   ├── Learning/         courses, lessons, sections, resources, enrolments, progress, bookmarks
│   │   │   ├── Assessment/       question banks, questions, assessments, attempts, marking, results
│   │   │   ├── Classroom/        classes, teacher assignments, class membership
│   │   │   ├── Reporting/        analytics queries, progress reports, recommendations, certificates
│   │   │   ├── Billing/          plans, subscriptions, payments, callbacks, invoices, gateways
│   │   │   ├── Communication/    notifications, announcements, support tickets
│   │   │   └── Platform/         settings, audit log, uploads
│   │   │       (each module: Http/Controllers, Http/Requests, Http/Resources, Models,
│   │   │        Policies, Services, Actions, Jobs, Events, Listeners, Notifications, routes.php)
│   │   ├── Support/              shared base classes, traits, value objects
│   │   └── Providers/
│   ├── database/{migrations,seeders,factories}/
│   ├── routes/api.php            mounts each module's routes.php
│   ├── tests/{Feature,Unit}/<Module>/
│   └── .env.example
├── frontend/
│   └── src/
│       ├── app/                  router, providers, query client, auth context
│       ├── components/ui/        Button, Card, Input, Select, Modal, ConfirmDialog, DataTable,
│       │                         EmptyState, Spinner, Badge, Tabs, Toast, ProgressRing …
│       ├── components/forms/     form fields wired to react-hook-form + zod
│       ├── layouts/              PublicLayout, LearnerLayout, ParentLayout, TeacherLayout, AdminLayout
│       ├── features/
│       │   ├── public/  auth/  learner/  parent/  teacher/  admin/
│       │   ├── curriculum/  learning/  exams/  results/  billing/  notifications/
│       ├── lib/api/              typed API client (axios with credentials), one service file per module
│       ├── lib/                  formatting, permissions helpers, constants
│       └── styles/               Tailwind theme (navy / white / gold tokens)
├── deploy/                       nginx.conf, supervisor.conf, crontab, backup.sh, deploy.sh, rollback.sh
└── docs/
```

Rules for modules:
- A module may call another module only through that module's **Services or Actions**, never by reaching into its tables directly. Eloquent relationships across modules are allowed as read paths.
- Authorization lives in **Policies** and route middleware. React hides buttons only for usability, never for security.
- Writes that touch several tables (submitting an attempt, activating a subscription) run inside **database transactions**.

## 3. Key frontend choices

| Concern | Choice |
|---|---|
| Routing | React Router (data routers), role-gated route groups |
| Server state | TanStack Query |
| Forms and validation | react-hook-form + zod; server validation errors are mapped onto fields |
| Charts | Recharts |
| Rich text | TipTap editor. Content is stored as HTML, **sanitized server-side** (HTMLPurifier) on save and rendered without `dangerouslySetInnerHTML` of unsanitized input. |
| Maths | KaTeX for equations in notes and questions |
| Design tokens | `navy-900 #0B1F3A`, `navy-700`, `gold-500 #C9A227`, `gold-400`, white surfaces. Gold on navy for CTAs, checked for WCAG AA contrast. |

## 4. Authentication and authorization

- **Sanctum SPA (cookie) auth.** Login, logout, registration, email verification and password reset are API endpoints. Login and reset routes are rate-limited.
- **Roles:** `super_admin`, `content_editor`, `teacher`, `parent`, `learner`. **Permissions** are fine-grained strings (`curriculum.manage`, `questions.create`, `attempts.mark`, `payments.view` …) attached to roles, with optional per-user overrides. A permission package (spatie/laravel-permission) is used rather than hand-rolling RBAC.
- **Scoped access** is enforced in Policies, beyond role checks:
  - Parent → only learners linked in `parent_learner_links` with `status = active`.
  - Teacher → only classes and subjects in `teacher_assignments`, and learners in those classes.
  - Learner → only their own attempts, progress and results. Course content is limited by enrolment plus subscription entitlement.
- **Account status:** `active`, `suspended`, `deactivated`. Suspended users are rejected at the auth middleware.
- **Audit log:** an observer or explicit service call records sensitive actions (role changes, mark changes, result publication, payment reconciliation, settings edits, child-data access by staff).

## 5. Database design (PostgreSQL)

Conventions: `bigint` identity primary keys, plus a `uuid` public id on rows exposed in URLs (users, attempts, payments, invoices). Timestamps are `timestamptz`. Money is stored as **integer minor units** plus an ISO currency code. Status columns are `varchar` + `CHECK` constraints. Every foreign key is indexed. Soft deletes apply only where restoring data makes sense (content, users).

### 5.1 Identity and access

| Table | Key columns | Notes |
|---|---|---|
| `users` | id, uuid, name, email (unique, nullable for young learners), username (unique), password, status, email_verified_at, last_login_at | One table for every role |
| `roles`, `permissions`, `model_has_roles`, `role_has_permissions`, `model_has_permissions` | spatie schema | Covers `roles` / `permissions` / `user_roles` from the brief |
| `learner_profiles` | user_id (unique), curriculum_id, level_id, date_of_birth (year/month only), school_name (optional), guardian_consent_at | Minimal personal data (ADR-006) |
| `teacher_profiles` | user_id, phone, bio, qualifications | |
| `parent_profiles` | user_id, phone (for M-Pesa), notification_prefs jsonb | |
| `parent_learner_links` | parent_id, learner_id, relationship, status (pending/active/revoked), link_code_hash, verified_at | Unique (parent_id, learner_id) |
| `consents` | user_id, subject_user_id, type (terms, privacy, guardian_data_processing, marketing), version, granted_at, revoked_at, ip | Kenya Data Protection Act evidence trail |

### 5.2 Curriculum: one engine, two structures (ADR-004)

| Table | Key columns | Notes |
|---|---|---|
| `curricula` | id, code (`cambridge`, `cbc`), name, labels jsonb | `labels` maps generic terms to curriculum terms, e.g. CBC `{unit: "Strand", topic: "Sub-strand", objective: "Learning outcome", subject: "Learning area"}` |
| `academic_levels` | id, curriculum_id, parent_id (self), kind (stage / qualification / grade / year), name, code, sort_order | One self-referencing tree: *Upper Primary → Grade 4*, *Key Stage 3 → Year 7*, *IGCSE* (no children). Covers both `academic_levels` and `grades` from the brief without forcing identical depth. |
| `subjects` | id, name, code, slug, icon | Shared catalogue (Mathematics exists once) |
| `curriculum_subjects` | id, curriculum_id, level_id, subject_id, syllabus_code, is_active | A subject offered at a given level |
| `units` | id, curriculum_subject_id, title, code, sort_order, status | CBC: Strand |
| `topics` | id, unit_id, title, description, sort_order, status | CBC: Sub-strand |
| `learning_objectives` | id, topic_id, code, statement, sort_order | CBC: Learning outcome |

### 5.3 Learning

| Table | Key columns | Notes |
|---|---|---|
| `courses` | id, curriculum_subject_id, title, slug, summary, cover_path, status (draft/review/published/archived), published_at | A packaged learning path over the curriculum |
| `lessons` | id, course_id, topic_id, title, sort_order, estimated_minutes, status | |
| `lesson_sections` | id, lesson_id, type (notes / worked_example / diagram / video / revision), title, body_html (sanitized), media_id, sort_order | |
| `learning_resources` | id, owner (topic or lesson, polymorphic), title, file_path, mime, size, disk, is_downloadable, status | Private disk, signed download URLs |
| `lesson_objective` | lesson_id, learning_objective_id | Pivot |
| `enrollments` | id, learner_id, course_id, source (subscription/teacher/admin), status, enrolled_at | Unique (learner_id, course_id) |
| `lesson_progress` | learner_id, lesson_id, status (started/completed), last_section_id, seconds_spent, started_at, completed_at | Unique (learner_id, lesson_id). Powers "resume where you stopped". |
| `bookmarks` | learner_id, lesson_id, section_id | |
| `content_reviews` | reviewable (polymorphic), submitted_by, reviewed_by, decision, comment | Editor → admin approval workflow |

### 5.4 Assessment

| Table | Key columns | Notes |
|---|---|---|
| `question_banks` | id, curriculum_subject_id, name, owner_id | |
| `questions` | id, question_bank_id, topic_id, type (mcq, true_false, fill_blank, short_answer, long_answer, essay, matching, multi_select), stem_html, instructions, marks, difficulty, explanation_html, answer_key jsonb, version, status | `answer_key` holds blanks or matching pairs. It is **never serialized to learners** before results are released. |
| `question_options` | id, question_id, label_html, is_correct, match_key, sort_order | |
| `marking_schemes` | id, question_id, criteria jsonb (point → marks), guidance_html | For written answers |
| `assessments` | id, curriculum_subject_id, type (topic_quiz, practice, unit, mock, exam_practice, timed_exam), title, instructions, duration_minutes, pass_mark_pct, max_attempts, shuffle_questions, random_pick_count, opens_at, closes_at, results_release (immediate / after_close / manual), status, created_by | |
| `assessment_questions` | assessment_id, question_id, sort_order, marks_override | Fixed questions, or a pool for random selection |
| `assessment_audiences` | assessment_id, class_id or course_id | Who may sit it |
| `assessment_attempts` | id, uuid, assessment_id, learner_id, attempt_no, status (in_progress / submitted / auto_marked / marking / marked / released), started_at, deadline_at, submitted_at, question_order jsonb, lock_version | Unique (assessment_id, learner_id, attempt_no). `deadline_at` is fixed server-side when the attempt starts. |
| `learner_answers` | attempt_id, question_id, response jsonb, auto_score, manual_score, final_score, feedback, marked_by, marked_at | Unique (attempt_id, question_id), so autosave is an idempotent upsert |
| `assessment_results` | attempt_id (unique), score, max_score, percentage, passed, released_at, released_by | |
| `topic_performance` (materialized/summary) | learner_id, topic_id, attempts, avg_pct, last_pct, updated_at | Rebuilt by a queued job after marking. Feeds recommendations. |

Integrity rules: submission is a single transaction that checks `status = in_progress` with a row lock, so a duplicate submit is a no-op. Answers received after `deadline_at` plus a small grace period are rejected, and an expired attempt is auto-submitted by a scheduled job. Correct answers and explanations are filtered out by API Resources unless the attempt's result is released.

### 5.5 Classroom

| Table | Key columns |
|---|---|
| `classes` | id, name, curriculum_id, level_id, academic_year, school_name |
| `class_learners` | class_id, learner_id |
| `teacher_assignments` | teacher_id, class_id, curriculum_subject_id, permissions jsonb (e.g. may_create_assessments) |

### 5.6 Billing (ADR-007)

| Table | Key columns | Notes |
|---|---|---|
| `subscription_plans` | id, name, slug, description, price_minor, currency, billing_period (monthly/termly/annual), trial_days, features jsonb, max_learners, is_active | |
| `plan_entitlements` | plan_id, curriculum_subject_id or course_id or curriculum_id | Included content |
| `subscriptions` | id, payer_id (parent or learner), plan_id, status (trialing/active/past_due/expired/cancelled), current_period_start, current_period_end, cancel_at_period_end | **Separate from payments** |
| `subscription_learners` | subscription_id, learner_id | One family plan can cover several children |
| `payments` | id, uuid, subscription_id, payer_id, provider (mpesa/card), amount_minor, currency, status (pending/succeeded/failed/cancelled/refunded), merchant_reference (unique), provider_reference (unique per provider, nullable), phone_masked, failure_reason, verified_at | Never stores PINs, card numbers or CVV |
| `payment_callbacks` | id, provider, idempotency_key (unique), payment_id, payload jsonb (sensitive fields redacted), signature_valid, processed_at, received_ip | Duplicate callbacks hit the unique key and are ignored |
| `invoices` | id, uuid, number (unique, sequential), payment_id, subscription_id, amount_minor, currency, issued_at, pdf_path | Receipts |
| `reconciliation_runs` | id, provider, period, matched, unmatched, report jsonb | |

Payment flow: initiate → `payments.pending` → provider callback stored raw in `payment_callbacks` → queued job **re-verifies with the provider** (M-Pesa STK Push Query, or the card gateway's verify-transaction API) → in one transaction: payment `succeeded` + subscription period extended + invoice issued → notification. The frontend's "success" message never activates anything.

### 5.7 Communication and platform

| Table | Notes |
|---|---|
| `notifications` | Laravel's standard table (uuid, notifiable, type, data jsonb, read_at). Channels are pluggable: database, mail, SMS. |
| `notification_preferences` | user_id, type, channel, enabled |
| `announcements` | title, body_html, audience (roles / curriculum / class), published_at, expires_at |
| `support_tickets`, `support_ticket_messages` | requester, subject, status, priority, assignee |
| `progress_reports` | learner_id, period, generated_by, file_path, data jsonb |
| `certificates` | uuid, learner_id, course_id, issued_at, verification_code (unique) |
| `audit_logs` | actor_id, action, auditable (polymorphic), old_values jsonb, new_values jsonb (secrets redacted), ip, user_agent, created_at. Append-only. |
| `system_settings` | key (unique), value jsonb, is_public |
| `media` / `uploads` | disk, path, mime (sniffed from content), size, checksum, uploaded_by |

## 6. Cross-cutting concerns

- **Validation:** Form Request classes on every write endpoint.
- **API shape:** `/api/v1/...`, JSON:API-like Resources, standard error envelope, cursor or page pagination.
- **Queues:** marking aggregation, notification fan-out, payment verification, report PDFs, subscription expiry sweeps.
- **Scheduler:** expire subscriptions, renewal reminders, auto-submit expired attempts, nightly reconciliation, backups.
- **Logging:** structured JSON logs with redaction of phone numbers, emails and payment payloads.
- **Testing:** Pest or PHPUnit feature tests per module against a real PostgreSQL test database. Vitest + Testing Library for components. Playwright for critical end-to-end flows and mobile viewports.
