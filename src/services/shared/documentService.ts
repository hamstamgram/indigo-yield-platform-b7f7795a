import { supabase } from "@/integrations/supabase/client";
import type { Document, DocumentFilter } from "@/types/domains/document";

export const documentService = {
  /**
   * List documents with optional filtering
   */
  async listDocuments(filter?: DocumentFilter): Promise<Document[]> {
    let query = supabase.from("documents").select("*").order("created_at", { ascending: false });

    if (filter?.type) {
      query = query.eq("type", filter.type);
    }

    if (filter?.fund_id) {
      query = query.eq("fund_id", filter.fund_id);
    }

    if (filter?.period_start) {
      query = query.gte("period_start", filter.period_start);
    }

    if (filter?.period_end) {
      query = query.lte("period_end", filter.period_end);
    }

    if (filter?.search_query) {
      query = query.ilike("title", `%${filter.search_query}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching documents:", error);
      throw error;
    }

    return data || [];
  },

  /**
   * Get signed URL for document download
   */
  async getSignedUrl(docId: string): Promise<string> {
    // First get the document to find its storage path
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("storage_path")
      .eq("id", docId)
      .single();

    if (docError || !doc) {
      throw new Error("Document not found");
    }

    // Get signed URL from storage
    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(doc.storage_path, 3600); // 1 hour expiry

    if (error) {
      console.error("Error generating signed URL:", error);
      throw error;
    }

    return data.signedUrl;
  },

  /**
   * Upload a new document
   */
  async uploadDocument(
    file: File,
    metadata: {
      type: string;
      title: string;
      fund_id?: string;
      period_start?: string;
      period_end?: string;
    }
  ): Promise<Document> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Generate unique file path
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    // Upload file to storage
    const { error: uploadError } = await supabase.storage.from("documents").upload(filePath, file);

    if (uploadError) {
      console.error("Error uploading file:", uploadError);
      throw uploadError;
    }

    // Create database record
    const { data, error } = await supabase
      .from("documents")
      .insert({
        user_id: user.id,
        storage_path: filePath,
        type: metadata.type as any,
        title: metadata.title,
        fund_id: metadata.fund_id || null,
        period_start: metadata.period_start || null,
        period_end: metadata.period_end || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      // Clean up uploaded file if database insert fails
      await supabase.storage.from("documents").remove([filePath]);
      throw error;
    }

    return data;
  },

  /**
   * Delete a document
   */
  async deleteDocument(docId: string): Promise<void> {
    const { data: doc, error: fetchError } = await supabase
      .from("documents")
      .select("storage_path")
      .eq("id", docId)
      .single();

    if (fetchError || !doc) {
      throw new Error("Document not found");
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from("documents")
      .remove([doc.storage_path]);

    if (storageError) {
      console.error("Error deleting from storage:", storageError);
    }

    // Delete database record
    const { error: dbError } = await supabase.from("documents").delete().eq("id", docId);

    if (dbError) {
      throw dbError;
    }
  },
};
