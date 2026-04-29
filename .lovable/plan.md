## Email Notifications Preview & Editor

Add an "Email Notifications" section to the Admin Dashboard so you can manage who gets notified and preview/edit the email content — without wiring up actual sending yet.

### What you'll get

In `/admin`, the dashboard will be reorganized into tabs:
- **Overview** — existing stats
- **CSV Import** — existing importer
- **Email Notifications** — new

The Email Notifications tab has two parts:

1. **Recipients** — list, add, pause/resume, and remove recipients (uses the existing `notification_recipients` table).
2. **Templates** — sub-tabs for each notification (Ineligible Quote Request, Purchase Completed) with:
   - Editable **Subject**, **Heading**, **Intro paragraph**, **Footer**
   - `{{firstName}}` / `{{lastName}}` token support
   - **Live preview** on the right showing the email styled exactly how it will send (DM Sans / Inter, teal accents, white body), populated with realistic sample customer/vehicle/coverage data
   - **Save** / **Reset to default** buttons

The data sections under the intro (Customer, Vehicle, Coverage, Pricing) are rendered automatically from real submission data and aren't editable — keeps the editing surface safe and prevents broken emails.

### Storage approach

Template edits are persisted to **localStorage** in this iteration. When we wire up actual email sending later, we'll move the source of truth into the database so the edge function reads the same content. Defaults live in code so the editor always has a baseline.

### Files to create
- `src/lib/emailTemplates.ts` — types, default content, load/save/reset, token interpolation
- `src/lib/emailSampleData.ts` — sample payloads for each template's preview
- `src/components/admin/EmailPreview.tsx` — brand-styled email render
- `src/components/admin/NotificationsRecipients.tsx` — recipients CRUD UI
- `src/components/admin/EmailTemplateEditor.tsx` — editor + live preview

### Files to edit
- `src/pages/AdminDashboard.tsx` — wrap content in `Tabs`, add Email Notifications tab

### Out of scope (for the next round)
- DNS / sender domain setup
- Actual email sending (`send-transactional-email` edge function)
- Wiring triggers in `StepEligibility` / `StepConfirm`
- Moving template storage from localStorage to a DB table
