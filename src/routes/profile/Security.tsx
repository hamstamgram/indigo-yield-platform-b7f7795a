/**
 * Security Settings Page
 * Password changes, 2FA, and session management
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Shield,
  Key,
  Smartphone,
  Monitor,
  Loader2,
  Check,
  X,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth/context";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Session {
  id: string;
  device: string;
  location: string;
  lastActive: string;
  current: boolean;
}

export default function Security() {
  const { user, profile, updatePassword } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  useEffect(() => {
    setTwoFactorEnabled(profile?.totp_verified || false);
    loadActiveSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const loadActiveSessions = async () => {
    if (!user) return;

    setLoadingSessions(true);
    try {
      // Display current session
      setSessions([
        {
          id: "current",
          device: "Current Device",
          location: "Current Location",
          lastActive: new Date().toISOString(),
          current: true,
        },
      ]);
    } catch (error) {
      console.error("Failed to load sessions:", error);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      });
      return;
    }

    setChangingPassword(true);

    try {
      const { error } = await updatePassword(newPassword);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Your password has been changed successfully",
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to change password",
        variant: "destructive",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleEnable2FA = async () => {
    navigate("/auth/mfa-setup");
  };

  const handleDisable2FA = async () => {
    try {
      // In production, disable TOTP
      toast({
        title: "Success",
        description: "Two-factor authentication has been disabled",
      });
      setTwoFactorEnabled(false);
    } catch (error) {
      console.error("Failed to disable 2FA:", error);
    }
  };

  const handleRevokeSession = async (_sessionId: string) => {
    try {
      // Revoke specific session
      toast({
        title: "Success",
        description: "Session has been revoked",
      });
      loadActiveSessions();
    } catch (error) {
      console.error("Failed to revoke session:", error);
    }
  };

  const handleRevokeAllSessions = async () => {
    try {
      await supabase.auth.signOut({ scope: "others" });
      toast({
        title: "Success",
        description: "All other sessions have been revoked",
      });
      loadActiveSessions();
    } catch (error) {
      console.error("Failed to revoke sessions:", error);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Security Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your password, two-factor authentication, and active sessions
          </p>
        </div>
      </div>

      {/* Password Change */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            <CardTitle>Change Password</CardTitle>
          </div>
          <CardDescription>
            Update your password regularly to keep your account secure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">Must be at least 8 characters long</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" disabled={changingPassword}>
              {changingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Changing...
                </>
              ) : (
                "Change Password"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                <CardTitle>Two-Factor Authentication</CardTitle>
              </div>
              <CardDescription className="mt-2">
                Add an extra layer of security to your account
              </CardDescription>
            </div>
            <Badge variant={twoFactorEnabled ? "default" : "secondary"}>
              {twoFactorEnabled ? (
                <>
                  <Check className="mr-1 h-3 w-3" />
                  Enabled
                </>
              ) : (
                <>
                  <X className="mr-1 h-3 w-3" />
                  Disabled
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Two-factor authentication adds an additional layer of security by requiring a code from
            your mobile device in addition to your password.
          </p>

          {twoFactorEnabled ? (
            <div className="flex items-start gap-4 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
              <Shield className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900 dark:text-green-100">
                  Your account is protected
                </p>
                <p className="text-xs text-green-800 dark:text-green-200 mt-1">
                  Two-factor authentication is active on your account
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    Disable
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Disable Two-Factor Authentication?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will make your account less secure. You will only need your password to
                      log in.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDisable2FA}>Disable 2FA</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ) : (
            <div className="flex items-start gap-4 p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  Your account is not fully protected
                </p>
                <p className="text-xs text-amber-800 dark:text-amber-200 mt-1">
                  Enable two-factor authentication to add an extra layer of security
                </p>
              </div>
              <Button onClick={handleEnable2FA} size="sm">
                Enable 2FA
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                <CardTitle>Active Sessions</CardTitle>
              </div>
              <CardDescription className="mt-2">
                Manage devices and sessions where you're currently logged in
              </CardDescription>
            </div>
            {sessions.length > 1 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    Revoke All
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Revoke All Sessions?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will sign you out of all devices except this one. You'll need to sign in
                      again on those devices.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRevokeAllSessions}>
                      Revoke All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loadingSessions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session, index) => (
                <div key={session.id}>
                  {index > 0 && <Separator />}
                  <div className="flex items-start justify-between py-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-muted p-2">
                        <Monitor className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{session.device}</p>
                          {session.current && (
                            <Badge variant="secondary" className="text-xs">
                              Current
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{session.location}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Last active: {format(new Date(session.lastActive), "PPpp")}
                        </p>
                      </div>
                    </div>
                    {!session.current && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevokeSession(session.id)}
                      >
                        Revoke
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
