import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { FileText, Upload, Send, CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

type Report = {
  id: string;
  name: string;
  type: "monthly" | "quarterly" | "annual" | "tax";
  investor: string;
  date_generated: string;
  status: "sent" | "pending" | "viewed";
};

const mockReports: Report[] = [
  {
    id: "1",
    name: "October 2025 Statement",
    type: "monthly",
    investor: "John Doe",
    date_generated: "2025-11-01",
    status: "viewed",
  },
  {
    id: "2",
    name: "Q3 2025 Performance",
    type: "quarterly",
    investor: "Alice Smith",
    date_generated: "2025-10-15",
    status: "sent",
  },
];

export default function ReportDispatcher() {
  const [reports, setReports] = useState<Report[]>(mockReports);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedInvestor, setSelectedInvestor] = useState("");
  const [reportType, setReportType] = useState("monthly");
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadAndSend = async () => {
    if (!selectedFile || !selectedInvestor) {
      toast({
        title: "Validation Error",
        description: "Please select a file and an investor.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    // Simulate upload delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const newReport: Report = {
      id: Date.now().toString(),
      name: selectedFile.name,
      type: reportType as any,
      investor: selectedInvestor,
      date_generated: new Date().toISOString().split("T")[0],
      status: "sent",
    };

    setReports([newReport, ...reports]);
    setIsUploading(false);
    setSelectedFile(null);
    setSelectedInvestor("");

    toast({
      title: "Report Sent",
      description: `Successfully sent ${newReport.name} to ${newReport.investor}.`,
    });
  };

  const columns = [
    { header: "Report Name", accessorKey: "name" as keyof Report, className: "font-medium" },
    {
      header: "Type",
      accessorKey: "type" as keyof Report,
      cell: (item: Report) => (
        <Badge variant="outline" className="capitalize">
          {item.type}
        </Badge>
      ),
    },
    { header: "Investor", accessorKey: "investor" as keyof Report },
    { header: "Date", accessorKey: "date_generated" as keyof Report },
    {
      header: "Status",
      accessorKey: "status" as keyof Report,
      cell: (item: Report) => (
        <Badge
          variant={item.status === "viewed" ? "secondary" : "default"}
          className={item.status === "sent" ? "bg-green-600" : "bg-blue-100 text-blue-800"}
        >
          {item.status === "sent" ? <CheckCircle className="w-3 h-3 mr-1" /> : null}
          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-indigo-900 dark:text-indigo-100">
            Report Dispatcher
          </h1>
          <p className="text-muted-foreground">Manually upload and send reports to investors.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Card */}
        <Card className="lg:col-span-1 border-t-4 border-t-indigo-600 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-indigo-700">
              <Upload className="w-5 h-5" />
              Send New Report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="investor">Select Investor</Label>
              <select
                id="investor"
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedInvestor}
                onChange={(e) => setSelectedInvestor(e.target.value)}
              >
                <option value="">Select an investor...</option>
                <option value="John Doe">John Doe</option>
                <option value="Alice Smith">Alice Smith</option>
                <option value="Robert Johnson">Robert Johnson</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Report Type</Label>
              <select
                id="type"
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
              >
                <option value="monthly">Monthly Statement</option>
                <option value="quarterly">Quarterly Report</option>
                <option value="annual">Annual Statement</option>
                <option value="tax">Tax Document (K-1)</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">Report File (PDF)</Label>
              <Input
                id="file"
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="cursor-pointer"
              />
            </div>

            <Button
              onClick={handleUploadAndSend}
              disabled={isUploading || !selectedFile || !selectedInvestor}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white mt-4"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Report
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* History List */}
        <Card className="lg:col-span-2 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Sent Reports History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveTable
              data={reports}
              columns={columns}
              keyExtractor={(item) => item.id}
              emptyMessage="No reports sent recently."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
