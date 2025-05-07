
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
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Asset } from "@/types/investorTypes";

// Define the schema for our form
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
  // Add additional fields for asset balances
  btc_balance: z.string().optional(),
  eth_balance: z.string().optional(),
  sol_balance: z.string().optional(),
  usdc_balance: z.string().optional(),
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
  defaultValues = {}
}) => {
  const form = useForm<InvestorFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      first_name: "",
      last_name: "",
      btc_balance: "0",
      eth_balance: "0",
      sol_balance: "0",
      usdc_balance: "0",
      ...defaultValues
    },
  });

  // Get the asset symbols for our supported assets
  const assetSymbols = assets.map(asset => asset.symbol.toLowerCase());
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="investor@example.com" {...field} />
                </FormControl>
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

        <div className="pt-4 border-t">
          <h3 className="text-lg font-medium mb-4">Initial Balances</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {assetSymbols.includes('btc') && (
              <FormField
                control={form.control}
                name="btc_balance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>BTC Balance</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.00000001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {assetSymbols.includes('eth') && (
              <FormField
                control={form.control}
                name="eth_balance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ETH Balance</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.00000001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {assetSymbols.includes('sol') && (
              <FormField
                control={form.control}
                name="sol_balance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SOL Balance</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.00000001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {assetSymbols.includes('usdc') && (
              <FormField
                control={form.control}
                name="usdc_balance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>USDC Balance</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
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
