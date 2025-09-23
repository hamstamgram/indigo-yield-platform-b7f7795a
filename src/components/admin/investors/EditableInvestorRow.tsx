
import React, { useState, useEffect } from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Send, Save } from 'lucide-react';
import { Asset } from '@/types/investorTypes';
import { InvestorSummaryV2 } from "@/services/adminServiceV2";
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { updateInvestorFeePercentage, removeAssetFromInvestor } from '@/services/positionService';
import InvestorAssetDropdown from './InvestorAssetDropdown';

interface EditableInvestorRowProps {
  investor: InvestorSummaryV2;
  assets: Asset[];
  onSendEmail: (email: string) => void;
  onSaveSuccess: () => void;
}

const EditableInvestorRow: React.FC<EditableInvestorRowProps> = ({
  investor,
  assets,
  onSendEmail,
  onSaveSuccess
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fee, setFee] = useState<string>("2.0");
  const { toast } = useToast();
  
  // Update fee state when investor prop changes
  useEffect(() => {
    setFee("2.0"); // Default fee since InvestorSummaryV2 doesn't have fee_percentage
  }, [investor]);
  
  // Create state for each asset balance
  const [balances, setBalances] = useState<Record<string, string>>(() => {
    const initialBalances: Record<string, string> = {};
    assets.forEach(asset => {
      const symbol = asset.symbol;
      const balance = investor.portfolioDetails.assetBreakdown[symbol] || 0;
      initialBalances[symbol] = balance.toString();
    });
    return initialBalances;
  });

  // Get list of asset IDs that this investor already has
  const existingAssetIds = Object.keys(investor.portfolioDetails.assetBreakdown).map(symbol => {
    const asset = assets.find(a => a.symbol.toUpperCase() === symbol.toUpperCase());
    return asset ? asset.id : -1;
  }).filter(id => id !== -1);

  const handleBalanceChange = (symbol: string, value: string) => {
    setBalances(prev => ({
      ...prev,
      [symbol]: value
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      console.log("Saving fee:", fee, "for investor:", investor.id);
      
      // Parse fee as float for database update, ensuring it's a valid number
      const feeValue = parseFloat(fee);
      if (isNaN(feeValue)) {
        throw new Error("Invalid fee percentage");
      }
      
      // Update fee percentage
      const feeUpdateSuccess = await updateInvestorFeePercentage(investor.id, feeValue);
      if (!feeUpdateSuccess) {
        throw new Error("Failed to update fee percentage");
      }
      
      // Update portfolio positions
      const portfolioUpdates = assets.map(asset => {
        const symbol = asset.symbol;
        const balance = parseFloat(balances[symbol] || '0');
        
        return {
          asset_symbol: symbol,
          balance: balance
        };
      }).filter(update => update.balance >= 0); // Include zero balances to clear positions
      
      // Update each position
      for (const update of portfolioUpdates) {
        if (update.balance === 0) {
          // Remove position if balance is zero
          await removeAssetFromInvestor(investor.id, update.asset_symbol);
        } else {
          // Update position
          const { error: positionError } = await supabase
            .from('positions')
            .upsert({
              user_id: investor.id,
              asset_code: update.asset_symbol as any, // Type cast to handle enum
              current_balance: update.balance,
              principal: update.balance, // Set principal to current balance for now
              total_earned: 0
            });
          
          if (positionError) {
            console.error("Error updating position:", positionError);
            throw positionError;
          }
        }
      }
      
      toast({
        title: "Success",
        description: "Investor portfolio updated successfully",
      });
      
      setTimeout(() => {
        setIsSaving(false);
        setIsEditing(false);
        onSaveSuccess(); // Refresh data
      }, 500); // Small delay to ensure UI feedback
      
    } catch (error) {
      console.error("Error saving investor data:", error);
      toast({
        title: "Error",
        description: "Failed to update investor portfolio",
        variant: "destructive",
      });
      setIsSaving(false);
    }
  };

  const name = investor.firstName && investor.lastName 
    ? `${investor.firstName} ${investor.lastName}`
    : investor.email.split('@')[0];

  return (
    <TableRow key={investor.id}>
      <TableCell className="font-medium">{name}</TableCell>
      
      {/* Asset balances */}
      {assets.map(asset => (
        <TableCell key={asset.id}>
          {isEditing ? (
            <Input 
              type="number"
              step="0.00000001"
              value={balances[asset.symbol] || '0'}
              onChange={(e) => handleBalanceChange(asset.symbol, e.target.value)}
              className="min-w-[120px] h-10"
            />
           ) : (
             investor.portfolioDetails.assetBreakdown[asset.symbol] 
               ? `${investor.portfolioDetails.assetBreakdown[asset.symbol].toFixed(4)}`
               : '-'
           )}
        </TableCell>
      ))}

      {/* Fee percentage */}
      <TableCell>
        {isEditing ? (
          <Input 
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            className="min-w-[100px] h-10"
          />
         ) : (
           "2.0%"
         )}
      </TableCell>
      
      {/* Actions */}
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          {isEditing ? (
            <Button 
              variant="default" 
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
            >
              <Save className="h-4 w-4 mr-1" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          ) : (
            <>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                Edit
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onSendEmail(investor.email)}
              >
                <Send className="h-4 w-4 mr-1" />
                Send Invite
              </Button>
              <InvestorAssetDropdown 
                userId={investor.id}
                assets={assets}
                existingAssets={existingAssetIds}
                onAssetAdded={onSaveSuccess}
              />
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
};

export default EditableInvestorRow;
