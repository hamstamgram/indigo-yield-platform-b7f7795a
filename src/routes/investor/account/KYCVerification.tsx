/**
 * KYC Verification Page
 * Identity verification and document upload
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  Upload,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Loader2,
  Download,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth/context";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface KYCStatus {
  // DB constraint: 'pending', 'approved', 'rejected', 'expired'
  // UI also supports 'not_started' for display purposes
  status: "not_started" | "pending" | "approved" | "rejected" | "expired";
  approvedAt?: string;
  rejectionReason?: string;
  lastUpdated?: string;
}

interface Document {
  id: string;
  type: string;
  fileName: string;
  status: "pending" | "approved" | "rejected";
  uploadedAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

const REQUIRED_DOCUMENTS = [
  {
    type: "id_front",
    label: "Government ID (Front)",
    description: "Driver license, passport, or national ID",
  },
  {
    type: "id_back",
    label: "Government ID (Back)",
    description: "Required if using driver license",
  },
  {
    type: "proof_of_address",
    label: "Proof of Address",
    description: "Utility bill or bank statement (max 3 months old)",
  },
  { type: "selfie", label: "Selfie with ID", description: "Hold your ID next to your face" },
];

export default function KYCVerification() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [kycStatus, setKycStatus] = useState<KYCStatus>({ status: "not_started" });
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadKYCData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadKYCData = async () => {
    if (!user) return;

    try {
      // Query investors table (which has kyc_status) via profile_id
      const { data: investorData } = await supabase
        .from("investors")
        .select("kyc_status, kyc_date, updated_at")
        .eq("profile_id", user.id)
        .maybeSingle();

      if (investorData) {
        setKycStatus({
          status: (investorData.kyc_status as any) || "not_started",
          approvedAt: investorData.kyc_date || undefined,
          rejectionReason: undefined,
          lastUpdated: investorData.updated_at || undefined,
        });
      }

      const { data: documentsData } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (documentsData) {
        setDocuments(
          documentsData.map((doc: any) => ({
            id: doc.id,
            type: doc.document_type || doc.type,
            fileName: doc.file_name || "document",
            status: doc.status || "pending",
            uploadedAt: doc.created_at,
            reviewedAt: doc.reviewed_at,
            rejectionReason: doc.rejection_reason,
          }))
        );
      }
    } catch (error) {
      console.error("Failed to load KYC data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (documentType: string, file: File) => {
    if (!user) return;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${documentType}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("kyc-documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from("documents").insert({
        user_id: user.id,
        document_type: documentType,
        file_name: file.name,
        file_path: fileName,
        status: "pending",
      } as any);

      if (insertError) throw insertError;

      toast({
        title: "Success",
        description: "Document uploaded successfully",
      });

      loadKYCData();
    } catch (error) {
      console.error("Failed to upload document:", error);
      toast({
        title: "Error",
        description: "Failed to upload document",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="gap-1 bg-green-600">
            <CheckCircle className="h-3 w-3" />
            Approved
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Under Review
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Not Started
          </Badge>
        );
    }
  };

  const getCompletionPercentage = () => {
    if (kycStatus.status === "approved") return 100;
    const uploadedDocs = REQUIRED_DOCUMENTS.filter((req) =>
      documents.some((doc) => doc.type === req.type)
    ).length;
    return Math.round((uploadedDocs / REQUIRED_DOCUMENTS.length) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/account")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">KYC Verification</h1>
          <p className="text-muted-foreground mt-2">
            Complete identity verification to unlock full platform features
          </p>
        </div>
        {getStatusBadge(kycStatus.status)}
      </div>

      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Verification Status</CardTitle>
          <CardDescription>Your current verification status and progress</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium">Completion</span>
              <span className="text-muted-foreground">{getCompletionPercentage()}%</span>
            </div>
            <Progress value={getCompletionPercentage()} className="h-2" />
          </div>

          {kycStatus.status === "approved" && kycStatus.approvedAt && (
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-green-900 dark:text-green-100">
                    Your identity is verified
                  </p>
                  <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                    Approved on {format(new Date(kycStatus.approvedAt), "PPP")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {kycStatus.status === "rejected" && kycStatus.rejectionReason && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Verification was rejected</p>
                  <p className="text-sm mt-1">{kycStatus.rejectionReason}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => setKycStatus({ ...kycStatus, status: "not_started" })}
                  >
                    Resubmit Documents
                  </Button>
                </div>
              </div>
            </div>
          )}

          {kycStatus.status === "pending" && (
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    Your documents are under review
                  </p>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                    This usually takes 1-2 business days. We'll notify you once complete.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Required Documents */}
      <Card>
        <CardHeader>
          <CardTitle>Required Documents</CardTitle>
          <CardDescription>
            Upload the following documents to complete your verification
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {REQUIRED_DOCUMENTS.map((requiredDoc, index) => {
              const uploadedDoc = documents.find((doc) => doc.type === requiredDoc.type);

              return (
                <div key={requiredDoc.type}>
                  {index > 0 && <Separator />}
                  <div className="flex items-start justify-between py-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-muted p-2">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{requiredDoc.label}</p>
                          {uploadedDoc && getStatusBadge(uploadedDoc.status)}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {requiredDoc.description}
                        </p>
                        {uploadedDoc &&
                          uploadedDoc.status === "rejected" &&
                          uploadedDoc.rejectionReason && (
                            <p className="text-sm text-destructive mt-1">
                              {uploadedDoc.rejectionReason}
                            </p>
                          )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {uploadedDoc ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              try {
                                const { data } = await supabase.storage
                                  .from("kyc-documents")
                                  .createSignedUrl(
                                    `${user?.id}/${uploadedDoc.type}_${uploadedDoc.id}`,
                                    60
                                  );
                                if (data?.signedUrl) {
                                  window.open(data.signedUrl, "_blank");
                                }
                              } catch (error) {
                                toast({
                                  title: "Error",
                                  description: "Failed to download document",
                                  variant: "destructive",
                                });
                              }
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {uploadedDoc.status === "rejected" && (
                            <Button
                              size="sm"
                              disabled={uploading}
                              onClick={() => {
                                const input = document.createElement("input");
                                input.type = "file";
                                input.accept = "image/*,.pdf";
                                input.onchange = (e: any) => {
                                  const file = e.target?.files?.[0];
                                  if (file) handleFileUpload(requiredDoc.type, file);
                                };
                                input.click();
                              }}
                            >
                              <Upload className="mr-2 h-4 w-4" />
                              Reupload
                            </Button>
                          )}
                        </>
                      ) : (
                        <Button
                          size="sm"
                          disabled={uploading}
                          onClick={() => {
                            const input = document.createElement("input");
                            input.type = "file";
                            input.accept = "image/*,.pdf";
                            input.onchange = (e: any) => {
                              const file = e.target?.files?.[0];
                              if (file) handleFileUpload(requiredDoc.type, file);
                            };
                            input.click();
                          }}
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Upload
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Help Information */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Document Requirements</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Documents must be clear and readable</li>
                <li>All information must be visible</li>
                <li>No screenshots or edited images</li>
                <li>Files must be in JPG, PNG, or PDF format</li>
                <li>Maximum file size: 10MB</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Why do we need this?</h4>
              <p className="text-muted-foreground">
                Identity verification helps us prevent fraud, comply with regulations, and keep your
                account secure. Your information is encrypted and stored securely.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
