

## Plan: Add Eligibility Rules for Mileage and Purchase Timeframe

### What changes
1. **Add client-side eligibility checks in `StepEligibility.tsx`** — Before/after the database rules check, add two hard-coded checks:
   - If `details.mileage` > 36000 → ineligible with message about mileage exceeding 36,000 km
   - If `details.purchase_timeframe` === "More than 36 months" → ineligible with message about purchase timeframe

2. **Update placeholder text in `StepDetails.tsx`** — Change the `SelectValue` placeholder from `` `Select ${field.label.toLowerCase()}` `` to `"Select one"` for select-type fields (line 103).

### Technical details

**File: `src/components/quote/StepEligibility.tsx`**
- Add checks at the start of `checkEligibility()` (after line 26), before the database query:
  - `Number(details.mileage) > 36000` → call `onResult(false, "Vehicles with over 36,000 km are not eligible for coverage.", null)` and return
  - `details.purchase_timeframe === "More than 36 months"` → call `onResult(false, "Vehicles purchased more than 36 months ago are not eligible for coverage.", null)` and return

**File: `src/components/quote/StepDetails.tsx`**
- Line 103: Change placeholder to `"Select one"`

