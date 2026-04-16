# Project Memory

## Core
Extended Warranty Quote Generator. Teal primary (#0EA5E9), light bg. DM Sans headings, Inter body.
Lovable Cloud for DB, auth, storage. Public quote flow, admin panel at /admin.
Vehicle classes: sedan, suv, truck. Pricing = plan × vehicle_class × years × mileage × deductible.
Surcharges: timeframe (>20k km or 12-36 months), commercial ($500), snowplow (by mileage). Auto-applied.

## Memories
- [Data model](mem://features/data-model) — Tables: vehicles, eligibility_rules, plans, coverage_pricing, additional_vehicle_fields, csv_import_jobs, user_roles, surcharges
- [Quote flow](mem://features/quote-flow) — 6-step wizard: Vehicle → Details → Eligibility → Coverage → Quote → Confirm
- [Admin](mem://features/admin) — Login at /admin/login, dashboard at /admin, CSV import for pricing & eligibility
