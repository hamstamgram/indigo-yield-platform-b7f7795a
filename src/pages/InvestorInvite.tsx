import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Button, Input, Label,
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui";
import { useToast } from "@/hooks";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useVerifyInvestorInvite, useAcceptInvestorInvite } from "@/hooks/data";

const InvestorInvite = () => {
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get("code");
  const navigate = useNavigate();
  const { toast } = useToast();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const { data: inviteData, isLoading, error: verifyError } = useVerifyInvestorInvite(inviteCode);
  const acceptMutation = useAcceptInvestorInvite();

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!password || password.length < 6) {
      toast({
        title: "Invalid Password",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }

    if (!inviteCode || !inviteData?.email) return;

    acceptMutation.mutate({
      inviteCode,
      email: inviteData.email,
      password,
      firstName,
      lastName,
    });
  };

  // Handle navigation to login
  const goToLogin = () => {
    navigate("/login");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const validInvite = !!inviteData && !verifyError;
  const errorMessage = verifyError?.message || (!inviteCode ? "Invalid invitation link. No code provided." : null);

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <img
              src="/lovable-uploads/74aa0ccc-22f8-4892-9282-3991b5e10f4c.png"
              alt="Indigo Yield"
              className="h-12 w-auto"
              loading="lazy"
              decoding="async"
            />
          </div>
          <CardTitle className="text-2xl">Investor Invitation</CardTitle>
          <CardDescription>
            {validInvite
              ? `Accept your invitation to join as an investor`
              : `There was an issue with your invitation`}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {validInvite && !acceptMutation.isSuccess ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={inviteData.email} disabled readOnly className="bg-muted" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={acceptMutation.isPending}>
                {acceptMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Create Investor Account
              </Button>
            </form>
          ) : acceptMutation.isSuccess ? (
            <div className="text-center py-4 space-y-4">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
              <p className="text-lg font-medium">Account Created Successfully</p>
              <p className="text-muted-foreground">
                You will be redirected to your dashboard shortly.
              </p>
            </div>
          ) : (
            <div className="text-center py-4 space-y-4">
              <XCircle className="h-16 w-16 text-red-500 mx-auto" />
              <p className="text-lg font-medium">Invalid Invitation</p>
              <p className="text-muted-foreground">{errorMessage}</p>
            </div>
          )}
        </CardContent>

        {!validInvite && (
          <CardFooter>
            <Button className="w-full" onClick={goToLogin}>
              Go to Login
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
};

export default InvestorInvite;
