## Add "Check a different vehicle's eligibility" button

On step 3 (`StepEligibility.tsx`), in the **ineligible** state (both before and after custom-request submission), add a new button directly under "Submit Request" (or under "Start Over" on the submitted screen) labeled **"Check a different vehicle's eligibility"**.

### Behavior
- Clicking it clears the current quote session and starts fresh at step 1 — same behavior as the existing `restart` handler in `QuoteWizard.tsx` (calls `clearSessionId()`, resets state to `initialQuoteState`, then `initSession()` mints a new session).
- To wire this without duplicating logic, pass the existing `restart` function down as an `onRestart` prop to `StepEligibility` (mirrors how `StepQuote` and `StepConfirm` already receive it).

### Files
- `src/components/quote/QuoteWizard.tsx` — pass `onRestart={restart}` into `<StepEligibility …/>`.
- `src/components/quote/StepEligibility.tsx` — accept `onRestart` prop; render a secondary `Button` (variant `outline`, full width, `size="lg"`) under the Submit Request button in the ineligible form view, and also under the "Start Over" button in the submitted confirmation view. Label: "Check a different vehicle's eligibility".

No other steps, no styling system changes, no backend changes.
