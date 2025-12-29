import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTransactionById } from "@/hooks/data";

export default function TransactionDetailsPage() {
  const { id } = useParams<{ id: string }>();

  const { data: item, isLoading } = useTransactionById(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Item not found</p>
          <Button asChild>
            <Link to="/transactions">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to List
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild>
          <Link to="/transactions">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">
                {item.type?.replace(/_/g, " ").toUpperCase() || "Transaction"}
              </CardTitle>
              <CardDescription>
                Date: {new Date(item.tx_date || item.created_at).toLocaleDateString()}
              </CardDescription>
            </div>
            <Badge className="bg-green-600">Completed</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground mb-1">ID</p>
              <p className="font-mono text-sm">{item.id}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Status</p>
              <p className="capitalize">Completed</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Created</p>
              <p>{new Date(item.created_at).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Amount</p>
              <p className="font-semibold text-lg">
                {item.amount} {item.asset}
              </p>
            </div>
            {item.tx_hash && (
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground mb-1">Transaction Hash</p>
                <p className="font-mono text-xs break-all">{item.tx_hash}</p>
              </div>
            )}
          </div>

          {item.notes && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Notes</p>
              <p>{item.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
