/**
 * InvestorActivityTab - Combined Activity view
 * Sections: Transactions, Withdrawal Requests, Reports
 */

import { Separator } from "@/components/ui";
import InvestorTransactionsTab from "./InvestorTransactionsTab";
import InvestorWithdrawalsTab from "./InvestorWithdrawalsTab";
import InvestorReportsTab from "./InvestorReportsTab";

interface InvestorActivityTabProps {
  investorId: string;
  investorName: string;
  onDataChange?: () => void;
}

export function InvestorActivityTab({
  investorId,
  investorName,
  onDataChange,
}: InvestorActivityTabProps) {
  return (
    <div className="space-y-8">
      {/* Transactions Section */}
      <section id="transactions-section">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Transactions</h2>
          <p className="text-sm text-muted-foreground">
            All deposits, withdrawals, and fee transactions
          </p>
        </div>
        <InvestorTransactionsTab investorId={investorId} />
      </section>

      <Separator />

      {/* Withdrawal Requests Section */}
      <section id="withdrawals-section">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Withdrawal Requests</h2>
          <p className="text-sm text-muted-foreground">Pending and processed withdrawal requests</p>
        </div>
        <InvestorWithdrawalsTab investorId={investorId} />
      </section>

      <Separator />

      {/* Reports Section */}
      <section id="reports-section">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Reports</h2>
          <p className="text-sm text-muted-foreground">Generated statements and investor reports</p>
        </div>
        <InvestorReportsTab investorId={investorId} investorName={investorName} />
      </section>
    </div>
  );
}
