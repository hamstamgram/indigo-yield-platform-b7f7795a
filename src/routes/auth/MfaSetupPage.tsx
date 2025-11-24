import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Smartphone, Mail, Loader2, CheckCircle2 } from "lucide-react";
import QRCode from "qrcode";
import { useEffect } from "react";

export default function MfaSetupPage() {
  const navigate = useNavigate();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);

  useEffect(() => {
    enrollMFA();
  }, []);

  const enrollMFA = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
      });

      if (error) throw error;

      if (data) {
        setSecret(data.totp.secret);
        const qrCodeUri = data.totp.qr_code;
        const qrCode = await QRCode.toDataURL(qrCodeUri);
        setQrCodeUrl(qrCode);
      }
    } catch (error: any) {
      console.error("MFA enrollment error:", error);
      toast.error("Failed to initialize MFA setup");
    }
  };

  const handleVerifyTotp = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }

    setIsLoading(true);
    try {
      const factors = await supabase.auth.mfa.listFactors();
      if (factors.data?.totp && factors.data.totp.length > 0) {
        const factorId = factors.data.totp[0].id;

        const { error } = await supabase.auth.mfa.challengeAndVerify({
          factorId,
          code: verificationCode,
        });

        if (error) throw error;

        setSetupComplete(true);
        toast.success("MFA setup complete!");

        setTimeout(() => {
          navigate("/dashboard");
        }, 2000);
      }
    } catch (error: any) {
      console.error("MFA verification error:", error);
      toast.error("Invalid verification code");
    } finally {
      setIsLoading(false);
    }
  };

  if (setupComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-blue-50 to-indigo-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto" />
            <CardTitle className="text-2xl font-bold">MFA Enabled!</CardTitle>
            <CardDescription>
              Your account is now protected with multi-factor authentication.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-blue-50 to-indigo-50">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Set Up Multi-Factor Authentication</CardTitle>
          <CardDescription>Add an extra layer of security to your account</CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="totp" className="w-full">
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="totp">
                <Smartphone className="h-4 w-4 mr-2" />
                Authenticator App
              </TabsTrigger>
            </TabsList>

            <TabsContent value="totp" className="space-y-6 pt-6">
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Step 1: Install an Authenticator App</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Download one of these apps on your phone:
                  </p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                    <li>Google Authenticator (iOS/Android)</li>
                    <li>Authy (iOS/Android)</li>
                    <li>Microsoft Authenticator (iOS/Android)</li>
                  </ul>
                </div>

                <div className="bg-muted p-4 rounded-lg">
                  <h3 className="font-medium mb-4">Step 2: Scan QR Code</h3>
                  <div className="flex justify-center mb-4">
                    {qrCodeUrl ? (
                      <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
                    ) : (
                      <div className="w-48 h-48 bg-background flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground text-center">
                      Or enter this key manually:
                    </p>
                    <div className="bg-background p-2 rounded border">
                      <code className="text-xs font-mono break-all">{secret}</code>
                    </div>
                  </div>
                </div>

                <div className="bg-muted p-4 rounded-lg">
                  <h3 className="font-medium mb-4">Step 3: Enter Verification Code</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="code">6-Digit Code from App</Label>
                      <Input
                        id="code"
                        placeholder="000000"
                        maxLength={6}
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                        disabled={isLoading}
                      />
                    </div>

                    <Button
                      className="w-full"
                      onClick={handleVerifyTotp}
                      disabled={isLoading || verificationCode.length !== 6}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        "Verify and Enable MFA"
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                <Button variant="ghost" onClick={() => navigate("/dashboard")}>
                  Skip for now
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
