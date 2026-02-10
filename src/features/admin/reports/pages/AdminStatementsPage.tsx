import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Label,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui";
import { Loader2, FileText, Download, Send, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import {
  useStatementsPageInvestors,
  useStatementDocuments,
  useGenerateStatementMutation,
  useSendStatementEmail,
} from "@/hooks";
import { PageShell } from "@/components/layout/PageShell";

const MONTHS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

export default function AdminStatementsPage() {
  const [selectedInvestor, setSelectedInvestor] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>(
    (new Date().getMonth() + 1).toString()
  );
  const [generatingStatement, setGeneratingStatement] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  // Use extracted hooks
  const { data: investorProfiles, isLoading: investorsLoading } = useStatementsPageInvestors();
  const investors = investorProfiles || [];

  const { data: statements, isLoading: statementsLoading } = useStatementDocuments(50);

  const generateStatementMutation = useGenerateStatementMutation((id) =>
    setGeneratingStatement(id)
  );

  const sendStatementMutation = useSendStatementEmail();

  const handleGenerateStatement = () => {
    if (!selectedInvestor || !selectedYear || !selectedMonth) {
      return;
    }

    generateStatementMutation.mutate({
      investorId: selectedInvestor,
      year: parseInt(selectedYear),
      month: parseInt(selectedMonth),
    });
  };

  const handleSendStatement = (investorId: string, statementId: string, email: string) => {
    const investorName = investors?.find((i) => i.id === investorId)?.name || "Investor";
    const period = `${MONTHS.find((m) => m.value === selectedMonth)?.label} ${selectedYear}`;

    sendStatementMutation.mutate({
      investorId,
      statementId,
      email,
      investorName,
      period,
    });
  };

  if (investorsLoading || statementsLoading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div>
        <h1 className="text-2xl font-bold">Statement Management</h1>
        <p className="text-muted-foreground">Generate and manage investor monthly statements</p>
      </div>

      {/* Generate New Statement */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate New Statement
          </CardTitle>
          <CardDescription>Create monthly statements for investors</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Investor</Label>
              <Select value={selectedInvestor} onValueChange={setSelectedInvestor}>
                <SelectTrigger>
                  <SelectValue placeholder="Select investor" />
                </SelectTrigger>
                <SelectContent>
                  {investors?.map((investor) => (
                    <SelectItem key={investor.id} value={investor.id}>
                      {investor.name} ({investor.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Year</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Month</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleGenerateStatement}
            disabled={generateStatementMutation.isPending || !!generatingStatement}
            className="w-full md:w-auto"
          >
            {generateStatementMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Generating Statement...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Generate Statement
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Existing Statements */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Statements</CardTitle>
          <CardDescription>Previously generated statements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {statements?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No statements generated yet
              </div>
            ) : (
              statements?.map((statement) => (
                <div key={statement.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span className="font-semibold">Statement User</span>
                      <span className="text-sm text-muted-foreground">
                        (User ID: {statement.user_id})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        <Calendar className="h-3 w-3 mr-1" />
                        {format(new Date(statement.period_start || new Date()), "MMM d, yyyy")}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{statement.title}</div>
                      <div className="text-sm text-muted-foreground">
                        Created: {new Date(statement.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <Send className="h-4 w-4 mr-1" />
                            Send
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Send Statement</DialogTitle>
                            <DialogDescription>
                              Send statement notification to user
                            </DialogDescription>
                          </DialogHeader>
                          <div className="py-4">
                            <p>
                              This will send an email notification with a link to access the
                              statement.
                            </p>
                          </div>
                          <DialogFooter>
                            <Button
                              onClick={() =>
                                handleSendStatement(
                                  statement.user_id,
                                  statement.id,
                                  "user@example.com"
                                )
                              }
                              disabled={sendStatementMutation.isPending}
                            >
                              {sendStatementMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <Send className="h-4 w-4 mr-2" />
                              )}
                              Send Email
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}
