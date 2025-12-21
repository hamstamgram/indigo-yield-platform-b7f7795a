import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { WizardProvider, useWizard } from "./WizardContext";
import { WIZARD_STEPS, WizardStep } from "./types";
import IdentityStep from "./steps/IdentityStep";
import IBStep from "./steps/IBStep";
import FeesStep from "./steps/FeesStep";
import PositionsStep from "./steps/PositionsStep";
import ReviewStep from "./steps/ReviewStep";
import { Asset } from "@/types/investorTypes";
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
      case "positions":
        return <PositionsStep />;
      case "review":
        return <ReviewStep />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Step Indicator */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b">
        {WIZARD_STEPS.map((step, idx) => (
          <div key={step.id} className="flex items-center">
            <div
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors",
                idx < stepIndex
                  ? "bg-primary text-primary-foreground"
                  : idx === stepIndex
                  ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {idx + 1}
            </div>
            <span
              className={cn(
                "ml-2 text-sm hidden sm:inline",
                idx === stepIndex ? "font-medium" : "text-muted-foreground"
              )}
            >
              {step.label}
            </span>
            {idx < WIZARD_STEPS.length - 1 && (
              <div
                className={cn(
                  "w-8 sm:w-12 h-0.5 mx-2",
                  idx < stepIndex ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto min-h-[300px]">
        {renderStep()}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-6 mt-6 border-t">
        <Button
          type="button"
          variant="ghost"
          onClick={stepIndex === 0 ? onCancel : prevStep}
          disabled={isLoading}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          {stepIndex === 0 ? "Cancel" : "Back"}
        </Button>

        {isLastStep ? (
          <Button onClick={onSubmit} disabled={!canProceed || isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Investor"
            )}
          </Button>
        ) : (
          <Button onClick={nextStep} disabled={!canProceed}>
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
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

const AddInvestorWizard: React.FC<AddInvestorWizardProps> = ({
  assets,
  onSuccess,
  onCancel,
}) => {
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
      await createInvestorWithWizard(data);
      reset();
      onSuccess();
    } catch (error) {
      console.error("Wizard submit error:", error);
      throw error; // Will be caught by the dialog
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <WizardContent
      onSubmit={handleSubmit}
      isLoading={isLoading}
      onCancel={onCancel}
    />
  );
};

export default AddInvestorWizard;
