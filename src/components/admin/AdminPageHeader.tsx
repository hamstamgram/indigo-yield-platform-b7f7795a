
import React from "react";

interface AdminPageHeaderProps {
  userName?: string;
}

const AdminPageHeader: React.FC<AdminPageHeaderProps> = ({ userName }) => {
  return (
    <div className="flex flex-col items-center md:flex-row md:justify-between">
      <div className="text-center md:text-left">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Admin Dashboard {userName ? `- Welcome ${userName}` : ''}
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Overview of all managed assets and yields
        </p>
      </div>
    </div>
  );
};

export default AdminPageHeader;
