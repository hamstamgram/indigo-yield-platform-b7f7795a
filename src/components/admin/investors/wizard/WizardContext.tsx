import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { WizardFormData, WizardStep, getDefaultWizardData, WIZARD_STEPS } from "./types";
import { AssetRef as Asset } from "@/types/asset";

interface WizardContextType {
  data: WizardFormData;
  currentStep: WizardStep;
  stepIndex: number;
  assets: Asset[];
  updateData: <K extends keyof WizardFormData>(key: K, value: WizardFormData[K]) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: WizardStep) => void;
  canProceed: boolean;
  setCanProceed: (can: boolean) => void;
  isLastStep: boolean;
  reset: () => void;
}

const WizardContext = createContext<WizardContextType | undefined>(undefined);

interface WizardProviderProps {
  children: ReactNode;
  assets: Asset[];
}

export const WizardProvider: React.FC<WizardProviderProps> = ({ children, assets }) => {
  const [data, setData] = useState<WizardFormData>(getDefaultWizardData());
  const [stepIndex, setStepIndex] = useState(0);
  const [canProceed, setCanProceed] = useState(false);

  const currentStep = WIZARD_STEPS[stepIndex].id;
  const isLastStep = stepIndex === WIZARD_STEPS.length - 1;

  const updateData = useCallback(<K extends keyof WizardFormData>(key: K, value: WizardFormData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const nextStep = useCallback(() => {
    if (stepIndex < WIZARD_STEPS.length - 1) {
      setStepIndex((prev) => prev + 1);
      setCanProceed(false);
    }
  }, [stepIndex]);

  const prevStep = useCallback(() => {
    if (stepIndex > 0) {
      setStepIndex((prev) => prev - 1);
    }
  }, [stepIndex]);

  const goToStep = useCallback((step: WizardStep) => {
    const index = WIZARD_STEPS.findIndex((s) => s.id === step);
    if (index !== -1) {
      setStepIndex(index);
    }
  }, []);

  const reset = useCallback(() => {
    setData(getDefaultWizardData());
    setStepIndex(0);
    setCanProceed(false);
  }, []);

  return (
    <WizardContext.Provider
      value={{
        data,
        currentStep,
        stepIndex,
        assets,
        updateData,
        nextStep,
        prevStep,
        goToStep,
        canProceed,
        setCanProceed,
        isLastStep,
        reset,
      }}
    >
      {children}
    </WizardContext.Provider>
  );
};

export const useWizard = (): WizardContextType => {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error("useWizard must be used within a WizardProvider");
  }
  return context;
};
