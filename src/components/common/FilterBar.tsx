import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface FilterBarProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Standard filter layout container.
 * Renders children in a flex-wrap row with consistent spacing.
 * Use FilterBar.Search for the search input and FilterBar.Count for the result count.
 */
export function FilterBar({ children, className }: FilterBarProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3",
        className
      )}
    >
      {children}
    </div>
  );
}

interface FilterSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

FilterBar.Search = function FilterSearch({
  value,
  onChange,
  placeholder = "Search...",
  className,
}: FilterSearchProps) {
  return (
    <div className={cn("relative flex-1 min-w-[200px]", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9 h-9"
      />
    </div>
  );
};

interface FilterCountProps {
  filtered: number;
  total: number;
  label?: string;
}

FilterBar.Count = function FilterCount({ filtered, total, label = "results" }: FilterCountProps) {
  if (filtered === total) {
    return (
      <span className="text-xs text-muted-foreground whitespace-nowrap ml-auto">
        {total} {label}
      </span>
    );
  }
  return (
    <span className="text-xs text-muted-foreground whitespace-nowrap ml-auto">
      {filtered} of {total}
    </span>
  );
};

interface FilterResetProps {
  onClick: () => void;
  visible?: boolean;
}

FilterBar.Reset = function FilterReset({ onClick, visible = true }: FilterResetProps) {
  if (!visible) return null;
  return (
    <Button variant="ghost" size="sm" onClick={onClick} className="h-9 text-xs">
      <X className="h-3.5 w-3.5 mr-1" />
      Clear
    </Button>
  );
};

export default FilterBar;
