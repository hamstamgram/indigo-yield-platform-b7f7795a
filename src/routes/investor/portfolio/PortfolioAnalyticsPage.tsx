import MyPerformanceHistory from "@/components/investor/portfolio/MyPerformanceHistory";

export default function PortfolioAnalyticsPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Portfolio Performance</h1>
          <p className="text-muted-foreground">Historical performance and monthly breakdowns</p>
        </div>
      </div>

      <MyPerformanceHistory />
    </div>
  );
}
