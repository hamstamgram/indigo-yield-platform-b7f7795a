import React from "react";
import { TableHead, TableHeader, TableRow } from "@/components/ui";
import { CryptoIcon } from "@/components/CryptoIcons";
import { AssetRef as Asset } from "@/types/asset";

interface InvestorsTableHeaderProps {
  assets: Asset[];
}

const InvestorsTableHeader: React.FC<InvestorsTableHeaderProps> = ({ assets }) => {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>Investor</TableHead>
        {assets.map((asset) => (
          <TableHead key={asset.id}>
            <div className="flex items-center">
              <CryptoIcon symbol={asset.symbol} className="h-5 w-5 mr-2" />
              {asset.symbol}
            </div>
          </TableHead>
        ))}
        <TableHead className="text-right">Actions</TableHead>
      </TableRow>
    </TableHeader>
  );
};

export default InvestorsTableHeader;
