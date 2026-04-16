import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { VehicleSelection, CoverageSelection, AdditionalDetails, AppliedSurcharge } from "@/types/quote";
import { DollarSign, ChevronLeft, Loader2, RefreshCw, ShieldCheck } from "lucide-react";

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
    const query = supabase
      .from("coverage_pricing")
      .select("price, deductible_cost, rental_plus")
      .eq("plan_id", coverage.planId)
      .eq("years_covered", coverage.yearsCovered)
      .eq("mileage_covered", coverage.mileageCovered)
      .eq("deductible", coverage.deductible)
      .eq("active", true);

    if (vehicleClass) query.eq("vehicle_class", vehicleClass);

    const { data } = await query.limit(1).single();

    // Fetch surcharges for this plan
    const { data: surchargeRows } = await supabase
      .from("surcharges")
      .select("surcharge_type, mileage_threshold, amount")
      .eq("plan_id", coverage.planId)
      .eq("active", true);

    const applied: AppliedSurcharge[] = [];

    if (surchargeRows) {
      // Timeframe surcharge: mileage > 20000 OR purchase_timeframe is "Between 12 and 36 months"
      const mileage = Number(details.mileage || 0);
      const purchaseTimeframe = String(details.purchase_timeframe || "");
      const timeframeApplies = mileage > 20000 || purchaseTimeframe === "Between 12 and 36 months";
      
      if (timeframeApplies) {
        const row = surchargeRows.find((r: any) => r.surcharge_type === "timeframe");
        if (row) applied.push({ type: "timeframe", label: "Timeframe/Mileage Surcharge", amount: Number(row.amount) });
      }

      // Commercial surcharge
      if (String(details.commercial_use) === "Yes") {
        const row = surchargeRows.find((r: any) => r.surcharge_type === "commercial");
        if (row) applied.push({ type: "commercial", label: "Commercial Vehicle Surcharge", amount: Number(row.amount) });
      }

      // Snowplow surcharge - match by mileage_covered
      if (String(details.has_snowplow) === "Yes") {
        const snowplowRow = surchargeRows.find(
          (r: any) => r.surcharge_type === "snowplow" && r.mileage_threshold === coverage.mileageCovered
        );
        if (snowplowRow) {
          applied.push({ type: "snowplow", label: `Snowplow Surcharge (${coverage.mileageCovered.toLocaleString()} km)`, amount: Number(snowplowRow.amount) });
        }
      }
    }

    if (data) {
      const basePrice = Number(data.price) + Number(data.deductible_cost || 0);
      const surchargeTotal = applied.reduce((sum, s) => sum + s.amount, 0);
      onPriceGenerated(basePrice + surchargeTotal, applied);
    }
    setLoading(false);
  }

  if (loading || price === null) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-muted-foreground font-medium">Generating your quote...</p>
      </div>
    );
  }

  const surchargeTotal = surcharges.reduce((sum, s) => sum + s.amount, 0);
  const basePrice = price - surchargeTotal;

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
          {details.commercial_use === "Yes" && <p className="text-xs text-muted-foreground mt-1">Commercial Use</p>}
          {details.has_snowplow === "Yes" && <p className="text-xs text-muted-foreground mt-1">Snowplow Equipped</p>}
        </div>
        <div className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Coverage</p>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Plan</span><span className="font-medium text-foreground">{coverage.planName}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Term</span><span className="font-medium text-foreground">{coverage.yearsCovered} {coverage.yearsCovered === 1 ? "Year" : "Years"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Mileage</span><span className="font-medium text-foreground">{coverage.mileageCovered.toLocaleString()} km</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Deductible</span><span className="font-medium text-foreground">{coverage.deductible}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Base Price</span><span className="font-medium text-foreground">${basePrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span></div>
          </div>
        </div>
        {surcharges.length > 0 && (
          <div className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Surcharges</p>
            <div className="space-y-1.5 text-sm">
              {surcharges.map((s) => (
                <div key={s.type} className="flex justify-between">
                  <span className="text-muted-foreground">{s.label}</span>
                  <span className="font-medium text-foreground">${s.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} size="lg"><ChevronLeft className="w-4 h-4 mr-1" /> Back</Button>
        <Button variant="outline" onClick={onRestart} size="lg"><RefreshCw className="w-4 h-4 mr-1" /> New Quote</Button>
        <Button onClick={onProceed} size="lg" className="flex-1">Proceed</Button>
      </div>
    </div>
  );
}
