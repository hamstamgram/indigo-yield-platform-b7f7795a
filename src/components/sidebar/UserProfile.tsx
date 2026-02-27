import { Crown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui";

type UserProfileProps = {
  userName: string;
  isAdmin?: boolean;
  avatarUrl?: string;
};

const UserProfile = ({ userName, isAdmin = false, avatarUrl }: UserProfileProps) => {
  const initials = userName
    .split(" ")
    .map((name) => name.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-center px-4 py-3">
      <div className="flex items-center gap-3 w-full">
        <div className="shrink-0">
          <Avatar className="w-8 h-8">
            <AvatarImage src={avatarUrl} alt={userName} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-bold text-sidebar-foreground truncate leading-tight">
              {userName}
            </p>
            {isAdmin && <Crown className="w-3 h-3 text-primary shrink-0" />}
          </div>
          <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
            {isAdmin ? "Administrator" : "Investor"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
