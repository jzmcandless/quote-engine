import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Require a shared secret so only the scheduler can invoke this endpoint.
  const expectedSecret = Deno.env.get("SWEEP_SECRET");
  if (!expectedSecret) {
    console.error("[sweep] SWEEP_SECRET not configured");
    return new Response(JSON.stringify({ ok: false, error: "Server not configured" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
  const providedSecret = req.headers.get("x-sweep-secret");
  if (providedSecret !== expectedSecret) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 401,
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  try {
    const { data: newlyAbandoned, error } = await admin.rpc("sweep_quote_sessions");
    if (error) throw error;

    const rows = (newlyAbandoned ?? []) as Array<{
      newly_abandoned_id: string;
      email: string | null;
      first_name: string | null;
      last_name: string | null;
      vehicle: any;
      current_step: number;
    }>;

    let queued = 0;
    if (rows.length > 0) {
      const { data: recipients } = await admin
        .from("notification_recipients")
        .select("email, name")
        .eq("active", true);

      for (const row of rows) {
        // Email queue not yet wired — log and mark as notified to avoid repeat attempts.
        // Once email infra is enabled, replace this block with an enqueue call.
        console.log("[sweep] would notify abandoned session", {
          id: row.newly_abandoned_id,
          customerEmail: row.email,
          recipients: recipients?.map((r) => r.email) ?? [],
        });
        await admin.rpc("mark_abandon_notified", { p_id: row.newly_abandoned_id });
        queued++;
      }
    }

    return new Response(
      JSON.stringify({ ok: true, newly_abandoned: rows.length, notifications_queued: queued }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (err) {
    console.error("[sweep] error", err);
    return new Response(
      JSON.stringify({ ok: false, error: (err as Error).message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
