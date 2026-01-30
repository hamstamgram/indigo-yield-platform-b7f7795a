import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui";
import {
  Users,
  LayoutDashboard,
  FileText,
  Settings,
  TrendingUp,
  Wallet,
  ArrowUpCircle,
  Mail,
  Shield,
  Search,
  Clock,
  Calculator,
} from "lucide-react";
import { useKeyboardShortcuts, SHORTCUTS, formatShortcut } from "@/hooks";
import { useAuth } from "@/services/auth";
import { useCommandPaletteInvestors } from "@/hooks/data/admin";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SearchResult {
  id: string;
  type: "investor" | "page" | "action";
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  href?: string;
  action?: () => void;
}

const ADMIN_PAGES: SearchResult[] = [
  { id: "dashboard", type: "page", title: "Dashboard", subtitle: "Overview & metrics", icon: <LayoutDashboard className="h-4 w-4" />, href: "/admin" },
  { id: "investors", type: "page", title: "Investors", subtitle: "Manage investors", icon: <Users className="h-4 w-4" />, href: "/admin/investors" },
  { id: "withdrawals", type: "page", title: "Withdrawals", subtitle: "Withdrawal requests", icon: <ArrowUpCircle className="h-4 w-4" />, href: "/admin/withdrawals" },
  { id: "reports", type: "page", title: "Investor Reports", subtitle: "Generate & send reports", icon: <FileText className="h-4 w-4" />, href: "/admin/investor-reports" },
  { id: "monthly-data", type: "page", title: "Monthly Data Entry", subtitle: "Fund AUM & yields", icon: <Calculator className="h-4 w-4" />, href: "/admin/monthly-data-entry" },
  { id: "rates", type: "page", title: "Daily Rates", subtitle: "Asset prices", icon: <TrendingUp className="h-4 w-4" />, href: "/admin/rates" },
  { id: "transactions", type: "page", title: "Transactions", subtitle: "All transactions", icon: <Wallet className="h-4 w-4" />, href: "/admin/transactions" },
  { id: "email-tracking", type: "page", title: "Email Tracking", subtitle: "Email delivery logs", icon: <Mail className="h-4 w-4" />, href: "/admin/email-tracking" },
  { id: "system-health", type: "page", title: "System Health", subtitle: "Platform status", icon: <Shield className="h-4 w-4" />, href: "/admin/system-health" },
  { id: "settings", type: "page", title: "Settings", subtitle: "Admin settings", icon: <Settings className="h-4 w-4" />, href: "/admin/settings" },
];

const INVESTOR_PAGES: SearchResult[] = [
  { id: "dashboard", type: "page", title: "Dashboard", subtitle: "Your portfolio", icon: <LayoutDashboard className="h-4 w-4" />, href: "/dashboard" },
  { id: "statements", type: "page", title: "Statements", subtitle: "Monthly statements", icon: <FileText className="h-4 w-4" />, href: "/statements" },
  { id: "withdraw", type: "page", title: "Withdraw", subtitle: "Request withdrawal", icon: <ArrowUpCircle className="h-4 w-4" />, href: "/withdraw" },
  { id: "profile", type: "page", title: "Profile", subtitle: "Your profile", icon: <Users className="h-4 w-4" />, href: "/profile" },
  { id: "settings", type: "page", title: "Settings", subtitle: "Account settings", icon: <Settings className="h-4 w-4" />, href: "/settings" },
];

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState("");
  const [recentItems, setRecentItems] = useState<string[]>([]);

  // Use React Query hook for fetching investors
  const { data: investorData = [] } = useCommandPaletteInvestors(isAdmin, open);

  // Transform investor data to search results
  const investors: SearchResult[] = useMemo(() => {
    return investorData.map((inv) => ({
      id: inv.id,
      type: "investor" as const,
      title: `${inv.first_name || ""} ${inv.last_name || ""}`.trim() || inv.email,
      subtitle: inv.email,
      icon: <Users className="h-4 w-4" />,
      href: `/admin/investors/${inv.id}`,
    }));
  }, [investorData]);

  // Load recent items from localStorage
  useEffect(() => {
    const recent = localStorage.getItem("commandPaletteRecent");
    if (recent) {
      setRecentItems(JSON.parse(recent));
    }
  }, [open]);

  const pages = isAdmin ? ADMIN_PAGES : INVESTOR_PAGES;

  // Filter results based on search
  const filteredResults = useMemo(() => {
    if (!search) return { pages: pages.slice(0, 5), investors: [], actions: [] };

    const searchLower = search.toLowerCase();
    
    const filteredPages = pages.filter(
      (p) =>
        p.title.toLowerCase().includes(searchLower) ||
        p.subtitle?.toLowerCase().includes(searchLower)
    );

    const filteredInvestors = investors.filter(
      (i) =>
        i.title.toLowerCase().includes(searchLower) ||
        i.subtitle?.toLowerCase().includes(searchLower)
    );

    return {
      pages: filteredPages,
      investors: filteredInvestors.slice(0, 5),
      actions: [],
    };
  }, [search, pages, investors]);

  // Recent items filtered
  const recentResults = useMemo(() => {
    if (search) return [];
    return [...pages, ...investors].filter((item) => recentItems.includes(item.id)).slice(0, 3);
  }, [recentItems, pages, investors, search]);

  const handleSelect = (item: SearchResult) => {
    // Save to recent
    const newRecent = [item.id, ...recentItems.filter((id) => id !== item.id)].slice(0, 5);
    localStorage.setItem("commandPaletteRecent", JSON.stringify(newRecent));
    setRecentItems(newRecent);

    onOpenChange(false);
    setSearch("");

    if (item.href) {
      navigate(item.href);
    } else if (item.action) {
      item.action();
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <Command className="rounded-lg border shadow-md">
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <input
            className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Search investors, pages, actions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
            ESC
          </kbd>
        </div>
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {/* Recent Items */}
          {recentResults.length > 0 && (
            <CommandGroup heading="Recent">
              {recentResults.map((item) => (
                <CommandItem
                  key={`recent-${item.id}`}
                  onSelect={() => handleSelect(item)}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span>{item.title}</span>
                    {item.subtitle && (
                      <span className="text-xs text-muted-foreground">{item.subtitle}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Pages */}
          {filteredResults.pages.length > 0 && (
            <CommandGroup heading="Pages">
              {filteredResults.pages.map((page) => (
                <CommandItem
                  key={page.id}
                  onSelect={() => handleSelect(page)}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  {page.icon}
                  <div className="flex flex-col">
                    <span>{page.title}</span>
                    {page.subtitle && (
                      <span className="text-xs text-muted-foreground">{page.subtitle}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Investors (Admin only) */}
          {isAdmin && filteredResults.investors.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Investors">
                {filteredResults.investors.map((investor) => (
                  <CommandItem
                    key={investor.id}
                    onSelect={() => handleSelect(investor)}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    {investor.icon}
                    <div className="flex flex-col">
                      <span>{investor.title}</span>
                      {investor.subtitle && (
                        <span className="text-xs text-muted-foreground">{investor.subtitle}</span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {/* Keyboard Shortcuts Hint */}
          <div className="px-2 py-3 text-xs text-muted-foreground border-t">
            <div className="flex items-center justify-between">
              <span>Quick actions:</span>
              <div className="flex gap-2">
                <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">
                  {formatShortcut(SHORTCUTS.COMMAND_PALETTE)}
                </kbd>
                <span>Search</span>
              </div>
            </div>
          </div>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
