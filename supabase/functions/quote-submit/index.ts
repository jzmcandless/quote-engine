// Server-side finalization of a quote. Re-verifies session, re-uses server-
// computed price/surcharges, inserts the custom_quote_requests row, and marks
// the session completed. The browser cannot set status directly anymore.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SubmitBody {
  session_id: string;
  write_token: string;
  kind: "purchase" | "custom_request";
  contact: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    vin?: string | null;
    street_address?: string | null;
    city?: string | null;
    province?: string | null;
  };
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function s(v: unknown, max = 500) {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  let body: SubmitBody;
  try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON" }); }
  const { session_id, write_token, kind, contact } = body ?? {} as SubmitBody;
  if (!session_id || !write_token || !kind || !contact) return json(400, { error: "Missing fields" });
  if (!["purchase", "custom_request"].includes(kind)) return json(400, { error: "Invalid kind" });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: verified, error: vErr } = await admin.rpc("verify_quote_session_token", {
    p_session_id: session_id, p_token: write_token,
  });
  if (vErr || verified !== true) return json(401, { error: "Invalid or expired session" });

  // Load authoritative session state
  const { data: sess } = await admin.from("quote_sessions")
    .select("vehicle, coverage, price, surcharges, is_eligible")
    .eq("session_id", session_id).maybeSingle();
  if (!sess) return json(404, { error: "Session not found" });

  const vehicle = (sess.vehicle ?? {}) as Record<string, unknown>;
  const coverage = (sess.coverage ?? {}) as Record<string, unknown>;
  const surcharges = (sess.surcharges ?? []) as Array<{ label: string; amount: number }>;
  const price = sess.price != null ? Number(sess.price) : null;

  const first = s(contact.first_name, 100);
  const last = s(contact.last_name, 100);
  const email = s(contact.email, 255);
  const phone = s(contact.phone, 20);
  const vin = s(contact.vin, 17) || null;
  if (!first || !last || !email || !phone) return json(400, { error: "Missing contact fields" });

  let message: string | null = null;
  if (kind === "purchase") {
    if (!price) return json(400, { error: "No computed price for this session" });
    const surchargeText = surcharges.length > 0
      ? ` (includes surcharges: ${surcharges.map((x) => `${x.label}: $${x.amount}`).join(", ")})`
      : "";
    const addr = [s(contact.street_address, 200), s(contact.city, 100), s(contact.province, 60)]
      .filter(Boolean).join(", ");
    message = `Confirmed quote — ${coverage.planName ?? ""}, ${coverage.yearsCovered ?? ""}yr/${Number(coverage.mileageCovered ?? 0).toLocaleString()}km, ${coverage.deductible ?? ""}. Price: $${price.toLocaleString("en-US", { minimumFractionDigits: 2 })}${surchargeText}.${addr ? ` Address: ${addr}.` : ""}`;
  }

  const { error: insErr } = await admin.from("custom_quote_requests").insert({
    first_name: first,
    last_name: last,
    email,
    phone,
    vin,
    vehicle_year: (vehicle.year as number) ?? null,
    vehicle_make: (vehicle.make as string) ?? null,
    vehicle_model: (vehicle.model as string) ?? null,
    message,
  });
  if (insErr) return json(500, { error: "Failed to save request" });

  // Also persist contact on the session for admin visibility
  await admin.from("quote_sessions").update({
    first_name: first, last_name: last, email, phone,
  }).eq("session_id", session_id);

  const status = kind === "purchase"
    ? "completed_purchase"
    : (sess.is_eligible === false ? "completed_ineligible" : "completed_custom_request");

  await admin.rpc("complete_quote_session", { p_session_id: session_id, p_status: status });

  return json(200, { ok: true });
});
