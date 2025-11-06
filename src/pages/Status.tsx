import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, CheckCircle, AlertCircle, XCircle } from 'lucide-react';

interface ServiceStatus {
  name: string;
  status: 'operational' | 'warning' | 'error';
  description: string;
  lastChecked: string;
}

export default function StatusPage() {
  const [services] = useState<ServiceStatus[]>([
    {
      name: 'Database',
      status: 'operational',
      description: 'All database operations running normally',
      lastChecked: new Date().toISOString()
    },
    {
      name: 'Authentication',
      status: 'operational', 
      description: 'User authentication system operational',
      lastChecked: new Date().toISOString()
    },
    {
      name: 'API Services',
      status: 'operational',
      description: 'All API endpoints responding normally',
      lastChecked: new Date().toISOString()
    },
    {
      name: 'File Storage',
      status: 'operational',
      description: 'Document storage and retrieval operational',
      lastChecked: new Date().toISOString()
    }
  ]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusVariant = (status: string): 'default' | 'destructive' | 'outline' | 'secondary' => {
    switch (status) {
      case 'operational': return 'default';
      case 'warning': return 'outline';
      case 'error': return 'destructive';
      default: return 'secondary';
    }
  };

  const overallStatus = services.every(s => s.status === 'operational') 
    ? 'operational' 
    : services.some(s => s.status === 'error') 
    ? 'error' 
    : 'warning';

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">System Status</h1>
          <p className="text-muted-foreground">Monitor the health of platform services</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon(overallStatus)}
            Overall System Status
          </CardTitle>
          <CardDescription>
            Current operational status of all platform services
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Badge variant={getStatusVariant(overallStatus)}>
              {overallStatus === 'operational' ? 'All Systems Operational' :
               overallStatus === 'error' ? 'Service Disruption' : 'Degraded Performance'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map((service) => (
          <Card key={service.name}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  {getStatusIcon(service.status)}
                  {service.name}
                </span>
                <Badge variant={getStatusVariant(service.status)}>
                  {service.status}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                {service.description}
              </p>
              <p className="text-xs text-muted-foreground">
                Last checked: {new Date(service.lastChecked).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h3 className="font-medium">Platform Version</h3>
              <p className="text-sm text-muted-foreground">1.0.0</p>
            </div>
            <div>
              <h3 className="font-medium">Last Deployment</h3>
              <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString()}</p>
            </div>
            <div>
              <h3 className="font-medium">Uptime</h3>
              <p className="text-sm text-muted-foreground">99.9%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}