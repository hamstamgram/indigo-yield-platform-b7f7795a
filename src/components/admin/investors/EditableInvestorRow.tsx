
import React, { useState, useEffect } from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Send, Save } from 'lucide-react';
import { Asset, Investor } from '@/types/investorTypes';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import InvestorAssetDropdown from './InvestorAssetDropdown';

interface EditableInvestorRowProps {
  investor: Investor;
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
  const { toast } = useToast();
  
  // Create state for each asset balance
  const [balances, setBalances] = useState<Record<string, string>>(() => {
    const initialBalances: Record<string, string> = {};
    assets.forEach(asset => {
      const symbol = asset.symbol;
      // Normalize symbol to uppercase for lookup in portfolio_summary
      const normalizedSymbol = symbol.toUpperCase();
      const balance = investor.portfolio_summary && investor.portfolio_summary[normalizedSymbol] 
        ? investor.portfolio_summary[normalizedSymbol].balance.toString()
        : '0';
      initialBalances[symbol] = balance;
    });
    return initialBalances;
  });

  // Get list of asset IDs that this investor already has
  const existingAssetIds = investor.portfolio_summary 
    ? Object.keys(investor.portfolio_summary).map(symbol => {
        const asset = assets.find(a => a.symbol.toUpperCase() === symbol);
        return asset ? asset.id : -1;
      }).filter(id => id !== -1)
    : [];

  const handleBalanceChange = (symbol: string, value: string) => {
    setBalances(prev => ({
      ...prev,
      [symbol]: value
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // Convert input values to portfolio entries
      const portfolioUpdates = assets.map(asset => {
        const symbol = asset.symbol;
        const balance = parseFloat(balances[symbol] || '0');
        
        return {
          user_id: investor.id,
          asset_id: asset.id,
          balance: balance
        };
      });
      
      // Use upsert to add or update portfolio entries
      const { error } = await supabase
        .from('portfolios')
        .upsert(
          portfolioUpdates,
          { 
            onConflict: 'user_id,asset_id',
            ignoreDuplicates: false 
          }
        );
      
      if (error) {
        console.error("Error updating portfolio:", error);
        throw error;
      }
      
      toast({
        title: "Success",
        description: "Investor portfolio updated successfully",
      });
      
      setIsEditing(false);
      onSaveSuccess(); // Refresh data
    } catch (error) {
      console.error("Error saving investor data:", error);
      toast({
        title: "Error",
        description: "Failed to update investor portfolio",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const name = investor.first_name && investor.last_name 
    ? `${investor.first_name} ${investor.last_name}`
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
              className="max-w-[100px]"
            />
          ) : (
            investor.portfolio_summary && investor.portfolio_summary[asset.symbol.toUpperCase()] 
              ? `${investor.portfolio_summary[asset.symbol.toUpperCase()].balance.toFixed(4)}`
              : '-'
          )}
        </TableCell>
      ))}
      
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
                existingAssetIds={existingAssetIds}
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
