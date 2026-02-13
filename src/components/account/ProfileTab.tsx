/**
 * ProfileTab - Editable profile with avatar upload
 */
import { useState, useRef } from "react";
import { User, User2, Mail, Phone, Camera, Save, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Separator,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Button,
} from "@/components/ui";
import { useUpdatePersonalInfo } from "@/hooks/data/shared/useProfileSettings";
import { uploadAvatar } from "@/services/shared/storageService";
import { useToast } from "@/hooks";

interface ProfileTabProps {
  profile: {
    id?: string;
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
    email?: string | null;
    avatar_url?: string | null;
  } | null;
  loading: boolean;
}

const ProfileTab = ({ profile, loading }: ProfileTabProps) => {
  const [firstName, setFirstName] = useState(profile?.first_name || "");
  const [lastName, setLastName] = useState(profile?.last_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const updateMutation = useUpdatePersonalInfo();

  // Sync form state when profile loads
  const [lastProfileId, setLastProfileId] = useState<string | undefined>();
  if (profile?.id && profile.id !== lastProfileId) {
    setLastProfileId(profile.id);
    setFirstName(profile.first_name || "");
    setLastName(profile.last_name || "");
    setPhone(profile.phone || "");
  }

  const avatarUrl = avatarPreview || profile?.avatar_url || null;

  const getInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    } else if (profile?.first_name) {
      return profile.first_name[0].toUpperCase();
    } else if (profile?.email) {
      return profile.email[0].toUpperCase();
    }
    return "U";
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.id) return;

    // Validate file type and size
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Avatar must be under 2 MB",
        variant: "destructive",
      });
      return;
    }

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);

    try {
      setUploading(true);
      const { publicUrl } = await uploadAvatar(profile.id, file);
      updateMutation.mutate({ avatar_url: publicUrl });
    } catch (err) {
      toast({
        title: "Upload failed",
        description: "Could not upload avatar",
        variant: "destructive",
      });
      setAvatarPreview(null);
    } finally {
      setUploading(false);
      // Reset input so re-selecting the same file triggers onChange
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = () => {
    updateMutation.mutate({
      first_name: firstName,
      last_name: lastName,
      phone: phone || undefined,
    });
  };

  const hasChanges =
    firstName !== (profile?.first_name || "") ||
    lastName !== (profile?.last_name || "") ||
    phone !== (profile?.phone || "");

  if (loading) {
    return <div className="animate-pulse">Loading profile...</div>;
  }

  return (
    <Card className="border-white/10 bg-card">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-xl">Personal Information</CardTitle>
          <CardDescription>Your personal details</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
            <Avatar className="h-24 w-24 border-2 border-border">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={profile?.first_name || "User"} />
              ) : null}
              <AvatarFallback className="text-2xl bg-indigo-600 text-white">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
              {uploading ? (
                <Loader2 className="h-6 w-6 text-white animate-spin" />
              ) : (
                <Camera className="h-6 w-6 text-white" />
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          <div>
            <h3 className="font-semibold text-lg">
              {profile?.first_name && profile?.last_name
                ? `${profile.first_name} ${profile.last_name}`
                : "Account User"}
            </h3>
            <p className="text-sm text-muted-foreground">{profile?.email}</p>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName" className="text-sm font-medium text-foreground mb-1 block">
                First Name
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="pl-9"
                  placeholder="First name"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="lastName" className="text-sm font-medium text-foreground mb-1 block">
                Last Name
              </Label>
              <div className="relative">
                <User2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="pl-9"
                  placeholder="Last name"
                />
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="email" className="text-sm font-medium text-foreground mb-1 block">
              Email Address
            </Label>
            <div className="flex items-center gap-2 p-2 border border-border rounded-md bg-muted">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{profile?.email}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Contact support to change your email address
            </p>
          </div>

          <div>
            <Label htmlFor="phone" className="text-sm font-medium text-foreground mb-1 block">
              Phone Number
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pl-9"
                placeholder="Phone number"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={!hasChanges || updateMutation.isPending}>
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfileTab;
