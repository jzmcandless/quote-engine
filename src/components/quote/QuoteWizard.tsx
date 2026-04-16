import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ProgressBar } from "./ProgressBar";
import { StepVehicle } from "./StepVehicle";
import { StepDetails } from "./StepDetails";
import { StepEligibility } from "./StepEligibility";
import { StepCoverage } from "./StepCoverage";
import { StepQuote } from "./StepQuote";
import { StepConfirm } from "./StepConfirm";
import { QuoteState, initialQuoteState } from "@/types/quote";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

export function QuoteWizard() {
  const [state, setState] = useState<QuoteState>(initialQuoteState);

  const goTo = (step: number) => setState((s) => ({ ...s, step }));

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-start px-4 py-8 sm:py-12">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-3">
          <ShieldCheck className="w-7 h-7 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">Extended Warranty Quote</h1>
        </div>
        <p className="text-muted-foreground text-sm sm:text-base">Get instant coverage pricing for your vehicle</p>
      </div>

      <ProgressBar currentStep={state.step} />

      <Card className="w-full max-w-lg shadow-elevated border">
        <CardContent className="p-6 sm:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={state.step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {state.step === 1 && (
                <StepVehicle
                  vehicle={state.vehicle}
                  onChange={(v) => setState((s) => ({ ...s, vehicle: v }))}
                  onNext={() => goTo(2)}
                />
              )}
              {state.step === 2 && (
                <StepDetails
                  details={state.additionalDetails}
                  onChange={(d) => setState((s) => ({ ...s, additionalDetails: d }))}
                  onNext={() => goTo(3)}
                  onBack={() => goTo(1)}
                />
              )}
              {state.step === 3 && (
                <StepEligibility
                  vehicle={state.vehicle}
                  details={state.additionalDetails}
                  isEligible={state.isEligible}
                  ineligibleMessage={state.ineligibleMessage}
                  onResult={(eligible, message, vehicleClass) =>
                    setState((s) => ({ ...s, isEligible: eligible, ineligibleMessage: message, vehicleClass }))
                  }
                  onNext={() => goTo(4)}
                  onBack={() => {
                    setState((s) => ({ ...s, isEligible: null, ineligibleMessage: "" }));
                    goTo(2);
                  }}
                />
              )}
              {state.step === 4 && (
                <StepCoverage
                  vehicleClass={state.vehicleClass}
                  coverage={state.coverage}
                  onChange={(c) => setState((s) => ({ ...s, coverage: c }))}
                  onNext={() => goTo(5)}
                  onBack={() => goTo(3)}
                />
              )}
              {state.step === 5 && (
                <StepQuote
                  vehicle={state.vehicle}
                  vehicleClass={state.vehicleClass}
                  coverage={state.coverage}
                  price={state.price}
                  onPriceGenerated={(price) => setState((s) => ({ ...s, price }))}
                  onBack={() => {
                    setState((s) => ({ ...s, price: null }));
                    goTo(4);
                  }}
                  onRestart={() => setState(initialQuoteState)}
                  onProceed={() => goTo(6)}
                />
              )}
              {state.step === 6 && (
                <StepConfirm
                  vehicle={state.vehicle}
                  details={state.additionalDetails}
                  coverage={state.coverage}
                  price={state.price!}
                  onBack={() => goTo(5)}
                  onRestart={() => setState(initialQuoteState)}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground mt-6 text-center">
        Quotes are estimates and may vary. Final pricing subject to verification.
      </p>
    </div>
  );
}
