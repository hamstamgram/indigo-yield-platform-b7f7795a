import { useState } from "react";
import { Key, ShieldCheck, ShieldAlert, Smartphone } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Badge,
} from "@/components/ui";
import { useToast } from "@/hooks";
import { useInvestorProfileData } from "@/features/investor/transactions/hooks/useInvestorPortal";
import { useChangePassword } from "@/hooks/data/shared/useProfileSettings";
const SecurityTab = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { toast } = useToast();

  const { data: profile } = useInvestorProfileData();
  const changePasswordMutation = useChangePassword();

  const is2FAEnabled = profile?.totp_enabled || false;

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "New password and confirmation do not match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      });
      return;
    }

    changePasswordMutation.mutate(newPassword, {
      onSuccess: () => {
        setDialogOpen(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      },
    });
  };

  return (
    <div className="space-y-6">
      <Card className="border-white/10 bg-card">
        <CardHeader>
          <CardTitle className="text-xl">Authentication</CardTitle>
          <CardDescription>Manage your account security and authentication methods</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Password Section */}
          <div className="flex items-center justify-between border-b border-white/5 pb-6">
            <div className="space-y-1">
              <h3 className="font-medium">Password</h3>
              <p className="text-sm text-muted-foreground">
                Update your password regularly for better security
              </p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-white/10 hover:bg-white/5">
                  <Key className="h-4 w-4 mr-2" />
                  Update Password
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-black/90 backdrop-blur-xl">
                <DialogHeader>
                  <DialogTitle>Change Password</DialogTitle>
                  <DialogDescription>
                    Enter your current password and choose a new one
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handlePasswordChange}>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="current-password">Current Password</Label>
                      <Input
                        id="current-password"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        autoComplete="current-password"
                        className="bg-white/5 border-white/10"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoComplete="new-password"
                        className="bg-white/5 border-white/10"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="confirm-password">Confirm Password</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                        className="bg-white/5 border-white/10"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={changePasswordMutation.isPending}>
                      {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* 2FA Section */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-white">Two-Factor Authentication</h3>
                {is2FAEnabled ? (
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">
                    <ShieldCheck className="h-3 w-3 mr-1" />
                    ENABLED
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]">
                    <ShieldAlert className="h-3 w-3 mr-1" />
                    NOT SETUP
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Add an extra layer of security to your account with a mobile authenticator app
              </p>
            </div>
            <Button 
              variant="outline" 
              className="border-white/10 hover:bg-white/5"
              onClick={() => {
                toast({
                  title: "Authenticator Setup",
                  description: "2FA setup is available via our verified partner portal. Check your email for the link.",
                });
              }}
            >
              <Smartphone className="h-4 w-4 mr-2" />
              {is2FAEnabled ? "Manage 2FA" : "Setup 2FA"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityTab;
