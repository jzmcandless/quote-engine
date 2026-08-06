# Fix: quote form rejected at the "purchase timeframe" question

## What happened

The form stopped saving the moment the purchase-timeframe question was answered. Every save after that was rejected by the server, and the eligibility check then failed with an error.

Confirmed from the request logs: saves succeeded for make, model, year and mileage, then the first request that included `purchase_timeframe: "Less than 12 months ago"` returned `invalid_input`, and everything after it failed too.

## Root cause

The dropdown option stored in the database question list reads **"Less than 12 months ago"**, but the server's list of accepted answers only allows **"Less than 12 months"** (no "ago"). Two places enforce that shorter list:

- the `patch_quote_session` database function (saving progress)
- `supabase/functions/_shared/validate.ts` (eligibility/pricing calculation)

So the answer the user can actually pick is one the server refuses. A secondary effect: when the save is rejected, the app assumes the session expired and mints a brand-new session, which is why several new sessions appear in a row and the eligibility call returns an error.

## Fix

1. Update the stored option for the `purchase_timeframe` question to "Less than 12 months" so the dropdown matches what the server accepts. This is a one-row data change; no wording change is visible other than dropping the trailing "ago".
2. Accept both spellings server-side so any older saved data and any embedded copy of the widget keep working: add "Less than 12 months ago" as an accepted value in both the database function and the shared validation file, normalising it to "Less than 12 months".
3. Stop the runaway session resets: only mint a new session when the server signals an expired/unknown session, not on every rejected save. A rejected save should surface a single inline error instead of silently restarting the wizard.

## Technical notes

- Migration: update `additional_vehicle_fields.options` for `field_name = 'purchase_timeframe'`, and update the `v_allowed_timeframe` array plus a normalisation step inside `patch_quote_session`.
- `supabase/functions/_shared/validate.ts`: widen `TIMEFRAME` and map the legacy value.
- `src/lib/quoteSession.ts`: narrow the auto-reset path so a validation rejection does not create a new session.
