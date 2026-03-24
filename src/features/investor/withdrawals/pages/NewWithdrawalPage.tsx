import { useWithdrawalPositions } from "@/hooks/data";
import { WithdrawalRequestForm } from "@/features/investor/withdrawals/components/WithdrawalRequestForm";
import { Card, CardContent, Button } from "@/components/ui";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export default function NewWithdrawalPage() {
  const navigate = useNavigate();

  const { data: positions, isLoading } = useWithdrawalPositions();

  if (isLoading) {
    return <div className="p-8 text-center">Loading available balance...</div>;
  }

  if (!positions || positions.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center">
          <Button variant="ghost" asChild>
            <Link to="/investor/withdrawals">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to History
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              You don't have any active positions to withdraw from.
            </p>
            <Button variant="primary" asChild className="mt-4">
              <Link to="/dashboard">Go to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild>
          <Link to="/investor/withdrawals">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to History
          </Link>
        </Button>
      </div>

      <div className="max-w-3xl mx-auto">
        <WithdrawalRequestForm
          positions={positions}
          onSuccess={() => navigate("/investor/withdrawals")}
          onCancel={() => navigate("/investor/withdrawals")}
        />
      </div>
    </div>
  );
}
