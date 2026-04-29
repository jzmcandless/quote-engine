import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VehicleSelection, AdditionalDetails, CoverageSelection, AppliedSurcharge } from "@/types/quote";
import { ChevronLeft, CreditCard, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { patchSession, markCompleted } from "@/lib/quoteSession";

interface StepConfirmProps {
  vehicle: VehicleSelection;
  details: AdditionalDetails;
  coverage: CoverageSelection;
  price: number;
  surcharges: AppliedSurcharge[];
  onBack: () => void;
  onRestart: () => void;
}

const provinces = [
  "Alberta", "British Columbia", "Manitoba", "New Brunswick",
  "Newfoundland and Labrador", "Nova Scotia", "Ontario",
  "Prince Edward Island", "Quebec", "Saskatchewan",
  "Northwest Territories", "Nunavut", "Yukon",
];

export function StepConfirm({ vehicle, details, coverage, price, surcharges, onBack, onRestart }: StepConfirmProps) {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    streetAddress: "",
    city: "",
    province: "",
    phone: "",
    email: "",
    vin: "",
  });

  const requiredFilled =
    form.firstName.trim() &&
    form.lastName.trim() &&
    form.streetAddress.trim() &&
    form.city.trim() &&
    form.province &&
    form.phone.trim() &&
    form.email.trim() &&
    form.vin.trim();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from("custom_quote_requests").insert({
      first_name: form.firstName.trim(),
      last_name: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      vin: form.vin.trim(),
      vehicle_year: vehicle.year,
      vehicle_make: vehicle.make,
      vehicle_model: vehicle.model,
      message: `Confirmed quote — ${coverage.planName}, ${coverage.yearsCovered}yr/${coverage.mileageCovered.toLocaleString()}km, ${coverage.deductible}. Price: $${price.toLocaleString("en-US", { minimumFractionDigits: 2 })}${surcharges.length > 0 ? ` (includes surcharges: ${surcharges.map(s => `${s.label}: $${s.amount}`).join(', ')})` : ''}. Address: ${form.streetAddress}, ${form.city}, ${form.province}.`,
    });

    setLoading(false);
    if (error) {
      toast({ title: "Error", description: "Failed to submit. Please try again.", variant: "destructive" });
    } else {
      await markCompleted("completed_purchase", {
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      });
      setSubmitted(true);
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center text-center py-8 space-y-4">
        <CheckCircle className="w-14 h-14 text-primary" />
        <h2 className="text-xl font-heading font-bold text-foreground">Thank You!</h2>
        <p className="text-sm text-muted-foreground">
          Thanks for purchasing a Ford Extended Warranty. A member of our team will be in touch with final paperwork shortly.
        </p>
        <Button onClick={onRestart} size="lg" className="mt-4">Start New Quote</Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Customer Information */}
      <div>
        <h2 className="text-lg font-heading font-bold text-foreground mb-4">Customer Information</h2>
        <div className="space-y-3">
          {[
            { key: "firstName", label: "First Name", type: "text" },
            { key: "lastName", label: "Last Name", type: "text" },
            { key: "streetAddress", label: "Street Address", type: "text" },
            { key: "city", label: "City", type: "text" },
          ].map((f) => (
            <div key={f.key}>
              <div className="flex items-center gap-1">
                <Label htmlFor={f.key} className="sr-only">{f.label}</Label>
                <Input
                  id={f.key}
                  placeholder={f.label}
                  type={f.type}
                  value={(form as any)[f.key]}
                  onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                  onBlur={(e) => {
                    const map: Record<string, string> = { firstName: "first_name", lastName: "last_name" };
                    if (map[f.key]) patchSession({ [map[f.key]]: e.target.value.trim() || null });
                  }}
                  required
                />
                <span className="text-destructive text-sm">*</span>
              </div>
            </div>
          ))}

          <div className="flex items-center gap-1">
            <Select value={form.province} onValueChange={(v) => setForm((s) => ({ ...s, province: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Province" />
              </SelectTrigger>
              <SelectContent>
                {provinces.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-destructive text-sm">*</span>
          </div>

          {[
            { key: "phone", label: "Phone Number", type: "tel" },
            { key: "email", label: "Email", type: "email" },
          ].map((f) => (
            <div key={f.key} className="flex items-center gap-1">
              <Input
                id={f.key}
                placeholder={f.label}
                type={f.type}
                value={(form as any)[f.key]}
                onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                onBlur={(e) => patchSession({ [f.key]: e.target.value.trim() || null })}
                required
              />
              <span className="text-destructive text-sm">*</span>
            </div>
          ))}
        </div>
      </div>

      {/* Vehicle Confirmation */}
      <div>
        <h2 className="text-lg font-heading font-bold text-foreground mb-3">Confirm Vehicle Information</h2>
        <div className="space-y-2 text-sm">
          <p className="text-foreground">
            Year: {vehicle.year} {vehicle.make} {vehicle.model}
          </p>
          <div className="grid grid-cols-2 gap-2 text-muted-foreground">
            {Object.entries(details).map(([key, val]) => (
              <p key={key}>
                <span className="capitalize">{key.replace(/_/g, " ")}</span>: {String(val)}
              </p>
            ))}
          </div>
          <div className="flex items-center gap-1 mt-3">
            <Input
              placeholder="VIN Number"
              value={form.vin}
              onChange={(e) => setForm((s) => ({ ...s, vin: e.target.value }))}
              required
            />
            <span className="text-destructive text-sm">*</span>
          </div>
        </div>
      </div>

      {/* Payment Details Placeholder */}
      <div>
        <h2 className="text-lg font-heading font-bold text-foreground mb-3">Payment Details</h2>
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
            <CreditCard className="w-4 h-4" />
            <span>Payment processing coming soon</span>
          </div>
          <Input placeholder="Card Number" disabled className="bg-muted/50" />
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="MM / YY" disabled className="bg-muted/50" />
            <Input placeholder="CVV" disabled className="bg-muted/50" />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onBack} size="lg">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <Button type="submit" size="lg" disabled={!requiredFilled || loading} className="flex-1">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CreditCard className="w-4 h-4 mr-1" />}
          Complete Purchase
        </Button>
      </div>
    </form>
  );
}
