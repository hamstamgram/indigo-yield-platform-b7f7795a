
import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { CryptoIcon } from "@/components/CryptoIcons";

interface YieldSource {
  id: string;
  name: string;
  btcYield: number;
  ethYield: number;
  solYield: number;
  usdcYield: number;
}

interface YieldSourcesTableProps {
  loading: boolean;
  yieldSources: YieldSource[];
}

// Format helpers
const formatPercent = (value: number) => {
  return `${value.toFixed(2)}%`;
};

const YieldSourcesTable: React.FC<YieldSourcesTableProps> = ({ loading, yieldSources }) => {
  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <CardTitle>Yield Sources</CardTitle>
        <CardDescription>Current yield rates from different protocols</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Protocol</TableHead>
                  <TableHead>
                    <div className="flex items-center">
                      <CryptoIcon symbol="btc" className="h-5 w-5 mr-2" />
                      BTC
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center">
                      <CryptoIcon symbol="eth" className="h-5 w-5 mr-2" />
                      ETH
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center">
                      <CryptoIcon symbol="sol" className="h-5 w-5 mr-2" />
                      SOL
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center">
                      <CryptoIcon symbol="usdc" className="h-5 w-5 mr-2" />
                      USDC
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {yieldSources.map((source) => (
                  <TableRow key={source.id}>
                    <TableCell className="font-medium">{source.name}</TableCell>
                    <TableCell>
                      {source.btcYield > 0 ? (
                        <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                          {formatPercent(source.btcYield)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {source.ethYield > 0 ? (
                        <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                          {formatPercent(source.ethYield)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {source.solYield > 0 ? (
                        <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                          {formatPercent(source.solYield)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {source.usdcYield > 0 ? (
                        <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                          {formatPercent(source.usdcYield)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default YieldSourcesTable;
