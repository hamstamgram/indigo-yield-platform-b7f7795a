import React, { useState } from "react";
import { logError } from "@/lib/logger";
import { Button } from "@/components/ui";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { WizardProvider, useWizard } from "./WizardContext";
import { WIZARD_STEPS, WizardStep } from "./types";
import IdentityStep from "./steps/IdentityStep";
import IBStep from "./steps/IBStep";
import FeesStep from "./steps/FeesStep";
import ReviewStep from "./steps/ReviewStep";
import { AssetRef as Asset } from "@/types/asset";
import { cn } from "@/lib/utils";

interface WizardContentProps {
  onSubmit: () => Promise<void>;
  isLoading: boolean;
  onCancel: () => void;
}

const WizardContent: React.FC<WizardContentProps> = ({ onSubmit, isLoading, onCancel }) => {
  const { currentStep, stepIndex, nextStep, prevStep, canProceed, isLastStep } = useWizard();

  const renderStep = () => {
    switch (currentStep) {
      case "identity":
        return <IdentityStep />;
      case "ib":
        return <IBStep />;
      case "fees":
        return <FeesStep />;
      case "review":
        return <ReviewStep />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-between pb-6 border-b border-white/5 overflow-x-auto scrollbar-none">
        {WIZARD_STEPS.map((step, idx) => (
          <div key={step.id} className="flex items-center shrink-0">
            <div
              className={cn(
                "flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-bold transition-all duration-300",
                idx < stepIndex
                  ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30"
                  : idx === stepIndex
                    ? "bg-primary text-primary-foreground ring-4 ring-primary/20 scale-110 shadow-[0_0_15px_rgba(var(--primary),0.3)]"
                    : "bg-white/5 text-muted-foreground/50 border border-white/5"
              )}
            >
              {idx + 1}
            </div>
            <span
              className={cn(
                "ml-2.5 text-[11px] uppercase tracking-wider hidden sm:inline-block transition-colors duration-300",
                idx === stepIndex
                  ? "font-bold text-white shadow-sm"
                  : "text-muted-foreground/60 font-medium"
              )}
            >
              {step.label}
            </span>
            {idx < WIZARD_STEPS.length - 1 && (
              <div
                className={cn(
                  "w-6 sm:w-10 h-[1px] mx-3 transition-colors duration-500",
                  idx < stepIndex ? "bg-emerald-500/30" : "bg-white/5"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto min-h-[350px] pr-2 scrollbar-thin scrollbar-thumb-white/5">
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">{renderStep()}</div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center pt-6 border-t border-white/5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={stepIndex === 0 ? onCancel : prevStep}
          disabled={isLoading}
          className="text-xs text-muted-foreground hover:text-white transition-colors"
        >
          <ChevronLeft className="h-4 w-4 mr-1.5 opacity-70" />
          {stepIndex === 0 ? "Cancel Request" : "Back to Previous"}
        </Button>

        {isLastStep ? (
          <Button
            size="sm"
            onClick={onSubmit}
            disabled={!canProceed || isLoading}
            className="px-6 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/10 transition-all active:scale-95"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Finalizing...
              </>
            ) : (
              "Complete Onboarding"
            )}
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={nextStep}
            disabled={!canProceed}
            className="px-6 group transition-all"
          >
            Continue
            <ChevronRight className="h-4 w-4 ml-1.5 transition-transform group-hover:translate-x-0.5" />
          </Button>
        )}
      </div>
    </div>
  );
};

interface AddInvestorWizardProps {
  assets: Asset[];
  onSuccess: () => void;
  onCancel: () => void;
}

const AddInvestorWizard: React.FC<AddInvestorWizardProps> = ({ assets, onSuccess, onCancel }) => {
  return (
    <WizardProvider assets={assets}>
      <WizardContentWrapper onSuccess={onSuccess} onCancel={onCancel} />
    </WizardProvider>
  );
};

// Wrapper to access wizard context
const WizardContentWrapper: React.FC<{
  onSuccess: () => void;
  onCancel: () => void;
}> = ({ onSuccess, onCancel }) => {
  const { data, reset } = useWizard();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      // Import dynamically to avoid circular dependencies
      const { createInvestorWithWizard } = await import("@/services/admin/investorWizardService");
      const { toast } = await import("sonner");

      const result = await createInvestorWithWizard(data, (message, status) => {
        if (status === "info") toast.info(message);
        else if (status === "success") toast.success(message);
        else if (status === "error") toast.error(message);
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      reset();
      onSuccess();
    } catch (error) {
      logError("AddInvestorWizard.handleSubmit", error);
      throw error; // Will be caught by the dialog
    } finally {
      setIsLoading(false);
    }
  };

  return <WizardContent onSubmit={handleSubmit} isLoading={isLoading} onCancel={onCancel} />;
};

export default AddInvestorWizard;
