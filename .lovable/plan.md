# Seed 25 Sample Quote Submissions

Create 25 realistic quote submissions in the admin Submissions list, each with a full, correct price breakdown, then report the breakdowns back in chat.

## What gets created

25 rows in the quote sessions table, marked as completed submissions, each with:
- Contact info (clearly fake sample names/emails so they are easy to spot and delete later)
- Vehicle (year, make, model, drivetrain, fuel) picked from real vehicles already in the database
- Additional details: current mileage, purchase timeframe, commercial use, snowplow
- Coverage: plan, years, mileage plan, deductible
- Stored pricing: vehicle category, base price, deductible cost, surcharges, total

## Coverage of the requested variety

- At least 6 with current mileage over 20,000 km (and under the 36,000 km eligibility cap)
- At least 6 purchased over 12 months ago (12-36 month timeframe, still eligible)
- At least 6 flagged commercial use
- At least 5 with a snowplow
- Spread across all 8 vehicle categories (A through H)
- All 5 plan types represented (BaseCARE, PowertrainCARE, ExtraCARE, PremiumCARE, PremiumCARE PLUS!)
- Mixed term/mileage plans (3-8 years, 40,000-200,000 km)
- All deductible options represented ($0, $50, $200, Disappearing)

## How pricing is calculated

Prices are not invented. For each row the real pricing table is queried by vehicle category + plan + years + mileage + deductible to get base price and deductible cost, and the real surcharge table supplies commercial / snowplow / timeframe amounts for that plan. Total = base + deductible + applicable surcharges. Only combinations that actually exist in the pricing table are used, so every seeded row matches what the live calculator would produce.

## Deliverable

After seeding, chat returns a list of all 25 entries with: vehicle, category, plan, term/mileage, deductible, mileage, timeframe, commercial/snowplow flags, and the itemized breakdown with total.

## Technical notes

- Insert-only data change against the quote sessions table; no schema changes, no app code changes.
- Rows use completed purchase status with recent activity timestamps so they appear in the Submissions tab immediately.
- No write tokens are set, so seeded rows cannot be modified through the public wizard.
