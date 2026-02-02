import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  Button,
} from "@/components/ui";
import { UserPlus } from "lucide-react";
import { AssetRef as Asset } from "@/types/asset";
import AddInvestorWizard from "../wizard/AddInvestorWizard";

interface AddInvestorDialogProps {
  assets: Asset[];
  onInvestorAdded: () => void;
}

const AddInvestorDialog: React.FC<AddInvestorDialogProps> = ({ assets, onInvestorAdded }) => {
  const [open, setOpen] = useState(false);

  const handleSuccess = () => {
    setOpen(false);
    setTimeout(() => {
      onInvestorAdded();
    }, 500);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Investor
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Investor</DialogTitle>
          <DialogDescription>
            Create a new investor account with IB linkage and initial positions
          </DialogDescription>
        </DialogHeader>
        <AddInvestorWizard
          assets={assets}
          onSuccess={handleSuccess}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
};

export default AddInvestorDialog;
