
import React from 'react';
import { Button } from '@/components/ui/button';
import { Send, Save } from 'lucide-react';
import InvestorAssetDropdown from '../InvestorAssetDropdown';

interface CardActionsProps {
  isEditing: boolean;
  isSaving: boolean;
  userId: string;
  existingAssets: number[];
  assets: any[];
  onEdit: () => void;
  onSave: () => void;
  onSendEmail: (email: string) => void;
  email: string;
  onAssetAdded: () => void;
}

const CardActions: React.FC<CardActionsProps> = ({
  isEditing,
  isSaving,
  userId,
  existingAssets,
  assets,
  onEdit,
  onSave,
  onSendEmail,
  email,
  onAssetAdded
}) => {
  return (
    <>
      {isEditing ? (
        <Button 
          variant="default" 
          size="sm"
          onClick={onSave}
          disabled={isSaving}
        >
          <Save className="h-4 w-4 mr-1" />
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      ) : (
        <>
          <Button 
            variant="outline" 
            size="sm"
            onClick={onEdit}
          >
            Edit
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onSendEmail(email)}
          >
            <Send className="h-4 w-4 mr-1" />
            Send Invite
          </Button>
          <InvestorAssetDropdown 
            userId={userId}
            assets={assets}
            existingAssets={existingAssets}
            onAssetAdded={onAssetAdded}
          />
        </>
      )}
    </>
  );
};

export default CardActions;
