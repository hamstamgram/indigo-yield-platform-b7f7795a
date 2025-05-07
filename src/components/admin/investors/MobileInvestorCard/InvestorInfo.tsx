
import React from 'react';

interface InvestorInfoProps {
  name: string;
  email: string;
}

const InvestorInfo: React.FC<InvestorInfoProps> = ({ name, email }) => {
  return (
    <div>
      <div className="font-medium text-lg mb-2">{name}</div>
      <div className="text-sm text-muted-foreground mb-4">{email}</div>
    </div>
  );
};

export default InvestorInfo;
