import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

export interface QuoteSession {
  id: string;
  session_id: string;
  status: string;
  current_step: number;
  vehicle: any;
  additional_details: any;
  coverage: any;
  vehicle_class: string | null;
  is_eligible: boolean | null;
  ineligible_message: string | null;
  price: number | null;
  surcharges: any;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  user_agent: string | null;
  referrer: string | null;
  created_at: string;
  updated_at: string;
  last_activity_at: string;
}

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString();
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{title}</h3>
      <div className="rounded-lg border bg-card p-3 text-sm space-y-1.5">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right break-all">{value ?? "—"}</span>
    </div>
  );
}

export function SubmissionDetailDrawer({
  session,
  onClose,
}: {
  session: QuoteSession | null;
  onClose: () => void;
}) {
  const open = !!session;
  const s = session;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-heading">Submission Detail</SheetTitle>
          <SheetDescription>
            {s && (
              <span className="flex items-center gap-2 mt-1">
                <Badge variant="secondary">{s.status}</Badge>
                <span>Step {s.current_step}/6</span>
              </span>
            )}
          </SheetDescription>
        </SheetHeader>

        {s && (
          <div className="space-y-4 mt-4">
            <Section title="Contact">
              <Row label="Name" value={[s.first_name, s.last_name].filter(Boolean).join(" ") || null} />
              <Row label="Email" value={s.email} />
              <Row label="Phone" value={s.phone} />
            </Section>

            <Section title="Vehicle">
              <Row label="Year" value={s.vehicle?.year} />
              <Row label="Make" value={s.vehicle?.make} />
              <Row label="Model" value={s.vehicle?.model} />
              <Row label="Drivetrain" value={s.vehicle?.drivetrain} />
              <Row label="Fuel" value={s.vehicle?.fuelType} />
              <Row label="Class" value={s.vehicle_class} />
              <Row label="Eligible" value={s.is_eligible === null ? "—" : s.is_eligible ? "Yes" : "No"} />
              {s.ineligible_message && <Row label="Reason" value={s.ineligible_message} />}
            </Section>

            {s.additional_details && Object.keys(s.additional_details || {}).length > 0 && (
              <Section title="Additional Details">
                {Object.entries(s.additional_details).map(([k, v]) => (
                  <Row key={k} label={k.replace(/_/g, " ")} value={String(v)} />
                ))}
              </Section>
            )}

            {s.coverage?.planName && (
              <Section title="Coverage">
                <Row label="Plan" value={s.coverage.planName} />
                <Row label="Years" value={s.coverage.yearsCovered} />
                <Row label="Mileage" value={s.coverage.mileageCovered?.toLocaleString?.()} />
                <Row label="Deductible" value={s.coverage.deductible} />
              </Section>
            )}

            {s.price != null && (
              <Section title="Quote">
                <Row label="Price" value={`$${Number(s.price).toLocaleString()}`} />
                {Array.isArray(s.surcharges) && s.surcharges.map((sc: any, i: number) => (
                  <Row key={i} label={sc.label} value={`$${Number(sc.amount).toLocaleString()}`} />
                ))}
              </Section>
            )}

            <Section title="Activity">
              <Row label="Created" value={fmt(s.created_at)} />
              <Row label="Updated" value={fmt(s.updated_at)} />
              <Row label="Last Activity" value={fmt(s.last_activity_at)} />
              <Row label="Session ID" value={<code className="text-xs">{s.session_id}</code>} />
            </Section>

            <Section title="Source">
              <Row label="Referrer" value={s.referrer || "Direct"} />
              <Row label="User Agent" value={<span className="text-xs">{s.user_agent}</span>} />
            </Section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
