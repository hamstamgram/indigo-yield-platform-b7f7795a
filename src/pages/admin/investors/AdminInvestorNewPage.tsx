import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, Mail, DollarSign } from "lucide-react";
import InvestorForm, { InvestorFormValues } from "@/components/admin/investors/InvestorForm";
import { Asset } from "@/types/investorTypes";
import { createOrFindInvestorUser } from "@/services/userService";

const AdminInvestorNewPage = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("assets")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setAssets(data || []);
    } catch (error) {
      console.error("Error fetching assets:", error);
      toast({
        title: "Error",
        description: "Failed to fetch assets",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (values: InvestorFormValues) => {
    try {
      setIsSubmitting(true);
      console.log("Creating investor with values:", values);

      // Create user or find existing one
      const userId = await createOrFindInvestorUser(values);

      if (!userId) {
        throw new Error("Failed to create or find auth user");
      }

      console.log("User created/found with ID:", userId);

      // Create profile entry
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: userId,
        email: values.email,
        first_name: values.first_name,
        last_name: values.last_name,
        is_admin: false,
        user_type: "investor",
      });

      if (profileError) {
        console.error("Profile creation error:", profileError);
      }

      // Create investor record
      const { error: investorError } = await supabase.from("investors").insert({
        profile_id: userId,
        name: `${values.first_name} ${values.last_name}`,
        email: values.email,
        status: "active",
      });

      if (investorError) {
        console.error("Investor creation error:", investorError);
      }

      toast({
        title: "Investor Created",
        description: `${values.first_name} ${values.last_name} has been added successfully.`,
      });

      // Reset form or redirect
      window.location.href = "/admin/investors";
    } catch (error) {
      console.error("Error adding investor:", error);
      toast({
        title: "Error",
        description: `Failed to add investor: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Investor</h1>
          <p className="text-muted-foreground">
            Add a new investor to the platform with initial portfolio settings
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Investor</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Account Setup</div>
            <p className="text-xs text-muted-foreground">Create user credentials and profile</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Init</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Initial Balances</div>
            <p className="text-xs text-muted-foreground">Set starting asset positions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notification</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Welcome Email</div>
            <p className="text-xs text-muted-foreground">Automatic invitation sent</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <div className="text-muted-foreground">Loading assets...</div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Investor Information</CardTitle>
            <CardDescription>
              Enter the new investor's details and set their initial portfolio balances
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InvestorForm onSubmit={handleSubmit} isLoading={isSubmitting} assets={assets} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminInvestorNewPage;
