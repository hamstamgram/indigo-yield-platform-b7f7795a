import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";

export default function ActivityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Activity</h1>
        <p className="text-muted-foreground">
          View your statements, transactions, and withdrawals.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Statements</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">View your monthly statements.</p>
            <Link to="/statements" className="text-primary font-semibold mt-4 block">
              View Statements
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">View your transaction history.</p>
            <Link to="/transactions" className="text-primary font-semibold mt-4 block">
              View Transactions
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Withdrawals</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">View your withdrawal history.</p>
            <Link to="/withdrawals" className="text-primary font-semibold mt-4 block">
              View Withdrawals
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
