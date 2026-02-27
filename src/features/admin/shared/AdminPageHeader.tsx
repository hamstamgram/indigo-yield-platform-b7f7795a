import React from "react";

interface AdminPageHeaderProps {
  userName?: string;
}

const AdminPageHeader: React.FC<AdminPageHeaderProps> = ({ userName }) => {
  return (
    <div className="text-center">
      <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
        Admin Dashboard {userName ? `- Welcome ${userName}` : ""}
      </h1>
      <p className="text-muted-foreground">Overview of all managed assets and yields</p>
    </div>
  );
};

export default AdminPageHeader;
