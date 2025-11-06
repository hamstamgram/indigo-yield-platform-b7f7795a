
import { Crown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type UserProfileProps = {
  userName: string;
  isAdmin?: boolean;
  avatarUrl?: string;
};

const UserProfile = ({ userName, isAdmin = false, avatarUrl }: UserProfileProps) => {
  const initials = userName
    .split(' ')
    .map(name => name.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-center px-6 py-4 border-t border-sidebar-border bg-sidebar-accent/30">
      <div className="flex items-center space-x-3 w-full">
        <div className="flex-shrink-0">
          <Avatar className="w-9 h-9">
            <AvatarImage src={avatarUrl} alt={userName} />
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-sm font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {userName}
            </p>
            {isAdmin && (
              <Crown className="w-3 h-3 text-sidebar-primary shrink-0" />
            )}
          </div>
          {isAdmin && (
            <p className="text-xs text-sidebar-foreground/60">
              Administrator
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
