import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, Database, Users, Shield, AlertTriangle } from 'lucide-react';

export default function AdminOperationsPage() {
  const [operations] = useState([
    {
      id: '1',
      name: 'System Maintenance',
      status: 'scheduled',
      description: 'Routine system maintenance and updates',
      category: 'maintenance'
    },
    {
      id: '2', 
      name: 'Database Backup',
      status: 'running',
      description: 'Daily automated database backup',
      category: 'backup'
    },
    {
      id: '3',
      name: 'User Access Review',
      status: 'completed',
      description: 'Quarterly user access audit',
      category: 'security'
    }
  ]);

  const getStatusVariant = (status: string): 'default' | 'destructive' | 'outline' | 'secondary' => {
    switch (status) {
      case 'running': return 'default';
      case 'scheduled': return 'outline';
      case 'completed': return 'secondary';
      default: return 'secondary';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'maintenance': return <Settings className="h-4 w-4" />;
      case 'backup': return <Database className="h-4 w-4" />;
      case 'security': return <Shield className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Admin Operations</h1>
          <p className="text-muted-foreground">System operations and administrative tasks</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Operations</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {operations.filter(op => op.status === 'running').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently running
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {operations.filter(op => op.status === 'scheduled').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Pending execution
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {operations.filter(op => op.status === 'completed').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Today's tasks
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            System Operations
          </CardTitle>
          <CardDescription>
            Overview of administrative tasks and system operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {operations.map((operation) => (
              <div
                key={operation.id}
                className="flex items-center justify-between p-4 border rounded-lg bg-card"
              >
                <div className="flex items-center gap-4">
                  {getCategoryIcon(operation.category)}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{operation.name}</h3>
                      <Badge variant={getStatusVariant(operation.status)}>
                        {operation.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {operation.description}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  View Details
                </Button>
              </div>
            ))}
          </div>

          {operations.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No operations found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}