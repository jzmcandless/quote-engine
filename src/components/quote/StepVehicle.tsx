import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VehicleSelection } from "@/types/quote";
import { Car, ChevronRight } from "lucide-react";

interface StepVehicleProps {
  vehicle: VehicleSelection;
  onChange: (v: VehicleSelection) => void;
  onNext: () => void;
}

export function StepVehicle({ vehicle, onChange, onNext }: StepVehicleProps) {
  const [years, setYears] = useState<number[]>([]);
  const [makes, setMakes] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);

  useEffect(() => {
    supabase
      .from("vehicles")
      .select("year")
      .eq("active", true)
      .order("year", { ascending: false })
      .then(({ data }) => {
        if (data) {
          const unique = [...new Set(data.map((d) => d.year))];
          setYears(unique);
        }
      });
  }, []);

  useEffect(() => {
    if (!vehicle.year) { setMakes([]); return; }
    supabase
      .from("vehicles")
      .select("make")
      .eq("year", vehicle.year)
      .eq("active", true)
      .order("make")
      .then(({ data }) => {
        if (data) setMakes([...new Set(data.map((d) => d.make))]);
      });
  }, [vehicle.year]);

  useEffect(() => {
    if (!vehicle.year || !vehicle.make) { setModels([]); return; }
    supabase
      .from("vehicles")
      .select("model")
      .eq("year", vehicle.year)
      .eq("make", vehicle.make)
      .eq("active", true)
      .order("model")
      .then(({ data }) => {
        if (data) setModels([...new Set(data.map((d) => d.model))]);
      });
  }, [vehicle.year, vehicle.make]);

  const canProceed = vehicle.year && vehicle.make && vehicle.model;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
          <Car className="w-5 h-5 text-accent-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-heading font-bold text-foreground">Select Your Vehicle</h2>
          <p className="text-sm text-muted-foreground">Tell us about your vehicle to get started</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium mb-1.5 block">Year</Label>
          <Select
            value={vehicle.year?.toString() ?? ""}
            onValueChange={(v) => onChange({ year: Number(v), make: "", model: "" })}
          >
            <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm font-medium mb-1.5 block">Make</Label>
          <Select
            value={vehicle.make}
            onValueChange={(v) => onChange({ ...vehicle, make: v, model: "" })}
            disabled={!vehicle.year}
          >
            <SelectTrigger><SelectValue placeholder="Select make" /></SelectTrigger>
            <SelectContent>
              {makes.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm font-medium mb-1.5 block">Model</Label>
          <Select
            value={vehicle.model}
            onValueChange={(v) => onChange({ ...vehicle, model: v })}
            disabled={!vehicle.make}
          >
            <SelectTrigger><SelectValue placeholder="Select model" /></SelectTrigger>
            <SelectContent>
              {models.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button onClick={onNext} disabled={!canProceed} className="w-full" size="lg">
        Continue <ChevronRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );
}
