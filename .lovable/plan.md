

## Plan: Cascade-filter coverage dropdowns

### Problem
Currently, all three dropdowns (years, mileage, deductible) are populated from the full pricing dataset for the selected plan. When a user picks a coverage term (e.g. 3 years), mileage options that don't exist for that term still appear.

### Solution
Store the raw pricing rows and filter mileage/deductible options based on prior selections. Each dropdown cascades into the next, and changing an earlier selection resets later ones.

### Technical Details
**File: `src/components/quote/StepCoverage.tsx`**

1. Add a state variable `allRows` to store the full query result (array of `{years_covered, mileage_covered, deductible}`).

2. Replace the current `setYearsOptions` / `setMileageOptions` / `setDeductibleOptions` logic in the plan useEffect — just store raw data in `allRows` and derive `yearsOptions` from it.

3. Compute `mileageOptions` by filtering `allRows` where `years_covered === coverage.yearsCovered`. Compute `deductibleOptions` by further filtering where `mileage_covered === coverage.mileageCovered`. Use `useMemo` for both.

4. When `yearsCovered` changes, reset `mileageCovered` to 0 and `deductible` to `''`. When `mileageCovered` changes, reset `deductible` to `''`. This is done in the `onValueChange` handlers.

5. Remove the separate `mileageOptions` and `deductibleOptions` state variables — they become derived values.

