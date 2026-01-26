import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input, Badge, PageLoadingSpinner, EmptyState } from "@/components/ui";
import { formatAssetAmount } from "@/utils/assets";
import { format } from "date-fns";
import {
  Search,
  Users,
  ChevronRight,
  ChevronLeft,
  UserPlus,
  Mail,
  Calendar,
  Wallet,
} from "lucide-react";
import { useIBReferrals } from "@/hooks/data/shared";
import { CryptoIcon } from "@/components/CryptoIcons";

const PAGE_SIZE = 10;

export default function IBReferralsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const { data, isLoading } = useIBReferrals(page, PAGE_SIZE);

  const filteredReferrals =
    data?.referrals.filter((r) => {
      if (!search) return true;
      const searchLower = search.toLowerCase();
      const fullName = `${r.firstName || ""} ${r.lastName || ""}`.toLowerCase();
      return fullName.includes(searchLower) || r.email.toLowerCase().includes(searchLower);
    }) || [];

  const totalPages = Math.ceil((data?.total || 0) / PAGE_SIZE);

  if (isLoading) {
    return <PageLoadingSpinner />;
  }

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-1">
        <div>
          <h1 className="text-4xl font-display font-bold tracking-tight text-white flex items-center gap-3">
            Client Roster
            <Badge
              variant="outline"
              className="ml-2 bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
            >
              {data?.total || 0} Total
            </Badge>
          </h1>
          <p className="text-slate-400 mt-2 text-lg">
            Manage your referred investors and track their activity
          </p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-black/20 border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-500/50 focus:ring-0 rounded-full"
          />
        </div>
      </div>

      <div className="glass-panel rounded-3xl border border-white/5 bg-white/[0.02] overflow-hidden min-h-[500px]">
        {filteredReferrals.length > 0 ? (
          <div className="divide-y divide-white/5">
            {/* Table Header-ish (Hidden on mobile, visible on desktop) */}
            <div className="hidden md:grid grid-cols-12 gap-4 p-4 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 bg-black/20">
              <div className="col-span-4 pl-2">Investor</div>
              <div className="col-span-2">Joined</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-3">Active Holdings</div>
              <div className="col-span-1"></div>
            </div>

            {filteredReferrals.map((referral) => (
              <div
                key={referral.id}
                className="group relative md:grid md:grid-cols-12 gap-4 p-4 items-center hover:bg-white/5 transition-colors cursor-pointer"
                onClick={() => navigate(`/ib/referrals/${referral.id}`)}
              >
                {/* Investor Info */}
                <div className="col-span-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold shrink-0">
                    {(referral.firstName?.[0] || referral.email[0]).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-white text-base">
                      {referral.firstName || referral.lastName
                        ? `${referral.firstName || ""} ${referral.lastName || ""}`.trim()
                        : "—"}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Mail className="h-3 w-3 text-slate-500" />
                      <p className="text-xs text-slate-400">{referral.email}</p>
                    </div>
                  </div>
                </div>

                {/* Joined Date */}
                <div className="col-span-2 flex items-center gap-2 text-slate-400 text-sm">
                  <Calendar className="h-4 w-4 text-slate-600 md:hidden" />
                  {format(new Date(referral.joinedAt), "MMM d, yyyy")}
                </div>

                {/* Status */}
                <div className="col-span-2">
                  <Badge
                    variant={referral.status === "active" ? "default" : "secondary"}
                    className={
                      referral.status === "active"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                        : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                    }
                  >
                    {referral.status}
                  </Badge>
                </div>

                {/* Holdings */}
                <div className="col-span-3">
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(referral.holdings).length > 0 ? (
                      Object.entries(referral.holdings).map(([asset, amount]) => (
                        <span
                          key={asset}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono bg-white/5 border border-white/5 text-slate-300"
                        >
                          <CryptoIcon symbol={asset} className="h-3.5 w-3.5" />
                          {formatAssetAmount(amount, asset)}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-600 text-xs italic">No holdings</span>
                    )}
                  </div>
                </div>

                {/* Arrow */}
                <div className="col-span-1 flex justify-end">
                  <div className="h-8 w-8 rounded-full flex items-center justify-center group-hover:bg-white/10 transition-colors">
                    <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-white" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : search ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Search className="h-12 w-12 text-slate-700 mb-4" />
            <p className="text-slate-400 text-lg font-medium">No clients found</p>
            <p className="text-slate-600">Try adjusting your search terms</p>
          </div>
        ) : (
          <EmptyState
            icon={UserPlus}
            title="No referrals yet"
            description="When you refer investors to the platform, they will appear here."
            className="bg-transparent border-0"
          />
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="border-t border-white/5 p-4 flex items-center justify-between bg-black/20">
            <p className="text-xs text-slate-500">
              Showing {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, data?.total || 0)} of{" "}
              {data?.total || 0}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="h-8 glass-panel border-white/10 hover:bg-white/5 text-slate-400 disabled:opacity-30"
              >
                <ChevronLeft className="h-3 w-3 mr-1" />
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages - 1}
                className="h-8 glass-panel border-white/10 hover:bg-white/5 text-slate-400 disabled:opacity-30"
              >
                Next
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
