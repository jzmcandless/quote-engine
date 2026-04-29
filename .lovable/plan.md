## Plan: Submissions Tracking

### Locked-in rules
- Partial = no activity for 30 minutes → marked `abandoned`
- Contact info saved live (on field blur) as user types
- Abandoned sessions auto-purged after 365 days
- Abandon notifications sent to existing notification recipients (queued; deliver once email sending is enabled)

### Database (migration)
Create `quote_sessions`:
- `id` uuid PK
- `session_id` text unique (client-generated, stored in localStorage)
- `status` text: `in_progress` | `abandoned` | `completed_purchase` | `completed_custom_request` | `completed_ineligible`
- `current_step` int
- `vehicle` jsonb, `additional_details` jsonb, `coverage` jsonb, `vehicle_class` text
- `is_eligible` bool, `ineligible_message` text
- `price` numeric, `surcharges` jsonb
- `first_name`, `last_name`, `email`, `phone` text (live-saved)
- `user_agent`, `referrer` text
- `created_at`, `updated_at`, `last_activity_at` timestamptz
- `abandoned_notified_at` timestamptz (null until abandon notification queued)

RLS:
- Public INSERT (anyone can start a session)
- Public UPDATE only WHERE `session_id = current_setting` matches (use a security-definer RPC `upsert_quote_session(session_id, patch jsonb)` so clients can't read/modify other rows)
- SELECT restricted to `has_role(auth.uid(),'admin')`
- DELETE admin only

Index on `status`, `last_activity_at`, `email`.

Trigger: `update_updated_at_column` on UPDATE.

### Wizard instrumentation
- New `src/lib/quoteSession.ts`: getOrCreate `session_id` in localStorage, `patchSession(patch)` calling RPC, `heartbeat()` updating `last_activity_at`, `markCompleted(status)`.
- `QuoteWizard.tsx`: on mount initialize session row; on every `setState` debounce-patch the changed fields + `current_step`; 60s heartbeat with `visibilitychange` pause.
- `StepDetails.tsx`: live-save name/email/phone on blur.
- `StepQuote.tsx` (custom request submit) → `markCompleted('completed_custom_request')`.
- `StepConfirm.tsx` (purchase) → `markCompleted('completed_purchase')`.
- `StepEligibility.tsx` ineligible result → `markCompleted('completed_ineligible')`.

### Background sweep (Edge Function + cron)
- `supabase/functions/sweep-abandoned-sessions/index.ts`: marks `in_progress` rows with `last_activity_at < now() - 30 min` as `abandoned`, then for each newly-abandoned row with an email and `abandoned_notified_at IS NULL`, enqueues an email to active `notification_recipients` (reuses email queue once enabled; safe to call when not enabled — logs and continues), and sets `abandoned_notified_at`.
- 365-day purge: same function deletes `abandoned` rows older than 365 days.
- pg_cron: run every 5 minutes (insert into cron via insert tool).

### Admin dashboard — Submissions tab
New `src/components/admin/SubmissionsTable.tsx`:
- Filters: All / In Progress / Abandoned / Purchased / Custom Request / Ineligible
- Search by email/name/vehicle
- Columns: Date, Status badge, Name, Email, Vehicle, Step reached, Price, Last activity
- Row click → drawer (`SubmissionDetailDrawer.tsx`) showing full vehicle, details, coverage, price/surcharges, contact, timestamps, user agent, referrer
- "Export CSV" button for current filter
- Realtime subscription on `quote_sessions` so new submissions appear live

Add "Submissions" tab to `AdminDashboard.tsx` Tabs (alongside CSV Import, Email Notifications).

### Files
**New**
- `src/lib/quoteSession.ts`
- `src/components/admin/SubmissionsTable.tsx`
- `src/components/admin/SubmissionDetailDrawer.tsx`
- `supabase/functions/sweep-abandoned-sessions/index.ts`

**Edited**
- `src/components/quote/QuoteWizard.tsx`
- `src/components/quote/StepDetails.tsx`
- `src/components/quote/StepEligibility.tsx`
- `src/components/quote/StepQuote.tsx`
- `src/components/quote/StepConfirm.tsx`
- `src/pages/AdminDashboard.tsx`

**Migrations**
- Create `quote_sessions` table + RLS + indexes + `upsert_quote_session` RPC
- Schedule `sweep-abandoned-sessions` via pg_cron every 5 min

Approve and I'll implement.