import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { FolderOpen, Download, FileText, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout";
import { format } from "date-fns";
import { toast } from "sonner";
import { useInvestorDocuments, useDocumentDownload } from "@/hooks/data/investor";
import type { InvestorDocument } from "@/services/investor/investorDataService";

export default function InvestorDocumentsPage() {
  const { data: documents, isLoading } = useInvestorDocuments();
  const downloadMutation = useDocumentDownload();

  const handleDownload = (doc: InvestorDocument) => {
    downloadMutation.mutate(
      { storage_path: doc.storage_path, title: doc.title },
      {
        onSuccess: () => {
          toast.success("Document downloaded successfully");
        },
        onError: (error) => {
          console.error("Download error:", error);
          toast.error("Failed to download document");
        },
      }
    );
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      statement: "Statement",
      tax_document: "Tax Document",
      agreement: "Agreement",
      report: "Report",
      other: "Other",
    };
    return labels[type] || type;
  };

  const columns = [
    {
      header: "Document",
      cell: (item: InvestorDocument) => (
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="font-medium">{item.title}</p>
            {item.period_start && item.period_end && (
              <p className="text-xs text-muted-foreground">
                {format(new Date(item.period_start), "MMM d, yyyy")} -{" "}
                {format(new Date(item.period_end), "MMM d, yyyy")}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      header: "Type",
      cell: (item: InvestorDocument) => (
        <Badge variant="outline">{getDocumentTypeLabel(item.type)}</Badge>
      ),
    },
    {
      header: "Date",
      cell: (item: InvestorDocument) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(item.created_at), "MMM d, yyyy")}
        </span>
      ),
    },
    {
      header: "Actions",
      cell: (item: InvestorDocument) => (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => handleDownload(item)}
          disabled={downloadMutation.isPending}
        >
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20 px-4 md:px-6 lg:px-0">
      <PageHeader
        title="Documents"
        subtitle="Access your investment documents"
        icon={FolderOpen}
      />

      <Card>
        <CardHeader>
          <CardTitle>Your Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : documents && documents.length > 0 ? (
            <ResponsiveTable
              data={documents}
              columns={columns}
              keyExtractor={(item) => item.id}
            />
          ) : (
            <EmptyState
              icon={FolderOpen}
              title="No Documents"
              description="Your investment documents will appear here when available."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
