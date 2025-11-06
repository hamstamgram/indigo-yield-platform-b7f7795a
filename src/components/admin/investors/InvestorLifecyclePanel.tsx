import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Clock, User, UserX, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const InvestorLifecyclePanel = () => {
  const [selectedInvestor] = useState<string>('');
  const [entryDate, setEntryDate] = useState<string>('');
  const [exitDate, setExitDate] = useState<string>('');
  const [lockUntilDate, setLockUntilDate] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleUpdateInvestorStatus = async (
    investorId: string, 
    status: 'active' | 'inactive' | 'suspended' | 'exited'
  ) => {
    try {
      setIsProcessing(true);
      
      const { error } = await supabase
        .from('investors')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', investorId);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Investor status changed to ${status}`,
      });
    } catch (error) {
      console.error('Error updating investor status:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update investor status",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLockPositions = async (investorId: string, lockUntil: string) => {
    try {
      setIsProcessing(true);
      
      const { error } = await supabase
        .from('investor_positions')
        .update({ lock_until_date: lockUntil })
        .eq('investor_id', investorId);

      if (error) throw error;

      toast({
        title: "Positions Locked",
        description: `Positions locked until ${lockUntil}`,
      });
    } catch (error) {
      console.error('Error locking positions:', error);
      toast({
        title: "Lock Failed",
        description: "Failed to lock investor positions",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCleanupInactiveInvestors = async () => {
    try {
      setIsProcessing(true);
      
      // Get investors with zero balance and inactive for 90+ days
      const { data: inactiveInvestors, error: fetchError } = await supabase
        .from('investors')
        .select(`
          id,
          name,
          email,
          updated_at,
          investor_positions!inner (
            current_value
          )
        `)
        .eq('status', 'inactive')
        .lt('updated_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

      if (fetchError) throw fetchError;

      const investorsToCleanup = inactiveInvestors?.filter(investor => 
        investor.investor_positions.every((pos: any) => pos.current_value <= 0)
      ) || [];

      if (investorsToCleanup.length === 0) {
        toast({
          title: "No Cleanup Needed",
          description: "No inactive investors found for cleanup",
        });
        return;
      }

      // Archive positions instead of deleting
      for (const investor of investorsToCleanup) {
        const { error } = await supabase
          .from('investors')
          .update({ 
            status: 'archived',
            updated_at: new Date().toISOString()
          })
          .eq('id', investor.id);

        if (error) {
          console.error(`Failed to archive investor ${investor.id}:`, error);
        }
      }

      toast({
        title: "Cleanup Complete",
        description: `Archived ${investorsToCleanup.length} inactive investors`,
      });
    } catch (error) {
      console.error('Error during cleanup:', error);
      toast({
        title: "Cleanup Failed",
        description: "Failed to cleanup inactive investors",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Investor Status Management
          </CardTitle>
          <CardDescription>
            Manage investor lifecycle status and access controls
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Entry Date Tracking</Label>
              <Input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                placeholder="Set investor entry date"
              />
            </div>
            <div className="space-y-2">
              <Label>Exit Date (if applicable)</Label>
              <Input
                type="date"
                value={exitDate}
                onChange={(e) => setExitDate(e.target.value)}
                placeholder="Set investor exit date"
              />
            </div>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => selectedInvestor && handleUpdateInvestorStatus(selectedInvestor, 'active')}
              disabled={!selectedInvestor || isProcessing}
              className="flex items-center gap-2"
            >
              <User className="h-4 w-4" />
              Activate
            </Button>
            <Button
              variant="outline"
              onClick={() => selectedInvestor && handleUpdateInvestorStatus(selectedInvestor, 'inactive')}
              disabled={!selectedInvestor || isProcessing}
              className="flex items-center gap-2"
            >
              <UserX className="h-4 w-4" />
              Deactivate
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedInvestor && handleUpdateInvestorStatus(selectedInvestor, 'suspended')}
              disabled={!selectedInvestor || isProcessing}
              className="flex items-center gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              Suspend
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Position Locking */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Position Lock Management
          </CardTitle>
          <CardDescription>
            Lock investor positions based on status or compliance requirements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Lock Positions Until</Label>
            <Input
              type="date"
              value={lockUntilDate}
              onChange={(e) => setLockUntilDate(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Reason for Lock</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for position lock..."
              rows={3}
            />
          </div>
          
          <Button
            onClick={() => selectedInvestor && lockUntilDate && handleLockPositions(selectedInvestor, lockUntilDate)}
            disabled={!selectedInvestor || !lockUntilDate || isProcessing}
          >
            Apply Position Lock
          </Button>
        </CardContent>
      </Card>

      {/* Cleanup Operations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Automated Cleanup
          </CardTitle>
          <CardDescription>
            Clean up inactive investors and maintain data hygiene
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Cleanup Criteria:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Investors inactive for 90+ days</li>
              <li>• Zero balance across all positions</li>
              <li>• No pending transactions or withdrawals</li>
              <li>• Status will be changed to "archived"</li>
            </ul>
          </div>
          
          <Button
            variant="outline"
            onClick={handleCleanupInactiveInvestors}
            disabled={isProcessing}
            className="w-full"
          >
            {isProcessing ? "Processing..." : "Run Cleanup for Inactive Investors"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvestorLifecyclePanel;