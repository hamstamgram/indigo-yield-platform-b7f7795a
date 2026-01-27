import React from "react";
import { LogOut } from "lucide-react";
import { useSignOut } from "@/hooks/data";

type LogoutButtonProps = {
  onLogout?: () => void;
};

const LogoutButton: React.FC<LogoutButtonProps> = ({ onLogout }) => {
  const signOutMutation = useSignOut();

  const handleLogout = async () => {
    if (onLogout) {
      onLogout();
    }
    signOutMutation.mutate();
  };

  return (
    <button
      onClick={handleLogout}
      disabled={signOutMutation.isPending}
      className="flex w-full items-center px-2 py-2 text-sm text-gray-700 hover:text-red-600 hover:bg-gray-100 rounded-md group dark:text-gray-300 dark:hover:text-red-400 dark:hover:bg-gray-700"
      aria-label={signOutMutation.isPending ? "Logging out..." : "Log out of your account"}
      aria-busy={signOutMutation.isPending}
    >
      <span className="mr-3" aria-hidden="true">
        <LogOut className="h-5 w-5" />
      </span>
      {signOutMutation.isPending ? "Logging out..." : "Log Out"}
    </button>
  );
};

export default LogoutButton;
