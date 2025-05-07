
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Asset, Investor } from '@/types/investorTypes';

// Import our new components
import InvestorInfo from './InvestorInfo';
import AssetBalanceItem from './AssetBalanceItem';
import FeePercentageItem from './FeePercentageItem';
import CardActions from './CardActions';

interface MobileInvestorCardProps {
  investor: Investor;
  assets: Asset[];
  onSendEmail: (email: string) => void;
  onSaveSuccess: () => void;
}

const MobileInvestorCard = ({
  investor,
  assets,
  onSendEmail,
  onSaveSuccess
}: MobileInvestorCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fee, setFee] = useState<string>(investor.fee_percentage?.toString() || "2.0");
  const { toast } = useToast();
  
  // Update fee state when investor prop changes
  useEffect(() => {
    setFee(investor.fee_percentage?.toString() || "2.0");
  }, [investor]);
  
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
      console.log("Saving fee:", fee, "for investor:", investor.id);
      
      // Parse fee as float for database update, ensuring it's a valid number
      const feeValue = parseFloat(fee);
      if (isNaN(feeValue)) {
        throw new Error("Invalid fee percentage");
      }
      
      // Update fee percentage in profile
      const { data: feeData, error: feeError } = await supabase
        .from('profiles')
        .update({ 
          fee_percentage: feeValue,
          updated_at: new Date().toISOString()
        })
        .eq('id', investor.id)
        .select();
      
      if (feeError) {
        console.error("Error updating fee:", feeError);
        throw feeError;
      }
      
      console.log("Fee update response:", feeData);
      
      // Convert input values to portfolio entries
      const portfolioUpdates = assets.map(asset => {
        const symbol = asset.symbol;
        const balance = parseFloat(balances[symbol] || '0');
        
        return {
          user_id: investor.id,
          asset_id: asset.id,
          balance: balance,
          updated_at: new Date().toISOString()
        };
      }).filter(update => update.balance > 0); // Only update assets with positive balances
      
      if (portfolioUpdates.length > 0) {
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
      }
      
      toast({
        title: "Success",
        description: "Investor portfolio updated successfully",
      });
      
      // Add timeout to ensure UI feedback before reverting to normal state
      setTimeout(() => {
        setIsSaving(false);
        setIsEditing(false);
        onSaveSuccess(); // Refresh data
      }, 500);
      
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

  const name = investor.first_name && investor.last_name 
    ? `${investor.first_name} ${investor.last_name}`
    : investor.email.split('@')[0];

  return (
    <Card className="mb-4">
      <CardContent className="pt-4">
        <InvestorInfo name={name} email={investor.email} />
        
        <div className="space-y-4">
          {assets.map(asset => {
            // Determine what to display for balance
            const normalizedSymbol = asset.symbol.toUpperCase();
            const displayBalance = isEditing
              ? balances[asset.symbol] || '0'
              : investor.portfolio_summary && investor.portfolio_summary[normalizedSymbol]
                ? investor.portfolio_summary[normalizedSymbol].balance
                : '-';
                
            return (
              <AssetBalanceItem
                key={asset.id}
                symbol={asset.symbol}
                balance={displayBalance}
                isEditing={isEditing}
                onChange={handleBalanceChange}
              />
            );
          })}

          <FeePercentageItem 
            fee={isEditing ? fee : investor.fee_percentage !== null && investor.fee_percentage !== undefined
              ? investor.fee_percentage
              : '2.0%'}
            isEditing={isEditing}
            onChange={setFee}
          />
        </div>
      </CardContent>
      
      <CardFooter>
        <CardActions 
          isEditing={isEditing}
          isSaving={isSaving}
          userId={investor.id}
          existingAssets={existingAssetIds}
          assets={assets}
          onEdit={() => setIsEditing(true)}
          onSave={handleSave}
          onSendEmail={onSendEmail}
          email={investor.email}
          onAssetAdded={onSaveSuccess}
        />
      </CardFooter>
    </Card>
  );
};

export default MobileInvestorCard;
