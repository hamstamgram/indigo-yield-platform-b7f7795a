import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminTransactionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Transactions</h1>
        <p className="text-muted-foreground">
          View and manage all investor transactions.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            A table of all transactions will be displayed here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
