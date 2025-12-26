import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { FolderOpen, Download, FileText, Loader2 } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { format } from "date-fns";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/constants/queryKeys";

export default function InvestorDocumentsPage() {
  const { data: documents, isLoading } = useQuery({
    queryKey: QUERY_KEYS.investorDocuments,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Fetch documents from documents table
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const handleDownload = async (doc: any) => {
    try {
      const { data, error } = await supabase.storage
        .from("documents")
        .download(doc.storage_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.title;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Document downloaded successfully");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download document");
    }
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
      cell: (item: any) => (
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
      cell: (item: any) => (
        <Badge variant="outline">{getDocumentTypeLabel(item.type)}</Badge>
      ),
    },
    {
      header: "Date",
      cell: (item: any) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(item.created_at), "MMM d, yyyy")}
        </span>
      ),
    },
    {
      header: "Actions",
      cell: (item: any) => (
        <Button variant="outline" size="sm" onClick={() => handleDownload(item)}>
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
