## Import May 26 pricing CSV (replace all)

One-time data refresh — no schema or app code changes.

### Transformations applied during parse
- Rename plan `PremuimCARE` → `PremiumCARE` (typo fix, maps to existing plan id).
- For `PremiumCARE PLUS!`, keep only the `$0 Deductible` rows; drop `Disappearing`, `$50`, `$200`.
- For all other plans, keep all 5 deductible options as present in the CSV.
- Auto-create the three new plans not yet in DB: `ExtraCARE`, `BaseCARE`, `PowertrainCARE`.

### Execution
1. Generate the SQL locally from `Pricing_May26 - Price.csv` using the existing `parsePricingCSV` logic (Node script, no project files changed).
2. Run a single migration that:
   - `INSERT` the three missing plans (idempotent via `ON CONFLICT (name) DO NOTHING`).
   - `DELETE FROM coverage_pricing` (full wipe).
   - Bulk `INSERT` all parsed rows with `plan_id` resolved from `plans.name`.
3. Verify with a count query and a couple of spot checks (PremiumCARE PLUS! Category A 4yr/80k = $1,148; PowertrainCARE Category H 8yr/200k = $6,165).

### Expected scope
~136 CSV data rows → roughly:
- PremiumCARE PLUS!: 13 rows × 8 categories × 1 deductible = 104
- PremiumCARE / ExtraCARE / BaseCARE / PowertrainCARE: remaining rows × 8 categories × 5 deductibles ≈ 4,900

You'll review the migration before it runs.
