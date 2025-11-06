import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AdminStatementGenerator: React.FC = () => {
  const { toast } = useToast();

  const handleGenerateStatements = () => {
    toast({
      title: 'Feature Under Maintenance',
      description: 'Statement generation is being updated for the new database schema. Please check back soon.',
      variant: 'destructive',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Statement Generator
        </CardTitle>
        <CardDescription>
          Generate monthly statements for all investors
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <Info className="h-5 w-5 text-yellow-600" />
          <div className="text-sm text-yellow-800">
            This feature is temporarily unavailable while we update the database schema. 
            All existing investor data remains safe and accessible.
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Month</label>
            <select 
              className="w-full p-2 border rounded-md opacity-50" 
              disabled
            >
              <option value="">Select month</option>
              {Array.from({length: 12}, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2024, i).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Year</label>
            <select 
              className="w-full p-2 border rounded-md opacity-50" 
              disabled
            >
              <option value="">Select year</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
            </select>
          </div>
        </div>

        <Button 
          onClick={handleGenerateStatements}
          disabled
          className="w-full"
        >
          <FileText className="mr-2 h-4 w-4" />
          Generate Statements (Temporarily Disabled)
        </Button>
      </CardContent>
    </Card>
  );
};

export default AdminStatementGenerator;