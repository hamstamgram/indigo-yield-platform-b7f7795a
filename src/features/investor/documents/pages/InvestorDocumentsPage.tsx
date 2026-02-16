import { Button, Badge, ResponsiveTable, EmptyState, SortableTableHead } from "@/components/ui";
import { FolderOpen, Download, FileText, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout";
import { PageShell } from "@/components/layout/PageShell";
import { format } from "date-fns";
import { toast } from "sonner";
import { useInvestorDocuments, useDocumentDownload } from "@/hooks/data/investor";
import { useSortableColumns } from "@/hooks";
import type { InvestorDocument } from "@/services/investor";
import { logError } from "@/lib/logger";

export default function InvestorDocumentsPage() {
  const { data: documents, isLoading } = useInvestorDocuments();
  const downloadMutation = useDocumentDownload();

  const { sortConfig, requestSort, sortedData } = useSortableColumns(documents || [], {
    column: "created_at",
    direction: "desc",
  });

  const handleDownload = (doc: InvestorDocument) => {
    downloadMutation.mutate(
      { storage_path: doc.storage_path, title: doc.title },
      {
        onSuccess: () => {
          toast.success("Document downloaded successfully");
        },
        onError: (error) => {
          logError("InvestorDocumentsPage.handleDownload", error, { documentId: doc.id });
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
      header: (
        <SortableTableHead column="type" currentSort={sortConfig} onSort={requestSort}>
          Type
        </SortableTableHead>
      ),
      cell: (item: InvestorDocument) => (
        <Badge variant="outline">{getDocumentTypeLabel(item.type)}</Badge>
      ),
    },
    {
      header: (
        <SortableTableHead column="created_at" currentSort={sortConfig} onSort={requestSort}>
          Date
        </SortableTableHead>
      ),
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
    <PageShell maxWidth="narrow">
      <PageHeader title="Documents" subtitle="Access your investment documents" icon={FolderOpen} />

      <div className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10">
          <span className="text-sm font-medium text-white">Your Documents</span>
        </div>
        <div className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : sortedData && sortedData.length > 0 ? (
            <ResponsiveTable data={sortedData} columns={columns} keyExtractor={(item) => item.id} />
          ) : (
            <EmptyState
              icon={FolderOpen}
              title="No Documents"
              description="Your investment documents will appear here when available."
            />
          )}
        </div>
      </div>
    </PageShell>
  );
}
