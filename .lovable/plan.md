# Online payment: pay in full or pay over time with Klarna

## What the customer will see
After the quote is confirmed (the current Confirm page), the "Submit" button becomes **"Continue to Payment"**. On a secure Stripe payment page, the customer picks how to pay:
- **Pay in full**: credit/debit card, Apple Pay or Google Pay
- **Pay over time**: Klarna (Pay in 4 or monthly financing, depending on the amount and whether Klarna approves the customer)

Either way, the business gets the full warranty price up front. Klarna collects the installments from the customer.

After paying, the customer comes back to a "Payment Successful" screen with an order reference. If they cancel, they return to the Confirm page and nothing is lost.

## What staff will see
- Submissions in the admin area show payment status (Awaiting payment / Paid / Failed), how they paid (card or Klarna) and the payment reference.
- The "Purchase Completed" email goes out only after payment succeeds, and includes the payment details.

## Setup steps
1. Turn on Lovable's built-in Stripe payments. No Stripe account is needed to start, and a test mode is ready right away. To take real payments later, you claim the Stripe account.
2. Taxes: Stripe works out and collects the right Canadian GST/HST/PST at checkout (+0.5% per payment). You handle filing.
3. Klarna is turned on in Stripe's payment settings. Klarna is available for Canadian businesses charging in CAD.

## Technical details
- Enable with `enable_stripe_payments`. Checkout sessions use `automatic_tax`, currency CAD, and `payment_method_types` card + klarna (wallets come through card).
- New edge function `create-checkout`: checks the session write_token and charges the **server-stored** `quote_sessions.price` (the client never sends the price). It creates a Checkout Session using price_data with that amount and stores `stripe_checkout_id`.
- New `stripe-webhook`: on `checkout.session.completed` / `async_payment_succeeded`, marks the quote_session `paid`, saves the payment method type and payment intent ID, and runs `notifyStaff` (purchase-submitted). On failure it marks the session `payment_failed`.
- Migration: add `payment_status`, `payment_method`, `stripe_checkout_id`, `stripe_payment_intent_id`, `paid_at` to quote_sessions.
- StepConfirm: saves the contact and address details through quote-submit (kind "purchase_pending"), then redirects to the Checkout URL. It redirects the top window so it works inside the Webflow embed. Return URLs come back with `?payment=success|cancel`, and QuoteWizard shows the right screen.
- Admin SubmissionDetailDrawer and SubmissionsTable get a payment status column and details.
