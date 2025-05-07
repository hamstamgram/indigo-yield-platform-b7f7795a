
import { useToast } from "@/hooks/use-toast";
import InvestorsHeader from "@/components/admin/investors/InvestorsHeader";
import InvestorTableContainer from "@/components/admin/investors/InvestorTableContainer";
import { useInvestors } from "@/hooks/useInvestors";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { supabase } from "@/integrations/supabase/client";
import AddInvestorDialog from "@/components/admin/investors/AddInvestorDialog";
import { useEffect } from "react";

const AdminInvestors = () => {
  const { 
    filteredInvestors, 
    searchTerm, 
    setSearchTerm,
    loading, 
    assets,
    refetch
  } = useInvestors();
  const { toast } = useToast();
  
  // IMPORTANT: useEffect must be called at the top level, not conditionally
  useEffect(() => {
    refetch();
  }, [refetch]); // Added refetch as a dependency
  
  // Show loading state while checking permissions or loading data
  if (loading) {
    return <LoadingSpinner />;
  }
  
  // Send email invitation
  const sendInviteToInvestor = async (email: string) => {
    try {
      console.log("Sending invite to:", email);
      
      // Generate a new invite code each time we send an invite
      const inviteCode = Math.random().toString(36).substring(2, 15);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Invite expires in 7 days
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Store or update invite in the database
      const { data, error } = await supabase
        .from('admin_invites')
        .upsert({
          email: email,
          invite_code: inviteCode,
          created_by: user?.id,
          expires_at: expiresAt.toISOString(),
          used: false, // Reset to false if re-sending
        })
        .select();
      
      if (error) {
        console.error("Error creating invite:", error);
        throw error;
      }
      
      console.log("Invite created:", data);
      
      // Call edge function to send the email
      const { error: inviteError } = await supabase.functions.invoke('send-admin-invite', {
        body: { invite: data[0] }
      });
      
      if (inviteError) {
        console.error("Error invoking edge function:", inviteError);
        throw inviteError;
      }
      
      toast({
        title: "Invite sent",
        description: `An invitation has been sent to ${email}`,
      });
      
      // Refresh the data
      refetch();
      
    } catch (error) {
      console.error("Error sending invite:", error);
      toast({
        title: "Error",
        description: "Failed to send invitation. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Define handleInvestorAdded function for refreshing data
  const handleInvestorAdded = () => {
    console.log("Investor added, refreshing data...");
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Investor Management</h1>
        <AddInvestorDialog assets={assets} onInvestorAdded={handleInvestorAdded} />
      </div>
      
      <InvestorTableContainer
        investors={filteredInvestors}
        assets={assets}
        loading={loading}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onSendEmail={sendInviteToInvestor}
        onRefresh={refetch}
      />
    </div>
  );
};

export default AdminInvestors;
