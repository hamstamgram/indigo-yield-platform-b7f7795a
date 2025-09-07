import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Save, User, Globe } from 'lucide-react';
import { getProfile, updateProfile } from '@/server/lp';
import { useAuth } from '@/context/AuthContext';

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'UTC', label: 'UTC' },
];

interface ProfileData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  timezone: string;
}

export default function ProfileSettings() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    timezone: 'UTC',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const profileData = await getProfile(user.id);
      setProfile(profileData);
      setFormData({
        firstName: profileData.firstName || '',
        lastName: profileData.lastName || '',
        timezone: profileData.timezone || 'UTC',
      });
    } catch (error) {
      console.error('Failed to load profile:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;
    
    try {
      setSaving(true);
      const result = await updateProfile(user.id, {
        first_name: formData.firstName,
        last_name: formData.lastName,
        timezone: formData.timezone,
      });
      
      if (result.success) {
        toast.success('Profile updated successfully');
        // Reload profile to get updated data
        loadProfile();
      } else {
        toast.error('Failed to update profile');
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          <div className="h-8 w-48 bg-gray-200 rounded mb-6 animate-pulse"></div>
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-10 w-full bg-gray-100 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Profile Settings</h1>
          <p className="text-gray-600">Manage your personal information and preferences</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Personal Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Email (read-only) */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={profile?.email || ''}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500">
                Email address cannot be changed. Contact support if you need to update it.
              </p>
            </div>

            {/* First Name */}
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                type="text"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                placeholder="Enter your first name"
              />
            </div>

            {/* Last Name */}
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                type="text"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                placeholder="Enter your last name"
              />
            </div>

            {/* Timezone */}
            <div className="space-y-2">
              <Label htmlFor="timezone">
                <Globe className="h-4 w-4 inline mr-1" />
                Timezone
              </Label>
              <Select
                value={formData.timezone}
                onValueChange={(value) => handleInputChange('timezone', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your timezone" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map(tz => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                This affects how dates and times are displayed in your account
              </p>
            </div>

            {/* Account Status Info */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-blue-800 mb-2">Account Information</h3>
              <div className="text-xs text-blue-700 space-y-1">
                <p><strong>Account ID:</strong> {profile?.id?.substring(0, 12)}...</p>
                <p><strong>Status:</strong> Active</p>
                <p><strong>KYC Status:</strong> Verified</p>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4 border-t">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center space-x-2"
              >
                {saving ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security Note */}
        <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
          <h3 className="text-sm font-medium text-yellow-800 mb-2">Security Notice</h3>
          <p className="text-xs text-yellow-700">
            For security reasons, some profile changes may require additional verification. 
            Contact our support team if you need help with sensitive account modifications.
          </p>
        </div>
      </div>
    </div>
  );
}
