## Update warranty pricing via CSV

You already have a working CSV importer for the pricing matrix — no code or schema changes are needed. Here's the path to update it.

### Steps
1. Sign in at `/admin/login` as an admin user.
2. In the admin dashboard, open the **Pricing CSV Import** section.
3. Upload your new pricing CSV. The parser unpivots it into the `coverage_pricing` table (one row per plan × vehicle class × years × mileage × deductible).
4. The import replaces the active pricing set; the quote wizard picks up the new prices immediately.

### Required CSV format
Header row, then one row per `Plan Type` + term + mileage:

```text
Plan Type, Term, Distance Coverage, Category A, Category B, ... Category H, Rental Plus!, $0 Deductible, Disappearing Deductible, $50 Deductible, $200 Deductible
Powertrain, 4 Year Plan, 80000, 1295, 1395, ..., 1895, 150, 0, 75, -50, -150
```

Notes:
- `Category A`–`Category H` are vehicle classes; each cell is the base price.
- Deductible columns hold the cost adjustment (added to the base price) for that deductible option. Leave blank to skip that combination.
- `$` and `,` in numbers are stripped automatically.
- `Term` parses the first integer (e.g. "4 Year Plan" → 4 years).

### What I need from you
Upload (or paste) the new pricing CSV. Tell me if you want me to:
- (a) just confirm the format and let you upload it yourself in `/admin`, or
- (b) parse and insert the rows for you directly via a data migration.

No file or database changes are made until you approve.
