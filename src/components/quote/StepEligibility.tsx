import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { VehicleSelection, AdditionalDetails } from "@/types/quote";
import { ShieldCheck, ShieldX, ChevronLeft, ChevronRight, Loader2, Phone } from "lucide-react";

interface StepEligibilityProps {
  vehicle: VehicleSelection;
  details: AdditionalDetails;
  isEligible: boolean | null;
  ineligibleMessage: string;
  onResult: (eligible: boolean, message: string, vehicleClass: string | null) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepEligibility({ vehicle, details, isEligible, ineligibleMessage, onResult, onNext, onBack }: StepEligibilityProps) {
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (isEligible !== null) return;
    checkEligibility();
  }, []);

  async function checkEligibility() {
    setChecking(true);

    // Get vehicle class
    const { data: vehicleData } = await supabase
      .from("vehicles")
      .select("vehicle_class")
      .eq("year", vehicle.year!)
      .eq("make", vehicle.make)
      .eq("model", vehicle.model)
      .eq("drivetrain", vehicle.drivetrain)
      .eq("fuel_type", vehicle.fuelType)
      .single();

    const vehicleClass = vehicleData?.vehicle_class ?? null;

    // Check eligibility rules
    const { data: rules } = await supabase
      .from("eligibility_rules")
      .select("*")
      .eq("active", true);

    if (!rules || rules.length === 0) {
      // No rules = eligible by default
      onResult(true, "", vehicleClass);
      setChecking(false);
      return;
    }

    // Find matching rules
    for (const rule of rules) {
      const makeMatch = !rule.make || rule.make === vehicle.make;
      const modelMatch = !rule.model || rule.model === vehicle.model;
      const yearMin = !rule.min_year || vehicle.year! >= rule.min_year;
      const yearMax = !rule.max_year || vehicle.year! <= rule.max_year;
      const mileageOk = !rule.max_mileage || !details.mileage || Number(details.mileage) <= rule.max_mileage;

      if (makeMatch && modelMatch && yearMin && yearMax && mileageOk) {
        if (!rule.eligible) {
          onResult(false, rule.ineligible_message || "This vehicle is not eligible for coverage.", vehicleClass);
          setChecking(false);
          return;
        }
      }
    }

    onResult(true, "", vehicleClass);
    setChecking(false);
  }

  if (checking) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-muted-foreground font-medium">Checking vehicle eligibility...</p>
      </div>
    );
  }

  if (isEligible === false) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center text-center py-6">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <ShieldX className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-heading font-bold text-foreground mb-2">Vehicle Not Eligible</h2>
          <p className="text-muted-foreground max-w-sm">{ineligibleMessage}</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <p className="text-sm text-muted-foreground mb-2">Have questions? Our team can help.</p>
          <Button variant="outline" size="sm">
            <Phone className="w-4 h-4 mr-2" /> Contact Us
          </Button>
        </div>
        <Button variant="outline" onClick={onBack} size="lg" className="w-full">
          <ChevronLeft className="w-4 h-4 mr-1" /> Try Another Vehicle
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center py-6">
        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
          <ShieldCheck className="w-8 h-8 text-success" />
        </div>
        <h2 className="text-xl font-heading font-bold text-foreground mb-2">Your Vehicle Qualifies!</h2>
        <p className="text-muted-foreground">
          Great news — your {vehicle.year} {vehicle.make} {vehicle.model} is eligible for extended warranty coverage.
        </p>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} size="lg"><ChevronLeft className="w-4 h-4 mr-1" /> Back</Button>
        <Button onClick={onNext} className="flex-1" size="lg">
          Choose Coverage <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
