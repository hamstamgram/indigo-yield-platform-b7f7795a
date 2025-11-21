import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Download, Trash2, FileText } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Document } from "@/types/documents";
import { useDocuments } from "@/hooks/useDocuments";
import PDFViewer from "@/components/documents/PDFViewer";
import { Skeleton } from "@/components/ui/skeleton";

const DocumentViewerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [document, setDocument] = useState<Document | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { downloadDocument, deleteDocument, getDocumentUrl } = useDocuments(currentUser?.id);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getUser();
  }, []);

  useEffect(() => {
    if (id && currentUser) {
      loadDocument();
    }
  }, [id, currentUser]);

  const loadDocument = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (!data) {
        console.error("Document not found");
        setLoading(false);
        return;
      }

      if (error) throw error;
      setDocument(data as any);

      // Get signed URL
      const url = await getDocumentUrl(data.storage_path);
      setDocumentUrl(url);
    } catch (error) {
      console.error("Error loading document:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (document && window.confirm("Are you sure you want to delete this document?")) {
      await deleteDocument(document.id, document.file_path);
      navigate("/documents");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-32" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!document || !documentUrl) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Document not found</h3>
            <p className="text-muted-foreground text-center mb-4">
              This document may have been deleted or you don't have permission to view it.
            </p>
            <Button onClick={() => navigate("/documents")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Documents
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Button variant="ghost" onClick={() => navigate("/documents")} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back to Documents
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-2xl">{document.title}</CardTitle>
              {document.description && (
                <p className="text-muted-foreground mt-2">{document.description}</p>
              )}
              <div className="flex items-center gap-2 mt-3">
                <Badge variant="outline">{document.category}</Badge>
                <Badge variant={document.status === "available" ? "default" : "secondary"}>
                  {document.status}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => downloadDocument(document)}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
              <Button variant="outline" size="icon" onClick={handleDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">File Name</p>
              <p className="font-medium">{document.file_name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">File Size</p>
              <p className="font-medium">{formatFileSize(document.file_size)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Uploaded</p>
              <p className="font-medium">{format(new Date(document.created_at), "MMM d, yyyy")}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Downloads</p>
              <p className="font-medium">{document.download_count}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {document.mime_type === "application/pdf" ? (
        <PDFViewer url={documentUrl} onDownload={() => downloadDocument(document)} />
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Preview not available</h3>
            <p className="text-muted-foreground text-center mb-4">
              This file type cannot be previewed in the browser. Please download it to view.
            </p>
            <Button onClick={() => downloadDocument(document)} className="gap-2">
              <Download className="h-4 w-4" />
              Download File
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DocumentViewerPage;
