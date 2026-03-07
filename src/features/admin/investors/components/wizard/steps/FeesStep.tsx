import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
  Input,
  Switch,
  Label,
} from "@/components/ui";
import { Link2, Link2Off } from "lucide-react";
import { useWizard } from "../WizardContext";
import { feesSchema } from "../types";

type FeesFormValues = z.infer<typeof feesSchema>;

const FeesStep: React.FC = () => {
  const { data, updateData, setCanProceed } = useWizard();

  const form = useForm<FeesFormValues>({
    resolver: zodResolver(feesSchema),
    defaultValues: data.fees,
    mode: "onChange",
  });

  const { isValid } = form.formState;
  const ibEnabled = data.ib.enabled;
  const linkFees = form.watch("link_fees");
  const investorFeePct = form.watch("investor_fee_pct");

  useEffect(() => {
    setCanProceed(isValid);
  }, [isValid, setCanProceed]);

  // Sync IB commission with investor fee when linked
  useEffect(() => {
    if (linkFees && ibEnabled) {
      form.setValue("ib_commission_pct", investorFeePct);
    }
  }, [linkFees, investorFeePct, ibEnabled, form]);

  useEffect(() => {
    const subscription = form.watch((value) => {
      if (value) {
        updateData("fees", value as FeesFormValues);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, updateData]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Fee Configuration</h3>
        <p className="text-sm text-muted-foreground">
          Set the performance fee percentage for this investor
        </p>
      </div>

      <Form {...form}>
        <form className="space-y-6">
          {/* Investor Fee */}
          <FormField
            control={form.control}
            name="investor_fee_pct"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Investor Performance Fee (%)</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      className="pr-8"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      %
                    </span>
                  </div>
                </FormControl>
                <FormDescription>
                  Percentage of yield allocated as INDIGO Fees (typically 20%)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* IB Commission Section */}
          {ibEnabled && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
              <h4 className="font-medium">IB Commission</h4>

              {/* Link Toggle */}
              <FormField
                control={form.control}
                name="link_fees"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between space-y-0">
                    <div className="flex items-center gap-2">
                      {field.value ? (
                        <Link2 className="h-4 w-4 text-primary" />
                      ) : (
                        <Link2Off className="h-4 w-4 text-muted-foreground" />
                      )}
                      <Label>Link IB Commission to Investor Fee</Label>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* IB Commission Input */}
              <FormField
                control={form.control}
                name="ib_commission_pct"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IB Commission (%)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          className="pr-8"
                          disabled={linkFees}
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          %
                        </span>
                      </div>
                    </FormControl>
                    <FormDescription>
                      {linkFees
                        ? "IB commission is synced with investor fee"
                        : "Percentage of investor's net yield allocated to IB"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* Summary */}
          <div className="p-4 border rounded-lg bg-accent/10">
            <h4 className="font-medium mb-2">Fee Summary</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">INDIGO Fee:</span>
                <span className="font-medium">{form.watch("investor_fee_pct")}%</span>
              </div>
              {ibEnabled && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IB Commission:</span>
                  <span className="font-medium">{form.watch("ib_commission_pct")}%</span>
                </div>
              )}
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default FeesStep;
