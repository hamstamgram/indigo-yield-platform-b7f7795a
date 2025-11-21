import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const QuickLinks: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="border-0 shadow-md h-full flex flex-col">
        <CardHeader>
          <CardTitle>Investor Management</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <p className="text-gray-500 mb-4">
            View and manage all investor accounts and their portfolio data.
          </p>
          <div className="mt-auto">
            <Button className="w-full text-center" asChild>
              <Link to="/admin-investors">Manage Investors</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md h-full flex flex-col">
        <CardHeader>
          <CardTitle>Portfolio Management</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <p className="text-gray-500 mb-4">
            Update investor portfolios and manage asset allocations.
          </p>
          <div className="mt-auto">
            <Button className="w-full text-center" asChild>
              <Link to="/admin?tab=portfolios">Update Portfolios</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md h-full flex flex-col">
        <CardHeader>
          <CardTitle>Yield Settings</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <p className="text-gray-500 mb-4">
            Configure yield rates and distribution settings for each asset.
          </p>
          <div className="mt-auto">
            <Button className="w-full text-center" asChild>
              <Link to="/admin?tab=yields">Manage Yields</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuickLinks;
