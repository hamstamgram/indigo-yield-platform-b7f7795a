import { useState, useEffect } from 'react';
import { User, User2, Mail, Phone, Upload, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ProfileTabProps {
  profile: any;
  loading: boolean;
  onSave: (data: any) => Promise<void>;
}

const ProfileTab = ({ profile, loading, onSave }: ProfileTabProps) => {
  const [editMode, setEditMode] = useState(false);
  const [firstName, setFirstName] = useState(profile?.first_name || '');
  const [lastName, setLastName] = useState(profile?.last_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url || null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const { toast } = useToast();

  // Update local state when profile changes
  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setPhone(profile.phone || '');
      setAvatarUrl(profile.avatar_url || null);
    }
  }, [profile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }
    const file = e.target.files[0];
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Image must be less than 5MB',
        variant: 'destructive',
      });
      return;
    }
    setAvatarFile(file);
    // Create a preview URL
    const objectUrl = URL.createObjectURL(file);
    setAvatarUrl(objectUrl);
  };

  const handleSaveProfile = async () => {
    try {
      setIsUpdating(true);
      
      let newAvatarUrl = profile?.avatar_url;

      // Upload new avatar if one was selected
      if (avatarFile) {
        try {
          const fileExt = avatarFile.name.split('.').pop();
          const fileName = `${profile.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
          const filePath = `${profile.id}/${fileName}`;
          
          // Upload avatar to storage
          const { error: uploadError } = await supabase.storage
            .from('profiles')
            .upload(filePath, avatarFile);
            
          if (uploadError) {
            throw uploadError;
          }
          
          // Get public URL for the uploaded file
          const { data } = supabase.storage
            .from('profiles')
            .getPublicUrl(filePath);
            
          newAvatarUrl = data.publicUrl;
        } catch (uploadError: any) {
          console.error('Error uploading avatar:', uploadError);
          toast({
            title: 'Upload failed',
            description: uploadError.message || 'Failed to upload image',
            variant: 'destructive',
          });
          // Continue saving other profile info even if avatar upload fails
        }
      }
      
      // Save profile with potentially new avatar URL
      await onSave({
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        avatar_url: newAvatarUrl,
      });
      
      setEditMode(false);
    } catch (error: any) {
      console.error('Error in handleSaveProfile:', error);
      toast({
        title: 'Update failed',
        description: error.message || 'Failed to update profile information',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setFirstName(profile?.first_name || '');
    setLastName(profile?.last_name || '');
    setPhone(profile?.phone || '');
    setAvatarUrl(profile?.avatar_url || null);
    setAvatarFile(null);
  };

  const getInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    } else if (profile?.first_name) {
      return profile.first_name[0].toUpperCase();
    } else if (profile?.email) {
      return profile.email[0].toUpperCase();
    }
    return 'U';
  };

  if (loading) {
    return <div className="animate-pulse">Loading profile...</div>;
  }

  return (
    <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-xl">Personal Information</CardTitle>
          <CardDescription>Manage your personal details</CardDescription>
        </div>
        {!editMode ? (
          <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditMode(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveProfile} disabled={isUpdating}>
              {isUpdating ? 'Saving...' : 'Save'}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative">
            <Avatar className="h-24 w-24 border-2 border-gray-200 dark:border-gray-700">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={profile?.first_name || 'User'} />
              ) : null}
              <AvatarFallback className="text-2xl bg-indigo-600 text-white">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            {editMode && (
              <div className="mt-2">
                <Label htmlFor="avatar-upload" className="cursor-pointer">
                  <div className="flex items-center justify-center py-1 px-3 bg-gray-100 dark:bg-gray-700 rounded-md text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition">
                    <Upload className="h-4 w-4 mr-2" />
                    Change Photo
                  </div>
                  <Input 
                    id="avatar-upload" 
                    type="file" 
                    className="hidden" 
                    onChange={handleFileChange}
                    accept="image/*"
                  />
                </Label>
              </div>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-lg">
              {profile?.first_name && profile?.last_name 
                ? `${profile.first_name} ${profile.last_name}` 
                : 'Account User'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{profile?.email}</p>
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                First Name
              </Label>
              {editMode ? (
                <Input 
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full"
                />
              ) : (
                <div className="flex items-center gap-2 p-2 border border-gray-200 dark:border-gray-700 rounded-md">
                  <User className="h-4 w-4 text-gray-500" />
                  <span>{profile?.first_name || '—'}</span>
                </div>
              )}
            </div>
            
            <div>
              <Label htmlFor="lastName" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                Last Name
              </Label>
              {editMode ? (
                <Input 
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full"
                />
              ) : (
                <div className="flex items-center gap-2 p-2 border border-gray-200 dark:border-gray-700 rounded-md">
                  <User2 className="h-4 w-4 text-gray-500" />
                  <span>{profile?.last_name || '—'}</span>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
              Email Address
            </Label>
            <div className="flex items-center gap-2 p-2 border border-gray-200 dark:border-gray-700 rounded-md">
              <Mail className="h-4 w-4 text-gray-500" />
              <span>{profile?.email}</span>
            </div>
          </div>
          
          <div>
            <Label htmlFor="phone" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
              Phone Number
            </Label>
            {editMode ? (
              <Input 
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full"
                placeholder="+1 (555) 123-4567"
              />
            ) : (
              <div className="flex items-center gap-2 p-2 border border-gray-200 dark:border-gray-700 rounded-md">
                <Phone className="h-4 w-4 text-gray-500" />
                <span>{profile?.phone || '—'}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfileTab;
