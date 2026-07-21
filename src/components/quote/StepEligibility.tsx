import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VehicleSelection, AdditionalDetails } from "@/types/quote";
import { ShieldCheck, ShieldX, ChevronLeft, ChevronRight, Loader2, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { patchSession, getSessionCredentials, initSession } from "@/lib/quoteSession";

interface StepEligibilityProps {
  vehicle: VehicleSelection;
  details: AdditionalDetails;
  isEligible: boolean | null;
  ineligibleMessage: string;
  onResult: (eligible: boolean, message: string, vehicleClass: string | null) => void;
  onNext: () => void;
  onBack: () => void;
  onRestart: () => void;
}

export function StepEligibility({ vehicle, details, isEligible, ineligibleMessage, onResult, onNext, onBack, onRestart }: StepEligibilityProps) {
  const [checking, setChecking] = useState(false);
  const [contactForm, setContactForm] = useState({ firstName: "", lastName: "", email: "", phone: "", vin: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isEligible !== null) return;
    checkEligibility();
  }, []);

  async function checkEligibility() {
    setChecking(true);
    await initSession();
    const creds = getSessionCredentials();
    if (!creds) {
      setChecking(false);
      onResult(false, "Session error. Please refresh and try again.", null);
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("quote-compute", {
        body: {
          session_id: creds.session_id,
          write_token: creds.write_token,
          vehicle,
          additional_details: details,
        },
      });
      if (error || !data) throw error ?? new Error("compute failed");
      onResult(!!data.eligible, data.ineligibleMessage || "", data.vehicleClass ?? null);
    } catch (err) {
      console.warn("[eligibility] failed", err);
      onResult(false, "Unable to check eligibility right now. Please try again.", null);
    } finally {
      setChecking(false);
    }
  }

  async function handleContactSubmit(e: React.FormEvent) {
    e.preventDefault();
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
          first_name: contactForm.firstName.trim(),
          last_name: contactForm.lastName.trim(),
          email: contactForm.email.trim(),
          phone: contactForm.phone.trim(),
          vin: contactForm.vin.trim() || null,
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

  const canSubmit = contactForm.firstName.trim() && contactForm.lastName.trim() && contactForm.email.trim() && contactForm.phone.trim();

  if (checking) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-muted-foreground font-medium">Checking vehicle eligibility...</p>
      </div>
    );
  }

  if (isEligible === false) {
    if (submitted) {
      return (
        <div className="space-y-6">
          <div className="flex flex-col items-center text-center py-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Send className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-heading font-bold text-foreground mb-2">Request Submitted!</h2>
            <p className="text-muted-foreground max-w-sm">
              Thank you! Our team will review your information and get back to you with a custom warranty quote.
            </p>
          </div>
          <Button variant="outline" onClick={onBack} size="lg" className="w-full">
            <ChevronLeft className="w-4 h-4 mr-1" /> Start Over
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center text-center py-4">
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mb-3">
            <ShieldX className="w-7 h-7 text-destructive" />
          </div>
          <h2 className="text-xl font-heading font-bold text-foreground mb-1">Request a Custom Warranty Quote</h2>
          <p className="text-muted-foreground text-sm max-w-sm">
            Your {vehicle.make} {vehicle.model} is not eligible for an online quote. Please contact us for a custom warranty quote.
          </p>
        </div>

        <form onSubmit={handleContactSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium mb-1.5 block">
                First Name <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="First Name"
                value={contactForm.firstName}
                onChange={(e) => setContactForm({ ...contactForm, firstName: e.target.value })}
                onBlur={(e) => patchSession({ first_name: e.target.value.trim() || null })}
                maxLength={100}
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-1.5 block">
                Last Name <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="Last Name"
                value={contactForm.lastName}
                onChange={(e) => setContactForm({ ...contactForm, lastName: e.target.value })}
                onBlur={(e) => patchSession({ last_name: e.target.value.trim() || null })}
                maxLength={100}
              />
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium mb-1.5 block">
              Email Address <span className="text-destructive">*</span>
            </Label>
            <Input
              type="email"
              placeholder="Email Address"
              value={contactForm.email}
              onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
              onBlur={(e) => patchSession({ email: e.target.value.trim() || null })}
              maxLength={255}
            />
          </div>
          <div>
            <Label className="text-sm font-medium mb-1.5 block">
              Phone <span className="text-destructive">*</span>
            </Label>
            <Input
              type="tel"
              placeholder="Phone"
              value={contactForm.phone}
              onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
              onBlur={(e) => patchSession({ phone: e.target.value.trim() || null })}
              maxLength={20}
            />
          </div>
          <div>
            <Label className="text-sm font-medium mb-1.5 block">VIN</Label>
            <Input
              placeholder="VIN"
              value={contactForm.vin}
              onChange={(e) => setContactForm({ ...contactForm, vin: e.target.value })}
              maxLength={17}
            />
          </div>

          <Button type="submit" disabled={!canSubmit || submitting} className="w-full" size="lg">
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Submit Request
          </Button>
        </form>

        <Button variant="outline" onClick={onBack} size="lg" className="w-full">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
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
