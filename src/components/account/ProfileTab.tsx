import { useState, useEffect } from "react";
import { User, User2, Mail, Phone, Upload } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ProfileTabProps {
  profile: any;
  loading: boolean;
  onSave: (data: any) => Promise<void>;
}

const ProfileTab = ({ profile, loading }: Omit<ProfileTabProps, "onSave">) => {
  const firstName = profile?.first_name || "";
  const lastName = profile?.last_name || "";
  const phone = profile?.phone || "";
  const avatarUrl = profile?.avatar_url || null;

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

  if (loading) {
    return <div className="animate-pulse">Loading profile...</div>;
  }

  return (
    <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 opacity-80">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-xl">Personal Information</CardTitle>
          <CardDescription>Your personal details (Read-only)</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative">
            <Avatar className="h-24 w-24 border-2 border-gray-200 dark:border-gray-700">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={profile?.first_name || "User"} />
              ) : null}
              <AvatarFallback className="text-2xl bg-indigo-600 text-white">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
          </div>
          <div>
            <h3 className="font-semibold text-lg">
              {profile?.first_name && profile?.last_name
                ? `${profile.first_name} ${profile.last_name}`
                : "Account User"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{profile?.email}</p>
          </div>
        </div>

        <Separator />

        <div className="space-y-4 pointer-events-none grayscale-[0.5]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label
                htmlFor="firstName"
                className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block"
              >
                First Name
              </Label>
              <div className="flex items-center gap-2 p-2 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-900">
                <User className="h-4 w-4 text-gray-500" />
                <span>{firstName || "—"}</span>
              </div>
            </div>

            <div>
              <Label
                htmlFor="lastName"
                className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block"
              >
                Last Name
              </Label>
              <div className="flex items-center gap-2 p-2 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-900">
                <User2 className="h-4 w-4 text-gray-500" />
                <span>{lastName || "—"}</span>
              </div>
            </div>
          </div>

          <div>
            <Label
              htmlFor="email"
              className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block"
            >
              Email Address
            </Label>
            <div className="flex items-center gap-2 p-2 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-900">
              <Mail className="h-4 w-4 text-gray-500" />
              <span>{profile?.email}</span>
            </div>
          </div>

          <div>
            <Label
              htmlFor="phone"
              className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block"
            >
              Phone Number
            </Label>
            <div className="flex items-center gap-2 p-2 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-900">
              <Phone className="h-4 w-4 text-gray-500" />
              <span>{phone || "—"}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfileTab;
