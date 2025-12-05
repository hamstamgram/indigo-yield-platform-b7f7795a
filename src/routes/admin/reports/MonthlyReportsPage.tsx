import { StatementManager } from "@/components/admin/statements/StatementManager";

export default function MonthlyReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Monthly Statements</h1>
        <p className="text-muted-foreground">
          Generate, validate, and publish PDF statements for all investors.
        </p>
      </div>
      <StatementManager />
    </div>
  );
}
