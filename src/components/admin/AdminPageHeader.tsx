
import React from "react";

interface AdminPageHeaderProps {
  userName?: string;
}

const AdminPageHeader: React.FC<AdminPageHeaderProps> = ({ userName }) => {
  return (
    <div className="text-center">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Admin Dashboard {userName ? `- Welcome ${userName}` : ''}
      </h1>
      <p className="text-gray-500 dark:text-gray-400">
        Overview of all managed assets and yields
      </p>
    </div>
  );
};

export default AdminPageHeader;
