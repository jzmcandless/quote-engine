## Plan: Email Notifications for Quote Submissions

### Overview
Add the ability for admins to receive email notifications whenever:
1. An **ineligible** customer submits the custom warranty quote request form
2. An **eligible** customer completes a purchase (final confirm step)

Admins manage a list of notification recipients in the admin dashboard. Notifications are sent to every active recipient using Lovable's built-in email infrastructure.

---

### Prerequisite: Email domain setup
No email sender domain is configured yet. The first step is setting up a sender domain so notifications come from your brand (e.g. `notifications@yourdomain.com`). I'll prompt you to set this up before sending any emails — it's a one-time DNS configuration handled in-app.

---

### Step 1 — Notification recipients table
New table `notification_recipients`:
- `id` (uuid)
- `email` (text, unique, not null)
- `name` (text, optional)
- `active` (boolean, default true)
- `created_at` (timestamptz)

RLS:
- Admins can SELECT/INSERT/UPDATE/DELETE (via `has_role(auth.uid(), 'admin')`)
- No public access

### Step 2 — Admin UI for recipients
Add a new section/tab in `AdminDashboard.tsx` called **"Email Notifications"**:
- Table listing current recipients (email, name, active toggle, delete)
- "Add recipient" form with email + optional name
- Toggle to activate/deactivate without deleting

### Step 3 — Email infrastructure & templates
After domain verification, set up Lovable's email infrastructure and create two app-email templates:

**Template A — `ineligible-quote-request`**
Sent when a non-eligible customer submits the contact form on Step 3.
Includes:
- Customer: first name, last name, email, phone, VIN
- Vehicle: year, make, model
- All additional details captured (mileage, purchase timeframe, drivetrain, fuel type, etc.)

**Template B — `purchase-completed`**
Sent when an eligible customer completes the purchase on Step 6.
Includes:
- Customer: name, address (street, city, province), phone, email, VIN
- Vehicle: year, make, model, drivetrain, fuel type, all additional details
- Coverage: plan name, years, mileage, deductible
- Pricing: total price + any applied surcharges (commercial, snowplow, timeframe)

Both emails sent to **every active recipient** in `notification_recipients` (one send per recipient, looped server-side inside the edge function — this is allowed because each send is triggered by a single user action and goes to people who explicitly opted in to receive these admin notifications).

### Step 4 — Wire up triggers
- **`StepEligibility.tsx`** — after successful `custom_quote_requests` insert, invoke `send-transactional-email` once per active recipient with template `ineligible-quote-request`.
- **`StepConfirm.tsx`** — after successful `custom_quote_requests` insert (the purchase confirmation insert), invoke `send-transactional-email` once per active recipient with template `purchase-completed`.

Both invocations use `idempotencyKey` derived from the request UUID + template name + recipient email to prevent duplicate sends on retry.

### Step 5 — Memory update
Add a memory entry noting the notification recipient system and the two email triggers.

---

### What you'll do
1. Approve this plan
2. Complete the email domain setup dialog (one-time, ~2 min)
3. Add at least one recipient in the admin dashboard
4. Test by submitting an ineligible quote and a completed purchase

### What I'll do
- Create the `notification_recipients` table + RLS
- Build the admin UI for managing recipients
- Set up email infrastructure + both templates
- Wire up both triggers
- Update project memory
