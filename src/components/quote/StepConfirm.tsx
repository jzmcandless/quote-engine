import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VehicleSelection, AdditionalDetails, CoverageSelection } from "@/types/quote";
import { ChevronLeft, Send, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface StepConfirmProps {
  vehicle: VehicleSelection;
  details: AdditionalDetails;
  coverage: CoverageSelection;
  price: number;
  onBack: () => void;
  onRestart: () => void;
}

const provinces = [
  "Alberta", "British Columbia", "Manitoba", "New Brunswick",
  "Newfoundland and Labrador", "Nova Scotia", "Ontario",
  "Prince Edward Island", "Quebec", "Saskatchewan",
  "Northwest Territories", "Nunavut", "Yukon",
];

export function StepConfirm({ vehicle, details, coverage, price, onBack, onRestart }: StepConfirmProps) {
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
      message: `Confirmed quote — ${coverage.planName}, ${coverage.yearsCovered}yr/${coverage.mileageCovered.toLocaleString()}km, $${coverage.deductible} deductible. Price: $${price.toLocaleString("en-US", { minimumFractionDigits: 2 })}. Address: ${form.streetAddress}, ${form.city}, ${form.province}.`,
    });

    setLoading(false);
    if (error) {
      toast({ title: "Error", description: "Failed to submit. Please try again.", variant: "destructive" });
    } else {
      setSubmitted(true);
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center text-center py-8 space-y-4">
        <CheckCircle className="w-14 h-14 text-primary" />
        <h2 className="text-xl font-heading font-bold text-foreground">Submission Received!</h2>
        <p className="text-sm text-muted-foreground">We'll be in touch shortly to finalize your warranty.</p>
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

      {/* Actions */}
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onBack} size="lg">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <Button type="submit" size="lg" disabled={!requiredFilled || loading} className="flex-1">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
          Submit
        </Button>
      </div>
    </form>
  );
}
