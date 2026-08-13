# Price Breakdown on the Quote Screen

## The math behind your $2,593

For the 2025 Ford Bronco, PremiumCARE, 6 years / 120,000 km, $0 deductible:

```text
Base price (PremiumCARE, Category A, 6yr/120,000km, $0)   2,288.00
Deductible cost ($0 deductible option)                    +  305.00
Surcharges                                                +    0.00
--------------------------------------------------------------------
Total                                                      2,593.00
```

## A problem this uncovered

The vehicle list only contains **2024** model years — 74 vehicles, and nothing for any other
year. The 2024 Ford Bronco is correctly Category D, but there is no 2025 Bronco record. Because
no matching vehicle was found, the pricing lookup fell back to matching *any* vehicle class and
returned the first row it found, which happened to be Category A (the cheapest tier).

The correct Category D price for that coverage is **$4,423.00** (4,118 + 305) — so the quote
shown was understated by $1,830. Every non-2024 year currently prices this way.

## What to build

**1. Add the missing model years**

Copy the existing 2024 vehicle list to 2025 (same make/model/drivetrain/fuel/class), so a 2025
Bronco resolves to Category D. Years offered in the wizard stay driven by the vehicle table.

**2. Stop guessing the price when the vehicle class is unknown**

When no active vehicle record matches the selected year/make/model/drivetrain/fuel, the pricing
lookup must not fall back to an arbitrary class. Instead, return no price and show a "we need to
confirm pricing for this vehicle" message on the quote step, routing the customer to the
custom-quote contact path already used for ineligible vehicles.

**3. Visible price breakdown on the quote screen**

Replace the single total with an itemized block:

- Base coverage price
- Deductible cost (only when non-zero)
- Each applied surcharge as its own line (timeframe, commercial, snowplow)
- Total, styled as it is today

## Technical notes

- Migration: insert 2025 rows into `vehicles` mirroring the active 2024 rows.
- `supabase/functions/quote-compute/index.ts`: return `basePrice` and `deductibleCost`
  alongside `price` and `surcharges`; when `vehicleClass` is `null`, skip pricing and return a
  `pricing_unavailable` reason rather than querying `coverage_pricing` without the
  `vehicle_class` filter.
- `src/types/quote.ts`: add `basePrice` and `deductibleCost` to the quote state.
- `src/components/quote/StepQuote.tsx`: render the itemized breakdown; handle the
  `pricing_unavailable` state.

