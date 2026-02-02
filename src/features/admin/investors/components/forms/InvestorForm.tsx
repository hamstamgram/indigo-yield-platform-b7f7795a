import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
  Input,
  Button,
  EmailChipsInput,
} from "@/components/ui";
import { AssetRef as Asset } from "@/types/asset";
import { getAssetLogo } from "@/utils/assets";

// Define the schema for our form with non-negative balance validation
const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address",
  }),
  first_name: z.string().min(1, {
    message: "First name is required",
  }),
  last_name: z.string().min(1, {
    message: "Last name is required",
  }),
  // Report recipient emails (optional array)
  report_emails: z.array(z.string().email()).default([]),
  // Dynamic balances record: key is asset symbol, value is balance string
  // Must be empty string OR a valid non-negative number
  balances: z.record(
    z
      .string()
      .refine((val) => val === "" || (!isNaN(Number(val)) && Number(val) >= 0), {
        message: "Must be a non-negative number",
      })
  ),
});

export type InvestorFormValues = z.infer<typeof formSchema>;

interface InvestorFormProps {
  onSubmit: (values: InvestorFormValues) => void;
  isLoading: boolean;
  assets: Asset[];
  defaultValues?: Partial<InvestorFormValues>;
}

const InvestorForm: React.FC<InvestorFormProps> = ({
  onSubmit,
  isLoading,
  assets,
  defaultValues = {},
}) => {
  const form = useForm<InvestorFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      first_name: "",
      last_name: "",
      report_emails: [],
      balances: {},
      ...defaultValues,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Account Email</FormLabel>
                <FormControl>
                  <Input placeholder="investor@example.com" {...field} />
                </FormControl>
                <FormDescription>Used for login and account access</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="first_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input placeholder="First Name" {...field} />
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
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input placeholder="Last Name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Report Recipients Section */}
        <div className="pt-4 border-t">
          <FormField
            control={form.control}
            name="report_emails"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Report Recipients</FormLabel>
                <FormControl>
                  <EmailChipsInput
                    value={field.value || []}
                    onChange={field.onChange}
                    placeholder="Add email and press Enter"
                  />
                </FormControl>
                <FormDescription>
                  These emails will receive monthly investment reports. Leave empty to use account
                  email.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="pt-4 border-t">
          <h3 className="text-lg font-medium mb-4">Initial Balances</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {assets.map((asset) => (
              <FormField
                key={asset.id}
                control={form.control}
                name={`balances.${asset.symbol}`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <img
                        src={getAssetLogo(asset.symbol)}
                        alt={asset.symbol}
                        className="w-4 h-4 rounded-full"
                      />
                      {asset.name} ({asset.symbol})
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.00000001"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value)} // Handle number input as string
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </div>
        </div>

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? "Saving..." : "Save Investor"}
        </Button>
      </form>
    </Form>
  );
};

export default InvestorForm;
