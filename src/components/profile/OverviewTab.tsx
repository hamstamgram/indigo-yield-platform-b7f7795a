import { useEffect, useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth/context";
import { supabase } from "@/integrations/supabase/client";

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

interface OverviewTabProps {
  onTabChange: (value: string) => void;
}

export default function OverviewTab({ onTabChange }: OverviewTabProps) {
  const { user, profile } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<AccountStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfileData();
    loadAccountStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadProfileData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfileData({
          firstName: data.first_name ?? undefined,
          lastName: data.last_name ?? undefined,
          email: user.email || "",
          phone: data.phone ?? undefined,
          address: undefined,
          city: undefined,
          state: undefined,
          postalCode: undefined,
          country: undefined,
          dateOfBirth: undefined,
          accountCreated: data.created_at,
          twoFactorEnabled: profile?.totp_verified || false,
          emailVerified: user.email_confirmed_at != null,
          phoneVerified: false,
        });
      }
    } catch (error) {
      console.error("Failed to load profile data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAccountStats = async () => {
    if (!user) return;

    try {
      const documentsRes = await supabase.from("documents").select("id").eq("user_id", user.id);

      setStats({
        totalInvested: 0,
        totalValue: 0,
        totalReturn: 0,
        activeStrategies: 0,
        documentsUploaded: documentsRes.data?.length || 0,
        referralsCount: 0,
      });
    } catch (error) {
      console.error("Failed to load account stats:", error);
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
      profileData.twoFactorEnabled,
      profileData.emailVerified,
    ];

    const completed = fields.filter(Boolean).length;
    return Math.round((completed / fields.length) * 100);
  };

  const getInitials = () => {
    if (!profileData) return "U";
    const first = profileData.firstName?.[0] || "";
    const last = profileData.lastName?.[0] || "";
    return `${first}${last}`.toUpperCase() || "U";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const profileCompleteness = getProfileCompleteness();

  return (
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
                {profileData?.emailVerified && (
                  <Badge variant="outline" className="gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Verified
                  </Badge>
                )}
                {profile?.is_admin && <Badge variant="secondary">Admin</Badge>}
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
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => onTabChange("personal-info")}
                >
                  Complete Your Profile
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
                <span
                  className={`font-semibold ${stats.totalReturn >= 0 ? "text-green-600" : "text-red-600"}`}
                >
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
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right Column - Info */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Full Name</p>
                <p>
                  {profileData?.firstName} {profileData?.lastName || "Not set"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Email</p>
                <p>{profileData?.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Phone</p>
                <p>{profileData?.phone || "Not set"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Location</p>
                <p>
                  {[profileData?.city, profileData?.country].filter(Boolean).join(", ") ||
                    "Not set"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Member Since</p>
                <p>
                  {profileData?.accountCreated
                    ? new Date(profileData.accountCreated).toLocaleDateString()
                    : "Unknown"}
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => onTabChange("personal-info")}>
                Edit Information
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
