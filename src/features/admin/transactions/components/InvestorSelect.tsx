import { useState, Dispatch, SetStateAction } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  Badge,
} from "@/components/ui";
import { cn } from "@/lib/utils";

export interface InvestorOption {
  id: string;
  email: string;
  displayName: string;
  isSystemAccount?: boolean;
}

interface InvestorSelectProps {
  investors: InvestorOption[];
  isLoading: boolean;
  selectedInvestorId: string;
  onSelect: (id: string) => void;
  error?: string | null;
}

export function InvestorSelect({
  investors,
  isLoading,
  selectedInvestorId,
  onSelect,
  error,
}: InvestorSelectProps) {
  const [open, setOpen] = useState(false);
  const selectedInvestor = investors.find((i) => i.id === selectedInvestorId);

  // Format investor display with truncation
  const formatInvestorDisplay = (investor: InvestorOption) => {
    const displayName = investor.displayName;
    const showEmail = displayName !== investor.email;
    return { displayName, email: showEmail ? investor.email : null };
  };

  return (
    <div className="space-y-2">
      <Label>Investor *</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("w-full justify-between", error && "border-destructive")}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="text-muted-foreground">Loading investors...</span>
            ) : selectedInvestor ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-1 min-w-0 max-w-[350px]">
                    <span className="truncate font-medium">{selectedInvestor.displayName}</span>
                    {selectedInvestor.displayName !== selectedInvestor.email && (
                      <span className="text-muted-foreground text-xs truncate max-w-[150px]">
                        ({selectedInvestor.email})
                      </span>
                    )}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[400px]">
                  <p className="font-medium">{selectedInvestor.displayName}</p>
                  {selectedInvestor.displayName !== selectedInvestor.email && (
                    <p className="text-sm text-muted-foreground">{selectedInvestor.email}</p>
                  )}
                </TooltipContent>
              </Tooltip>
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
                {investors.map((investor) => {
                  const { displayName, email } = formatInvestorDisplay(investor);
                  return (
                    <CommandItem
                      key={investor.id}
                      value={`${investor.displayName} ${investor.email}`}
                      onSelect={() => {
                        onSelect(investor.id);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          selectedInvestorId === investor.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate">{displayName}</span>
                          {investor.isSystemAccount && (
                            <Badge variant="outline" className="text-[9px] h-4 px-1 shrink-0">
                              System
                            </Badge>
                          )}
                        </div>
                        {email && (
                          <span className="text-xs text-muted-foreground truncate">{email}</span>
                        )}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
