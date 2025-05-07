
import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface InvestorsHeaderProps {
  onCreateInvestor: () => void;
}

const InvestorsHeader: React.FC<InvestorsHeaderProps> = ({ onCreateInvestor }) => {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-bold">Investor Management</h1>
      <Button onClick={onCreateInvestor}>
        <Plus className="h-4 w-4 mr-2" />
        Invite New Investor
      </Button>
    </div>
  );
};

export default InvestorsHeader;
