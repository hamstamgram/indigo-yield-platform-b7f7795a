import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Document, DocumentFilter, DocumentStats, DocumentUpload } from "@/types/documents";
import { useToast } from "@/hooks/use-toast";

export function useDocuments(userId?: string, filter?: DocumentFilter) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    if (!userId) return;

    try {
      let query = supabase
        .from("documents")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      // Apply filters
      if (filter?.category) {
        query = query.eq("category", filter.category);
      }
      if (filter?.status) {
        query = query.eq("status", filter.status);
      }
      if (filter?.dateFrom) {
        query = query.gte("created_at", filter.dateFrom);
      }
      if (filter?.dateTo) {
        query = query.lte("created_at", filter.dateTo);
      }
      if (filter?.searchQuery) {
        query = query.or(
          `title.ilike.%${filter.searchQuery}%,description.ilike.%${filter.searchQuery}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast({
        title: "Error",
        description: "Failed to load documents.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [userId, filter, toast]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase.from("documents").select("*").eq("user_id", userId);

      if (error) throw error;

      const docs = data || [];
      const byCategory: Record<string, number> = {};
      const byStatus: Record<string, number> = {};
      let totalSize = 0;
      let lastUploaded = "";

      docs.forEach((doc) => {
        byCategory[doc.category] = (byCategory[doc.category] || 0) + 1;
        byStatus[doc.status] = (byStatus[doc.status] || 0) + 1;
        totalSize += doc.file_size;
        if (!lastUploaded || doc.created_at > lastUploaded) {
          lastUploaded = doc.created_at;
        }
      });

      setStats({
        total: docs.length,
        by_category: byCategory,
        by_status: byStatus,
        total_size: totalSize,
        last_uploaded: lastUploaded,
      });
    } catch (error) {
      console.error("Error fetching document stats:", error);
    }
  }, [userId]);

  // Download document
  const downloadDocument = useCallback(
    async (document: Document) => {
      try {
        // Get signed URL from Supabase Storage
        const { data, error } = await supabase.storage
          .from("documents")
          .createSignedUrl(document.file_path, 60);

        if (error) throw error;

        // Track download
        await supabase
          .from("documents")
          .update({
            download_count: document.download_count + 1,
            last_downloaded_at: new Date().toISOString(),
          })
          .eq("id", document.id);

        // Trigger download
        window.open(data.signedUrl, "_blank");

        toast({
          title: "Download started",
          description: `Downloading ${document.title}`,
        });
      } catch (error) {
        console.error("Error downloading document:", error);
        toast({
          title: "Download failed",
          description: "Failed to download the document.",
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  // Upload document
  const uploadDocument = useCallback(
    async (upload: DocumentUpload) => {
      if (!userId) return;

      try {
        // Upload file to Supabase Storage
        const filePath = `${userId}/${Date.now()}_${upload.file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("documents")
          .upload(filePath, upload.file);

        if (uploadError) throw uploadError;

        // Create document record
        const { data, error: dbError } = await supabase
          .from("documents")
          .insert({
            user_id: userId,
            category: upload.category,
            title: upload.title,
            description: upload.description,
            file_name: upload.file.name,
            file_path: filePath,
            file_size: upload.file.size,
            mime_type: upload.file.type,
            status: "available",
            tags: upload.tags,
            is_encrypted: false,
            download_count: 0,
          })
          .select()
          .single();

        if (dbError) throw dbError;

        setDocuments((prev) => [data, ...prev]);

        toast({
          title: "Upload successful",
          description: `${upload.title} has been uploaded.`,
        });

        return data;
      } catch (error) {
        console.error("Error uploading document:", error);
        toast({
          title: "Upload failed",
          description: "Failed to upload the document.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [userId, toast]
  );

  // Delete document
  const deleteDocument = useCallback(
    async (documentId: string, filePath: string) => {
      try {
        // Delete from storage
        const { error: storageError } = await supabase.storage.from("documents").remove([filePath]);

        if (storageError) throw storageError;

        // Delete from database
        const { error: dbError } = await supabase.from("documents").delete().eq("id", documentId);

        if (dbError) throw dbError;

        setDocuments((prev) => prev.filter((d) => d.id !== documentId));

        toast({
          title: "Document deleted",
          description: "Document has been permanently deleted.",
        });
      } catch (error) {
        console.error("Error deleting document:", error);
        toast({
          title: "Delete failed",
          description: "Failed to delete the document.",
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  // Get document URL
  const getDocumentUrl = useCallback(async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("documents")
        .createSignedUrl(filePath, 3600); // 1 hour

      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error("Error getting document URL:", error);
      return null;
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
    fetchStats();
  }, [fetchDocuments, fetchStats]);

  return {
    documents,
    stats,
    loading,
    downloadDocument,
    uploadDocument,
    deleteDocument,
    getDocumentUrl,
    refreshDocuments: fetchDocuments,
  };
}
