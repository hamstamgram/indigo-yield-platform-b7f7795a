
import React from "react";

type UserProfileProps = {
  userName: string;
  isAdmin: boolean;
};

const UserProfile: React.FC<UserProfileProps> = ({ userName, isAdmin }) => {
  return (
    <div className="flex items-center px-6 py-4 border-t border-gray-200 dark:border-gray-700">
      <div className="flex-shrink-0">
        <div className="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center text-white">
          {userName.charAt(0).toUpperCase()}
        </div>
      </div>
      <div className="ml-3">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{userName}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {isAdmin ? "Administrator" : "Investor"}
        </p>
      </div>
    </div>
  );
};

export default UserProfile;
