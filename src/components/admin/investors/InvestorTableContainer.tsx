
import React from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import SearchBar from "./SearchBar";
import InvestorsTable from "./InvestorsTable";
import { Asset, Investor } from "@/types/investorTypes";

interface InvestorTableContainerProps {
  investors: Investor[];
  assets: Asset[];
  loading: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onSendEmail: (email: string) => void;
  onRefresh: () => void;
}

const InvestorTableContainer: React.FC<InvestorTableContainerProps> = ({
  investors,
  assets,
  loading,
  searchTerm,
  setSearchTerm,
  onSendEmail,
  onRefresh
}) => {
  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <CardTitle>All Investors</CardTitle>
        <CardDescription>
          Manage investors and send platform invites
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex mb-4">
          <SearchBar 
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
          />
        </div>
        
        <InvestorsTable
          investors={investors}
          assets={assets}
          loading={loading}
          searchTerm={searchTerm}
          onSendEmail={onSendEmail}
          onRefresh={onRefresh}
        />
      </CardContent>
    </Card>
  );
};

export default InvestorTableContainer;
