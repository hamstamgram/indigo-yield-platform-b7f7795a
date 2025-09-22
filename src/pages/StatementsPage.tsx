import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Info } from 'lucide-react';

const StatementsPage = () => {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileText className="h-8 w-8 text-primary" />
          Monthly Statements
        </h1>
        <p className="text-muted-foreground">Access your monthly investment statements</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Statements</CardTitle>
          <CardDescription>Download your monthly portfolio statements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <Info className="h-5 w-5 text-yellow-600" />
            <div className="text-sm text-yellow-800">
              Statement generation is temporarily unavailable while we update the database schema.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatementsPage;