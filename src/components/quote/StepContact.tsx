import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ContactInfo } from "@/types/quote";
import { ChevronLeft, ChevronRight, User } from "lucide-react";
import { patchSession } from "@/lib/quoteSession";

const contactSchema = z.object({
  firstName: z.string().trim().min(1, "Required").max(100),
  lastName: z.string().trim().min(1, "Required").max(100),
  phone: z.string().trim().min(5, "Required").max(30),
  email: z.string().trim().email("Invalid email").max(255),
});

interface StepContactProps {
  contact: ContactInfo;
  onChange: (c: ContactInfo) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepContact({ contact, onChange, onNext, onBack }: StepContactProps) {
  const [errors, setErrors] = useState<Partial<Record<keyof ContactInfo, string>>>({});

  const update = (key: keyof ContactInfo, value: string) => {
    onChange({ ...contact, [key]: value });
  };

  const handleBlur = (key: keyof ContactInfo) => {
    const dbKeyMap: Record<keyof ContactInfo, string> = {
      firstName: "first_name",
      lastName: "last_name",
      phone: "phone",
      email: "email",
    };
    patchSession({ [dbKeyMap[key]]: contact[key].trim() || null });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = contactSchema.safeParse(contact);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof ContactInfo, string>> = {};
      result.error.issues.forEach((issue) => {
        const key = issue.path[0] as keyof ContactInfo;
        fieldErrors[key] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    onChange({
      firstName: result.data.firstName,
      lastName: result.data.lastName,
      phone: result.data.phone,
      email: result.data.email,
    });
    patchSession({
      first_name: result.data.firstName,
      last_name: result.data.lastName,
      phone: result.data.phone,
      email: result.data.email,
    });
    onNext();
  };

  const fields: { key: keyof ContactInfo; label: string; type: string; autoComplete: string }[] = [
    { key: "firstName", label: "First Name", type: "text", autoComplete: "given-name" },
    { key: "lastName", label: "Last Name", type: "text", autoComplete: "family-name" },
    { key: "phone", label: "Phone Number", type: "tel", autoComplete: "tel" },
    { key: "email", label: "Email", type: "email", autoComplete: "email" },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <User className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-heading font-bold text-foreground">Your Contact Info</h2>
          <p className="text-sm text-muted-foreground">We'll use this to send your quote and follow up.</p>
        </div>
      </div>

      <div className="space-y-4">
        {fields.map((f) => (
          <div key={f.key}>
            <Label htmlFor={f.key}>{f.label}</Label>
            <Input
              id={f.key}
              type={f.type}
              autoComplete={f.autoComplete}
              value={contact[f.key]}
              onChange={(e) => update(f.key, e.target.value)}
              onBlur={() => handleBlur(f.key)}
              className="mt-1"
              required
            />
            {errors[f.key] && (
              <p className="text-xs text-destructive mt-1">{errors[f.key]}</p>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onBack} size="lg">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <Button type="submit" size="lg" className="flex-1">
          Continue <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </form>
  );
}
