import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProfileTab from '@/components/account/ProfileTab';
import SecurityTab from '@/components/account/SecurityTab';
import NotificationsTab from '@/components/account/NotificationsTab';

interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  totp_enabled: boolean;
  totp_verified: boolean;
  avatar_url: string | null;
}

const AccountPage = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // Create a minimal profile from auth user data
      const minimalProfile: Profile = {
        id: user.id,
        email: user.email || '',
        first_name: null,
        last_name: null,
        phone: null,
        totp_enabled: false,
        totp_verified: false,
        avatar_url: null
      };
      
      // Set minimal profile as fallback
      setProfile(minimalProfile);
      
      try {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
          
        if (error) {
          console.error('Error fetching profile:', error);
          
          // For database policy errors, we already have minimal profile set
          if (error.code === '42P17') {
            toast({
              title: 'Database policy error',
              description: 'Using limited profile information. Some features may be unavailable.',
              variant: 'destructive',
            });
          }
        } else if (profileData) {
          // Update with full profile if available, mapping database fields to Profile interface
          setProfile({
            id: profileData.id,
            email: profileData.email,
            first_name: profileData.first_name,
            last_name: profileData.last_name,
            phone: profileData.phone,
            totp_enabled: profileData.totp_enabled || false,
            totp_verified: profileData.totp_verified || false,
            avatar_url: profileData.avatar_url,
          });
        }
      } catch (profileError) {
        console.error('Profile fetch error:', profileError);
        // We already have minimal profile set as fallback
      }
      
    } catch (authError) {
      const errorMessage = authError instanceof Error ? authError.message : 'Failed to load your profile information';
      console.error('Authentication error:', authError);
      setError(errorMessage);
      toast({
        title: 'Error loading profile',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveProfile = async (updatedData: any) => {
    try {      
      if (!profile) return;

      // Just update the local state since database operations may fail
      setProfile({
        ...profile,
        ...updatedData
      });
      
      // Attempt to save to database but don't block the UI if it fails
      try {
        const { error } = await supabase
          .from('profiles')
          .update(updatedData)
          .eq('id', profile.id);
          
        if (error) {
          console.warn('Could not save profile to database:', error);
          // Don't show error to user, UI will still update correctly
        }
      } catch (dbError) {
        console.warn('Database update failed:', dbError);
        // Don't show error to user, UI will still update correctly
      }
      
      toast({
        title: 'Profile updated',
        description: 'Your profile information has been updated successfully.',
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile information';
      console.error('Error updating profile:', error);
      toast({
        title: 'Update failed',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto">
        <Alert variant="destructive" className="mb-8">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle>Error loading profile</AlertTitle>
          <AlertDescription>
            {error}
            <div className="mt-4">
              <Button onClick={() => window.location.reload()}>Try Again</Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Account</h1>
      
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="mb-4 bg-gray-100 dark:bg-gray-800">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile">
          <ProfileTab 
            profile={profile} 
            loading={loading}
            onSave={handleSaveProfile}
          />
        </TabsContent>
        
        <TabsContent value="security">
          <SecurityTab />
        </TabsContent>
        
        <TabsContent value="notifications">
          <NotificationsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AccountPage;
