
import React from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

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
      <div className="flex mt-4 md:mt-0 space-x-3">
        <Button variant="outline" asChild>
          <Link to="/admin-investors">Manage Investors</Link>
        </Button>
        <Button asChild>
          <Link to="/admin?tab=portfolios">Portfolio Management</Link>
        </Button>
      </div>
    </div>
  );
};

export default AdminPageHeader;
