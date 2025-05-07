
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import InvestorForm, { InvestorFormValues } from "./InvestorForm";
import { Asset } from "@/types/investorTypes";
import { useToast } from "@/hooks/use-toast";
import { createOrFindInvestorUser } from "@/services/userService";
import { createPortfolioEntries } from "@/services/portfolioService";
import { useInvestorInvite } from "@/hooks/useInvestorInvite";

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
  const { createInvite } = useInvestorInvite();

  const handleSubmit = async (values: InvestorFormValues) => {
    try {
      setIsLoading(true);
      console.log("Creating investor with values:", values);
      
      // Create user or find existing one
      const userId = await createOrFindInvestorUser(values);

      if (!userId) {
        throw new Error("Failed to create or find auth user");
      }

      console.log("User created/found with ID:", userId);

      // Create portfolio entries for this investor
      const portfolioCreated = await createPortfolioEntries(userId, values, assets);

      if (!portfolioCreated) {
        throw new Error("Failed to create portfolio entries");
      }

      // Also create an invite entry to track this investor
      await createInvite(values.email);

      toast({
        title: "Investor added",
        description: `${values.first_name} ${values.last_name} has been added successfully.`,
      });

      // Close dialog first, then refresh data after a delay
      setOpen(false);
      
      // Refresh the parent component after dialog is closed
      setTimeout(() => {
        onInvestorAdded();
      }, 1000);

    } catch (error) {
      console.error("Error adding investor:", error);
      toast({
        title: "Error",
        description: `Failed to add investor: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    // Only allow closing if not currently loading
    if (isLoading && !newOpen) return;
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Investor
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add New Investor</DialogTitle>
          <DialogDescription>
            Create a new investor account and set initial portfolio balances.
          </DialogDescription>
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
