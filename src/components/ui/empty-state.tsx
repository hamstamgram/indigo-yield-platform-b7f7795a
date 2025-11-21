import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  FileX,
  Search,
  Inbox,
  Users,
  FileText,
  DollarSign,
  TrendingUp,
  Bell,
  FolderOpen,
  MessageSquare,
} from "lucide-react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Base empty state component
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn("flex flex-col items-center justify-center py-12 px-4 text-center", className)}
    >
      {icon && <div className="mb-4 text-gray-400">{icon}</div>}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      {description && <p className="text-sm text-gray-500 mb-6 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};

/**
 * Empty state for no search results
 */
export const NoSearchResults: React.FC<{ searchTerm?: string; onClear?: () => void }> = ({
  searchTerm,
  onClear,
}) => {
  return (
    <EmptyState
      icon={<Search className="h-12 w-12" />}
      title="No results found"
      description={
        searchTerm
          ? `No results for "${searchTerm}". Try adjusting your search.`
          : "Try adjusting your search criteria."
      }
      action={
        onClear && (
          <Button variant="outline" onClick={onClear}>
            Clear search
          </Button>
        )
      }
    />
  );
};

/**
 * Empty state for no transactions
 */
export const NoTransactions: React.FC<{ onAction?: () => void }> = ({ onAction }) => {
  return (
    <EmptyState
      icon={<DollarSign className="h-12 w-12" />}
      title="No transactions yet"
      description="Your transaction history will appear here once you make your first investment."
      action={onAction && <Button onClick={onAction}>Learn about investing</Button>}
    />
  );
};

/**
 * Empty state for no documents
 */
export const NoDocuments: React.FC<{ onUpload?: () => void }> = ({ onUpload }) => {
  return (
    <EmptyState
      icon={<FileText className="h-12 w-12" />}
      title="No documents available"
      description="Documents and statements will appear here when they're ready."
      action={
        onUpload && (
          <Button variant="outline" onClick={onUpload}>
            Upload document
          </Button>
        )
      }
    />
  );
};

/**
 * Empty state for no notifications
 */
export const NoNotifications: React.FC = () => {
  return (
    <EmptyState
      icon={<Bell className="h-12 w-12" />}
      title="No notifications"
      description="You're all caught up! We'll notify you when something important happens."
    />
  );
};

/**
 * Empty state for empty portfolio
 */
export const EmptyPortfolio: React.FC<{ onGetStarted?: () => void }> = ({ onGetStarted }) => {
  return (
    <EmptyState
      icon={<TrendingUp className="h-12 w-12" />}
      title="Start building your portfolio"
      description="Begin your investment journey with Indigo Yield Platform."
      action={onGetStarted && <Button onClick={onGetStarted}>Get started</Button>}
    />
  );
};

/**
 * Empty state for no users (admin)
 */
export const NoUsers: React.FC<{ onInvite?: () => void }> = ({ onInvite }) => {
  return (
    <EmptyState
      icon={<Users className="h-12 w-12" />}
      title="No investors yet"
      description="Invite your first investor to get started."
      action={onInvite && <Button onClick={onInvite}>Invite investor</Button>}
    />
  );
};

/**
 * Empty state for empty folder
 */
export const EmptyFolder: React.FC = () => {
  return (
    <EmptyState
      icon={<FolderOpen className="h-12 w-12" />}
      title="This folder is empty"
      description="Files added to this folder will appear here."
    />
  );
};

/**
 * Empty state for no messages
 */
export const NoMessages: React.FC<{ onCompose?: () => void }> = ({ onCompose }) => {
  return (
    <EmptyState
      icon={<MessageSquare className="h-12 w-12" />}
      title="No messages"
      description="Start a conversation with our support team."
      action={onCompose && <Button onClick={onCompose}>Send message</Button>}
    />
  );
};

/**
 * Generic error empty state
 */
export const ErrorState: React.FC<{
  title?: string;
  description?: string;
  onRetry?: () => void;
}> = ({
  title = "Something went wrong",
  description = "We couldn't load this content. Please try again.",
  onRetry,
}) => {
  return (
    <EmptyState
      icon={<FileX className="h-12 w-12" />}
      title={title}
      description={description}
      action={
        onRetry && (
          <Button variant="outline" onClick={onRetry}>
            Try again
          </Button>
        )
      }
    />
  );
};

/**
 * Empty state for no data with custom icon
 */
export const NoData: React.FC<{
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({
  icon = <Inbox className="h-12 w-12" />,
  title = "No data",
  description = "There's nothing to show here yet.",
  actionLabel,
  onAction,
}) => {
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      action={
        onAction &&
        actionLabel && (
          <Button variant="outline" onClick={onAction}>
            {actionLabel}
          </Button>
        )
      }
    />
  );
};

export default {
  EmptyState,
  NoSearchResults,
  NoTransactions,
  NoDocuments,
  NoNotifications,
  EmptyPortfolio,
  NoUsers,
  EmptyFolder,
  NoMessages,
  ErrorState,
  NoData,
};
