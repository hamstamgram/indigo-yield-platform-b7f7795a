import React from "react";
import { Button } from "@/components/ui";
import { UserPlus } from "lucide-react";
import { useIsMobile } from "@/hooks";

interface InvestorsHeaderProps {
  onCreateInvestor: () => void;
}

const InvestorsHeader: React.FC<InvestorsHeaderProps> = ({ onCreateInvestor }) => {
  const isMobile = useIsMobile();

  return (
    <div
      className={`flex ${isMobile ? "flex-col gap-4" : "flex-row items-center justify-between"}`}
    >
      <h1 className={`text-2xl font-bold ${isMobile ? "mb-2" : ""}`}>Investor Management</h1>
      <Button onClick={onCreateInvestor} className={`${isMobile ? "w-full" : ""}`}>
        <UserPlus className="h-4 w-4 mr-2" />
        Add Investor
      </Button>
    </div>
  );
};

export default InvestorsHeader;
