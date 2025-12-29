import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { toast } from "sonner";
import { Loader2, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAssetLogo, formatAssetAmount } from "@/utils/assets";
import { useInvestorOptions, useInvestorPositions } from "@/hooks/data/useWithdrawalFormData";
import { useWithdrawalMutations } from "@/hooks/data/useWithdrawalMutations";

const withdrawalSchema = z.object({
  amount: z
    .string()
    .trim()
    .min(1, "Amount is required")
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: "Amount must be a positive number",
    }),
  withdrawal_type: z.enum(["partial", "full"], {
    required_error: "Withdrawal type is required",
  }),
  notes: z.string().trim().max(1000, "Notes must be less than 1000 characters").optional(),
});

type WithdrawalFormData = z.infer<typeof withdrawalSchema>;

interface CreateWithdrawalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  preselectedInvestorId?: string;
}

export function CreateWithdrawalDialog({
  open,
  onOpenChange,
  onSuccess,
  preselectedInvestorId,
}: CreateWithdrawalDialogProps) {
  const [selectedInvestorId, setSelectedInvestorId] = useState<string>("");
  const [investorSearchOpen, setInvestorSearchOpen] = useState(false);
  const [selectedFundId, setSelectedFundId] = useState<string>("");
  const [investorError, setInvestorError] = useState<string | null>(null);
  const [fundError, setFundError] = useState<string | null>(null);

  // Data hooks
  const { data: investors = [], isLoading: isLoadingInvestors } = useInvestorOptions(open);
  const { data: positions = [], isLoading: isLoadingPositions } = useInvestorPositions(selectedInvestorId || null);
  
  // Mutation hook
  const { createMutation } = useWithdrawalMutations();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<WithdrawalFormData>({
    resolver: zodResolver(withdrawalSchema),
    defaultValues: {
      withdrawal_type: "partial",
    },
  });

  const withdrawalType = watch("withdrawal_type");

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      if (preselectedInvestorId) {
        setSelectedInvestorId(preselectedInvestorId);
      } else {
        setSelectedInvestorId("");
      }
      setSelectedFundId("");
      setInvestorError(null);
      setFundError(null);
      reset();
    }
  }, [open, preselectedInvestorId, reset]);

  // Auto-select first position when investor changes and has only one position
  useEffect(() => {
    if (positions.length === 1) {
      setSelectedFundId(positions[0].fund_id);
    } else if (!selectedInvestorId) {
      setSelectedFundId("");
    }
  }, [positions, selectedInvestorId]);

  const selectedInvestor = investors.find((i) => i.id === selectedInvestorId);
  const selectedPosition = positions.find((p) => p.fund_id === selectedFundId);

  const onSubmit = async (data: WithdrawalFormData) => {
    // Validate investor selection
    if (!selectedInvestorId) {
      setInvestorError("Please select an investor");
      return;
    }
    setInvestorError(null);

    // Validate fund selection
    if (!selectedFundId) {
      setFundError("Please select a fund position");
      return;
    }
    setFundError(null);

    const amount = Number(data.amount);

    // Check if amount exceeds position value
    if (selectedPosition && amount > selectedPosition.current_value) {
      toast.error(
        `Amount exceeds available balance: ${formatAssetAmount(
          selectedPosition.current_value,
          selectedPosition.fund.asset
        )}`
      );
      return;
    }

    createMutation.mutate(
      {
        investorId: selectedInvestorId,
        fundId: selectedFundId,
        amount,
        withdrawalType: data.withdrawal_type,
        notes: data.notes,
      },
      {
        onSuccess: () => {
          reset();
          setSelectedInvestorId("");
          setSelectedFundId("");
          onSuccess();
          onOpenChange(false);
        },
      }
    );
  };

  const handleCancel = () => {
    reset();
    setSelectedInvestorId("");
    setSelectedFundId("");
    setInvestorError(null);
    setFundError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Withdrawal Request</DialogTitle>
          <DialogDescription>
            Create a withdrawal request on behalf of an investor.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Investor Selector */}
          <div className="space-y-2">
            <Label>Investor *</Label>
            <Popover open={investorSearchOpen} onOpenChange={setInvestorSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={investorSearchOpen}
                  className={cn(
                    "w-full justify-between",
                    investorError && "border-destructive"
                  )}
                  disabled={isLoadingInvestors}
                >
                  {isLoadingInvestors ? (
                    <span className="text-muted-foreground">Loading investors...</span>
                  ) : selectedInvestor ? (
                    <span className="truncate">
                      {selectedInvestor.displayName}
                      {selectedInvestor.displayName !== selectedInvestor.email && (
                        <span className="ml-1 text-muted-foreground">
                          ({selectedInvestor.email})
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Select investor...</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search by name or email..." />
                  <CommandList>
                    <CommandEmpty>No investor found.</CommandEmpty>
                    <CommandGroup>
                      {investors.map((investor) => (
                        <CommandItem
                          key={investor.id}
                          value={`${investor.displayName} ${investor.email}`}
                          onSelect={() => {
                            setSelectedInvestorId(investor.id);
                            setSelectedFundId("");
                            setInvestorError(null);
                            setInvestorSearchOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedInvestorId === investor.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span>{investor.displayName}</span>
                            {investor.displayName !== investor.email && (
                              <span className="text-xs text-muted-foreground">
                                {investor.email}
                              </span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {investorError && <p className="text-sm text-destructive">{investorError}</p>}
          </div>

          {/* Fund Position Selector */}
          <div className="space-y-2">
            <Label>Fund Position *</Label>
            <Select
              value={selectedFundId}
              onValueChange={(value) => {
                setSelectedFundId(value);
                setFundError(null);
              }}
              disabled={!selectedInvestorId || isLoadingPositions}
            >
              <SelectTrigger className={fundError ? "border-destructive" : ""}>
                <SelectValue
                  placeholder={
                    isLoadingPositions
                      ? "Loading positions..."
                      : !selectedInvestorId
                      ? "Select an investor first"
                      : positions.length === 0
                      ? "No positions with balance"
                      : "Select fund position"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {positions.map((position) => (
                  <SelectItem key={position.fund_id} value={position.fund_id}>
                    <div className="flex items-center gap-2">
                      <img
                        src={getAssetLogo(position.fund.asset)}
                        alt={position.fund.asset}
                        className="h-5 w-5 rounded-full"
                      />
                      <span>
                        {position.fund.name} -{" "}
                        {formatAssetAmount(position.current_value, position.fund.asset)} available
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fundError && <p className="text-sm text-destructive">{fundError}</p>}
            {selectedPosition && (
              <p className="text-sm text-muted-foreground">
                Maximum withdrawal:{" "}
                {formatAssetAmount(selectedPosition.current_value, selectedPosition.fund.asset)}
              </p>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">
              Amount ({selectedPosition?.fund.asset || "Select fund"}) *
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.00000001"
              placeholder="0.00"
              {...register("amount")}
              className={errors.amount ? "border-destructive" : ""}
              disabled={!selectedFundId}
            />
            {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
          </div>

          {/* Withdrawal Type */}
          <div className="space-y-2">
            <Label>Withdrawal Type *</Label>
            <Select
              value={withdrawalType}
              onValueChange={(value) => setValue("withdrawal_type", value as "partial" | "full")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select withdrawal type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="partial">Partial Withdrawal</SelectItem>
                <SelectItem value="full">Full Withdrawal</SelectItem>
              </SelectContent>
            </Select>
            {errors.withdrawal_type && (
              <p className="text-sm text-destructive">{errors.withdrawal_type.message}</p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this withdrawal request"
              {...register("notes")}
              className={errors.notes ? "border-destructive" : ""}
              rows={3}
            />
            {errors.notes && <p className="text-sm text-destructive">{errors.notes.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || isLoadingInvestors || isLoadingPositions || positions.length === 0}
            >
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Withdrawal
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
