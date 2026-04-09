import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Input,
  Button,
  Switch,
  Label,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui";
import { Check, ChevronsUpDown, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWizard } from "../WizardContext";
import { ibSchema } from "../types";
import { useIBUsers } from "@/features/admin/ib/hooks/useIBUsers";
const newIbSchema = z.object({
  email: z.string().email("Valid email required"),
  first_name: z.string().min(1, "First name required"),
  last_name: z.string().min(1, "Last name required"),
});

const IBStep: React.FC = () => {
  const { data, updateData, setCanProceed } = useWizard();
  const [open, setOpen] = useState(false);

  // Use React Query hook for fetching IB users
  const { data: ibUsers = [], isLoading: isLoadingIBs } = useIBUsers();

  const newIbForm = useForm<z.infer<typeof newIbSchema>>({
    resolver: zodResolver(newIbSchema),
    defaultValues: {
      email: data.ib.newIb?.email || "",
      first_name: data.ib.newIb?.first_name || "",
      last_name: data.ib.newIb?.last_name || "",
    },
  });

  // Validate step
  useEffect(() => {
    if (!data.ib.enabled) {
      setCanProceed(true);
      return;
    }

    if (data.ib.existingIbId) {
      setCanProceed(true);
      return;
    }

    if (
      data.ib.createNewIb &&
      data.ib.newIb?.email &&
      data.ib.newIb?.first_name &&
      data.ib.newIb?.last_name
    ) {
      setCanProceed(true);
      return;
    }

    setCanProceed(false);
  }, [data.ib, setCanProceed]);

  const handleIBToggle = (enabled: boolean) => {
    updateData("ib", {
      ...data.ib,
      enabled,
      existingIbId: enabled ? data.ib.existingIbId : null,
      createNewIb: false,
    });

    // Reset IB commission if IB is disabled
    if (!enabled) {
      updateData("fees", {
        ...data.fees,
        ib_commission_pct: 0,
      });
    }
  };

  const handleSelectIB = (ibId: string) => {
    updateData("ib", {
      ...data.ib,
      existingIbId: ibId,
      createNewIb: false,
      newIb: undefined,
    });
    setOpen(false);
  };

  const handleCreateNewToggle = (create: boolean) => {
    updateData("ib", {
      ...data.ib,
      createNewIb: create,
      existingIbId: create ? null : data.ib.existingIbId,
    });
  };

  const handleNewIBChange = (field: keyof z.infer<typeof newIbSchema>, value: string) => {
    updateData("ib", {
      ...data.ib,
      newIb: {
        ...data.ib.newIb,
        [field]: value,
      },
    });
  };

  const selectedIB = ibUsers.find((ib) => ib.id === data.ib.existingIbId);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Introducing Broker (IB)</h3>
        <p className="text-sm text-muted-foreground">
          Link this investor to an Introducing Broker for commission sharing
        </p>
      </div>

      {/* IB Toggle */}
      <div className="flex items-center space-x-3 p-4 border rounded-lg bg-muted/30">
        <Switch id="ib-enabled" checked={data.ib.enabled} onCheckedChange={handleIBToggle} />
        <Label htmlFor="ib-enabled" className="font-medium">
          Investor comes via IB
        </Label>
      </div>

      {data.ib.enabled && (
        <div className="space-y-6 pt-4">
          {/* Select Existing IB */}
          {!data.ib.createNewIb && (
            <div className="space-y-2">
              <Label>Select Existing IB</Label>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                  >
                    {isLoadingIBs ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading IBs...
                      </span>
                    ) : selectedIB ? (
                      <span>
                        {selectedIB.first_name} {selectedIB.last_name} ({selectedIB.email})
                      </span>
                    ) : (
                      "Select an IB..."
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search IBs..." />
                    <CommandList>
                      <CommandEmpty>No IB found.</CommandEmpty>
                      <CommandGroup>
                        {ibUsers.map((ib) => (
                          <CommandItem
                            key={ib.id}
                            value={`${ib.first_name} ${ib.last_name} ${ib.email}`}
                            onSelect={() => handleSelectIB(ib.id)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                data.ib.existingIbId === ib.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {ib.first_name} {ib.last_name}
                              </span>
                              <span className="text-xs text-muted-foreground">{ib.email}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 border-t" />
            <span className="text-sm text-muted-foreground">OR</span>
            <div className="flex-1 border-t" />
          </div>

          {/* Create New IB Toggle */}
          <div className="flex items-center space-x-3">
            <Switch
              id="create-new-ib"
              checked={data.ib.createNewIb}
              onCheckedChange={handleCreateNewToggle}
            />
            <Label htmlFor="create-new-ib">Create New IB</Label>
          </div>

          {/* New IB Form */}
          {data.ib.createNewIb && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
              <h4 className="font-medium flex items-center gap-2">
                <Plus className="h-4 w-4" />
                New IB Details
              </h4>

              <div className="space-y-4">
                <div>
                  <Label>Email *</Label>
                  <Input
                    placeholder="ib@example.com"
                    value={data.ib.newIb?.email || ""}
                    onChange={(e) => handleNewIBChange("email", e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>First Name *</Label>
                    <Input
                      placeholder="Jane"
                      value={data.ib.newIb?.first_name || ""}
                      onChange={(e) => handleNewIBChange("first_name", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Last Name *</Label>
                    <Input
                      placeholder="Smith"
                      value={data.ib.newIb?.last_name || ""}
                      onChange={(e) => handleNewIBChange("last_name", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                A new IB account will be created with the 'ib' role when you submit the wizard.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default IBStep;
