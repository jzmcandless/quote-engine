# Wire up staff notification emails

## Why no email arrived

Nothing in the app actually sends email yet. What exists today is only the *management* side:

- The recipient list table and its admin screen (currently holds one active recipient: jessica@larkspurcreative.ca)
- The template preview/editor screen (stores edits in the browser, not on the server)

There is no sending function, no email queue, and no code in the quote flow that triggers a send. So the form submitting successfully and no email arriving is expected behaviour right now.

One additional blocker: the sender domain `notify.notifications.larkspurcreative.ca` is verified at the domain level, but this project's email setup reports "verification timed out". That needs re-running before any mail can leave the app.

## What to build

### 1. Re-activate the sender domain
Re-run the project's email setup for the existing domain so sending is active again. If it fails, the fix is a re-verify from Cloud → Emails; no new DNS records should be needed since the delegation is already in place.

### 2. Email infrastructure
Install the standard email sending infrastructure (send queue, send log, suppression list, unsubscribe handling, queue worker), then scaffold the send function.

### 3. Three notification templates
Brand-styled to match the quote wizard (teal, DM Sans/Inter):

- **Ineligible — custom quote requested**: full vehicle details (year/make/model/drivetrain/fuel, mileage, purchase timeframe, commercial use, snowplow), the ineligibility reason, and the contact's name/email/phone plus any message.
- **Contact captured (quote viewed)**: vehicle details, the computed price and coverage selection, and the contact's name/email/phone.
- **Purchase submitted**: everything above — vehicle, all additional details, selected plan/term/mileage/deductible, final price and any surcharges, and full contact info.

### 4. Trigger the sends
Send from the server, not the browser, so the recipient list can't be tampered with:

- `quote-submit` already receives the final submission — add sending there for the ineligible-custom-request and purchase-submitted cases.
- Add a small notification path for the contact-captured event when the contact step is saved.

Each send reads the active rows from the recipient list and issues one send per recipient (the queue only retries individually queued sends), using an idempotency key built from the quote session id plus the event name so retries don't duplicate.

### 5. Admin visibility
The existing template editor keeps its edits in browser storage only, so previews there won't match what actually goes out. Point it at the real server templates so the preview reflects the live email, and leave the recipient list screen as-is.

## Technical notes

- Templates live as React Email components under `supabase/functions/_shared/transactional-email-templates/` and are registered in that folder's registry.
- Recipient fan-out happens in the edge functions using the service role, reading `notification_recipients` where `active = true`.
- Trigger points: `supabase/functions/quote-submit/index.ts` (ineligible + purchase), plus a contact-captured hook wired from the contact step through an edge call.
- Edge functions must be deployed after template or registry changes.
- Delivery can be confirmed afterwards from the email send log.

## Verification

After deploy: run one ineligible request and one full purchase through the wizard, then confirm both the recipient inbox and the send log show the messages.
