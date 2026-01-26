import React from "react";
import { Button } from "@/components/ui";
import { Send, Save } from "lucide-react";
import FundAssetDropdown from "../shared/FundAssetDropdown";

interface CardActionsProps {
  isEditing: boolean;
  isSaving: boolean;
  userId: string;
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
  onEdit,
  onSave,
  onSendEmail,
  email,
  onAssetAdded,
}) => {
  return (
    <>
      {isEditing ? (
        <Button
          variant="primary"
          size="sm"
          onClick={onSave}
          disabled={isSaving}
          className="ml-auto"
        >
          <Save className="h-4 w-4 mr-1" />
          {isSaving ? "Saving..." : "Save"}
        </Button>
      ) : (
        <>
          <Button variant="outline" size="sm" onClick={onEdit}>
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={() => onSendEmail(email)}>
            <Send className="h-4 w-4 mr-1" />
            Send Invite
          </Button>
          <FundAssetDropdown
            investorId={userId}
            onFundAdded={onAssetAdded}
          />
        </>
      )}
    </>
  );
};

export default CardActions;
