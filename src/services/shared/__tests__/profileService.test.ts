import { describe, it, expect, vi, beforeEach } from "vitest";
import { supabase } from "@/integrations/supabase/client";

// Mock the supabase client chain
const mockSelect = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  },
}));

describe("getInvestorsForTransaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockLimit.mockResolvedValue({
      data: [
        {
          id: "inv-1",
          email: "alice@indigo.fund",
          first_name: "Alice",
          last_name: "Smith",
          account_type: "investor",
          is_system_account: false,
        },
        {
          id: "admin-1",
          email: "admin@indigo.fund",
          first_name: "Admin",
          last_name: "User",
          account_type: "investor",
          is_system_account: false,
        },
        {
          id: "fees-1",
          email: "fees@indigo.fund",
          first_name: "Indigo",
          last_name: "Fees",
          account_type: "fees_account",
          is_system_account: true,
        },
      ],
      error: null,
    });

    mockOrder.mockReturnValue({ limit: mockLimit });
    mockSelect.mockReturnValue({ order: mockOrder });
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: mockSelect,
    });
  });

  it("includes all profiles (admins, investors, fees_account) in the list", async () => {
    const { profileService } = await import("@/services/shared/profileService");
    const investors = await profileService.getInvestorsForTransaction();

    expect(investors).toHaveLength(3);
    expect(investors.find((i) => i.id === "inv-1")).toBeDefined();
    expect(investors.find((i) => i.id === "admin-1")).toBeDefined();
    expect(investors.find((i) => i.id === "fees-1")).toBeDefined();
  });

  it("marks fees_account profiles as system accounts", async () => {
    const { profileService } = await import("@/services/shared/profileService");
    const investors = await profileService.getInvestorsForTransaction();

    const feesAccount = investors.find((i) => i.id === "fees-1");
    expect(feesAccount!.isSystemAccount).toBe(true);

    const regularInvestor = investors.find((i) => i.id === "inv-1");
    expect(regularInvestor!.isSystemAccount).toBe(false);
  });

  it("queries all profiles without filtering by is_admin", async () => {
    const { profileService } = await import("@/services/shared/profileService");
    await profileService.getInvestorsForTransaction();

    expect(supabase.from).toHaveBeenCalledWith("profiles");
    expect(mockSelect).toHaveBeenCalledWith(expect.stringContaining("account_type"));
    // No .or() filter — all profiles are returned
    expect(mockOrder).toHaveBeenCalledWith("last_name");
  });
});
