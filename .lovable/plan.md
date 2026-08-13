# Fix: vehicle details missing on admin submissions

## What's happening

The admin drawer reads vehicle fields from the saved session, and for recent sessions those fields are blank in the database. Confirmed by querying sessions: the most recent completed-looking session (Aug 13, step 6, price $4,423, contact captured) has `vehicle` stored as `{year: null, make: "", model: "", drivetrain: "", fuelType: ""}` and `additional_details` as `{}`. Sessions before Aug 10 do have vehicle data, so this is a save regression, not a display bug.

Cause: the wizard pushes its **whole** state to the session on every change, including on first mount when the state is still empty. If the page reloads (or the embed mounts a second time) while a session ID is already stored in the browser, that fresh empty state overwrites the previously saved vehicle and details. The step number survives because the server keeps the highest step, and the price survives because it is written by the pricing function — which is exactly the pattern seen in the data.

## The fix

1. **Stop blank overwrites (client)** — before sending an update, drop vehicle / details / coverage objects that contain no real values, so an empty freshly-mounted wizard can never erase saved answers.
2. **Merge instead of replace (server)** — update the session-patch database function so vehicle, details and coverage merge key-by-key and ignore empty incoming values, keeping previously saved answers intact even if a blank update arrives.
3. **Admin drawer resilience** — show a clear "Not captured" placeholder for any missing vehicle field instead of an empty row, so it is obvious whether data is missing versus not yet entered.

Note: vehicle data already lost on past sessions cannot be recovered; the fix applies to sessions going forward.

## Technical notes

- `src/components/quote/QuoteWizard.tsx`: filter the patch payload before calling `patchSession`.
- `src/lib/quoteSession.ts`: add a shared "is this object empty" guard applied in `patchSession`/`flushSession`.
- Migration updating `public.patch_quote_session` to merge `vehicle`, `additional_details` and `coverage` (strip null/empty-string keys from the incoming object, then `||` merge onto the existing value) while keeping all current validation and allowlists.
- `src/components/admin/SubmissionDetailDrawer.tsx`: placeholder rendering in the `Row` helper.
