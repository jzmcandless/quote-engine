// Server-authoritative pricing & eligibility with strict input validation.
// Client sends only raw inputs; never trusts client-supplied price, surcharges,
// eligibility, vehicle_class, or status.
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  ComputeSchema, assertShape, readJsonBody, bad, ok, corsHeaders,
} from "../_shared/validate.ts";

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return bad(405, "method_not_allowed");

  try {
    const raw = await readJsonBody(req);
    if (raw === null) return bad(413, "invalid_request");
    if (!assertShape(raw, { maxDepth: 5, maxKeys: 40, maxStringLen: 500 })) {
      return bad(400, "invalid_request");
    }
    const parsed = ComputeSchema.safeParse(raw);
    if (!parsed.success) return bad(400, "invalid_request");
    const body = parsed.data;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Verify session token
    const { data: verified, error: verifyErr } = await admin.rpc(
      "verify_quote_session_token",
      { p_session_id: body.session_id, p_token: body.write_token },
    );
    if (verifyErr || verified !== true) return bad(401, "unauthorized");

    // 2. Vehicle class (must reference a real active vehicle)
    let vehicleClass: string | null = null;
    if (body.vehicle.year && body.vehicle.make && body.vehicle.model) {
      const { data: v } = await admin.from("vehicles")
        .select("vehicle_class")
        .eq("year", body.vehicle.year)
        .eq("make", body.vehicle.make)
        .eq("model", body.vehicle.model)
        .eq("drivetrain", body.vehicle.drivetrain)
        .eq("fuel_type", body.vehicle.fuelType)
        .eq("active", true)
        .maybeSingle();
      vehicleClass = v?.vehicle_class ?? null;
    }

    const details = body.additional_details;
    const mileage = Number(details.mileage ?? 0);
    const timeframe = details.purchase_timeframe ?? "";

    // 3. Hard eligibility rules
    let eligible = true;
    let ineligibleMessage = "";
    if (mileage > 36000) {
      eligible = false;
      ineligibleMessage = "Vehicles with over 36,000 km are not eligible for coverage.";
    } else if (timeframe === "More than 36 months") {
      eligible = false;
      ineligibleMessage = "Vehicles purchased more than 36 months ago are not eligible for coverage.";
    } else {
      const { data: rules } = await admin.from("eligibility_rules").select("*").eq("active", true);
      for (const rule of rules ?? []) {
        const makeMatch = !rule.make || rule.make === body.vehicle.make;
        const modelMatch = !rule.model || rule.model === body.vehicle.model;
        const yearMin = !rule.min_year || (body.vehicle.year ?? 0) >= rule.min_year;
        const yearMax = !rule.max_year || (body.vehicle.year ?? 0) <= rule.max_year;
        const mileageOk = !rule.max_mileage || !details.mileage || mileage <= rule.max_mileage;
        if (makeMatch && modelMatch && yearMin && yearMax && mileageOk && !rule.eligible) {
          eligible = false;
          ineligibleMessage = rule.ineligible_message || "This vehicle is not eligible for coverage.";
          break;
        }
      }
    }

    const inputHash = await sha256Hex(JSON.stringify({
      vehicle: body.vehicle, details, coverage: body.coverage ?? null,
    }));

    if (!eligible) {
      await admin.rpc("apply_quote_computation", {
        p_session_id: body.session_id,
        p_vehicle_class: vehicleClass,
        p_is_eligible: false,
        p_ineligible_message: ineligibleMessage,
        p_price: null,
        p_surcharges: [],
        p_coverage: null,
        p_input_hash: inputHash,
      });
      return ok({ eligible: false, ineligibleMessage, vehicleClass, price: null, surcharges: [] });
    }

    // 4. Pricing (requires coverage selection referencing real active records)
    let price: number | null = null;
    const applied: Array<{ type: string; label: string; amount: number }> = [];
    const coverage = body.coverage ?? null;

    if (coverage) {
      // Reference check: plan must be active
      const { data: plan } = await admin.from("plans")
        .select("id").eq("id", coverage.planId).eq("active", true).maybeSingle();
      if (!plan) return bad(422, "invalid_selection");

      const q = admin.from("coverage_pricing")
        .select("price, deductible_cost")
        .eq("plan_id", coverage.planId)
        .eq("years_covered", coverage.yearsCovered)
        .eq("mileage_covered", coverage.mileageCovered)
        .eq("deductible", coverage.deductible)
        .eq("active", true);
      if (vehicleClass) q.eq("vehicle_class", vehicleClass);
      const { data: pricing } = await q.limit(1).maybeSingle();
      if (!pricing) return bad(422, "invalid_selection");

      const { data: surchargeRows } = await admin.from("surcharges")
        .select("surcharge_type, mileage_threshold, amount")
        .eq("plan_id", coverage.planId).eq("active", true);

      const timeframeApplies = mileage > 20000 || timeframe === "Between 12 and 36 months";
      if (timeframeApplies) {
        const row = surchargeRows?.find((r) => r.surcharge_type === "timeframe");
        if (row) applied.push({ type: "timeframe", label: "Timeframe/Mileage Surcharge", amount: Number(row.amount) });
      }
      if (details.commercial_use === "Yes") {
        const row = surchargeRows?.find((r) => r.surcharge_type === "commercial");
        if (row) applied.push({ type: "commercial", label: "Commercial Vehicle Surcharge", amount: Number(row.amount) });
      }
      if (details.has_snowplow === "Yes") {
        const row = surchargeRows?.find(
          (r) => r.surcharge_type === "snowplow" && r.mileage_threshold === coverage.mileageCovered,
        );
        if (row) applied.push({
          type: "snowplow",
          label: `Snowplow Surcharge (${coverage.mileageCovered.toLocaleString()} km)`,
          amount: Number(row.amount),
        });
      }

      const base = Number(pricing.price) + Number(pricing.deductible_cost || 0);
      price = base + applied.reduce((s, x) => s + x.amount, 0);
      if (price < 0 || price > 1_000_000) return bad(500, "server_error");
    }

    await admin.rpc("apply_quote_computation", {
      p_session_id: body.session_id,
      p_vehicle_class: vehicleClass,
      p_is_eligible: true,
      p_ineligible_message: null,
      p_price: price,
      p_surcharges: applied,
      p_coverage: coverage,
      p_input_hash: inputHash,
    });

    return ok({ eligible: true, ineligibleMessage: null, vehicleClass, price, surcharges: applied });
  } catch (err) {
    console.error("[quote-compute]", err);
    return bad(500, "server_error");
  }
});
