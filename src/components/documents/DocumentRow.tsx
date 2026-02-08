import { useState } from "react";
import { logError } from "@/lib/logger";
import { Button, Badge } from "@/components/ui";
import { Download, Eye, FileText, Calendar, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export interface Document {
  id: string;
  name: string;
  type: "statement" | "tax" | "legal" | "notice" | "other";
  size: number;
  created_at: string;
  investor_id?: string;
  is_public: boolean;
  metadata?: Record<string, any>;
}

interface DocumentRowProps {
  document: Document;
  onDownload: (document: Document) => Promise<string>;
  onPreview?: (document: Document) => void;
  showInvestor?: boolean;
  className?: string;
}

const documentTypeColors = {
  statement: "bg-blue-900/30 text-blue-400",
  tax: "bg-green-900/30 text-green-400",
  legal: "bg-purple-900/30 text-purple-400",
  notice: "bg-orange-900/30 text-orange-400",
  other: "bg-gray-900/30 text-gray-400",
};

const documentTypeLabels = {
  statement: "Statement",
  tax: "Tax Document",
  legal: "Legal",
  notice: "Notice",
  other: "Other",
};

export default function DocumentRow({
  document,
  onDownload,
  onPreview,
  showInvestor = false,
  className = "",
}: DocumentRowProps) {
  const [downloading, setDownloading] = useState(false);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const signedUrl = await onDownload(document);

      // Create a temporary link and trigger download
      const link = window.document.createElement("a");
      link.href = signedUrl;
      link.download = document.name;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
    } catch (error) {
      logError("DocumentRow.handleDownload", error);
    } finally {
      setDownloading(false);
    }
  };

  const handlePreview = () => {
    if (onPreview) {
      onPreview(document);
    }
  };

  return (
    <div className={`border rounded-lg p-4 hover:bg-white/5 transition-colors ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          {/* File Icon */}
          <div className="flex-shrink-0">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>

          {/* Document Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="text-sm font-medium text-foreground truncate">{document.name}</h3>
              <Badge className={documentTypeColors[document.type]}>
                {documentTypeLabels[document.type]}
              </Badge>
              {document.is_public && (
                <Badge variant="outline" className="text-xs">
                  Public
                </Badge>
              )}
            </div>

            <div className="flex items-center text-xs text-muted-foreground space-x-4">
              <div className="flex items-center space-x-1">
                <Calendar className="h-3 w-3" />
                <span>
                  {formatDistanceToNow(new Date(document.created_at), { addSuffix: true })}
                </span>
              </div>

              <div className="flex items-center space-x-1">
                <span>{formatFileSize(document.size)}</span>
              </div>

              {showInvestor && document.investor_id && (
                <div className="flex items-center space-x-1">
                  <User className="h-3 w-3" />
                  <span>ID: {document.investor_id.substring(0, 8)}</span>
                </div>
              )}
            </div>

            {/* Metadata */}
            {document.metadata && Object.keys(document.metadata).length > 0 && (
              <div className="mt-2 text-xs text-muted-foreground">
                {Object.entries(document.metadata)
                  .slice(0, 3)
                  .map(([key, value]) => (
                    <span key={key} className="mr-3">
                      {key}: {String(value)}
                    </span>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2 ml-4">
          {onPreview && (
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreview}
              className="flex items-center space-x-1"
            >
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Preview</span>
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center space-x-1"
          >
            {downloading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
                <span className="hidden sm:inline">Downloading...</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Download</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
