## Update surcharges table from CSV

Replace all rows in `surcharges` with values from the uploaded CSV. The CSV matches the existing schema 1:1 (timeframe, commercial, snowplow per mileage threshold).

### Mapping
- "Premium CARE" (with space) → existing `PremiumCARE` plan
- PremiumCARE PLUS! snowplow 60k/80k are blank → not inserted (plan won't offer those tiers)
- All other plans: full set (timeframe, commercial, 6 snowplow thresholds)

### Values
Per plan: `timeframe=$100`, `commercial=$500/400/300/200` (varies), snowplow: 60k=$800, 80k=$900, 100k=$1100, 120k=$1300, 150k=$1700... actually 150k=$1500, 200k=$1700.

| Plan | timeframe | commercial | snowplow (60/80/100/120/150/200k) |
|---|---|---|---|
| PremiumCARE PLUS! | 100 | 500 | —, —, 1100, 1300, 1500, 1700 |
| PremiumCARE | 100 | 500 | 800, 900, 1100, 1300, 1500, 1700 |
| ExtraCARE | 100 | 400 | 800, 900, 1100, 1300, 1500, 1700 |
| BaseCARE | 100 | 300 | 800, 900, 1100, 1300, 1500, 1700 |
| PowertrainCARE | 100 | 200 | 800, 900, 1100, 1300, 1500, 1700 |

### Execution
Single `supabase--insert` call: `DELETE FROM surcharges;` then bulk `INSERT` (~38 rows) with `plan_id` resolved by name, `active=true`.

### Verification
`SELECT plan, type, mileage, amount` joined to plans to confirm counts and spot-check PremiumCARE PLUS! has no 60k/80k rows.
