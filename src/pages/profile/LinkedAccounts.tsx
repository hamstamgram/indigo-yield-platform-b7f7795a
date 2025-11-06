// @ts-nocheck
/**
 * Linked Accounts Page
 * Manage bank accounts and crypto wallets
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Building2,
  Wallet,
  CheckCircle,
  AlertCircle,
  Loader2,
  MoreVertical,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth/context';
import { supabase } from '@/integrations/supabase/client';

interface BankAccount {
  id: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  accountType: string;
  isVerified: boolean;
  isPrimary: boolean;
  addedAt: string;
}

interface CryptoWallet {
  id: string;
  walletAddress: string;
  network: string;
  label: string;
  isVerified: boolean;
  addedAt: string;
}

export default function LinkedAccounts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [cryptoWallets, setCryptoWallets] = useState<CryptoWallet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLinkedAccounts();
  }, [user]);

  const loadLinkedAccounts = async () => {
    if (!user) return;

    try {
      const [banksRes, walletsRes] = await Promise.all([
        supabase
          .from('bank_accounts')
          .select('*')
          .eq('user_id', user.id)
          .order('is_primary', { ascending: false }),
        supabase
          .from('crypto_wallets')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ]);

      if (banksRes.data) {
        setBankAccounts(
          banksRes.data.map((account) => ({
            id: account.id,
            accountName: account.account_name,
            accountNumber: account.account_number,
            bankName: account.bank_name,
            accountType: account.account_type,
            isVerified: account.is_verified,
            isPrimary: account.is_primary,
            addedAt: account.created_at,
          }))
        );
      }

      if (walletsRes.data) {
        setCryptoWallets(
          walletsRes.data.map((wallet) => ({
            id: wallet.id,
            walletAddress: wallet.wallet_address,
            network: wallet.network,
            label: wallet.label,
            isVerified: wallet.is_verified,
            addedAt: wallet.created_at,
          }))
        );
      }
    } catch (error) {
      console.error('Failed to load linked accounts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your linked accounts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveBankAccount = async (accountId: string) => {
    try {
      const { error } = await supabase
        .from('bank_accounts')
        .delete()
        .eq('id', accountId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Bank account removed successfully',
      });

      loadLinkedAccounts();
    } catch (error) {
      console.error('Failed to remove bank account:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove bank account',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveWallet = async (walletId: string) => {
    try {
      const { error } = await supabase
        .from('crypto_wallets')
        .delete()
        .eq('id', walletId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Wallet removed successfully',
      });

      loadLinkedAccounts();
    } catch (error) {
      console.error('Failed to remove wallet:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove wallet',
        variant: 'destructive',
      });
    }
  };

  const maskAccountNumber = (number: string) => {
    return `****${number.slice(-4)}`;
  };

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/profile')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Linked Accounts</h1>
          <p className="text-muted-foreground mt-2">
            Manage your connected bank accounts and crypto wallets
          </p>
        </div>
      </div>

      {/* Bank Accounts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                <CardTitle>Bank Accounts</CardTitle>
              </div>
              <CardDescription className="mt-2">
                Linked bank accounts for deposits and withdrawals
              </CardDescription>
            </div>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Bank Account
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {bankAccounts.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No bank accounts linked yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {bankAccounts.map((account, index) => (
                <div key={account.id}>
                  {index > 0 && <Separator />}
                  <div className="flex items-start justify-between py-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-muted p-2">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{account.accountName}</p>
                          {account.isPrimary && (
                            <Badge variant="secondary" className="text-xs">
                              Primary
                            </Badge>
                          )}
                          {account.isVerified ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-amber-600" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {account.bankName} • {account.accountType}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {maskAccountNumber(account.accountNumber)}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!account.isPrimary && (
                          <DropdownMenuItem>Set as Primary</DropdownMenuItem>
                        )}
                        {!account.isVerified && (
                          <DropdownMenuItem>Verify Account</DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleRemoveBankAccount(account.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Crypto Wallets */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                <CardTitle>Crypto Wallets</CardTitle>
              </div>
              <CardDescription className="mt-2">
                Connected cryptocurrency wallets
              </CardDescription>
            </div>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Wallet
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {cryptoWallets.length === 0 ? (
            <div className="text-center py-8">
              <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No wallets linked yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cryptoWallets.map((wallet, index) => (
                <div key={wallet.id}>
                  {index > 0 && <Separator />}
                  <div className="flex items-start justify-between py-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-muted p-2">
                        <Wallet className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{wallet.label}</p>
                          {wallet.isVerified ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-amber-600" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {wallet.network}
                        </p>
                        <p className="text-sm font-mono text-muted-foreground">
                          {shortenAddress(wallet.walletAddress)}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Copy Address</DropdownMenuItem>
                        {!wallet.isVerified && (
                          <DropdownMenuItem>Verify Wallet</DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleRemoveWallet(wallet.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
