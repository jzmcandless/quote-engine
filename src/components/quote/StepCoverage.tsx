import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CoverageSelection } from "@/types/quote";
import { Shield, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Plan {
  id: string;
  name: string;
  description: string | null;
}

interface StepCoverageProps {
  vehicleClass: string | null;
  coverage: CoverageSelection;
  onChange: (c: CoverageSelection) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepCoverage({ vehicleClass, coverage, onChange, onNext, onBack }: StepCoverageProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [yearsOptions, setYearsOptions] = useState<number[]>([]);
  const [mileageOptions, setMileageOptions] = useState<number[]>([]);
  const [deductibleOptions, setDeductibleOptions] = useState<number[]>([]);

  useEffect(() => {
    supabase
      .from("plans")
      .select("*")
      .eq("active", true)
      .then(({ data }) => {
        if (data) setPlans(data);
      });
  }, []);

  useEffect(() => {
    if (!coverage.planId) return;
    const query = supabase
      .from("coverage_pricing")
      .select("years_covered, mileage_covered, deductible")
      .eq("plan_id", coverage.planId)
      .eq("active", true);

    if (vehicleClass) query.eq("vehicle_class", vehicleClass);

    query.then(({ data }) => {
      if (data) {
        setYearsOptions([...new Set(data.map((d) => d.years_covered))].sort((a, b) => a - b));
        setMileageOptions([...new Set(data.map((d) => d.mileage_covered))].sort((a, b) => a - b));
        setDeductibleOptions([...new Set(data.map((d) => d.deductible))].sort((a, b) => a - b));
      }
    });
  }, [coverage.planId, vehicleClass]);

  const canProceed = coverage.planId && coverage.yearsCovered && coverage.mileageCovered && coverage.deductible;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
          <Shield className="w-5 h-5 text-accent-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-heading font-bold text-foreground">Choose Your Coverage</h2>
          <p className="text-sm text-muted-foreground">Select the plan that fits your needs</p>
        </div>
      </div>

      {/* Plan selection */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Warranty Plan</Label>
        <div className="grid gap-3">
          {plans.map((plan) => (
            <button
              key={plan.id}
              onClick={() => onChange({ ...coverage, planId: plan.id, planName: plan.name, yearsCovered: 0, mileageCovered: 0, deductible: 0 })}
              className={cn(
                "text-left p-4 rounded-lg border-2 transition-all",
                coverage.planId === plan.id
                  ? "border-primary bg-accent shadow-glow"
                  : "border-border hover:border-primary/40"
              )}
            >
              <p className="font-semibold text-foreground">{plan.name}</p>
              {plan.description && <p className="text-sm text-muted-foreground mt-0.5">{plan.description}</p>}
            </button>
          ))}
        </div>
      </div>

      {coverage.planId && (
        <>
          <div>
            <Label className="text-sm font-medium mb-1.5 block">Coverage Term</Label>
            <Select
              value={coverage.yearsCovered ? coverage.yearsCovered.toString() : ""}
              onValueChange={(v) => onChange({ ...coverage, yearsCovered: Number(v) })}
            >
              <SelectTrigger><SelectValue placeholder="Select years" /></SelectTrigger>
              <SelectContent>
                {yearsOptions.map((y) => (
                  <SelectItem key={y} value={y.toString()}>{y} {y === 1 ? "Year" : "Years"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium mb-1.5 block">Mileage Coverage</Label>
            <Select
              value={coverage.mileageCovered ? coverage.mileageCovered.toString() : ""}
              onValueChange={(v) => onChange({ ...coverage, mileageCovered: Number(v) })}
            >
              <SelectTrigger><SelectValue placeholder="Select mileage" /></SelectTrigger>
              <SelectContent>
                {mileageOptions.map((m) => (
                  <SelectItem key={m} value={m.toString()}>{m.toLocaleString()} km</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium mb-1.5 block">Deductible</Label>
            <Select
              value={coverage.deductible ? coverage.deductible.toString() : ""}
              onValueChange={(v) => onChange({ ...coverage, deductible: Number(v) })}
            >
              <SelectTrigger><SelectValue placeholder="Select deductible" /></SelectTrigger>
              <SelectContent>
                {deductibleOptions.map((d) => (
                  <SelectItem key={d} value={d.toString()}>${d.toLocaleString()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} size="lg"><ChevronLeft className="w-4 h-4 mr-1" /> Back</Button>
        <Button onClick={onNext} disabled={!canProceed} className="flex-1" size="lg">
          Get Quote <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
