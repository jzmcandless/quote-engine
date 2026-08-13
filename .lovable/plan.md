# Move the Price Breakdown to Admin Only

## What changes

**Customer quote screen**
- Remove the itemized "Price Breakdown" block (base price, deductible cost, surcharge lines). The customer sees only the total price and their coverage summary, as before the breakdown was added.
- The "we can't confirm pricing online" custom-request path stays exactly as it is.

**Admin submission detail**
- The Quote section of a submission gains a full breakdown:
  - Vehicle category (e.g. Category D) shown in the Quote section as well as the Vehicle section
  - Base coverage price
  - Deductible cost
  - Each applied surcharge as its own line (commercial use, snowplow, timeframe)
  - Total price

## Why a database change is needed

Submissions currently store only the final total price, the surcharge list, and the vehicle class. The base price and deductible cost are computed but never saved, so the admin view has nothing to itemize. Two new fields will be stored on each quote session when pricing is computed.

## Technical notes

- Migration: add `base_price` and `deductible_cost` (numeric, nullable) to `quote_sessions`; extend `apply_quote_computation` to accept and write both.
- `supabase/functions/quote-compute/index.ts`: pass the already-computed base price and deductible cost into `apply_quote_computation`.
- `src/components/quote/StepQuote.tsx`: delete the breakdown block and its `showBreakdown` logic. `basePrice`/`deductibleCost` stay in state (harmless, still returned by the function) — no type changes needed.
- `src/components/admin/SubmissionDetailDrawer.tsx`: extend the `QuoteSession` interface with the two new fields and render the itemized Quote section including vehicle category.
