import FundAUMManager from "@/components/admin/funds/FundAUMManager";

export default function MonthlyDataEntry() {
  return (
    <div className="container max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold">Monthly Data Entry</h1>
        <p className="text-muted-foreground mt-2">
          Manage fund AUM and distribute yields. This interface has been unified with the Fund Management module.
        </p>
      </div>
      
      <FundAUMManager />
    </div>
  );
}
