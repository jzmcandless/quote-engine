import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdditionalDetails } from "@/types/quote";
import { ClipboardList, ChevronLeft, ChevronRight } from "lucide-react";

interface FieldDef {
  id: string;
  field_name: string;
  label: string;
  input_type: string;
  options: string[] | null;
  required_for_eligibility: boolean;
  required_for_pricing: boolean;
}

interface StepDetailsProps {
  details: AdditionalDetails;
  onChange: (d: AdditionalDetails) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepDetails({ details, onChange, onNext, onBack }: StepDetailsProps) {
  const [fields, setFields] = useState<FieldDef[]>([]);

  useEffect(() => {
    supabase
      .from("additional_vehicle_fields")
      .select("*")
      .eq("active", true)
      .order("sort_order")
      .then(({ data }) => {
        if (data) {
          setFields(
            data.map((f) => ({
              ...f,
              options: f.options ? (f.options as string[]) : null,
            }))
          );
        }
      });
  }, []);

  const allRequired = fields.every((f) => {
    if (f.required_for_eligibility || f.required_for_pricing) {
      return details[f.field_name] !== undefined && details[f.field_name] !== "";
    }
    return true;
  });

  if (fields.length === 0) {
    // No additional fields, auto-advance
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-accent-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-heading font-bold text-foreground">Additional Details</h2>
            <p className="text-sm text-muted-foreground">No additional information needed</p>
          </div>
        </div>
        <p className="text-muted-foreground text-sm">Your vehicle selection is all we need. Continue to check eligibility.</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} size="lg"><ChevronLeft className="w-4 h-4 mr-1" /> Back</Button>
          <Button onClick={onNext} className="flex-1" size="lg">Check Eligibility <ChevronRight className="w-4 h-4 ml-1" /></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
          <ClipboardList className="w-5 h-5 text-accent-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-heading font-bold text-foreground">Additional Details</h2>
          <p className="text-sm text-muted-foreground">A few more details about your vehicle</p>
        </div>
      </div>

      <div className="space-y-4">
        {fields.map((field) => (
          <div key={field.id}>
            <Label className="text-sm font-medium mb-1.5 block">
              {field.label}
              {(field.required_for_eligibility || field.required_for_pricing) && (
                <span className="text-destructive ml-1">*</span>
              )}
            </Label>
            {field.input_type === "select" && field.options ? (
              <Select
                value={String(details[field.field_name] ?? "")}
                onValueChange={(v) => onChange({ ...details, [field.field_name]: v })}
              >
                <SelectTrigger><SelectValue placeholder="Select one" /></SelectTrigger>
                <SelectContent>
                  {field.options.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : field.input_type === "number" ? (
              <Input
                type="number"
                value={details[field.field_name] ?? ""}
                onChange={(e) => onChange({ ...details, [field.field_name]: e.target.value })}
                placeholder={`Enter ${field.label.toLowerCase()}`}
              />
            ) : (
              <Input
                type="text"
                value={String(details[field.field_name] ?? "")}
                onChange={(e) => onChange({ ...details, [field.field_name]: e.target.value })}
                placeholder={`Enter ${field.label.toLowerCase()}`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} size="lg"><ChevronLeft className="w-4 h-4 mr-1" /> Back</Button>
        <Button onClick={onNext} disabled={!allRequired} className="flex-1" size="lg">
          Check Eligibility <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
