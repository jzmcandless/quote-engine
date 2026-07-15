// Server-side quote finalization with strict input validation.
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  SubmitSchema, assertShape, readJsonBody, bad, ok, corsHeaders,
} from "../_shared/validate.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return bad(405, "method_not_allowed");

  try {
    const raw = await readJsonBody(req);
    if (raw === null) return bad(413, "invalid_request");
    if (!assertShape(raw, { maxDepth: 4, maxKeys: 20, maxStringLen: 500 })) {
      return bad(400, "invalid_request");
    }
    const parsed = SubmitSchema.safeParse(raw);
    if (!parsed.success) return bad(400, "invalid_request");
    const body = parsed.data;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: verified, error: vErr } = await admin.rpc("verify_quote_session_token", {
      p_session_id: body.session_id, p_token: body.write_token,
    });
    if (vErr || verified !== true) return bad(401, "unauthorized");

    const { data: sess } = await admin.from("quote_sessions")
      .select("vehicle, coverage, price, surcharges, is_eligible")
      .eq("session_id", body.session_id).maybeSingle();
    if (!sess) return bad(404, "not_found");

    const vehicle = (sess.vehicle ?? {}) as Record<string, unknown>;
    const coverage = (sess.coverage ?? {}) as Record<string, unknown>;
    const surcharges = Array.isArray(sess.surcharges)
      ? (sess.surcharges as Array<{ label: string; amount: number }>)
      : [];
    const price = sess.price != null ? Number(sess.price) : null;

    const c = body.contact;
    const vin = (typeof c.vin === "string" && c.vin) ? c.vin.toUpperCase() : null;
    const streetAddress = typeof c.street_address === "string" ? c.street_address : "";
    const city = typeof c.city === "string" ? c.city : "";
    const province = typeof c.province === "string" ? c.province : "";

    let message: string | null = null;
    if (body.kind === "purchase") {
      if (sess.is_eligible !== true || price == null) return bad(409, "not_ready");
      const surchargeText = surcharges.length > 0
        ? ` (includes surcharges: ${surcharges.map((x) => `${x.label}: $${x.amount}`).join(", ")})`
        : "";
      const addr = [streetAddress, city, province].filter(Boolean).join(", ");
      message =
        `Confirmed quote — ${coverage.planName ?? ""}, ${coverage.yearsCovered ?? ""}yr/` +
        `${Number(coverage.mileageCovered ?? 0).toLocaleString()}km, ${coverage.deductible ?? ""}. ` +
        `Price: $${price.toLocaleString("en-US", { minimumFractionDigits: 2 })}${surchargeText}.` +
        `${addr ? ` Address: ${addr}.` : ""}`;
      if (message.length > 2000) message = message.slice(0, 2000);
    }

    const { error: insErr } = await admin.from("custom_quote_requests").insert({
      first_name: c.first_name,
      last_name: c.last_name,
      email: c.email,
      phone: c.phone,
      vin,
      vehicle_year: (vehicle.year as number) ?? null,
      vehicle_make: (vehicle.make as string) ?? null,
      vehicle_model: (vehicle.model as string) ?? null,
      message,
    });
    if (insErr) {
      console.error("[quote-submit] insert", insErr);
      return bad(500, "server_error");
    }

    await admin.from("quote_sessions").update({
      first_name: c.first_name, last_name: c.last_name, email: c.email, phone: c.phone,
    }).eq("session_id", body.session_id);

    const status = body.kind === "purchase"
      ? "completed_purchase"
      : (sess.is_eligible === false ? "completed_ineligible" : "completed_custom_request");

    const { error: cErr } = await admin.rpc("complete_quote_session", {
      p_session_id: body.session_id, p_status: status,
    });
    if (cErr) {
      console.error("[quote-submit] complete", cErr);
      return bad(500, "server_error");
    }

    return ok({ ok: true });
  } catch (err) {
    console.error("[quote-submit]", err);
    return bad(500, "server_error");
  }
});
