## Add inline VIN validation error on Confirm step

Add client-side VIN format validation to `src/components/quote/StepConfirm.tsx` that mirrors the server rule (`/^[A-HJ-NPR-Z0-9]{11,17}$/i` — 11–17 chars, letters/digits, excluding I, O, Q).

**Behavior**
- Track a `vinError` string derived from `form.vin`.
- Show the error inline directly below the VIN input in `text-destructive text-xs` styling, only after the user has typed something or blurred the field (to avoid nagging on empty initial state).
- Error messages:
  - Empty on blur → no inline message (the required `*` already covers this; submit button stays disabled).
  - Wrong length (not 11–17 chars) → "VIN must be 11–17 characters."
  - Invalid characters (contains I, O, Q, or non-alphanumerics) → "VIN contains invalid characters (letters I, O, Q are not allowed)."
- Apply `aria-invalid` and a `border-destructive` class to the input when invalid.
- Include VIN validity in the `requiredFilled` check so Submit stays disabled until VIN is valid.
- Normalize to uppercase on change for user convenience (server regex is case-insensitive, but VINs are canonically uppercase).

No server, schema, or other step changes.