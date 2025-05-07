
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import InvestorsHeader from "@/components/admin/investors/InvestorsHeader";
import InvestorTableContainer from "@/components/admin/investors/InvestorTableContainer";
import { useInvestors } from "@/hooks/useInvestors";
import LoadingSpinner from "@/components/common/LoadingSpinner";

const AdminInvestors = () => {
  const { 
    filteredInvestors, 
    searchTerm, 
    setSearchTerm,
    loading, 
    assets,
    isAdmin 
  } = useInvestors();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Show loading state while checking permissions or loading data
  if (loading) {
    return <LoadingSpinner />;
  }
  
  // Navigate to create investor page
  const handleCreateInvestor = () => {
    navigate('/admin?tab=invites');
  };
  
  // View investor details
  const viewInvestorDetails = (investorId: string) => {
    // In a real app, this would navigate to a detailed investor view
    console.log("View investor details:", investorId);
    toast({
      title: "View investor",
      description: `Viewing details for investor ID: ${investorId}`,
    });
  };
  
  // Send email to investor
  const sendEmailToInvestor = (email: string) => {
    toast({
      title: "Email feature",
      description: `Feature to email ${email} would be implemented here`,
    });
  };

  return (
    <div className="space-y-6">
      <InvestorsHeader onCreateInvestor={handleCreateInvestor} />
      
      <InvestorTableContainer
        investors={filteredInvestors}
        assets={assets}
        loading={loading}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onViewDetails={viewInvestorDetails}
        onSendEmail={sendEmailToInvestor}
      />
    </div>
  );
};

export default AdminInvestors;
