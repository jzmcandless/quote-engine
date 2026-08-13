import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { VehicleSelection, CoverageSelection, AdditionalDetails, AppliedSurcharge, ContactInfo } from "@/types/quote";
import { DollarSign, ChevronLeft, Loader2, RefreshCw, ShieldCheck, Send, HelpCircle } from "lucide-react";
import { getSessionCredentials, initSession } from "@/lib/quoteSession";
import { useToast } from "@/hooks/use-toast";

interface PriceResult {
  price: number | null;
  basePrice: number | null;
  deductibleCost: number | null;
  pricingUnavailable: boolean;
  surcharges: AppliedSurcharge[];
}

interface StepQuoteProps {
  vehicle: VehicleSelection;
  vehicleClass: string | null;
  coverage: CoverageSelection;
  details: AdditionalDetails;
  contact: ContactInfo;
  price: number | null;
  basePrice: number | null;
  deductibleCost: number | null;
  pricingUnavailable: boolean;
  surcharges: AppliedSurcharge[];
  onPriceGenerated: (result: PriceResult) => void;
  onBack: () => void;
  onRestart: () => void;
  onProceed: () => void;
}

export function StepQuote({ vehicle, vehicleClass, coverage, details, contact, price, basePrice, deductibleCost, pricingUnavailable, surcharges, onPriceGenerated, onBack, onRestart, onProceed }: StepQuoteProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (price !== null || pricingUnavailable) return;
    fetchPrice();
  }, []);

  async function requestCustomQuote() {
    setSubmitting(true);
    const creds = getSessionCredentials();
    if (!creds) {
      setSubmitting(false);
      toast({ title: "Session error", description: "Please refresh and try again.", variant: "destructive" });
      return;
    }
    const { data, error } = await supabase.functions.invoke("quote-submit", {
      body: {
        session_id: creds.session_id,
        write_token: creds.write_token,
        kind: "custom_request",
        contact: {
          first_name: contact.firstName.trim(),
          last_name: contact.lastName.trim(),
          email: contact.email.trim(),
          phone: contact.phone.trim(),
          vin: null,
        },
      },
    });
    setSubmitting(false);
    if (error || !data?.ok) {
      toast({ title: "Something went wrong", description: "Please try again later.", variant: "destructive" });
      return;
    }
    setSubmitted(true);
  }

  async function fetchPrice() {
    setLoading(true);
    await initSession();
    const creds = getSessionCredentials();
    if (!creds) { setLoading(false); return; }
    try {
      const { data, error } = await supabase.functions.invoke("quote-compute", {
        body: {
          session_id: creds.session_id,
          write_token: creds.write_token,
          vehicle,
          additional_details: details,
          coverage: {
            planId: coverage.planId,
            planName: coverage.planName,
            yearsCovered: coverage.yearsCovered,
            mileageCovered: coverage.mileageCovered,
            deductible: coverage.deductible,
          },
        },
      });
      if (!error && data) {
        onPriceGenerated({
          price: typeof data.price === "number" ? data.price : null,
          basePrice: typeof data.basePrice === "number" ? data.basePrice : null,
          deductibleCost: typeof data.deductibleCost === "number" ? data.deductibleCost : null,
          pricingUnavailable: data.reason === "pricing_unavailable" || typeof data.price !== "number",
          surcharges: (data.surcharges ?? []) as AppliedSurcharge[],
        });
      }
    } catch (err) {
      console.warn("[quote] compute failed", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading || (price === null && !pricingUnavailable)) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-muted-foreground font-medium">Generating your quote...</p>
      </div>
    );
  }


  if (pricingUnavailable || price === null) {
    if (submitted) {
      return (
        <div className="space-y-6">
          <div className="flex flex-col items-center text-center py-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Send className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-heading font-bold text-foreground mb-2">Request Submitted!</h2>
            <p className="text-muted-foreground max-w-sm">
              Thank you! Our team will confirm pricing for your vehicle and get back to you shortly.
            </p>
          </div>
          <Button variant="outline" onClick={onRestart} size="lg" className="w-full">
            <RefreshCw className="w-4 h-4 mr-1" /> Start a new quote
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center text-center py-4">
          <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mb-4">
            <HelpCircle className="w-8 h-8 text-accent-foreground" />
          </div>
          <h2 className="text-xl font-heading font-bold text-foreground mb-1">We need to confirm pricing</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            We couldn't confirm pricing online for your {vehicle.year} {vehicle.make} {vehicle.model}. Send us a request and our team will follow up with an exact quote.
          </p>
        </div>

        <div className="bg-card border rounded-lg p-4 space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Vehicle</span><span className="font-medium text-foreground">{vehicle.year} {vehicle.make} {vehicle.model}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Plan</span><span className="font-medium text-foreground">{coverage.planName}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Term</span><span className="font-medium text-foreground">{coverage.yearsCovered} {coverage.yearsCovered === 1 ? "Year" : "Years"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Mileage</span><span className="font-medium text-foreground">{coverage.mileageCovered.toLocaleString()} km</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Deductible</span><span className="font-medium text-foreground">{coverage.deductible}</span></div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} size="lg"><ChevronLeft className="w-4 h-4 mr-1" /> Back</Button>
          <Button onClick={requestCustomQuote} disabled={submitting} size="lg" className="flex-1">
            {submitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />} Request a custom quote
          </Button>
        </div>
      </div>
    );
  }

  const surchargeTotal = surcharges.reduce((s, x) => s + x.amount, 0);
  const showBreakdown = basePrice !== null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center py-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <ShieldCheck className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-heading font-bold text-foreground mb-1">Your Quote is Ready</h2>
        <p className="text-sm text-muted-foreground">Here's your personalized warranty quote</p>
      </div>

      <div className="bg-accent rounded-xl p-6 text-center">
        <p className="text-sm text-muted-foreground mb-1">Total Price</p>
        <div className="flex items-center justify-center gap-1">
          <DollarSign className="w-8 h-8 text-primary" />
          <span className="text-5xl font-heading font-bold text-foreground">{price.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      {showBreakdown && (
        <div className="bg-card border rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3">Price Breakdown</p>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Base coverage price</span>
              <span className="font-medium text-foreground">${basePrice!.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
            </div>
            {deductibleCost !== null && deductibleCost !== 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{coverage.deductible} deductible</span>
                <span className="font-medium text-foreground">+ ${deductibleCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            {surcharges.map((s) => (
              <div key={s.type} className="flex justify-between">
                <span className="text-muted-foreground">{s.label}</span>
                <span className="font-medium text-foreground">+ ${s.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
            <div className="flex justify-between pt-2 mt-1 border-t">
              <span className="font-semibold text-foreground">Total</span>
              <span className="font-semibold text-foreground">${price.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      )}

      <div className="bg-card border rounded-lg divide-y">
        <div className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Vehicle</p>
          <p className="font-semibold text-foreground">{vehicle.year} {vehicle.make} {vehicle.model}</p>
          <div className="space-y-1 mt-2 text-sm">
            {details.commercial_use === "Yes" && (
              <div className="flex justify-between"><span className="text-muted-foreground">Commercial Use</span><span className="font-medium text-foreground">Yes</span></div>
            )}
            {details.has_snowplow === "Yes" && (
              <div className="flex justify-between"><span className="text-muted-foreground">Snowplow Equipped</span><span className="font-medium text-foreground">Yes</span></div>
            )}
          </div>
        </div>
        <div className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Coverage</p>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Plan</span><span className="font-medium text-foreground">{coverage.planName}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Term</span><span className="font-medium text-foreground">{coverage.yearsCovered} {coverage.yearsCovered === 1 ? "Year" : "Years"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Mileage</span><span className="font-medium text-foreground">{coverage.mileageCovered.toLocaleString()} km</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Deductible</span><span className="font-medium text-foreground">{coverage.deductible}</span></div>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} size="lg"><ChevronLeft className="w-4 h-4 mr-1" /> Back</Button>
        <Button variant="outline" onClick={onRestart} size="lg"><RefreshCw className="w-4 h-4 mr-1" /> New Quote</Button>
        <Button onClick={onProceed} size="lg" className="flex-1">Proceed</Button>
      </div>
    </div>
  );
}
