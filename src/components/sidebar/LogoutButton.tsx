import React from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks";

type LogoutButtonProps = {
  onLogout?: () => void;
};

const LogoutButton: React.FC<LogoutButtonProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account.",
      });
      if (onLogout) {
        onLogout();
      }
      navigate("/");
    } catch (error) {
      toast({
        title: "Log out failed",
        description: "There was an error logging out. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="flex w-full items-center px-2 py-2 text-sm text-gray-700 hover:text-red-600 hover:bg-gray-100 rounded-md group dark:text-gray-300 dark:hover:text-red-400 dark:hover:bg-gray-700"
    >
      <span className="mr-3">
        <LogOut className="h-5 w-5" />
      </span>
      Log Out
    </button>
  );
};

export default LogoutButton;
