
import React from 'react';

interface InvestorInfoProps {
  firstName?: string;
  lastName?: string;
  name?: string;
  email: string;
}

const InvestorInfo: React.FC<InvestorInfoProps> = ({ firstName, lastName, name, email }) => {
  // Use provided name if available, otherwise construct from firstName and lastName
  const displayName = name || 
    (firstName && lastName ? `${firstName} ${lastName}` : 
    (firstName || lastName || email.split('@')[0]));
  
  return (
    <div>
      <div className="font-medium text-lg mb-2">{displayName}</div>
      <div className="text-sm text-muted-foreground mb-4">{email}</div>
    </div>
  );
};

export default InvestorInfo;
