

## Problem

Your sample CSV uses a **pivot/matrix format** that is fundamentally different from what the current import system expects.

**Your CSV structure:**
```text
Plan Type | (empty) | Distance Coverage | Category A | Category B | ... | Category H | Rental Plus! | Deductible
PremiumCARE PLUS! | 4 Year Plan | 80,000 | $1,106 | $1,352 | ... | $2,117 | $0 | $0
```

**Current import expects flat rows:**
```text
plan_name, vehicle_class, years_covered, mileage_covered, deductible, price
```

Key mismatches:
1. **Matrix layout** — Categories A-H are columns containing prices, not separate rows
2. **Plan names differ** — CSV has "PremiumCARE PLUS!", DB has "Basic/Standard/Premium"
3. **Vehicle classes differ** — CSV uses "Category A-H", DB uses "sedan/suv/truck"
4. **Number formatting** — Prices have `$` and commas (e.g., `"$1,106"`, `"1,728"`)
5. **Years embedded in text** — "4 Year Plan" instead of a number
6. **Mileage has commas** — `"80,000"` wrapped in quotes
7. **New field** — "Rental Plus!" column has no DB equivalent
8. **Deductible** — appears as a column per row ($0), which is fine

## Plan

### 1. Update database reference data
- Create/update plans to match real plan names (e.g., "PremiumCARE PLUS!")
- Change vehicle classes from sedan/suv/truck to Category A through Category H

### 2. Add `rental_plus` column to `coverage_pricing`
- Migration to add a nullable `rental_plus` numeric column to support that data point

### 3. Rewrite CSV pricing import logic
Build a smart parser in `AdminDashboard.tsx` that handles the matrix format:
- Detect column headers: "Category A", "Category B", etc.
- For each data row, extract plan name (col 0), years from text like "4 Year Plan" (col 1), mileage from "80,000" (col 2)
- Strip `$` and commas from all price values
- **Unpivot**: For each category column, create one `coverage_pricing` row with `vehicle_class = "Category A"`, etc.
- Parse deductible from the last column
- Auto-create plans that don't exist yet (or match by name)

### 4. Update quote flow vehicle class mapping
- Update `StepCoverage.tsx` and `StepVehicle.tsx` so vehicles map to Category A-H instead of sedan/suv/truck
- This may require adding a mapping table or field, or updating vehicle records

### 5. Update seed/demo data
- Replace demo vehicles and pricing with data that matches the real category system

### Technical details

**CSV parsing approach** (handles quoted fields with commas):
```text
Row: PremiumCARE PLUS!,,80000,$1106,$1352,...,$2117,$0,$0
→ Unpivots to 8 rows:
  {plan: "PremiumCARE PLUS!", vehicle_class: "Category A", years: 4, mileage: 80000, deductible: 0, price: 1106}
  {plan: "PremiumCARE PLUS!", vehicle_class: "Category B", years: 4, mileage: 80000, deductible: 0, price: 1352}
  ...
```

The "4 Year Plan" text in the second column will be parsed with regex to extract the number. The term column appears to be in column index 1 (currently empty header).

