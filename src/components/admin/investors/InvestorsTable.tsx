
import React from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableRow 
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import InvestorTableRow from "./InvestorTableRow";
import InvestorsTableHeader from "./InvestorsTableHeader";
import { useIsMobile } from "@/hooks/use-mobile";
import MobileInvestorCard from "./MobileInvestorCard";

interface Investor {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  portfolio_summary?: {
    [key: string]: {
      balance: number;
      usd_value: number;
    }
  }
}

interface Asset {
  id: number;
  symbol: string;
  name: string;
}

interface InvestorsTableProps {
  investors: Investor[];
  assets: Asset[];
  loading: boolean;
  searchTerm: string;
  onViewDetails: (id: string) => void;
  onSendEmail: (email: string) => void;
}

const InvestorsTable: React.FC<InvestorsTableProps> = ({
  investors,
  assets,
  loading,
  searchTerm,
  onViewDetails,
  onSendEmail
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
              onViewDetails={onViewDetails}
              onSendEmail={onSendEmail}
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
              <InvestorTableRow 
                key={investor.id}
                id={investor.id}
                email={investor.email}
                first_name={investor.first_name}
                last_name={investor.last_name}
                portfolio_summary={investor.portfolio_summary}
                assets={assets}
                onViewDetails={onViewDetails}
                onSendEmail={onSendEmail}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default InvestorsTable;
