import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Download, FileText, Loader2 } from "lucide-react";

export default function DocumentViewerPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: document, isLoading } = useQuery({
    queryKey: ["document", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("documents").select("*").eq("id", id).single();

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="container mx-auto p-6 text-center">
        <h1 className="text-2xl font-bold mb-4">Document Not Found</h1>
        <Button onClick={() => navigate("/documents")}>Return to Documents</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 h-[calc(100vh-100px)] flex flex-col">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/documents")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-display font-bold tracking-tight">{document.title}</h1>
            <p className="text-muted-foreground text-sm">
              {new Date(document.created_at).toLocaleDateString()} •{" "}
              {(document.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        </div>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Download
        </Button>
      </div>

      <Card className="flex-1 overflow-hidden bg-muted/20">
        <CardContent className="p-0 h-full flex items-center justify-center">
          {document.file_path.endsWith(".pdf") ? (
            <iframe
              src={`${process.env.VITE_SUPABASE_URL}/storage/v1/object/public/documents/${document.file_path}`}
              className="w-full h-full"
              title={document.title}
            />
          ) : (
            <div className="text-center space-y-4">
              <div className="bg-primary/10 p-6 rounded-full inline-block">
                <FileText className="h-12 w-12 text-primary" />
              </div>
              <p className="text-lg font-medium">Preview not available for this file type</p>
              <Button variant="outline">Download to view</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
