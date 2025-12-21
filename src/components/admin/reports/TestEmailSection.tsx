/**
 * Test Email Section
 * Allows sending individual test emails to specific investors
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { FlaskConical, Send, Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface TestEmailSectionProps {
  selectedPeriodId: string;
  selectedDeliveryMode: "email_html" | "pdf_attachment" | "link_only" | "hybrid";
}

interface InvestorWithStatement {
  investor_id: string;
  investor_name: string;
  email: string;
  statement_id: string;
}

export function TestEmailSection({ selectedPeriodId, selectedDeliveryMode }: TestEmailSectionProps) {
  const queryClient = useQueryClient();
  const [selectedInvestorId, setSelectedInvestorId] = useState<string>("");

  // Fetch investors with generated statements for this period
  const { data: investorsWithStatements = [], isLoading } = useQuery({
    queryKey: ["investors-with-statements", selectedPeriodId],
    queryFn: async () => {
      if (!selectedPeriodId) return [];

      // First get the statements
      const { data: statements, error: stmtError } = await supabase
        .from("generated_statements")
        .select("id, investor_id")
        .eq("period_id", selectedPeriodId);

      if (stmtError) throw stmtError;
      if (!statements || statements.length === 0) return [];

      // Then get investor profiles
      const investorIds = [...new Set(statements.map(s => s.investor_id))];
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .in("id", investorIds);

      if (profileError) throw profileError;

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      return statements.map((stmt) => {
        const profile = profileMap.get(stmt.investor_id);
        return {
          investor_id: stmt.investor_id,
          investor_name: profile 
            ? [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.email
            : "Unknown",
          email: profile?.email || "",
          statement_id: stmt.id,
        };
      }) as InvestorWithStatement[];
    },
    enabled: !!selectedPeriodId,
  });

  // Send test email mutation
  const sendTestMutation = useMutation({
    mutationFn: async ({ investorId, periodId }: { investorId: string; periodId: string }) => {
      const { data, error } = await supabase.functions.invoke("send-report-mailersend", {
        body: { 
          investor_id: investorId, 
          period_id: periodId,
          delivery_mode: selectedDeliveryMode,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Test email sent!", {
        description: `Message ID: ${data.message_id?.slice(0, 16)}...`,
      });
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["delivery-stats"] });
      setSelectedInvestorId("");
    },
    onError: (error) => {
      toast.error(`Failed to send: ${error.message}`);
    },
  });

  const selectedInvestor = investorsWithStatements.find(i => i.investor_id === selectedInvestorId);

  return (
    <Card className="border-dashed border-amber-500/50 bg-amber-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-amber-600" />
          Test Email Delivery
        </CardTitle>
        <CardDescription className="text-xs">
          Send a single report email to test delivery before batch sending
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground sr-only">Select Investor</Label>
            <Select 
              value={selectedInvestorId} 
              onValueChange={setSelectedInvestorId}
              disabled={isLoading || investorsWithStatements.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  isLoading 
                    ? "Loading investors..." 
                    : investorsWithStatements.length === 0 
                      ? "No statements for this period" 
                      : "Select an investor..."
                } />
              </SelectTrigger>
              <SelectContent>
                {investorsWithStatements.map((inv) => (
                  <SelectItem key={inv.investor_id} value={inv.investor_id}>
                    <div className="flex flex-col">
                      <span>{inv.investor_name}</span>
                      <span className="text-xs text-muted-foreground">{inv.email}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => sendTestMutation.mutate({ 
              investorId: selectedInvestorId, 
              periodId: selectedPeriodId 
            })}
            disabled={!selectedInvestorId || sendTestMutation.isPending}
            className="shrink-0"
          >
            {sendTestMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Send Test Email
          </Button>
        </div>
        {selectedInvestor && (
          <p className="text-xs text-muted-foreground mt-2">
            Will send to: <span className="font-medium">{selectedInvestor.email}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
