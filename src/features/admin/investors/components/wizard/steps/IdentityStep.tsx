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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  EmailChipsInput,
} from "@/components/ui";
import { useWizard } from "../WizardContext";
import { identitySchema } from "../types";

type IdentityFormValues = z.infer<typeof identitySchema>;

const IdentityStep: React.FC = () => {
  const { data, updateData, setCanProceed } = useWizard();

  const form = useForm<IdentityFormValues>({
    resolver: zodResolver(identitySchema),
    defaultValues: data.identity,
    mode: "onChange",
  });

  const { isValid, isDirty } = form.formState;

  useEffect(() => {
    // Allow proceeding if form is valid
    setCanProceed(isValid);
  }, [isValid, setCanProceed]);

  useEffect(() => {
    const subscription = form.watch((value) => {
      if (value) {
        updateData("identity", value as IdentityFormValues);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, updateData]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Investor Identity</h3>
        <p className="text-sm text-muted-foreground">
          Enter the basic information for the new investor
        </p>
      </div>

      <Form {...form}>
        <form className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account Email *</FormLabel>
                <FormControl>
                  <Input placeholder="investor@example.com" {...field} />
                </FormControl>
                <FormDescription>Used for login and account access</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="first_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="John" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="last_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="entity_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Investor Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="entity">Entity / Company</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Report Recipients */}
          <div className="pt-4 border-t">
            <FormItem>
              <FormLabel>Report Recipients (Optional)</FormLabel>
              <FormControl>
                <EmailChipsInput
                  value={data.reportEmails}
                  onChange={(emails) => updateData("reportEmails", emails)}
                  placeholder="Add email and press Enter"
                />
              </FormControl>
              <FormDescription>
                These emails will receive monthly investment reports. Leave empty to use account
                email.
              </FormDescription>
            </FormItem>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default IdentityStep;
