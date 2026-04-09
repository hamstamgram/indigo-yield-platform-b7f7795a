/**
 * Fund Logo Upload Component
 * Handles image upload to Supabase storage with preview
 */

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui";
import { toast } from "sonner";
import { Loader2, Upload, X, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUploadFundLogo } from "@/hooks/data/shared/useStorage";
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

interface FundLogoUploadProps {
  currentLogoUrl?: string | null;
  onUpload: (url: string | null) => void;
  disabled?: boolean;
  size?: "sm" | "md";
}

export function FundLogoUpload({
  currentLogoUrl,
  onUpload,
  disabled,
  size = "md",
}: FundLogoUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentLogoUrl || null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Use React Query mutation hook
  const uploadMutation = useUploadFundLogo();
  const uploading = uploadMutation.isPending;

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return "Please upload a PNG, JPG, or WebP image";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "File size must be less than 2MB";
    }
    return null;
  };

  const uploadFile = async (file: File) => {
    const error = validateFile(file);
    if (error) {
      toast.error(error);
      return;
    }

    uploadMutation.mutate(file, {
      onSuccess: (result) => {
        setPreviewUrl(result.publicUrl);
        onUpload(result.publicUrl);
      },
    });
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (disabled || uploading) return;

      const files = e.dataTransfer.files;
      if (files && files[0]) {
        uploadFile(files[0]);
      }
    },
    [disabled, uploading]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      uploadFile(files[0]);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onUpload(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleClick = () => {
    if (!disabled && !uploading) {
      inputRef.current?.click();
    }
  };

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 transition-colors",
          dragActive && "border-primary bg-primary/5",
          !dragActive && "border-muted-foreground/25 hover:border-muted-foreground/50",
          disabled && "opacity-50 cursor-not-allowed",
          !disabled && !uploading && "cursor-pointer"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.webp"
          onChange={handleChange}
          disabled={disabled || uploading}
          className="hidden"
        />

        {uploading ? (
          <div className={cn("flex flex-col items-center gap-2", size === "sm" ? "py-1" : "py-4")}>
            <Loader2
              className={cn(
                "animate-spin text-muted-foreground",
                size === "sm" ? "h-5 w-5" : "h-8 w-8"
              )}
            />
            {size !== "sm" && <span className="text-sm text-muted-foreground">Uploading...</span>}
          </div>
        ) : previewUrl ? (
          <div className="relative group">
            <img
              src={previewUrl}
              alt="Fund logo preview"
              className={cn("rounded-lg object-cover", size === "sm" ? "h-12 w-12" : "h-20 w-20")}
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className={cn(
                "absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity",
                size === "sm" && "h-5 w-5 -top-1 -right-1"
              )}
              onClick={(e) => {
                e.stopPropagation();
                handleRemove();
              }}
              disabled={disabled}
            >
              <X className={cn(size === "sm" ? "h-2 w-2" : "h-3 w-3")} />
            </Button>
          </div>
        ) : (
          <div className={cn("flex flex-col items-center gap-2", size === "sm" ? "py-1" : "py-4")}>
            <div className={cn("rounded-full bg-muted", size === "sm" ? "p-1.5" : "p-3")}>
              <ImageIcon
                className={cn("text-muted-foreground", size === "sm" ? "h-4 w-4" : "h-6 w-6")}
              />
            </div>
            {size !== "sm" && (
              <div className="text-center">
                <p className="text-sm font-medium">
                  <Upload className="inline h-4 w-4 mr-1" />
                  Upload logo
                </p>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG, or WebP (max 2MB)</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
