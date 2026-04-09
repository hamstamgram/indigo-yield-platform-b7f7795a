import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CSVExporter, type ExportColumn } from "@/utils/export/csv-export";
import { useToast } from "@/hooks";
import { cn } from "@/lib/utils";

interface ExportButtonProps<T> {
  data: T[];
  columns: ExportColumn[];
  filename: string;
  className?: string;
  disabled?: boolean;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "icon";
  label?: string;
}

export function ExportButton<T>({
  data,
  columns,
  filename,
  className,
  disabled,
  variant = "outline",
  size = "sm",
  label = "Export",
}: ExportButtonProps<T>) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    if (data.length === 0) {
      toast({ title: "No data to export", variant: "destructive" });
      return;
    }

    setIsExporting(true);
    try {
      const result = await CSVExporter.exportToCSV(data, {
        filename,
        columns,
        includeHeaders: true,
        encoding: "utf-8-bom",
      });

      if (result.success) {
        toast({
          title: "Export complete",
          description: `${result.rowCount} rows exported to ${result.filename}`,
        });
      } else {
        toast({
          title: "Export failed",
          description: result.error,
          variant: "destructive",
        });
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleExport}
      disabled={disabled || isExporting || data.length === 0}
      className={cn("gap-2", className)}
    >
      <Download className="h-4 w-4" />
      {size !== "icon" && label}
    </Button>
  );
}

interface ExportDropdownProps<T> {
  data: T[];
  configs: Array<{
    label: string;
    columns: ExportColumn[];
    filename: string;
  }>;
  className?: string;
  disabled?: boolean;
}

export function ExportDropdown<T>({ data, configs, className, disabled }: ExportDropdownProps<T>) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async (config: ExportDropdownProps<T>["configs"][0]) => {
    if (data.length === 0) {
      toast({ title: "No data to export", variant: "destructive" });
      return;
    }

    setIsExporting(true);
    try {
      const result = await CSVExporter.exportToCSV(data, {
        filename: config.filename,
        columns: config.columns,
        includeHeaders: true,
        encoding: "utf-8-bom",
      });

      if (result.success) {
        toast({
          title: "Export complete",
          description: `${result.rowCount} rows exported`,
        });
      } else {
        toast({
          title: "Export failed",
          description: result.error,
          variant: "destructive",
        });
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || isExporting || data.length === 0}
          className={cn("gap-2", className)}
        >
          <Download className="h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {configs.map((config) => (
          <DropdownMenuItem key={config.filename} onClick={() => handleExport(config)}>
            {config.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
