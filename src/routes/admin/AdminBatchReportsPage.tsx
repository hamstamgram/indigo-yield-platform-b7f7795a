import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Calendar, Clock } from "lucide-react";

interface SimpleReport {
  id: string;
  name: string;
  status: "pending" | "processing" | "completed" | "failed";
  created_at: string;
  file_size?: string;
}

export default function AdminBatchReportsPage() {
  const [reports] = useState<SimpleReport[]>([
    {
      id: "1",
      name: "Monthly Statement Report",
      status: "completed",
      created_at: new Date().toISOString(),
      file_size: "2.4 MB",
    },
    {
      id: "2",
      name: "Portfolio Analytics Report",
      status: "processing",
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: "3",
      name: "Transaction Summary",
      status: "pending",
      created_at: new Date(Date.now() - 7200000).toISOString(),
    },
  ]);

  const getStatusVariant = (
    status: string
  ): "default" | "destructive" | "outline" | "secondary" => {
    switch (status) {
      case "completed":
        return "default";
      case "processing":
        return "outline";
      case "failed":
        return "destructive";
      case "pending":
        return "secondary";
      default:
        return "secondary";
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Batch Reports</h1>
          <p className="text-muted-foreground">Generate and download system reports</p>
        </div>
        <Button>
          <FileText className="h-4 w-4 mr-2" />
          New Report
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reports.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Download className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reports.filter((r) => r.status === "completed").length}
            </div>
            <p className="text-xs text-muted-foreground">Ready for download</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reports.filter((r) => r.status === "processing").length}
            </div>
            <p className="text-xs text-muted-foreground">Currently generating</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reports.filter((r) => r.status === "pending").length}
            </div>
            <p className="text-xs text-muted-foreground">In queue</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Report History
          </CardTitle>
          <CardDescription>Generated reports and their current status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between p-4 border rounded-lg bg-card"
              >
                <div className="flex items-center gap-4">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{report.name}</h3>
                      <Badge variant={getStatusVariant(report.status)}>{report.status}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Created: {new Date(report.created_at).toLocaleString()}</span>
                      {report.file_size && (
                        <>
                          <span>•</span>
                          <span>Size: {report.file_size}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {report.status === "completed" && (
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  )}
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {reports.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">No reports found</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
