import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { VehicleSelection, CoverageSelection, AdditionalDetails, AppliedSurcharge } from "@/types/quote";
import { DollarSign, ChevronLeft, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { getSessionCredentials, initSession } from "@/lib/quoteSession";

interface StepQuoteProps {
  vehicle: VehicleSelection;
  vehicleClass: string | null;
  coverage: CoverageSelection;
  details: AdditionalDetails;
  price: number | null;
  surcharges: AppliedSurcharge[];
  onPriceGenerated: (price: number, surcharges: AppliedSurcharge[]) => void;
  onBack: () => void;
  onRestart: () => void;
  onProceed: () => void;
}

export function StepQuote({ vehicle, vehicleClass, coverage, details, price, surcharges, onPriceGenerated, onBack, onRestart, onProceed }: StepQuoteProps) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (price !== null) return;
    fetchPrice();
  }, []);

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
      if (!error && data && typeof data.price === "number") {
        onPriceGenerated(data.price, (data.surcharges ?? []) as AppliedSurcharge[]);
      }
    } catch (err) {
      console.warn("[quote] compute failed", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading || price === null) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-muted-foreground font-medium">Generating your quote...</p>
      </div>
    );
  }


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
