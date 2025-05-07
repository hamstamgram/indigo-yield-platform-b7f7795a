
import { useToast } from "@/hooks/use-toast";
import InvestorsHeader from "@/components/admin/investors/InvestorsHeader";
import InvestorTableContainer from "@/components/admin/investors/InvestorTableContainer";
import { useInvestors } from "@/hooks/useInvestors";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { supabase } from "@/integrations/supabase/client";
import AddInvestorDialog from "@/components/admin/investors/AddInvestorDialog";

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
  
  // Show loading state while checking permissions or loading data
  if (loading) {
    return <LoadingSpinner />;
  }
  
  // Handle creating/adding an investor
  const handleCreateInvestor = () => {
    // The dialog will be shown via the AddInvestorDialog component
  };
  
  // Send email invitation
  const sendInviteToInvestor = async (email: string) => {
    try {
      // In a real implementation, this would generate an invite code and store it
      // Then call the send-admin-invite edge function
      const inviteCode = Math.random().toString(36).substring(2, 15);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Invite expires in 7 days
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Store invite in the database
      const { data, error } = await supabase
        .from('admin_invites')
        .insert({
          email: email,
          invite_code: inviteCode,
          created_by: user?.id,
          expires_at: expiresAt.toISOString()
        })
        .select();
      
      if (error) {
        throw error;
      }
      
      // Call edge function to send the email
      const { error: inviteError } = await supabase.functions.invoke('send-admin-invite', {
        body: { invite: data[0] }
      });
      
      if (inviteError) {
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Investor Management</h1>
        <AddInvestorDialog assets={assets} onInvestorAdded={refetch} />
      </div>
      
      <InvestorTableContainer
        investors={filteredInvestors}
        assets={assets}
        loading={loading}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onSendEmail={sendInviteToInvestor}
      />
    </div>
  );
};

export default AdminInvestors;
