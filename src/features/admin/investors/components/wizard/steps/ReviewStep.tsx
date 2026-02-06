import React, { useEffect, useState } from "react";
import { useWizard } from "../WizardContext";
import { profileService } from "@/services/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge } from "@/components/ui";
import { User, Users, Percent, CheckCircle2 } from "lucide-react";

const ReviewStep: React.FC = () => {
  const { data, setCanProceed } = useWizard();
  const [ibName, setIbName] = useState<string | null>(null);

  useEffect(() => {
    setCanProceed(true);
  }, [setCanProceed]);

  // Fetch IB name if existing IB selected
  useEffect(() => {
    const fetchIBName = async () => {
      if (data.ib.existingIbId) {
        const profile = await profileService.getProfileById(data.ib.existingIbId);

        if (profile) {
          setIbName(`${profile.first_name} ${profile.last_name}`);
        }
      } else if (data.ib.createNewIb && data.ib.newIb) {
        setIbName(`${data.ib.newIb.first_name} ${data.ib.newIb.last_name} (NEW)`);
      } else {
        setIbName(null);
      }
    };

    fetchIBName();
  }, [data.ib]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Review & Create</h3>
        <p className="text-sm text-muted-foreground">
          Review all details before creating the investor account
        </p>
      </div>

      <div className="grid gap-4">
        {/* Identity Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              Identity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name:</span>
              <span className="font-medium">
                {data.identity.first_name} {data.identity.last_name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email:</span>
              <span className="font-medium">{data.identity.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type:</span>
              <Badge variant="outline" className="capitalize">
                {data.identity.entity_type}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <Badge
                variant={data.identity.status === "active" ? "default" : "secondary"}
                className="capitalize"
              >
                {data.identity.status}
              </Badge>
            </div>
            {data.reportEmails.length > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Report Recipients:</span>
                <span className="font-medium text-right">{data.reportEmails.join(", ")}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* IB Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              Introducing Broker
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {data.ib.enabled ? (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IB Status:</span>
                  <Badge variant="default">Linked</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IB:</span>
                  <span className="font-medium">{ibName}</span>
                </div>
                {data.ib.createNewIb && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">New IB Email:</span>
                    <span className="font-medium">{data.ib.newIb?.email}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex justify-between">
                <span className="text-muted-foreground">IB Status:</span>
                <Badge variant="secondary">Not Linked</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fees Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Percent className="h-4 w-4" />
              Fee Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Platform Fee:</span>
              <span className="font-medium">{data.fees.investor_fee_pct}%</span>
            </div>
            {data.ib.enabled && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">IB Commission:</span>
                <span className="font-medium">{data.fees.ib_commission_pct}%</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confirmation */}
      <div className="flex items-center gap-2 p-4 bg-accent/10 border border-accent rounded-lg">
        <CheckCircle2 className="h-5 w-5 text-primary" />
        <p className="text-sm">
          Click <strong>Create Investor</strong> to proceed. This will create the account, set up
          positions, and configure fee schedules.
        </p>
      </div>
    </div>
  );
};

export default ReviewStep;
