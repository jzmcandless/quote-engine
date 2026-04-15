import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { VehicleSelection, CoverageSelection } from "@/types/quote";
import { DollarSign, ChevronLeft, Loader2, RefreshCw, ShieldCheck } from "lucide-react";

interface StepQuoteProps {
  vehicle: VehicleSelection;
  vehicleClass: string | null;
  coverage: CoverageSelection;
  price: number | null;
  onPriceGenerated: (price: number) => void;
  onBack: () => void;
  onRestart: () => void;
}

export function StepQuote({ vehicle, vehicleClass, coverage, price, onPriceGenerated, onBack, onRestart }: StepQuoteProps) {
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
    if (data) {
      const total = Number(data.price) + Number(data.deductible_cost || 0);
      onPriceGenerated(total);
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
      </div>
    </div>
  );
}
