Update the final step of the quote wizard so it behaves as a quote submission rather than a purchase flow.

### Changes
- File: `src/components/quote/StepConfirm.tsx`
  - Remove the entire "Payment Details" placeholder section (card number, expiry, CVV inputs).
  - Change the primary action button text from "Complete Purchase" to "Submit".
  - Remove the `CreditCard` icon from the primary button.

### Verification
- Run the existing test suite to ensure no regressions.
- Manually review the final step to confirm the payment section is gone and the button reads "Submit".

No database, backend, or other steps will be changed.