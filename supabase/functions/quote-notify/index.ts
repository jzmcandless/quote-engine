// Fires the "contact captured" staff notification once the customer has
// entered their contact details to view their quote.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { buildQuoteTemplateData, notifyStaff } from "../_shared/notifyStaff.ts";

const UUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  try {
    const body = await req.json().catch(() => null);
    const sessionId = body?.session_id;
    const writeToken = body?.write_token;
    const event = body?.event;

    if (
      typeof sessionId !== "string" || !UUID.test(sessionId) ||
      typeof writeToken !== "string" || writeToken.length < 20 || writeToken.length > 100 ||
      event !== "contact_captured"
    ) {
      return json(400, { error: "invalid_request" });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: verified, error: vErr } = await admin.rpc("verify_quote_session_token", {
      p_session_id: sessionId,
      p_token: writeToken,
    });
    if (vErr || verified !== true) return json(401, { error: "unauthorized" });

    const { data: session } = await admin
      .from("quote_sessions")
      .select(
        "vehicle, additional_details, coverage, price, surcharges, ineligible_message, first_name, last_name, email, phone",
      )
      .eq("session_id", sessionId)
      .maybeSingle();

    if (!session) return json(404, { error: "not_found" });
    if (!session.email) return json(200, { ok: true, skipped: "no_contact" });

    await notifyStaff({
      admin,
      templateName: "quote-contact-captured",
      eventKey: sessionId,
      templateData: buildQuoteTemplateData(session),
    });

    return json(200, { ok: true });
  } catch (err) {
    console.error("[quote-notify]", err);
    return json(500, { error: "server_error" });
  }
});
