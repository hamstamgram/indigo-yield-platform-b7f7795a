import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, CheckCircle, AlertTriangle, ExternalLink } from "lucide-react";
import type { OnboardingData } from "@/types/phase3Types";

interface DocumentsStepProps {
  data: OnboardingData;
  onUpdate: (updates: Partial<OnboardingData>) => void;
  onComplete: () => void;
}

// Sample documents that would be required
const REQUIRED_DOCUMENTS = [
  {
    id: "fund_terms",
    title: "Fund Terms & Conditions",
    description: "Important terms governing your participation in Indigo Yield funds",
    size: "2.4 MB",
    pages: 8,
    required: true,
    downloadUrl: "#", // Would be actual signed URL
  },
  {
    id: "kyc_requirements",
    title: "KYC Requirements & Privacy Policy",
    description: "Know Your Customer requirements and how we protect your data",
    size: "1.2 MB",
    pages: 4,
    required: true,
    downloadUrl: "#", // Would be actual signed URL
  },
  {
    id: "risk_disclosure",
    title: "Risk Disclosure Statement",
    description: "Important information about investment risks and potential losses",
    size: "850 KB",
    pages: 3,
    required: true,
    downloadUrl: "#", // Would be actual signed URL
  },
  {
    id: "fee_schedule",
    title: "Fee Schedule & Performance Metrics",
    description: "Detailed breakdown of management and performance fees",
    size: "640 KB",
    pages: 2,
    required: false,
    downloadUrl: "#", // Would be actual signed URL
  },
];

const DocumentsStep: React.FC<DocumentsStepProps> = ({ data, onUpdate, onComplete }) => {
  const [acknowledgedDocuments, setAcknowledgedDocuments] = useState<Set<string>>(new Set());
  const [finalAcknowledgment, setFinalAcknowledgment] = useState(
    data.documents_acknowledged || false
  );
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    validateStep();
  }, [acknowledgedDocuments, finalAcknowledgment, validateStep]);

  const validateStep = () => {
    // Check if all required documents are acknowledged
    const requiredDocs = REQUIRED_DOCUMENTS.filter((doc) => doc.required);
    const allRequiredAcknowledged = requiredDocs.every((doc) => acknowledgedDocuments.has(doc.id));

    const valid = allRequiredAcknowledged && finalAcknowledgment;
    setIsValid(valid);

    // Update parent data
    onUpdate({
      documents_acknowledged: finalAcknowledgment && allRequiredAcknowledged,
    });

    // Mark step as complete if valid
    if (valid) {
      onComplete();
    }
  };

  const handleDocumentAcknowledge = (docId: string, acknowledged: boolean) => {
    const newAcknowledged = new Set(acknowledgedDocuments);
    if (acknowledged) {
      newAcknowledged.add(docId);
    } else {
      newAcknowledged.delete(docId);
    }
    setAcknowledgedDocuments(newAcknowledged);
  };

  const handleDownload = (doc: (typeof REQUIRED_DOCUMENTS)[0]) => {
    // In a real implementation, this would fetch a signed URL from the backend
    // and trigger a secure download
    console.log(`Downloading document: ${doc.title}`);

    // For demo purposes, we'll simulate the download
    const link = document.createElement("a");
    link.href = "#"; // Would be actual signed URL
    link.download = `${doc.title.replace(/\s+/g, "_")}.pdf`;
    link.click();
  };

  const requiredDocsCount = REQUIRED_DOCUMENTS.filter((doc) => doc.required).length;
  const acknowledgedRequiredCount = REQUIRED_DOCUMENTS.filter(
    (doc) => doc.required && acknowledgedDocuments.has(doc.id)
  ).length;

  return (
    <div className="space-y-6">
      {/* Header Alert */}
      <Alert>
        <FileText className="h-4 w-4" />
        <AlertDescription>
          Please review and acknowledge the following documents before proceeding. These contain
          important information about your investment.
        </AlertDescription>
      </Alert>

      {/* Progress Indicator */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100">
                Document Review Progress
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {acknowledgedRequiredCount} of {requiredDocsCount} required documents acknowledged
              </p>
            </div>
            <Badge
              variant={acknowledgedRequiredCount === requiredDocsCount ? "default" : "secondary"}
            >
              {Math.round((acknowledgedRequiredCount / requiredDocsCount) * 100)}%
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <div className="space-y-4">
        {REQUIRED_DOCUMENTS.map((doc) => {
          const isAcknowledged = acknowledgedDocuments.has(doc.id);

          return (
            <Card
              key={doc.id}
              className={`transition-colors ${
                isAcknowledged
                  ? "border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800"
                  : doc.required
                    ? "border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800"
                    : ""
              }`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      {doc.title}
                      {doc.required && (
                        <Badge variant="destructive" className="text-xs">
                          Required
                        </Badge>
                      )}
                      {isAcknowledged && <CheckCircle className="w-4 h-4 text-green-600" />}
                    </CardTitle>
                    <CardDescription className="mt-1">{doc.description}</CardDescription>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span>{doc.size}</span>
                      <span>{doc.pages} pages</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(doc)}
                    className="ml-4"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    View PDF
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`acknowledge-${doc.id}`}
                    checked={isAcknowledged}
                    onCheckedChange={(checked) =>
                      handleDocumentAcknowledge(doc.id, checked as boolean)
                    }
                  />
                  <label
                    htmlFor={`acknowledge-${doc.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    I have read and understood this document
                  </label>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Final Acknowledgment */}
      {acknowledgedRequiredCount === requiredDocsCount && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-900 dark:text-green-100">
                    All Required Documents Reviewed
                  </h4>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    You have successfully reviewed all required documents. Please provide your final
                    acknowledgment below.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2 pt-4 border-t border-green-200 dark:border-green-800">
                <Checkbox
                  id="final-acknowledgment"
                  checked={finalAcknowledgment}
                  onCheckedChange={(checked) => setFinalAcknowledgment(checked as boolean)}
                />
                <label
                  htmlFor="final-acknowledgment"
                  className="text-sm font-medium leading-relaxed text-green-900 dark:text-green-100"
                >
                  I acknowledge that I have read, understood, and agree to be bound by all the terms
                  and conditions outlined in the documents above. I understand the risks involved
                  and wish to proceed with my investment in Indigo Yield funds.
                </label>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Incomplete Warning */}
      {acknowledgedRequiredCount < requiredDocsCount && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You must review and acknowledge all required documents before proceeding to the next
            step.
            {requiredDocsCount - acknowledgedRequiredCount} document(s) remaining.
          </AlertDescription>
        </Alert>
      )}

      {/* Completion Status */}
      {isValid && (
        <Alert className="border-green-200 bg-green-50 dark:bg-green-950">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            Document review complete! You can proceed to select your preferred funds.
          </AlertDescription>
        </Alert>
      )}

      {/* Additional Information */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mt-0.5">
              <ExternalLink className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-sm">
              <p className="font-medium text-gray-900 dark:text-white mb-1">Need Help?</p>
              <p className="text-gray-600 dark:text-gray-300">
                If you have questions about any of these documents, please contact our support team
                at{" "}
                <a href="mailto:support@indigo-yield.com" className="text-blue-600 hover:underline">
                  support@indigo-yield.com
                </a>{" "}
                before proceeding.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentsStep;
