/**
 * AdminOnboardingPage - Institutional Admin Training & Onboarding Guide
 * 
 * A comprehensive, interactive training module for new administrators
 * covering the platform's "Sovereign" protocols and institutional constraints.
 */

import { useState } from "react";
import {
  Calculator,
  TrendingUp,
  ArrowDownToLine,
  FileText,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Circle,
  BookOpen,
  ExternalLink,
  Info,
  Zap,
  Lock,
  Scale,
  Eye,
  KeyRound,
  RefreshCcw,
  Clock,
  Layers,
  Wallet,
  Ban,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useLocalStorage } from "@/hooks/ui/useLocalStorage";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FinancialValue } from "@/components/common/FinancialValue";

interface ModuleCompletion {
  precision: boolean;
  yield: boolean;
  withdrawals: boolean;
  audit: boolean;
  security: boolean;
  warnings: boolean;
}

const INITIAL_COMPLETION: ModuleCompletion = {
  precision: false,
  yield: false,
  withdrawals: false,
  audit: false,
  security: false,
  warnings: false,
};

export default function AdminOnboardingPage() {
  const [completion, setCompletion] = useLocalStorage<ModuleCompletion>(
    "admin-onboarding-progress",
    INITIAL_COMPLETION
  );

  const completedCount = Object.values(completion).filter(Boolean).length;
  const totalModules = 6;
  const progressPercent = (completedCount / totalModules) * 100;

  const markComplete = (module: keyof ModuleCompletion) => {
    setCompletion((prev) => ({ ...prev, [module]: true }));
  };

  const resetProgress = () => {
    setCompletion(INITIAL_COMPLETION);
  };

  return (
    <div className="container max-w-4xl py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">
            Admin Training & Onboarding Guide
          </h1>
        </div>
        <p className="text-muted-foreground">
          Complete these modules to understand the platform's institutional protocols
          and "Sovereign" security architecture.
        </p>
      </div>

      {/* Progress Section */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Training Progress
            </CardTitle>
            {completedCount === totalModules && (
              <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Certified
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {completedCount} of {totalModules} modules completed
            </span>
            <span className="font-medium">{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          {completedCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetProgress}
              className="text-xs text-muted-foreground"
            >
              <RefreshCcw className="h-3 w-3 mr-1" />
              Reset Progress
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Module 1: Precision-First Philosophy */}
      <ModuleCard
        icon={Calculator}
        title="Module 1: The 'Precision-First' Philosophy"
        description="Understanding the 10-decimal ledger and conservation of value"
        completed={completion.precision}
        onComplete={() => markComplete("precision")}
      >
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="ledger">
            <AccordionTrigger className="text-left">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-primary" />
                The 10-Decimal Ledger
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              <p className="text-muted-foreground">
                All financial values in the platform are stored with <strong>10 decimal precision</strong> using
                PostgreSQL's <code className="bg-muted px-1 rounded">NUMERIC(28,10)</code> type. This prevents
                floating-point errors that could accumulate over thousands of transactions.
              </p>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Why 10 Decimals?</AlertTitle>
                <AlertDescription>
                  Cryptocurrency assets like BTC can have values as small as 1 satoshi (0.00000001).
                  We use 10 decimals to ensure we never lose precision during yield calculations.
                </AlertDescription>
              </Alert>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="financial-value">
            <AccordionTrigger className="text-left">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                The FinancialValue Component
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              <p className="text-muted-foreground">
                The UI uses a special <code className="bg-muted px-1 rounded">FinancialValue</code> component
                that uses <strong>Decimal.js</strong> for all calculations to avoid JavaScript floating-point errors.
              </p>
              
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <p className="text-sm font-medium">Live Demo:</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Normal value:</span>
                    <div className="font-mono">
                      <FinancialValue value={1234.56789} asset="USDC" />
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Micro-balance:</span>
                    <div className="font-mono">
                      <FinancialValue value={0.0000000001} asset="BTC" />
                    </div>
                  </div>
                </div>
              </div>

              <Alert variant="default" className="border-amber-500/50 bg-amber-500/5">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <AlertTitle>Micro-Balance Tooltip</AlertTitle>
                <AlertDescription>
                  When you see <strong>"~0"</strong> with a tooltip, it means the value exists but is too small
                  to display at 8 decimals. Hover to see the full 10-decimal precision.
                </AlertDescription>
              </Alert>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="dust">
            <AccordionTrigger className="text-left">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                Conservation of Value (Dust Handler)
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              <p className="text-muted-foreground">
                The platform <strong>guarantees</strong> that no value is ever lost to rounding.
                The "Dust Handler" ensures:
              </p>
              
              <div className="p-4 bg-muted/50 rounded-lg font-mono text-sm">
                Investor Interest + Platform Fees + IB Commission + Dust = Gross Yield
              </div>
              
              <p className="text-muted-foreground">
                Any residual "dust" (sub-cent remainders from division) is automatically credited
                to the Platform Fees account, ensuring the equation always balances perfectly.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </ModuleCard>

      {/* Module 2: Yield Engine */}
      <ModuleCard
        icon={TrendingUp}
        title="Module 2: Operating the Yield Engine (T-1 Protocol)"
        description="Step-by-step guide to yield distribution and the temporal lock"
        completed={completion.yield}
        onComplete={() => markComplete("yield")}
        linkTo="/admin/yields"
        linkLabel="Go to Yield Operations"
      >
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="steps">
            <AccordionTrigger className="text-left">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Step-by-Step Yield Distribution
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div className="space-y-3">
                <StepCard step={1} title="Record AUM Snapshot (T-0)">
                  Navigate to Yield Operations and enter the fund's current Total AUM.
                  Select purpose: <strong>Reporting</strong> or <strong>Transaction</strong>.
                </StepCard>
                
                <StepCard step={2} title="Wait for Temporal Lock (T+1)">
                  You cannot distribute yield on the same day as the snapshot.
                  This prevents intraday compounding errors.
                </StepCard>
                
                <StepCard step={3} title="Preview & Apply Distribution">
                  Review the calculated allocations in the preview panel.
                  Verify the conservation checksum shows "Balanced".
                </StepCard>
                
                <StepCard step={4} title="Confirm with Admin Signature">
                  Apply the distribution. Your user ID is recorded as the actor.
                </StepCard>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="temporal-lock">
            <AccordionTrigger className="text-left">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                The Temporal Lock (Why Wait T-1?)
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              <Alert variant="destructive" className="border-red-500/50 bg-red-500/5">
                <Lock className="h-4 w-4" />
                <AlertTitle>Critical Constraint</AlertTitle>
                <AlertDescription>
                  You <strong>cannot</strong> apply yield on the same day as the AUM snapshot.
                  The system enforces: <code>yield_date &gt; snapshot_date</code>
                </AlertDescription>
              </Alert>
              
              <p className="text-muted-foreground">
                <strong>Why?</strong> If deposits or withdrawals occur during the day, applying
                yield immediately could compound errors. Waiting until T+1 ensures the snapshot
                represents a stable end-of-day position.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="waterfall">
            <AccordionTrigger className="text-left">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                The Yield Waterfall
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              <p className="text-muted-foreground">
                Gross yield is split according to this waterfall:
              </p>
              
              <div className="p-4 bg-muted/50 rounded-lg font-mono text-sm space-y-2">
                <div className="text-foreground font-semibold">Gross Yield (New AUM - Previous AUM)</div>
                <div className="pl-4 border-l-2 border-primary/30 space-y-1">
                  <div>├── Investor Interest (after all fees)</div>
                  <div>├── Platform Fee (% of Gross Yield)</div>
                  <div>├── IB Commission (% of Gross Yield)</div>
                  <div>└── Residual Dust → fees_account</div>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Platform fees and IB commissions are calculated as percentages of the <strong>gross</strong> yield,
                then the remainder goes to investors.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </ModuleCard>

      {/* Module 3: Withdrawals */}
      <ModuleCard
        icon={ArrowDownToLine}
        title="Module 3: Managing Withdrawals & 'Available Balance'"
        description="Understanding position locks and double-spend prevention"
        completed={completion.withdrawals}
        onComplete={() => markComplete("withdrawals")}
        linkTo="/admin/withdrawals"
        linkLabel="Go to Withdrawals"
      >
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="balance-types">
            <AccordionTrigger className="text-left">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-primary" />
                Total Position vs Available Balance
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold mb-2">Total Position</h4>
                  <p className="text-sm text-muted-foreground">
                    The investor's full balance including all deposits, yields, and adjustments.
                    This is the "paper value" of their investment.
                  </p>
                </div>
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <h4 className="font-semibold mb-2">Available Balance</h4>
                  <p className="text-sm text-muted-foreground">
                    Total Position <strong>minus</strong> any pending or approved (but not yet completed)
                    withdrawal requests.
                  </p>
                </div>
              </div>
              
              <div className="p-4 bg-muted/50 rounded-lg font-mono text-sm">
                Available = Total Position - Pending Withdrawals - Approved Withdrawals
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="double-spend">
            <AccordionTrigger className="text-left">
              <div className="flex items-center gap-2">
                <Ban className="h-4 w-4 text-primary" />
                Double-Spend Prevention
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertTitle>Automatic Lock</AlertTitle>
                <AlertDescription>
                  When a withdrawal is requested, that amount is immediately "locked" and
                  excluded from the Available Balance. This prevents approving multiple
                  withdrawals that exceed the investor's true position.
                </AlertDescription>
              </Alert>
              
              <p className="text-muted-foreground">
                The system enforces: <code>requested_amount ≤ available_balance</code> at the
                time of both <strong>request creation</strong> and <strong>approval</strong>.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </ModuleCard>

      {/* Module 4: Audit Vault */}
      <ModuleCard
        icon={FileText}
        title="Module 4: Using the Audit Vault (Reading Deltas)"
        description="How to investigate changes using the delta audit log"
        completed={completion.audit}
        onComplete={() => markComplete("audit")}
        linkTo="/admin/audit-logs"
        linkLabel="Go to Audit Logs"
      >
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="viewer">
            <AccordionTrigger className="text-left">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                Using the Audit Log Viewer
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              <p className="text-muted-foreground">
                The Audit Log provides a complete history of all system changes. You can filter by:
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li><strong>Entity</strong>: transactions_v2, investor_positions, withdrawal_requests, etc.</li>
                <li><strong>Action</strong>: INSERT, UPDATE, VOID, etc.</li>
                <li><strong>Actor</strong>: The admin user who performed the action</li>
                <li><strong>Date Range</strong>: When the action occurred</li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="delta">
            <AccordionTrigger className="text-left">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                Reading Delta Updates
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              <p className="text-muted-foreground">
                The platform uses <strong>delta logging</strong>—only the changed fields are recorded,
                not the entire row. This reduces storage by ~80-90%.
              </p>
              
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium mb-2">Example Delta Entry:</p>
                <pre className="text-xs bg-background p-3 rounded border overflow-x-auto">
{`{
  "status": { "old": "pending", "new": "approved" },
  "approved_at": { "old": null, "new": "2026-01-10T12:00:00Z" },
  "approved_by": { "old": null, "new": "admin-uuid-here" }
}`}
                </pre>
              </div>
              
              <p className="text-sm text-muted-foreground">
                This shows that only <code>status</code>, <code>approved_at</code>, and <code>approved_by</code>
                changed—not the amount, investor_id, or other fields.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </ModuleCard>

      {/* Module 5: Security */}
      <ModuleCard
        icon={Shield}
        title="Module 5: Security & The 'Two-Key' Protocol"
        description="MFA reset flows and the Financial Error Boundary"
        completed={completion.security}
        onComplete={() => markComplete("security")}
        linkTo="/admin/settings"
        linkLabel="Go to Settings"
      >
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="mfa">
            <AccordionTrigger className="text-left">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-primary" />
                MFA Reset Flow (Two-Key Protocol)
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              <Alert variant="destructive" className="border-red-500/50 bg-red-500/5">
                <Lock className="h-4 w-4" />
                <AlertTitle>Critical Security Constraint</AlertTitle>
                <AlertDescription>
                  No single admin can reset a user's MFA. The process requires <strong>two parties</strong>.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-3">
                <StepCard step={1} title="User Initiates Request">
                  The user contacts support and verifies their identity through
                  secondary channels (video call, ID verification, etc.).
                </StepCard>
                
                <StepCard step={2} title="Admin Creates Reset Request">
                  A regular admin creates an MFA reset request in the system,
                  documenting the verification method used.
                </StepCard>
                
                <StepCard step={3} title="Super-Admin Approves">
                  A <strong>Super Admin</strong> reviews the request and provides their
                  "digital signature" (approval) to execute the reset.
                </StepCard>
              </div>
              
              <p className="text-sm text-muted-foreground">
                This prevents social engineering attacks where an attacker impersonates a user
                and convinces a single admin to reset their MFA.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="safe-mode">
            <AccordionTrigger className="text-left">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-primary" />
                Financial Error Boundary (Safe Mode)
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              <p className="text-muted-foreground">
                If the system detects a critical financial error (e.g., a yield distribution that
                doesn't balance), it activates <strong>Safe Mode</strong>.
              </p>
              
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>When You See the Safe Mode Banner</AlertTitle>
                <AlertDescription>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li><strong>STOP</strong> all financial operations immediately</li>
                    <li><strong>REVIEW</strong> the console logs and audit trail</li>
                    <li><strong>ALERT</strong> the Technical Lead immediately</li>
                  </ol>
                </AlertDescription>
              </Alert>
              
              <p className="text-sm text-muted-foreground">
                Safe Mode prevents any further transactions until the error is resolved,
                protecting investor funds from cascading errors.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </ModuleCard>

      {/* Module 6: Warnings */}
      <ModuleCard
        icon={AlertTriangle}
        title="Module 6: Handling Warnings (The Butterfly Effect)"
        description="Understanding yield dependency warnings and cascading impacts"
        completed={completion.warnings}
        onComplete={() => markComplete("warnings")}
        linkTo="/admin/transactions"
        linkLabel="Go to Transactions"
      >
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="yield-dependency">
            <AccordionTrigger className="text-left">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                Yield Dependency Warning
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              <p className="text-muted-foreground">
                When voiding a transaction, the system checks if any yield distributions
                occurred <strong>after</strong> that transaction's date. If so, you'll see:
              </p>
              
              <Alert variant="default" className="border-amber-500/50 bg-amber-500/5">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <AlertTitle>Yield Dependency Warning</AlertTitle>
                <AlertDescription>
                  "3 yield distributions occurred after this transaction. Voiding may require
                  recalculating subsequent yields."
                </AlertDescription>
              </Alert>
              
              <p className="text-muted-foreground">
                <strong>The Butterfly Effect:</strong> If you void a deposit from January 5th,
                all yields calculated on January 6th onwards may have been based on an incorrect
                investor balance. The warning helps you understand the potential impact.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="best-practices">
            <AccordionTrigger className="text-left">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Best Practices for Historical Corrections
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div className="space-y-3">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <h4 className="font-medium text-sm">1. Review Affected Yields</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    The void dialog shows which yield distribution IDs are affected.
                    Note these for potential recalculation.
                  </p>
                </div>
                
                <div className="p-3 bg-muted/50 rounded-lg">
                  <h4 className="font-medium text-sm">2. Assess Materiality</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    If the transaction is small relative to total AUM, the yield impact
                    may be negligible (e.g., $100 on $10M AUM = 0.001% error).
                  </p>
                </div>
                
                <div className="p-3 bg-muted/50 rounded-lg">
                  <h4 className="font-medium text-sm">3. Document Your Decision</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    The void reason field should explain why recalculation was or wasn't
                    performed. This creates an audit trail.
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </ModuleCard>

      {/* Completion Certificate */}
      {completedCount === totalModules && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-6 w-6" />
              Training Complete!
            </CardTitle>
            <CardDescription>
              You have completed all 6 training modules and are now certified to operate
              the INDIGO platform's Sovereign protocols.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-sm py-1 px-3">
                Institutional Admin Certified
              </Badge>
              <span className="text-sm text-muted-foreground">
                Completion tracked locally
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Reference Links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-2">
            <Button variant="outline" asChild className="justify-start">
              <Link to="/admin/yields">
                <TrendingUp className="h-4 w-4 mr-2" />
                Yield Operations
              </Link>
            </Button>
            <Button variant="outline" asChild className="justify-start">
              <Link to="/admin/withdrawals">
                <ArrowDownToLine className="h-4 w-4 mr-2" />
                Withdrawals
              </Link>
            </Button>
            <Button variant="outline" asChild className="justify-start">
              <Link to="/admin/audit-logs">
                <FileText className="h-4 w-4 mr-2" />
                Audit Logs
              </Link>
            </Button>
            <Button variant="outline" asChild className="justify-start">
              <Link to="/admin/transactions">
                <Layers className="h-4 w-4 mr-2" />
                Transactions
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

interface ModuleCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  completed: boolean;
  onComplete: () => void;
  linkTo?: string;
  linkLabel?: string;
  children: React.ReactNode;
}

function ModuleCard({
  icon: Icon,
  title,
  description,
  completed,
  onComplete,
  linkTo,
  linkLabel,
  children,
}: ModuleCardProps) {
  return (
    <Card className={completed ? "border-green-500/30" : ""}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${completed ? "bg-green-500/10" : "bg-primary/10"}`}>
              <Icon className={`h-5 w-5 ${completed ? "text-green-600" : "text-primary"}`} />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {title}
                {completed ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
              </CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
        
        <Separator />
        
        <div className="flex items-center justify-between">
          {linkTo && (
            <Button variant="outline" size="sm" asChild>
              <Link to={linkTo}>
                {linkLabel || "Go to Feature"}
                <ExternalLink className="h-3 w-3 ml-2" />
              </Link>
            </Button>
          )}
          
          {!completed && (
            <Button size="sm" onClick={onComplete} className="ml-auto">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Mark as Complete
            </Button>
          )}
          
          {completed && (
            <Badge variant="outline" className="ml-auto text-green-600 border-green-500/30">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Completed
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface StepCardProps {
  step: number;
  title: string;
  children: React.ReactNode;
}

function StepCard({ step, title, children }: StepCardProps) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
        <span className="text-xs font-semibold text-primary">{step}</span>
      </div>
      <div>
        <h4 className="font-medium text-sm">{title}</h4>
        <p className="text-sm text-muted-foreground mt-0.5">{children}</p>
      </div>
    </div>
  );
}
