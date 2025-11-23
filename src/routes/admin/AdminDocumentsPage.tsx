/**
 * Admin Documents Management Page
 * Upload and manage fund documents with bulk upload capabilities
 */

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Document,
  DocumentType,
  DocumentUploadRequest,
  DOCUMENT_TYPE_CONFIG,
  formatFileSize,
  validateDocumentUpload,
  getDocumentTypeConfig,
} from "@/lib/documents/types";
import { documentService } from "@/services/documentService";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Upload,
  FileText,
  Trash2,
  Download,
  Eye,
  AlertCircle,
  CheckCircle2,
  Calendar as CalendarIcon,
  Upload as UploadIcon,
  FileUp,
  X,
  Plus,
  Users,
} from "lucide-react";

interface PendingUpload extends DocumentUploadRequest {
  id: string;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
}

export default function AdminDocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  // Single upload form state
  const [uploadForm, setUploadForm] = useState<Partial<DocumentUploadRequest>>({
    type: "statement",
    title: "",
    description: "",
    user_id: "",
  });
  const [periodStart, setPeriodStart] = useState<Date>();
  const [periodEnd, setPeriodEnd] = useState<Date>();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);

  // Load documents from database
  useEffect(() => {
    const loadDocuments = async () => {
      setIsLoadingDocuments(true);
      try {
        // TODO: Fix type mismatch between domain and lib Document types
        const docs = await documentService.listDocuments();
        setDocuments(docs as any);
      } catch (error) {
        console.error("Failed to load documents:", error);
      } finally {
        setIsLoadingDocuments(false);
      }
    };
    loadDocuments();
  }, []);

  // Handle single file upload
  const handleSingleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setUploadForm((prev) => ({ ...prev, file }));
  };

  const handleSingleUpload = async () => {
    if (!uploadForm.file || !uploadForm.type || !uploadForm.title) {
      return;
    }

    const uploadRequest: DocumentUploadRequest = {
      file: uploadForm.file,
      type: uploadForm.type,
      title: uploadForm.title,
      description: uploadForm.description,
      user_id: uploadForm.user_id || undefined,
      period_start: periodStart,
      period_end: periodEnd,
    };

    const validationErrors = validateDocumentUpload(uploadRequest);
    if (validationErrors.length > 0) {
      console.error("Validation errors:", validationErrors);
      return;
    }

    setIsUploading(true);
    try {
      // Simulate upload
      await simulateUpload(uploadRequest);

      // Add to documents list (in real app, this would come from API response)
      const newDocument: Document = {
        id: `doc_${Date.now()}`,
        user_id: uploadRequest.user_id,
        fund_id: "fund_001",
        type: uploadRequest.type,
        title: uploadRequest.title,
        description: uploadRequest.description,
        storage_path: `documents/${uploadRequest.user_id || "fund"}/${new Date().getFullYear()}`,
        filename: uploadRequest.file.name,
        file_size: uploadRequest.file.size,
        mime_type: uploadRequest.file.type,
        period_start: uploadRequest.period_start,
        period_end: uploadRequest.period_end,
        status: "ready",
        created_at: new Date(),
        created_by: "admin",
        checksum: "new_checksum",
      };

      setDocuments((prev) => [newDocument, ...prev]);
      setShowUploadDialog(false);
      resetUploadForm();
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleBulkFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newPendingUploads: PendingUpload[] = Array.from(files).map((file, index) => ({
      id: `pending_${Date.now()}_${index}`,
      file,
      type: "other" as DocumentType,
      title: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
      status: "pending",
      progress: 0,
    }));

    setPendingUploads((prev) => [...prev, ...newPendingUploads]);
  };

  const updatePendingUpload = (id: string, updates: Partial<PendingUpload>) => {
    setPendingUploads((prev) =>
      prev.map((upload) => (upload.id === id ? { ...upload, ...updates } : upload))
    );
  };

  const removePendingUpload = (id: string) => {
    setPendingUploads((prev) => prev.filter((upload) => upload.id !== id));
  };

  const handleBulkUpload = async () => {
    const uploadsToProcess = pendingUploads.filter((upload) => upload.status === "pending");
    if (uploadsToProcess.length === 0) return;

    setIsUploading(true);

    for (const upload of uploadsToProcess) {
      updatePendingUpload(upload.id, { status: "uploading", progress: 0 });

      try {
        // Simulate upload with progress
        for (let progress = 0; progress <= 100; progress += 20) {
          updatePendingUpload(upload.id, { progress });
          await new Promise((resolve) => setTimeout(resolve, 200));
        }

        // Validation
        const validationErrors = validateDocumentUpload(upload);
        if (validationErrors.length > 0) {
          updatePendingUpload(upload.id, {
            status: "error",
            error: validationErrors.join(", "),
          });
          continue;
        }

        updatePendingUpload(upload.id, { status: "success", progress: 100 });

        // Add to documents list
        const newDocument: Document = {
          id: `doc_${Date.now()}_${upload.id}`,
          user_id: upload.user_id,
          fund_id: "fund_001",
          type: upload.type,
          title: upload.title,
          description: upload.description,
          storage_path: `documents/${upload.user_id || "fund"}/${new Date().getFullYear()}`,
          filename: upload.file.name,
          file_size: upload.file.size,
          mime_type: upload.file.type,
          period_start: upload.period_start,
          period_end: upload.period_end,
          status: "ready",
          created_at: new Date(),
          created_by: "admin",
          checksum: "new_checksum",
        };

        setDocuments((prev) => [newDocument, ...prev]);
      } catch (error) {
        updatePendingUpload(upload.id, {
          status: "error",
          error: "Upload failed",
        });
      }
    }

    setIsUploading(false);
  };

  const simulateUpload = async (_request: DocumentUploadRequest) => {
    // Simulate upload progress
    for (let i = 0; i <= 100; i += 10) {
      setUploadProgress(i);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  };

  const resetUploadForm = () => {
    setUploadForm({
      type: "statement",
      title: "",
      description: "",
      user_id: "",
    });
    setPeriodStart(undefined);
    setPeriodEnd(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "success":
      case "ready":
        return "default";
      case "uploading":
      case "pending":
      case "processing":
        return "secondary";
      case "error":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Document Management</h1>
          <p className="text-gray-600 mt-2">
            Upload and manage fund documents, statements, and notices
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Upload New Document</DialogTitle>
                <DialogDescription>
                  Upload a single document with detailed metadata
                </DialogDescription>
              </DialogHeader>
              <SingleUploadForm
                form={uploadForm}
                onFormChange={setUploadForm}
                periodStart={periodStart}
                periodEnd={periodEnd}
                onPeriodStartChange={setPeriodStart}
                onPeriodEndChange={setPeriodEnd}
                onFileSelect={handleSingleFileSelect}
                fileInputRef={fileInputRef}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSingleUpload}
                  disabled={!uploadForm.file || !uploadForm.title || isUploading}
                  className="flex items-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <UploadIcon className="w-4 h-4 animate-pulse" />
                      Uploading... {uploadProgress}%
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload Document
                    </>
                  )}
                </Button>
              </DialogFooter>
              {isUploading && <Progress value={uploadProgress} className="w-full" />}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="documents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            All Documents ({documents.length})
          </TabsTrigger>
          <TabsTrigger value="bulk-upload" className="flex items-center gap-2">
            <FileUp className="w-4 h-4" />
            Bulk Upload
            {pendingUploads.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {pendingUploads.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Document Library</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingDocuments ? (
                <div className="py-12 text-center">
                  <p className="text-muted-foreground">Loading documents...</p>
                </div>
              ) : documents.length === 0 ? (
                <div className="py-12 text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">No documents yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Upload your first document to get started
                    </p>
                    <Button onClick={() => setShowUploadDialog(true)}>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Document
                    </Button>
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((document) => (
                      <TableRow key={document.id}>
                        <TableCell>
                          <div className="flex items-start gap-3">
                            <FileText className="w-4 h-4 mt-0.5" />
                            <div>
                              <div className="font-medium">{document.title}</div>
                              {document.description && (
                                <div className="text-sm text-gray-500 mt-1">
                                  {document.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {DOCUMENT_TYPE_CONFIG[document.type].label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {document.user_id ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Users className="w-3 h-3" />
                              Investor
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-sm">
                              <FileText className="w-3 h-3" />
                              Fund-wide
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {document.period_start && document.period_end ? (
                            <div className="text-sm">
                              {format(document.period_start, "MMM yyyy")} -{" "}
                              {format(document.period_end, "MMM yyyy")}
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatFileSize(document.file_size)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(document.status)}>
                            {document.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {format(document.created_at, "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Download className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk-upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileUp className="w-5 h-5" />
                Bulk Document Upload
              </CardTitle>
              <p className="text-sm text-gray-600">
                Select multiple files to upload. You can configure each file individually before
                uploading.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <FileUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Drop files here or click to browse</h3>
                <p className="text-gray-600 mb-4">
                  Support for PDF, Excel, and image files up to 15MB each
                </p>
                <input
                  ref={bulkFileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.xls,.xlsx,.png,.jpg,.jpeg,.txt,.html"
                  onChange={handleBulkFileSelect}
                  className="hidden"
                />
                <Button
                  onClick={() => bulkFileInputRef.current?.click()}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Select Files
                </Button>
              </div>

              {pendingUploads.length > 0 && (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">
                      Pending Uploads ({pendingUploads.length})
                    </h3>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setPendingUploads([])}>
                        Clear All
                      </Button>
                      <Button
                        onClick={handleBulkUpload}
                        disabled={
                          isUploading || pendingUploads.every((u) => u.status !== "pending")
                        }
                        className="flex items-center gap-2"
                      >
                        <UploadIcon className="w-4 h-4" />
                        Upload All ({pendingUploads.filter((u) => u.status === "pending").length})
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {pendingUploads.map((upload) => (
                      <BulkUploadItem
                        key={upload.id}
                        upload={upload}
                        onUpdate={(updates) => updatePendingUpload(upload.id, updates)}
                        onRemove={() => removePendingUpload(upload.id)}
                      />
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Single Upload Form Component
function SingleUploadForm({
  form,
  onFormChange,
  periodStart,
  periodEnd,
  onPeriodStartChange,
  onPeriodEndChange,
  onFileSelect,
  fileInputRef,
}: {
  form: Partial<DocumentUploadRequest>;
  onFormChange: (form: Partial<DocumentUploadRequest>) => void;
  periodStart?: Date;
  periodEnd?: Date;
  onPeriodStartChange: (date?: Date) => void;
  onPeriodEndChange: (date?: Date) => void;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}) {
  const config = form.type ? getDocumentTypeConfig(form.type) : null;

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="file">Document File *</Label>
          <input
            ref={fileInputRef}
            type="file"
            accept={config?.allowedMimeTypes.join(",") || "*/*"}
            onChange={onFileSelect}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {form.file && (
            <p className="text-sm text-gray-600">
              Selected: {form.file.name} ({formatFileSize(form.file.size)})
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Document Type *</Label>
          <Select
            value={form.type}
            onValueChange={(value: DocumentType) => onFormChange({ ...form, type: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(DOCUMENT_TYPE_CONFIG).map(([type, config]) => (
                <SelectItem key={type} value={type}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Document Title *</Label>
        <Input
          id="title"
          value={form.title}
          onChange={(e) => onFormChange({ ...form, title: e.target.value })}
          placeholder="Enter document title"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={form.description}
          onChange={(e) => onFormChange({ ...form, description: e.target.value })}
          placeholder="Optional document description"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="user_id">Target Investor (Optional)</Label>
          <Input
            id="user_id"
            value={form.user_id}
            onChange={(e) => onFormChange({ ...form, user_id: e.target.value })}
            placeholder="Leave empty for fund-wide"
          />
          <p className="text-xs text-gray-500">Leave empty for fund-wide documents</p>
        </div>
        <div className="space-y-2">
          <Label>Fund</Label>
          <Select defaultValue="fund_001">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fund_001">Indigo Digital Assets Fund</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {config?.requiresPeriod && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Period Start</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !periodStart && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {periodStart ? format(periodStart, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={periodStart}
                  onSelect={onPeriodStartChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label>Period End</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !periodEnd && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {periodEnd ? format(periodEnd, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={periodEnd}
                  onSelect={onPeriodEndChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}
    </div>
  );
}

// Bulk Upload Item Component
function BulkUploadItem({
  upload,
  onUpdate,
  onRemove,
}: {
  upload: PendingUpload;
  onUpdate: (updates: Partial<PendingUpload>) => void;
  onRemove: () => void;
}) {
  return (
    <Card
      className={cn(
        "border-l-4",
        upload.status === "success" && "border-l-green-500",
        upload.status === "error" && "border-l-red-500",
        upload.status === "uploading" && "border-l-blue-500",
        upload.status === "pending" && "border-l-gray-300"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4" />
              <div>
                <div className="font-medium">{upload.file.name}</div>
                <div className="text-sm text-gray-500">
                  {formatFileSize(upload.file.size)} • {upload.file.type}
                </div>
              </div>
              <Badge
                variant={
                  upload.status === "success"
                    ? "default"
                    : upload.status === "error"
                      ? "destructive"
                      : upload.status === "uploading"
                        ? "secondary"
                        : "outline"
                }
              >
                {upload.status === "success" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                {upload.status === "error" && <AlertCircle className="w-3 h-3 mr-1" />}
                {upload.status}
              </Badge>
            </div>

            {upload.status === "pending" && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Type</Label>
                  <Select
                    value={upload.type}
                    onValueChange={(value: DocumentType) => onUpdate({ type: value })}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(DOCUMENT_TYPE_CONFIG).map(([type, config]) => (
                        <SelectItem key={type} value={type}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Title</Label>
                  <Input
                    value={upload.title}
                    onChange={(e) => onUpdate({ title: e.target.value })}
                    className="h-8"
                    placeholder="Document title"
                  />
                </div>
                <div>
                  <Label className="text-xs">Target</Label>
                  <Input
                    value={upload.user_id || ""}
                    onChange={(e) => onUpdate({ user_id: e.target.value || undefined })}
                    className="h-8"
                    placeholder="User ID (optional)"
                  />
                </div>
              </div>
            )}

            {upload.status === "uploading" && (
              <Progress value={upload.progress} className="w-full" />
            )}

            {upload.status === "error" && upload.error && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{upload.error}</AlertDescription>
              </Alert>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-red-600 hover:text-red-700"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
