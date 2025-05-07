
import React, { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Send, Save } from "lucide-react";
import { CryptoIcon } from "@/components/CryptoIcons";
import { Asset, Investor } from "@/types/investorTypes";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface MobileInvestorCardProps {
  investor: Investor;
  assets: Asset[];
  onSendEmail: (email: string) => void;
  onSaveSuccess: () => void;
}

const MobileInvestorCard: React.FC<MobileInvestorCardProps> = ({
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
      const balance = investor.portfolio_summary && investor.portfolio_summary[symbol] 
        ? investor.portfolio_summary[symbol].balance.toString()
        : '0';
      initialBalances[symbol] = balance;
    });
    return initialBalances;
  });

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
    <Card>
      <CardContent className="pt-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">{name}</h3>
          <p className="text-sm text-gray-500">{investor.email}</p>
        </div>
        
        <div className="space-y-3">
          {assets.map(asset => (
            <div key={asset.id} className="flex items-center justify-between">
              <div className="flex items-center">
                <CryptoIcon symbol={asset.symbol} className="h-5 w-5 mr-2" />
                <span>{asset.symbol}</span>
              </div>
              
              {isEditing ? (
                <Input 
                  type="number"
                  step="0.00000001"
                  value={balances[asset.symbol] || '0'}
                  onChange={(e) => handleBalanceChange(asset.symbol, e.target.value)}
                  className="max-w-[120px]"
                />
              ) : (
                <span className="font-mono">
                  {investor.portfolio_summary && investor.portfolio_summary[asset.symbol] 
                    ? investor.portfolio_summary[asset.symbol].balance.toFixed(4)
                    : '-'
                  }
                </span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-end gap-2">
        {isEditing ? (
          <Button 
            variant="default" 
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="w-full"
          >
            <Save className="h-4 w-4 mr-1" />
            {isSaving ? 'Saving...' : 'Save Changes'}
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
          </>
        )}
      </CardFooter>
    </Card>
  );
};

export default MobileInvestorCard;
