import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

const AdminInvite = () => {
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get("code");
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [validInvite, setValidInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // Verify the invite code
  useEffect(() => {
    const verifyInvite = async () => {
      if (!inviteCode) {
        setValidInvite(false);
        setError("Invalid invitation link. No code provided.");
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("admin_invites")
          .select("*")
          .eq("invite_code", inviteCode)
          .maybeSingle();

        if (error || !data) {
          console.error("Error verifying invite:", error);
          setValidInvite(false);
          setError("Invalid invitation link. The invitation may have expired or been used.");
          setLoading(false);
          return;
        }

        // Check if invite has been used
        if (data.used) {
          setValidInvite(false);
          setError("This invitation has already been used.");
          setLoading(false);
          return;
        }

        // Check if invite has expired
        const now = new Date();
        const expiryDate = new Date(data.expires_at);
        if (now > expiryDate) {
          setValidInvite(false);
          setError("This invitation has expired.");
          setLoading(false);
          return;
        }

        // Valid invite
        setValidInvite(true);
        setInviteEmail(data.email);
        setLoading(false);
      } catch (err) {
        console.error("Error in invite verification:", err);
        setValidInvite(false);
        setError("An error occurred while verifying your invitation.");
        setLoading(false);
      }
    };

    verifyInvite();
  }, [inviteCode]);

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

    setSubmitting(true);

    try {
      // 1. Sign up the user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: inviteEmail,
        password: password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      });

      if (signUpError) throw signUpError;

      // 2. Update the invite to mark it as used
      const { error: updateError } = await supabase
        .from("admin_invites")
        .update({ used: true })
        .eq("invite_code", inviteCode || "");

      if (updateError) throw updateError;

      // 3. Update the user's profile to set them as an admin
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ is_admin: true })
        .eq("id", signUpData.user?.id || "");

      if (profileError) throw profileError;

      // Success
      setSuccess(true);
      toast({
        title: "Account Created",
        description: "Your admin account has been created successfully.",
      });

      // Redirect to admin panel after a delay
      setTimeout(() => {
        navigate("/admin");
      }, 3000);
    } catch (err: any) {
      console.error("Error creating admin account:", err);
      setError(err.message || "An error occurred while creating your account.");
      toast({
        title: "Error",
        description: err.message || "An error occurred while creating your account.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle navigation to login
  const goToLogin = () => {
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Admin Invitation</CardTitle>
          <CardDescription>
            {validInvite
              ? `Accept your invitation to join as an administrator`
              : `There was an issue with your invitation`}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {validInvite && !success ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={inviteEmail} disabled readOnly className="bg-muted" />
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

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Create Admin Account
              </Button>
            </form>
          ) : success ? (
            <div className="text-center py-4 space-y-4">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
              <p className="text-lg font-medium">Account Created Successfully</p>
              <p className="text-muted-foreground">
                You will be redirected to the admin panel shortly.
              </p>
            </div>
          ) : (
            <div className="text-center py-4 space-y-4">
              <XCircle className="h-16 w-16 text-red-500 mx-auto" />
              <p className="text-lg font-medium">Invalid Invitation</p>
              <p className="text-muted-foreground">{error}</p>
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

export default AdminInvite;
