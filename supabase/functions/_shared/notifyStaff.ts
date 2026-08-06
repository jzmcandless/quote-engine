// Fan-out helper: sends one notification email per active staff recipient.
// Runs server-side only, so the recipient list cannot be tampered with by clients.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export interface StaffNotifyArgs {
  admin: SupabaseClient;
  templateName: string;
  // Stable per-event key so retries don't duplicate sends.
  eventKey: string;
  templateData: Record<string, unknown>;
}

export function buildQuoteTemplateData(
  session: Record<string, any>,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  const v = (session.vehicle ?? {}) as Record<string, any>;
  const d = (session.additional_details ?? {}) as Record<string, any>;
  const c = (session.coverage ?? {}) as Record<string, any>;
  return {
    firstName: session.first_name ?? undefined,
    lastName: session.last_name ?? undefined,
    email: session.email ?? undefined,
    phone: session.phone ?? undefined,
    vehicleYear: v.year ?? undefined,
    vehicleMake: v.make ?? undefined,
    vehicleModel: v.model ?? undefined,
    drivetrain: v.drivetrain ?? undefined,
    fuelType: v.fuelType ?? undefined,
    mileage: d.mileage ?? undefined,
    purchaseTimeframe: d.purchase_timeframe ?? undefined,
    commercialUse: d.commercial_use ?? undefined,
    hasSnowplow: d.has_snowplow ?? undefined,
    planName: c.planName || undefined,
    yearsCovered: c.yearsCovered || undefined,
    mileageCovered: c.mileageCovered || undefined,
    deductible: c.deductible || undefined,
    price: session.price ?? undefined,
    surcharges: Array.isArray(session.surcharges) ? session.surcharges : [],
    ineligibleMessage: session.ineligible_message ?? undefined,
    submittedAt: new Date().toLocaleString("en-CA", {
      timeZone: "America/Vancouver",
      dateStyle: "medium",
      timeStyle: "short",
    }),
    ...extra,
  };
}

export async function notifyStaff(
  { admin, templateName, eventKey, templateData }: StaffNotifyArgs,
): Promise<void> {
  try {
    const { data: recipients, error } = await admin
      .from("notification_recipients")
      .select("email")
      .eq("active", true);

    if (error) {
      console.error("[notifyStaff] recipient lookup failed", error);
      return;
    }
    if (!recipients || recipients.length === 0) {
      console.warn("[notifyStaff] no active recipients configured");
      return;
    }

    const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-transactional-email`;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    await Promise.all(
      recipients.map(async (r: { email: string }) => {
        try {
          const res = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceKey}`,
              apikey: serviceKey,
            },
            body: JSON.stringify({
              templateName,
              recipientEmail: r.email,
              idempotencyKey: `${templateName}-${eventKey}-${r.email}`,
              templateData,
            }),
          });
          if (!res.ok) {
            console.error(
              `[notifyStaff] send failed [${res.status}] ${await res.text()}`,
            );
          }
        } catch (e) {
          console.error("[notifyStaff] send threw", e);
        }
      }),
    );
  } catch (e) {
    // Notifications must never break the customer-facing flow.
    console.error("[notifyStaff] unexpected", e);
  }
}
