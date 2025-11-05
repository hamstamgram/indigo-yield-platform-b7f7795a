/**
 * Referrals Page
 * Referral program dashboard with invite tracking
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Award,
  Copy,
  Share2,
  Users,
  DollarSign,
  CheckCircle,
  Clock,
  Loader2,
  Mail,
  MessageCircle,
  Link as LinkIcon,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth/context';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  pendingReferrals: number;
  totalEarnings: number;
  pendingEarnings: number;
}

interface Referral {
  id: string;
  email: string;
  status: 'pending' | 'completed' | 'rewarded';
  reward: number;
  createdAt: string;
  completedAt?: string;
}

export default function Referrals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [referralCode, setReferralCode] = useState('');
  const [referralLink, setReferralLink] = useState('');
  const [stats, setStats] = useState<ReferralStats>({
    totalReferrals: 0,
    activeReferrals: 0,
    pendingReferrals: 0,
    totalEarnings: 0,
    pendingEarnings: 0,
  });
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReferralData();
  }, [user]);

  const loadReferralData = async () => {
    if (!user) return;

    try {
      // Get or create referral code
      const { data: profileData } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('id', user.id)
        .single();

      let code = profileData?.referral_code;
      if (!code) {
        // Generate new referral code
        code = generateReferralCode();
        await supabase
          .from('profiles')
          .update({ referral_code: code })
          .eq('id', user.id);
      }

      setReferralCode(code);
      setReferralLink(`${window.location.origin}/signup?ref=${code}`);

      // Load referral stats
      const { data: referralsData } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });

      if (referralsData) {
        const mappedReferrals = referralsData.map((ref) => ({
          id: ref.id,
          email: ref.referred_email || 'Unknown',
          status: ref.status as any,
          reward: ref.reward_amount || 0,
          createdAt: ref.created_at,
          completedAt: ref.completed_at,
        }));

        setReferrals(mappedReferrals);

        // Calculate stats
        const totalReferrals = mappedReferrals.length;
        const activeReferrals = mappedReferrals.filter(
          (r) => r.status === 'completed' || r.status === 'rewarded'
        ).length;
        const pendingReferrals = mappedReferrals.filter((r) => r.status === 'pending').length;
        const totalEarnings = mappedReferrals
          .filter((r) => r.status === 'rewarded')
          .reduce((sum, r) => sum + r.reward, 0);
        const pendingEarnings = mappedReferrals
          .filter((r) => r.status === 'completed')
          .reduce((sum, r) => sum + r.reward, 0);

        setStats({
          totalReferrals,
          activeReferrals,
          pendingReferrals,
          totalEarnings,
          pendingEarnings,
        });
      }
    } catch (error) {
      console.error('Failed to load referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReferralCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast({
      title: 'Success',
      description: 'Referral link copied to clipboard',
    });
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    toast({
      title: 'Success',
      description: 'Referral code copied to clipboard',
    });
  };

  const handleShareEmail = () => {
    const subject = 'Join Indigo Yield Platform';
    const body = `I've been using Indigo Yield Platform and thought you might be interested. Use my referral link to sign up:\n\n${referralLink}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleShareSocial = (platform: 'twitter' | 'linkedin') => {
    const text = `Join me on Indigo Yield Platform - ${referralLink}`;
    const url =
      platform === 'twitter'
        ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`
        : `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`;
    window.open(url, '_blank');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'rewarded':
        return (
          <Badge className="gap-1 bg-green-600">
            <CheckCircle className="h-3 w-3" />
            Rewarded
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="secondary" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            Completed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
    }
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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Referral Program</h1>
          <p className="text-muted-foreground mt-2">
            Invite friends and earn rewards for each successful referral
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalReferrals}</p>
                <p className="text-xs text-muted-foreground">Total Referrals</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-500/10 p-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.activeReferrals}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-500/10 p-2">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pendingReferrals}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-500/10 p-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">${stats.totalEarnings.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Total Earned</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referral Link */}
      <Card>
        <CardHeader>
          <CardTitle>Your Referral Link</CardTitle>
          <CardDescription>
            Share this link with friends to invite them to the platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input value={referralLink} readOnly />
            <Button onClick={handleCopyLink} variant="outline">
              <Copy className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex gap-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Referral Code:</span>
              <code className="font-mono font-semibold">{referralCode}</code>
            </div>
            <Button onClick={handleCopyCode} variant="ghost" size="sm">
              <Copy className="h-3 w-3" />
            </Button>
          </div>

          <Separator />

          <div>
            <p className="text-sm font-medium mb-3">Share via:</p>
            <div className="flex gap-2">
              <Button onClick={handleShareEmail} variant="outline">
                <Mail className="mr-2 h-4 w-4" />
                Email
              </Button>
              <Button onClick={() => handleShareSocial('twitter')} variant="outline">
                <MessageCircle className="mr-2 h-4 w-4" />
                Twitter
              </Button>
              <Button onClick={() => handleShareSocial('linkedin')} variant="outline">
                <LinkIcon className="mr-2 h-4 w-4" />
                LinkedIn
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* How it Works */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                1
              </div>
              <div>
                <p className="font-medium">Share Your Link</p>
                <p className="text-sm text-muted-foreground">
                  Send your unique referral link to friends and family
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                2
              </div>
              <div>
                <p className="font-medium">They Sign Up</p>
                <p className="text-sm text-muted-foreground">
                  Your friend creates an account and completes KYC verification
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                3
              </div>
              <div>
                <p className="font-medium">Earn Rewards</p>
                <p className="text-sm text-muted-foreground">
                  Get $50 bonus when they make their first investment of $1,000 or more
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referral History */}
      <Card>
        <CardHeader>
          <CardTitle>Referral History</CardTitle>
          <CardDescription>Track all your referrals and their status</CardDescription>
        </CardHeader>
        <CardContent>
          {referrals.length === 0 ? (
            <div className="text-center py-8">
              <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No referrals yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Start inviting friends to earn rewards
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {referrals.map((referral, index) => (
                <div key={referral.id}>
                  {index > 0 && <Separator />}
                  <div className="flex items-center justify-between py-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{referral.email}</p>
                        {getStatusBadge(referral.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Invited on {format(new Date(referral.createdAt), 'PPP')}
                      </p>
                      {referral.completedAt && (
                        <p className="text-sm text-muted-foreground">
                          Completed on {format(new Date(referral.completedAt), 'PPP')}
                        </p>
                      )}
                    </div>
                    {referral.status === 'rewarded' && (
                      <div className="text-right">
                        <p className="font-semibold text-green-600">
                          +${referral.reward.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">Earned</p>
                      </div>
                    )}
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
