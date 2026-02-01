import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/db/index";
import { logError, logWarn } from "@/lib/logger";
import type { Document, DocumentFilter } from "@/types/domains/document";
import { sanitizeSearchInput } from "@/utils/searchSanitizer";

export interface CreateStatementDocumentParams {
  user_id: string;
  title: string;
  storage_path: string;
  period_start?: string;
  period_end?: string;
}

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
      const safeSearch = sanitizeSearchInput(filter.search_query);
      if (safeSearch) {
        query = query.ilike("title", `%${safeSearch}%`);
      }
    }

    const { data, error } = await query;

    if (error) {
      logError("documentService.listDocuments", error);
      throw error;
    }

    return data || [];
  },

  /**
   * Get statement documents (type = 'statement')
   */
  async getStatementDocuments(limit: number = 50): Promise<Document[]> {
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("type", "statement")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
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
      .maybeSingle();

    if (docError) {
      throw docError;
    }
    if (!doc) {
      throw new Error("Document not found");
    }

    // Get signed URL from storage
    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(doc.storage_path, 3600); // 1 hour expiry

    if (error) {
      logError("documentService.getSignedUrl", error, { docId });
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
      logError("documentService.uploadDocument", uploadError);
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
   * Create a statement document record
   */
  async createStatementDocument(params: CreateStatementDocumentParams): Promise<Document> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("documents")
      .insert({
        user_id: params.user_id,
        storage_path: params.storage_path,
        type: "statement" as any,
        title: params.title,
        period_start: params.period_start || null,
        period_end: params.period_end || null,
        created_by: user?.id,
      })
      .select()
      .single();

    if (error) throw error;
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
      .maybeSingle();

    if (fetchError) {
      throw fetchError;
    }
    if (!doc) {
      throw new Error("Document not found");
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from("documents")
      .remove([doc.storage_path]);

    if (storageError) {
      logWarn("documentService.deleteDocument", { docId, storageError: storageError.message });
    }

    // Delete database record
    const { success, error: dbError } = await db.delete("documents", {
      column: "id",
      value: docId,
    });

    if (!success) {
      throw new Error(dbError?.userMessage || "Failed to delete document");
    }
  },
};
