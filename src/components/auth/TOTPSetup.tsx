import { useState, useEffect, useCallback } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  Button, Input, Label,
  Alert, AlertDescription,
  Separator,
} from "@/components/ui";
import { toast } from "sonner";
import {
  Shield,
  Smartphone,
  CheckCircle,
  AlertCircle,
  QrCode,
  RefreshCw,
  X,
} from "lucide-react";

import { TOTPService } from "@/lib/auth/totp-service";
import { useAuth } from "@/lib/auth/context";

interface TOTPSetupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

interface SetupStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

export function TOTPSetup({ open, onOpenChange, onComplete }: TOTPSetupProps) {
  const { user } = useAuth();

  const [currentStep, setCurrentStep] = useState(0);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [factorId, setFactorId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<SetupStep[]>([
    {
      id: "generate",
      title: "Generate Secret",
      description: "Generate your unique TOTP secret",
      completed: false,
    },
    {
      id: "scan",
      title: "Scan QR Code",
      description: "Scan the QR code with your authenticator app",
      completed: false,
    },
    {
      id: "verify",
      title: "Verify Setup",
      description: "Enter a code from your authenticator app",
      completed: false,
    },
  ]);

  const supportedApps = [
    { name: "Google Authenticator", icon: "🔐" },
    { name: "Microsoft Authenticator", icon: "🔒" },
    { name: "Authy", icon: "🛡️" },
    { name: "1Password", icon: "🔑" },
  ];

  const updateStepCompletion = (stepIndex: number, completed: boolean) => {
    setSteps((prev) =>
      prev.map((step, index) => (index === stepIndex ? { ...step, completed } : step))
    );
  };

  const initializeSetup = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      // Generate secret and initialize TOTP
      const result = await TOTPService.enroll();
      if (!result || !result.secret) {
        throw new Error("Failed to generate TOTP secret");
      }
      setFactorId(result.id);

      // Use the QR code provided by Supabase
      if (result.qrCode) {
        setQrCodeUrl(result.qrCode);
      } else {
        throw new Error("Failed to generate QR code");
      }

      // Mark first step as completed
      updateStepCompletion(0, true);
      setCurrentStep(1);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to initialize 2FA setup";
      setError(errorMessage);
      toast.error("Setup Error", {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (open && currentStep === 0) {
      initializeSetup();
    }
  }, [open, currentStep, initializeSetup]);

  const verifyCode = async () => {
    if (!user?.id || !verificationCode) {
      setError("Please enter a verification code");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Complete TOTP setup with verification
      await TOTPService.verifySetup(factorId, verificationCode);

      updateStepCompletion(2, true);
      finishSetup();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Verification failed";
      setError(errorMessage);
      toast.error("Verification Failed", {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const finishSetup = () => {
    toast.success("2FA Setup Complete", {
      description: "Your account is now secured with two-factor authentication",
    });
    onComplete();
    onOpenChange(false);
  };

  const resetSetup = () => {
    setCurrentStep(0);
    setQrCodeUrl("");
    setVerificationCode("");
    setError(null);
    setSteps((prev) => prev.map((step) => ({ ...step, completed: false })));
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Initializing 2FA setup...</p>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">Install an Authenticator App</h3>
              <p className="text-gray-600 mb-4">Choose one of these popular authenticator apps:</p>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {supportedApps.map((app) => (
                  <div
                    key={app.name}
                    className="flex items-center p-3 border rounded-lg bg-gray-50"
                  >
                    <span className="text-2xl mr-3">{app.icon}</span>
                    <span className="text-sm font-medium">{app.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="text-center">
              <h3 className="text-lg font-medium mb-4">Scan this QR Code</h3>
              {qrCodeUrl && (
                <div className="inline-block p-4 border-2 border-dashed border-gray-300 rounded-lg">
                  <img src={qrCodeUrl} alt="TOTP QR Code" className="max-w-64 max-h-64 mx-auto" />
                </div>
              )}

              <Alert className="mt-4">
                <QrCode className="h-4 w-4" />
                <AlertDescription>
                  Open your authenticator app and scan this QR code to add your account.
                </AlertDescription>
              </Alert>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(2)} disabled={isLoading}>
                Skip to Manual Entry
              </Button>
              <Button onClick={() => setCurrentStep(2)} disabled={isLoading}>
                I've Scanned the Code
              </Button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Smartphone className="h-12 w-12 mx-auto text-blue-600 mb-4" />
              <h3 className="text-lg font-medium mb-2">Verify Your Setup</h3>
              <p className="text-gray-600 mb-6">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="verification-code">Verification Code</Label>
                <Input
                  id="verification-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="000000"
                  className="text-center text-lg tracking-widest"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(1)} disabled={isLoading}>
                Back to QR Code
              </Button>
              <Button onClick={verifyCode} disabled={isLoading || verificationCode.length !== 6}>
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify Code"
                )}
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Set Up Two-Factor Authentication
              </DialogTitle>
              <DialogDescription>
                Secure your account with an additional layer of protection
              </DialogDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex justify-between mb-6">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`
                flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                ${
                  step.completed
                    ? "bg-green-600 text-white"
                    : index === currentStep
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-600"
                }
              `}
              >
                {step.completed ? <CheckCircle className="h-4 w-4" /> : index + 1}
              </div>
              <div className="ml-2 hidden sm:block">
                <div className="text-sm font-medium">{step.title}</div>
                <div className="text-xs text-gray-500">{step.description}</div>
              </div>
              {index < steps.length - 1 && (
                <div className="w-8 h-px bg-gray-300 mx-4 hidden sm:block"></div>
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="min-h-[400px]">{renderStepContent()}</div>

        {/* Footer Actions */}
        {currentStep > 0 && currentStep < 3 && (
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={resetSetup} disabled={isLoading}>
              Start Over
            </Button>
            <div className="text-sm text-gray-500">
              Step {currentStep + 1} of {steps.length}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
