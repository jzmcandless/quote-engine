

## Plan: Decouple Make/Model from Year in Vehicle Selection

### Problem
The `vehicles` table only has records for year 2024, but the year dropdown shows 2021-2027. The makes and models queries filter by year, so selecting any other year returns empty results.

### Solution
Remove the year filter from the makes, models, drivetrains, and fuel types queries. The year is still collected for the quote but doesn't restrict which vehicles appear in the dropdowns.

### Technical Details
**File: `src/components/quote/StepVehicle.tsx`**
- **Makes query** (line 29): Remove `.eq("year", vehicle.year)` — load all active makes regardless of year
- **Models query** (lines 43-44): Remove `.eq("year", vehicle.year)` — load models filtered only by make
- **Drivetrains query** (lines 56-58): Remove `.eq("year", vehicle.year)` — filter by make + model only
- **Fuel types query** (lines 72-75): Remove `.eq("year", vehicle.year)` — filter by make + model + drivetrain only
- **Makes useEffect dependency**: Change from `[vehicle.year]` to `[]` (load once on mount) — no longer gated on year selection
- **Models useEffect guard**: Remove `!vehicle.year` check, keep `!vehicle.make`

The year dropdown remains as-is (2021-2027) for quote purposes; it just no longer filters the vehicle catalog queries.

