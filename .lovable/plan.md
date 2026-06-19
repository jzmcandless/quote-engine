# Staff Email Notifications

Send staff emails for three quote-flow events, with admin-managed recipient list, using sender domain `notifications.larkspurcreative.ca`.

## 1. Sender domain setup (prerequisite)

The subdomain `notifications.larkspurcreative.ca` isn't configured yet. First step is the email setup dialog, where you'll add it and we'll give you NS records to paste at your DNS provider. Scaffolding and code can continue immediately after the domain is added — DNS verification can finish in the background (up to ~72h, usually much faster).

## 2. Email infrastructure & template

- Run email infrastructure setup (queue, send log, suppression, cron worker).
- Scaffold the transactional email sender (`send-transactional-email` edge function + shared templates folder).
- Create one branded React Email template `staff-notification.tsx` with a `variant` prop:
  - `custom_quote` — ineligible vehicle, customer requested a custom quote
  - `contact_captured` — customer submitted contact info to view price
  - `quote_confirmed` — customer confirmed the quote
- Template renders customer info, vehicle summary, coverage + price (where applicable), session ID, and a link to the admin submission.

## 3. Fan-out edge function: `notify-staff`

- Reads active rows from existing `notification_recipients` table.
- For each recipient, invokes `send-transactional-email` once with a stable `idempotencyKey` of `staff-{event}-{sessionId}-{recipientEmail}` (per platform rule: one send per recipient).
- Zod-validated input: `event`, `sessionId`, plus event-specific payload.

## 4. Wire triggers (non-blocking, client-side invokes)

- `StepEligibility.tsx` — on custom-quote submit (ineligible path) → `event: "custom_quote"`
- `StepContact.tsx` — on successful contact submit → `event: "contact_captured"`
- `StepConfirm.tsx` — on confirm submit (after insert) → `event: "quote_confirmed"`

Failures are swallowed with a console log so the wizard never breaks if email is down.

## 5. Admin

Existing `/admin` → Notification Recipients UI already supports add/edit/toggle-active for multiple emails — no changes needed.

## Technical notes

- Sender: `notifications@notifications.larkspurcreative.ca`; From display can use root `larkspurcreative.ca`.
- Recipients table already has RLS; `notify-staff` uses service role to read it.
- No customer-facing emails in this change — staff only.
