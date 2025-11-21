/**
 * Admin User Management Page - Manage admin users
 */

import { UserCog } from "lucide-react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

function AdminUserManagementContent() {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handlePasswordReset = async () => {
    if (!email || !newPassword) {
      toast({
        title: "Validation Error",
        description: "Email and password are required",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke("set-user-password", {
        body: { email, password: newPassword },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Password updated for ${email}`,
      });

      setEmail("");
      setNewPassword("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold flex items-center gap-2 mb-2">
        <UserCog className="h-8 w-8" />
        User Management
      </h1>
      <p className="text-muted-foreground mb-8">Manage user accounts and passwords</p>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Reset User Password</CardTitle>
          <CardDescription>Update password for any user account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">User Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <Button onClick={handlePasswordReset} disabled={isLoading} className="w-full">
            {isLoading ? "Updating..." : "Update Password"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminUserManagement() {
  return (
    <AdminGuard>
      <AdminUserManagementContent />
    </AdminGuard>
  );
}
