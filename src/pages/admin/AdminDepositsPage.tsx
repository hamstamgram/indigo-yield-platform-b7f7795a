import { useState } from "react";
import { Button } from "@/components/ui";
import { Plus } from "lucide-react";
import { DepositStats, DepositsTable, CreateDepositDialog } from "@/components/admin";
import type { DepositFilters } from "@/types/domains";

export default function AdminDepositsPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  // Shared filter state - lifted to parent for consistency between stats and table
  const [filters, setFilters] = useState<DepositFilters>({});

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Deposit Management</h1>
          <p className="text-muted-foreground mt-1">Track and approve crypto and bank deposits</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Deposit
        </Button>
      </div>

      {/* Stats now receives same filters as table */}
      <DepositStats filters={filters} />

      {/* Table with filter controls - callbacks update shared state */}
      <DepositsTable filters={filters} onFiltersChange={setFilters} />

      <CreateDepositDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </div>
  );
}