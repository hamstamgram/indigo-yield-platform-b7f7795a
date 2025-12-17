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
import { portfolioService } from "@/services/core/PortfolioService";
import { useInvestorInvite } from "@/hooks/useInvestorInvite";

interface AddInvestorDialogProps {
  assets: Asset[];
  onInvestorAdded: () => void;
}

const AddInvestorDialog: React.FC<AddInvestorDialogProps> = ({ assets, onInvestorAdded }) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();
  const { createInvite } = useInvestorInvite();

  const handleSubmit = async (values: InvestorFormValues) => {
    setErrorMessage(null);
    try {
      setIsLoading(true);

      // Create user or find existing one
      const userId = await createOrFindInvestorUser(values);

      if (!userId) {
        throw new Error("Failed to create or find auth user");
      }

      // Normalize balances to numbers before passing to portfolio creation
      const numericBalances = Object.fromEntries(
        Object.entries(values.balances || {}).map(([k, v]) => [k, Number(v) || 0])
      );

      // Create portfolio entries for this investor
      // Pass the dynamic balances map and the full assets list
      const portfolioCreated = await portfolioService.createPortfolioEntries(userId, numericBalances, assets);

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
      const message = error instanceof Error ? error.message : "Unknown error";
      setErrorMessage(message);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    // Only allow closing if not currently loading
    if (isLoading && !newOpen) return;
    if (newOpen) {
      setErrorMessage(null);
    }
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
        {errorMessage && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md text-sm">
            {errorMessage}
          </div>
        )}
        <InvestorForm onSubmit={handleSubmit} isLoading={isLoading} assets={assets} />
      </DialogContent>
    </Dialog>
  );
};

export default AddInvestorDialog;
