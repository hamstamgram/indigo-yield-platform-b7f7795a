
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const QuickLinks: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="border-0 shadow-md h-full">
        <CardHeader>
          <CardTitle>Investor Management</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-between">
          <p className="text-gray-500 mb-4">
            View and manage all investor accounts and their portfolio data.
          </p>
          <Button className="w-full text-center mt-4" asChild>
            <Link to="/admin-investors">Manage Investors</Link>
          </Button>
        </CardContent>
      </Card>
      
      <Card className="border-0 shadow-md h-full">
        <CardHeader>
          <CardTitle>Portfolio Management</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-between">
          <p className="text-gray-500 mb-4">
            Update investor portfolios and manage asset allocations.
          </p>
          <Button className="w-full text-center mt-4" asChild>
            <Link to="/admin?tab=portfolios">Update Portfolios</Link>
          </Button>
        </CardContent>
      </Card>
      
      <Card className="border-0 shadow-md h-full">
        <CardHeader>
          <CardTitle>Yield Settings</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-between">
          <p className="text-gray-500 mb-4">
            Configure yield rates and distribution settings for each asset.
          </p>
          <Button className="w-full text-center mt-4" asChild>
            <Link to="/admin?tab=yields">Manage Yields</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuickLinks;
