

## Plan: Add "Vehicle Purchase Timeframe" Question to Additional Details

### What
Insert a new row into the `additional_vehicle_fields` table with:
- **field_name**: `purchase_timeframe`
- **label**: `How long ago was your vehicle purchased new (0km) from the dealership?`
- **input_type**: `select`
- **options**: `["Less than 12 months ago", "Between 12 and 36 months", "More than 36 months"]`
- **required_for_eligibility**: `true`
- **required_for_pricing**: `false`
- **active**: `true`
- **sort_order**: `1`

### How
Single database migration. The existing `StepDetails` component already dynamically renders fields from this table, so no code changes needed — the new question will appear automatically.

