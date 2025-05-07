
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import InvestorForm, { InvestorFormValues } from "./InvestorForm";
import { Asset } from "@/types/investorTypes";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AddInvestorDialogProps {
  assets: Asset[];
  onInvestorAdded: () => void;
}

const AddInvestorDialog: React.FC<AddInvestorDialogProps> = ({ 
  assets, 
  onInvestorAdded 
}) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (values: InvestorFormValues) => {
    try {
      setIsLoading(true);
      
      // Generate a random password for the initial user account
      const tempPassword = Math.random().toString(36).substring(2, 15) + 
                           Math.random().toString(36).substring(2, 15);
      
      // 1. Create a user in the auth system
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: values.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          first_name: values.first_name,
          last_name: values.last_name,
          is_investor: true
        }
      });
      
      if (authError) {
        // If the user already exists in auth system, continue with the profile creation
        // We'll still need to create the profile and portfolio entries
        console.log("Auth creation warning (user may already exist):", authError);
      }
      
      const userId = authData?.user?.id;

      if (!userId) {
        throw new Error("Failed to create or find auth user");
      }

      // 2. Create portfolio entries for this investor if balances are provided
      const portfolioEntries = [];

      if (values.btc_balance && parseFloat(values.btc_balance) > 0) {
        const btcAsset = assets.find(a => a.symbol.toLowerCase() === 'btc');
        if (btcAsset) {
          portfolioEntries.push({
            user_id: userId,
            asset_id: btcAsset.id,
            balance: parseFloat(values.btc_balance),
          });
        }
      }

      if (values.eth_balance && parseFloat(values.eth_balance) > 0) {
        const ethAsset = assets.find(a => a.symbol.toLowerCase() === 'eth');
        if (ethAsset) {
          portfolioEntries.push({
            user_id: userId,
            asset_id: ethAsset.id,
            balance: parseFloat(values.eth_balance),
          });
        }
      }

      if (values.sol_balance && parseFloat(values.sol_balance) > 0) {
        const solAsset = assets.find(a => a.symbol.toLowerCase() === 'sol');
        if (solAsset) {
          portfolioEntries.push({
            user_id: userId,
            asset_id: solAsset.id,
            balance: parseFloat(values.sol_balance),
          });
        }
      }

      if (values.usdc_balance && parseFloat(values.usdc_balance) > 0) {
        const usdcAsset = assets.find(a => a.symbol.toLowerCase() === 'usdc');
        if (usdcAsset) {
          portfolioEntries.push({
            user_id: userId,
            asset_id: usdcAsset.id,
            balance: parseFloat(values.usdc_balance),
          });
        }
      }

      // Insert portfolio entries if any
      if (portfolioEntries.length > 0) {
        const { error: portfolioError } = await supabase
          .from('portfolios')
          .insert(portfolioEntries);

        if (portfolioError) {
          throw portfolioError;
        }
      }

      // Create an invitation link for the investor
      const inviteCode = Math.random().toString(36).substring(2, 15);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Invite expires in 7 days

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error: inviteError } = await supabase
        .from('admin_invites')
        .insert({
          email: values.email,
          invite_code: inviteCode,
          created_by: user?.id,
          expires_at: expiresAt.toISOString()
        });

      if (inviteError) {
        throw inviteError;
      }

      toast({
        title: "Investor added",
        description: `${values.first_name} ${values.last_name} has been added successfully.`,
      });

      // Close dialog and refresh data
      setOpen(false);
      onInvestorAdded();

    } catch (error) {
      console.error("Error adding investor:", error);
      toast({
        title: "Error",
        description: "Failed to add investor. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Investor
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add New Investor</DialogTitle>
        </DialogHeader>
        <InvestorForm
          onSubmit={handleSubmit}
          isLoading={isLoading}
          assets={assets}
        />
      </DialogContent>
    </Dialog>
  );
};

export default AddInvestorDialog;
