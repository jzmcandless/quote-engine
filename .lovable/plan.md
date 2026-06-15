# Add Contact Info Step Before Quote

Insert a new step between **Coverage** and **Quote** that collects the customer's first name, last name, phone, and email. The same values are then pre-filled into the Customer Information section on the Confirm page so the user doesn't re-enter them.

## New flow

```
1 Vehicle → 2 Details → 3 Eligibility → 4 Coverage → 5 Contact → 6 Quote → 7 Confirm
```

## Changes

**`src/types/quote.ts`**
- Add `ContactInfo { firstName, lastName, phone, email }` interface.
- Add `contact: ContactInfo` to `QuoteState` and `initialQuoteState` (empty strings).

**`src/components/quote/StepContact.tsx`** (new)
- Form with 4 required inputs (first name, last name, phone, email).
- Client-side zod validation: trimmed, length limits, valid email, phone format.
- Continue button disabled until valid; Back returns to Coverage.

**`src/components/quote/QuoteWizard.tsx`**
- Renumber: Quote becomes step 6, Confirm becomes step 7. Insert `StepContact` at step 5.
- Wire contact state and `patchSession({ first_name, last_name, phone, email })` so the contact info is saved to the session as soon as it's entered (admin dashboard sees it earlier).
- Update back/next handlers for renumbered steps.

**`src/components/quote/ProgressBar.tsx`**
- Insert `{ number: 5, label: "Contact" }`, shift Quote→6, Confirm→7.

**`src/components/quote/StepConfirm.tsx`**
- Accept `contact: ContactInfo` prop.
- Initialize the local form's `firstName`, `lastName`, `phone`, `email` from `contact` (still editable in case user wants to correct).
- Keep existing address / province / VIN fields as-is.

**`src/components/quote/StepQuote.tsx`**
- No data changes; only the `onBack` target changes (handled in wizard) to return to Contact (step 5) instead of Coverage.

## Notes

- No DB migration needed — `quote_sessions` already stores `first_name`, `last_name`, `phone`, `email`, and `current_step`.
- Contact data is captured before the price is shown, so abandoned-session sweeps and admin views get customer contact info even if the user drops off at the Quote step.
