// @ts-nocheck
/**
 * Profile Overview Page
 * Main profile page with account summary
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  User,
  Shield,
  Settings,
  Lock,
  Link as LinkIcon,
  FileText,
  Award,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/lib/auth/context';
import { supabase } from '@/integrations/supabase/client';

interface ProfileData {
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  dateOfBirth?: string;
  accountCreated?: string;
  kycStatus?: string;
  kycVerifiedAt?: string;
  twoFactorEnabled?: boolean;
  emailVerified?: boolean;
  phoneVerified?: boolean;
}

interface AccountStats {
  totalInvested: number;
  totalValue: number;
  totalReturn: number;
  activeStrategies: number;
  documentsUploaded: number;
  referralsCount: number;
}

export default function ProfileOverview() {
  const { user, profile } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<AccountStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfileData();
    loadAccountStats();
  }, [user]);

  const loadProfileData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setProfileData({
        firstName: data.first_name,
        lastName: data.last_name,
        email: user.email || '',
        phone: data.phone,
        address: data.address,
        city: data.city,
        state: data.state,
        postalCode: data.postal_code,
        country: data.country,
        dateOfBirth: data.date_of_birth,
        accountCreated: data.created_at,
        kycStatus: data.kyc_status,
        kycVerifiedAt: data.kyc_verified_at,
        twoFactorEnabled: profile?.totp_verified || false,
        emailVerified: user.email_confirmed_at != null,
        phoneVerified: data.phone_verified,
      });
    } catch (error) {
      console.error('Failed to load profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAccountStats = async () => {
    if (!user) return;

    try {
      // Load aggregated stats
      const [investmentsRes, strategiesRes, documentsRes, referralsRes] = await Promise.all([
        supabase
          .from('investments')
          .select('amount, current_value')
          .eq('investor_id', user.id)
          .eq('status', 'active'),
        supabase
          .from('investor_strategies')
          .select('id')
          .eq('investor_id', user.id)
          .eq('status', 'active'),
        supabase
          .from('documents')
          .select('id')
          .eq('investor_id', user.id),
        supabase
          .from('referrals')
          .select('id')
          .eq('referrer_id', user.id)
          .eq('status', 'completed'),
      ]);

      const totalInvested = investmentsRes.data?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0;
      const totalValue = investmentsRes.data?.reduce((sum, inv) => sum + (inv.current_value || 0), 0) || 0;

      setStats({
        totalInvested,
        totalValue,
        totalReturn: totalValue - totalInvested,
        activeStrategies: strategiesRes.data?.length || 0,
        documentsUploaded: documentsRes.data?.length || 0,
        referralsCount: referralsRes.data?.length || 0,
      });
    } catch (error) {
      console.error('Failed to load account stats:', error);
    }
  };

  const getProfileCompleteness = () => {
    if (!profileData) return 0;

    const fields = [
      profileData.firstName,
      profileData.lastName,
      profileData.phone,
      profileData.address,
      profileData.dateOfBirth,
      profileData.kycStatus === 'verified',
      profileData.twoFactorEnabled,
      profileData.emailVerified,
    ];

    const completed = fields.filter(Boolean).length;
    return Math.round((completed / fields.length) * 100);
  };

  const getInitials = () => {
    if (!profileData) return 'U';
    const first = profileData.firstName?.[0] || '';
    const last = profileData.lastName?.[0] || '';
    return `${first}${last}`.toUpperCase() || 'U';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const profileCompleteness = getProfileCompleteness();

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account settings and personal information
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={undefined} />
                  <AvatarFallback className="text-2xl">{getInitials()}</AvatarFallback>
                </Avatar>

                <div>
                  <h3 className="text-xl font-semibold">
                    {profileData?.firstName} {profileData?.lastName}
                  </h3>
                  <p className="text-sm text-muted-foreground">{profileData?.email}</p>
                </div>

                <div className="flex gap-2">
                  {profileData?.kycStatus === 'verified' && (
                    <Badge variant="outline" className="gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Verified
                    </Badge>
                  )}
                  {profile?.is_admin && (
                    <Badge variant="secondary">Admin</Badge>
                  )}
                </div>
              </div>

              <Separator className="my-6" />

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Profile Completeness</span>
                    <span className="font-medium">{profileCompleteness}%</span>
                  </div>
                  <Progress value={profileCompleteness} className="h-2" />
                </div>

                {profileCompleteness < 100 && (
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/profile/personal-info">Complete Your Profile</Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          {stats && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Account Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Invested</span>
                  <span className="font-semibold">${stats.totalInvested.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Current Value</span>
                  <span className="font-semibold">${stats.totalValue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Return</span>
                  <span className={`font-semibold ${stats.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${Math.abs(stats.totalReturn).toLocaleString()}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Active Strategies</span>
                  <span className="font-semibold">{stats.activeStrategies}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Documents</span>
                  <span className="font-semibold">{stats.documentsUploaded}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Referrals</span>
                  <span className="font-semibold">{stats.referralsCount}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Quick Links */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Manage your account settings and preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <Link to="/profile/personal-info">
                  <Card className="hover:bg-accent transition-colors cursor-pointer">
                    <CardContent className="flex items-start gap-4 p-6">
                      <div className="rounded-lg bg-primary/10 p-3">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Personal Information</h3>
                        <p className="text-sm text-muted-foreground">
                          Update your name, contact details, and address
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                <Link to="/profile/security">
                  <Card className="hover:bg-accent transition-colors cursor-pointer">
                    <CardContent className="flex items-start gap-4 p-6">
                      <div className="rounded-lg bg-primary/10 p-3">
                        <Shield className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Security Settings</h3>
                        <p className="text-sm text-muted-foreground">
                          Password, 2FA, and active sessions
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                <Link to="/profile/preferences">
                  <Card className="hover:bg-accent transition-colors cursor-pointer">
                    <CardContent className="flex items-start gap-4 p-6">
                      <div className="rounded-lg bg-primary/10 p-3">
                        <Settings className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Preferences</h3>
                        <p className="text-sm text-muted-foreground">
                          Notifications, language, and timezone
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                <Link to="/profile/privacy">
                  <Card className="hover:bg-accent transition-colors cursor-pointer">
                    <CardContent className="flex items-start gap-4 p-6">
                      <div className="rounded-lg bg-primary/10 p-3">
                        <Lock className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Privacy</h3>
                        <p className="text-sm text-muted-foreground">
                          Data privacy and export options
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                <Link to="/profile/linked-accounts">
                  <Card className="hover:bg-accent transition-colors cursor-pointer">
                    <CardContent className="flex items-start gap-4 p-6">
                      <div className="rounded-lg bg-primary/10 p-3">
                        <LinkIcon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Linked Accounts</h3>
                        <p className="text-sm text-muted-foreground">
                          Bank accounts and wallets
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                <Link to="/profile/kyc-verification">
                  <Card className="hover:bg-accent transition-colors cursor-pointer">
                    <CardContent className="flex items-start gap-4 p-6">
                      <div className="rounded-lg bg-primary/10 p-3">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex justify-between items-start flex-1">
                        <div>
                          <h3 className="font-semibold mb-1">KYC Verification</h3>
                          <p className="text-sm text-muted-foreground">
                            Identity verification and documents
                          </p>
                        </div>
                        {profileData?.kycStatus === 'verified' ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-amber-600" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                <Link to="/profile/referrals">
                  <Card className="hover:bg-accent transition-colors cursor-pointer">
                    <CardContent className="flex items-start gap-4 p-6">
                      <div className="rounded-lg bg-primary/10 p-3">
                        <Award className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Referral Program</h3>
                        <p className="text-sm text-muted-foreground">
                          Invite friends and earn rewards
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
