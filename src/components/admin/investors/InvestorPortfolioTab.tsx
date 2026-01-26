/**
 * InvestorPortfolioTab - Combined Portfolio view
 * Sections: Positions, Yield History, Performance Summary
 */

import { useState } from "react";
import { Separator } from "@/components/ui";
import InvestorPositionsTab from "./InvestorPositionsTab";
import { InvestorYieldManager } from "./yields/InvestorYieldManager";
import { InvestorYieldHistory } from "./yields/InvestorYieldHistory";

interface InvestorPortfolioTabProps {
  investorId: string;
  investorName: string;
  onDataChange?: () => void;
}

export function InvestorPortfolioTab({
  investorId,
  investorName,
  onDataChange,
}: InvestorPortfolioTabProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleTransactionAdded = () => {
    setRefreshKey((prev) => prev + 1);
    onDataChange?.();
  };

  return (
    <div className="space-y-8">
      {/* Positions Section */}
      <section id="positions-section">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Positions</h2>
          <p className="text-sm text-muted-foreground">
            Current fund positions and balances
          </p>
        </div>
        <InvestorPositionsTab
          key={`positions-${refreshKey}`}
          investorId={investorId}
        />
      </section>

      <Separator />

      {/* Yield History Section */}
      <section id="yield-history-section">
        <InvestorYieldHistory
          key={`yield-history-${refreshKey}`}
          investorId={investorId}
        />
      </section>

      <Separator />

      {/* Performance Section */}
      <section id="performance-section">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Performance</h2>
          <p className="text-sm text-muted-foreground">
            Monthly yield and performance metrics
          </p>
        </div>
        <InvestorYieldManager
          key={`yield-${refreshKey}`}
          investorId={investorId}
          investorName={investorName}
        />
      </section>
    </div>
  );
}
