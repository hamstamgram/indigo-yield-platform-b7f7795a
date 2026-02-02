import React from "react";
import { Card, CardHeader, CardTitle, CardContent, Button } from "@/components/ui";
import { Link } from "react-router-dom";

const QuickLinks: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="border-0 shadow-md h-full flex flex-col">
        <CardHeader>
          <CardTitle>Investor Management</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <p className="text-muted-foreground mb-4">
            View and manage all investor accounts and their portfolio data.
          </p>
          <div className="mt-auto">
            <Button className="w-full text-center" asChild>
              <Link to="/admin/investors">Manage Investors</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md h-full flex flex-col">
        <CardHeader>
          <CardTitle>Operations Hub</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <p className="text-muted-foreground mb-4">
            Access data entry, yields, and portfolio management tools.
          </p>
          <div className="mt-auto">
            <Button className="w-full text-center" asChild>
              <Link to="/admin/operations">Go to Operations</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md h-full flex flex-col">
        <CardHeader>
          <CardTitle>Yield Management</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <p className="text-muted-foreground mb-4">
            Configure yield rates and view recorded yields for all funds.
          </p>
          <div className="mt-auto">
            <Button className="w-full text-center" asChild>
              <Link to="/admin/yields">Manage Yields</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuickLinks;
