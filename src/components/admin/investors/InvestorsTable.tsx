import React from "react";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import EditableInvestorRow from "./EditableInvestorRow";
import InvestorsTableHeader from "./InvestorsTableHeader";
import { useIsMobile } from "@/hooks/use-mobile";
import MobileInvestorCard from "./MobileInvestorCard";
import { InvestorSummaryV2 } from "@/services/adminServiceV2";
import { Asset } from "@/types/investorTypes";

interface InvestorsTableProps {
  investors: InvestorSummaryV2[];
  assets: Asset[];
  loading: boolean;
  searchTerm: string;
  onSendEmail: (email: string) => void;
  onRefresh: () => void;
  onDelete?: (investorId: string) => void;
}

const InvestorsTable: React.FC<InvestorsTableProps> = ({
  investors,
  assets,
  loading,
  searchTerm,
  onSendEmail,
  onRefresh,
  onDelete,
}) => {
  const isMobile = useIsMobile();

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show mobile card layout on mobile devices
  if (isMobile) {
    return (
      <div className="space-y-4">
        {investors.length === 0 ? (
          <div className="text-center py-6 bg-white dark:bg-gray-800 rounded-md border p-4">
            {searchTerm ? "No investors match your search" : "No investors found"}
          </div>
        ) : (
          investors.map((investor) => (
            <MobileInvestorCard
              key={investor.id}
              investor={investor}
              assets={assets}
              onSendEmail={onSendEmail}
              onSaveSuccess={onRefresh}
            />
          ))
        )}
      </div>
    );
  }

  // Desktop table layout
  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <InvestorsTableHeader assets={assets} />
        <TableBody>
          {investors.length === 0 ? (
            <TableRow>
              <TableCell colSpan={assets.length + 3} className="text-center py-6">
                {searchTerm ? "No investors match your search" : "No investors found"}
              </TableCell>
            </TableRow>
          ) : (
            investors.map((investor) => (
              <EditableInvestorRow
                key={investor.id}
                investor={investor}
                assets={assets}
                onSendEmail={onSendEmail}
                onDelete={onDelete}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default InvestorsTable;
