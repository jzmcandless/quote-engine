// Server-authoritative pricing & eligibility.
// Receives only raw inputs — never trusts client-supplied price, surcharges,
// eligibility, vehicle_class, or status.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ComputeBody {
  session_id: string;
  write_token: string;
  vehicle: { year: number | null; make: string; model: string; drivetrain: string; fuelType: string };
  additional_details: Record<string, string | number>;
  coverage?: { planId?: string; planName?: string; yearsCovered?: number; mileageCovered?: number; deductible?: string };
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  let body: ComputeBody;
  try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON" }); }
  const { session_id, write_token, vehicle, additional_details, coverage } = body ?? {} as ComputeBody;
  if (!session_id || !write_token || !vehicle) return json(400, { error: "Missing required fields" });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // 1. Verify session token
  const { data: verified, error: verifyErr } = await admin.rpc("verify_quote_session_token", {
    p_session_id: session_id, p_token: write_token,
  });
  if (verifyErr || verified !== true) return json(401, { error: "Invalid or expired session" });

  // 2. Lookup vehicle class
  let vehicleClass: string | null = null;
  if (vehicle.year && vehicle.make && vehicle.model) {
    const { data: v } = await admin.from("vehicles")
      .select("vehicle_class")
      .eq("year", vehicle.year).eq("make", vehicle.make).eq("model", vehicle.model)
      .eq("drivetrain", vehicle.drivetrain).eq("fuel_type", vehicle.fuelType)
      .maybeSingle();
    vehicleClass = v?.vehicle_class ?? null;
  }

  const details = additional_details ?? {};
  const mileage = Number(details.mileage || 0);
  const timeframe = String(details.purchase_timeframe || "");

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
    // 4. Rules table
    const { data: rules } = await admin.from("eligibility_rules").select("*").eq("active", true);
    for (const rule of rules ?? []) {
      const makeMatch = !rule.make || rule.make === vehicle.make;
      const modelMatch = !rule.model || rule.model === vehicle.model;
      const yearMin = !rule.min_year || (vehicle.year ?? 0) >= rule.min_year;
      const yearMax = !rule.max_year || (vehicle.year ?? 0) <= rule.max_year;
      const mileageOk = !rule.max_mileage || !details.mileage || mileage <= rule.max_mileage;
      if (makeMatch && modelMatch && yearMin && yearMax && mileageOk && !rule.eligible) {
        eligible = false;
        ineligibleMessage = rule.ineligible_message || "This vehicle is not eligible for coverage.";
        break;
      }
    }
  }

  const inputHash = await sha256Hex(JSON.stringify({ vehicle, details, coverage }));

  if (!eligible) {
    await admin.rpc("apply_quote_computation", {
      p_session_id: session_id,
      p_vehicle_class: vehicleClass,
      p_is_eligible: false,
      p_ineligible_message: ineligibleMessage,
      p_price: null,
      p_surcharges: [],
      p_coverage: null,
      p_input_hash: inputHash,
    });
    return json(200, { eligible: false, ineligibleMessage, vehicleClass, price: null, surcharges: [] });
  }

  // 5. Pricing (requires coverage selection)
  let price: number | null = null;
  const applied: Array<{ type: string; label: string; amount: number }> = [];
  let coverageOut = coverage ?? null;

  if (coverage?.planId && coverage.yearsCovered && coverage.mileageCovered && coverage.deductible) {
    const q = admin.from("coverage_pricing")
      .select("price, deductible_cost, rental_plus")
      .eq("plan_id", coverage.planId)
      .eq("years_covered", coverage.yearsCovered)
      .eq("mileage_covered", coverage.mileageCovered)
      .eq("deductible", coverage.deductible)
      .eq("active", true);
    if (vehicleClass) q.eq("vehicle_class", vehicleClass);
    const { data: pricing } = await q.limit(1).maybeSingle();

    if (pricing) {
      const { data: surchargeRows } = await admin.from("surcharges")
        .select("surcharge_type, mileage_threshold, amount")
        .eq("plan_id", coverage.planId).eq("active", true);

      const timeframeApplies = mileage > 20000 || timeframe === "Between 12 and 36 months";
      if (timeframeApplies) {
        const row = surchargeRows?.find((r) => r.surcharge_type === "timeframe");
        if (row) applied.push({ type: "timeframe", label: "Timeframe/Mileage Surcharge", amount: Number(row.amount) });
      }
      if (String(details.commercial_use) === "Yes") {
        const row = surchargeRows?.find((r) => r.surcharge_type === "commercial");
        if (row) applied.push({ type: "commercial", label: "Commercial Vehicle Surcharge", amount: Number(row.amount) });
      }
      if (String(details.has_snowplow) === "Yes") {
        const row = surchargeRows?.find((r) => r.surcharge_type === "snowplow" && r.mileage_threshold === coverage.mileageCovered);
        if (row) applied.push({
          type: "snowplow",
          label: `Snowplow Surcharge (${coverage.mileageCovered.toLocaleString()} km)`,
          amount: Number(row.amount),
        });
      }

      const base = Number(pricing.price) + Number(pricing.deductible_cost || 0);
      price = base + applied.reduce((s, x) => s + x.amount, 0);
    }
  }

  await admin.rpc("apply_quote_computation", {
    p_session_id: session_id,
    p_vehicle_class: vehicleClass,
    p_is_eligible: true,
    p_ineligible_message: null,
    p_price: price,
    p_surcharges: applied,
    p_coverage: coverageOut,
    p_input_hash: inputHash,
  });

  return json(200, { eligible: true, ineligibleMessage: null, vehicleClass, price, surcharges: applied });
});
