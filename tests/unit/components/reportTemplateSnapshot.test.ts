import { describe, it, expect } from "vitest";
import { renderReportToHtml } from "@/components/reports/InvestorReportTemplate";
import { InvestorData } from "@/types/domains";

/**
 * Report Template Snapshot Tests
 *
 * These tests ensure:
 * 1. All required bgcolor attributes are present for email compatibility
 * 2. No USD or $ symbols appear in investor reports
 * 3. All required sections are present
 * 4. 16px spacer is used between fund blocks
 * 5. Print CSS for background graphics is included
 */

const mockInvestorData: InvestorData = {
  name: "Test Investor",
  reportDate: "December 31st, 2025",
  funds: [
    {
      name: "BTC YIELD FUND",
      currency: "BTC",
      begin_balance_mtd: "1.00000000",
      begin_balance_qtd: "0.95000000",
      begin_balance_ytd: "0.50000000",
      begin_balance_itd: "0.00000000",
      additions_mtd: "-",
      additions_qtd: "-",
      additions_ytd: "0.50000000",
      additions_itd: "1.00000000",
      redemptions_mtd: "-",
      redemptions_qtd: "-",
      redemptions_ytd: "-",
      redemptions_itd: "-",
      net_income_mtd: "+0.05000000",
      net_income_qtd: "+0.10000000",
      net_income_ytd: "+0.55000000",
      net_income_itd: "+1.05000000",
      ending_balance_mtd: "1.05000000",
      ending_balance_qtd: "1.05000000",
      ending_balance_ytd: "1.05000000",
      ending_balance_itd: "1.05000000",
      return_rate_mtd: "+5.00%",
      return_rate_qtd: "+10.53%",
      return_rate_ytd: "+110.00%",
      return_rate_itd: "+105.00%",
    },
    {
      name: "ETH YIELD FUND",
      currency: "ETH",
      begin_balance_mtd: "10.0000",
      begin_balance_qtd: "9.5000",
      begin_balance_ytd: "5.0000",
      begin_balance_itd: "0.0000",
      additions_mtd: "-",
      additions_qtd: "-",
      additions_ytd: "5.0000",
      additions_itd: "10.0000",
      redemptions_mtd: "-",
      redemptions_qtd: "-",
      redemptions_ytd: "-",
      redemptions_itd: "-",
      net_income_mtd: "+0.5000",
      net_income_qtd: "+1.0000",
      net_income_ytd: "+5.5000",
      net_income_itd: "+10.5000",
      ending_balance_mtd: "10.5000",
      ending_balance_qtd: "10.5000",
      ending_balance_ytd: "10.5000",
      ending_balance_itd: "10.5000",
      return_rate_mtd: "+5.00%",
      return_rate_qtd: "+10.53%",
      return_rate_ytd: "+110.00%",
      return_rate_itd: "+105.00%",
    },
  ],
};

describe("Report Template Snapshot", () => {
  describe("Background Color Compatibility", () => {
    it("should include all required bgcolor attributes for email compatibility", () => {
      const html = renderReportToHtml(mockInvestorData);

      // Required bgcolor values for email clients (especially Outlook)
      expect(html).toContain('bgcolor="#f1f5f9"'); // Outer background
      expect(html).toContain('bgcolor="#ffffff"'); // White areas
      expect(html).toContain('bgcolor="#edf0fe"'); // Brand header
      expect(html).toContain('bgcolor="#f8fafc"'); // Light gray areas
      expect(html).toContain('bgcolor="#0f172a"'); // Table header (dark)
    });

    it("should have matching style and bgcolor for body background", () => {
      const html = renderReportToHtml(mockInvestorData);

      // Body should have both inline style and bgcolor
      expect(html).toContain("background-color:#f1f5f9");
      expect(html).toContain('bgcolor="#f1f5f9"');
    });

    it("should have matching style and bgcolor for brand header", () => {
      const html = renderReportToHtml(mockInvestorData);

      expect(html).toContain("background-color:#edf0fe");
      expect(html).toContain('bgcolor="#edf0fe"');
    });

    it("should have matching style and bgcolor for investor header", () => {
      const html = renderReportToHtml(mockInvestorData);

      expect(html).toContain("background-color:#f8fafc");
      expect(html).toContain('bgcolor="#f8fafc"');
    });

    it("should have matching style and bgcolor for table header cells", () => {
      const html = renderReportToHtml(mockInvestorData);

      expect(html).toContain("background-color:#0f172a");
      expect(html).toContain('bgcolor="#0f172a"');
    });

    it("should have matching style and bgcolor for fund block white areas", () => {
      const html = renderReportToHtml(mockInvestorData);

      expect(html).toContain("background-color:#ffffff");
      expect(html).toContain('bgcolor="#ffffff"');
    });
  });

  describe("No USD or Currency Symbols", () => {
    it("should not contain any $ symbols in content (except stylesheet references)", () => {
      const html = renderReportToHtml(mockInvestorData);

      // Remove stylesheet references before checking for $
      const withoutStylesheet = html.replace(/stylesheet/gi, "");
      expect(withoutStylesheet).not.toContain("$");
    });

    it("should not contain USD except in asset names (USDC, USDT)", () => {
      const html = renderReportToHtml(mockInvestorData);

      // USD should only appear as part of USDC or USDT
      const usdMatches = html.match(/USD(?!C|T)/g);
      expect(usdMatches).toBeNull();
    });

    it("should not contain formatCurrency or currency formatting functions", () => {
      const html = renderReportToHtml(mockInvestorData);

      expect(html).not.toContain("formatCurrency");
      expect(html).not.toContain("toLocaleString");
    });
  });

  describe("Required Sections", () => {
    it("should include the Monthly Report title", () => {
      const html = renderReportToHtml(mockInvestorData);
      expect(html).toContain("Monthly Report");
    });

    it("should include investor name", () => {
      const html = renderReportToHtml(mockInvestorData);
      expect(html).toContain("Investor: Test Investor");
    });

    it("should include period ended date", () => {
      const html = renderReportToHtml(mockInvestorData);
      expect(html).toContain("December 31st, 2025");
    });

    it("should include Capital Account Summary header", () => {
      const html = renderReportToHtml(mockInvestorData);
      expect(html).toContain("Capital Account Summary");
    });

    it("should include disclaimer text", () => {
      const html = renderReportToHtml(mockInvestorData);
      expect(html).toContain("This document is not an offer to sell");
    });

    it("should include copyright notice", () => {
      const html = renderReportToHtml(mockInvestorData);
      expect(html).toContain(`© ${new Date().getFullYear()} Indigo Fund`);
    });

    it("should include social icons (linkedin, instagram, twitter)", () => {
      const html = renderReportToHtml(mockInvestorData);
      expect(html).toContain("linkedin");
      expect(html).toContain("instagram");
      expect(html).toContain("twitter");
    });

    it("should include unsubscribe link", () => {
      const html = renderReportToHtml(mockInvestorData);
      expect(html).toContain("Unsubscribe");
    });
  });

  describe("Fund Block Structure", () => {
    it("should include all fund blocks", () => {
      const html = renderReportToHtml(mockInvestorData);
      expect(html).toContain("BTC YIELD FUND");
      expect(html).toContain("ETH YIELD FUND");
    });

    it("should include correct asset tickers in column headers", () => {
      const html = renderReportToHtml(mockInvestorData);
      expect(html).toContain("MTD (BTC)");
      expect(html).toContain("QTD (BTC)");
      expect(html).toContain("YTD (BTC)");
      expect(html).toContain("ITD (BTC)");
      expect(html).toContain("MTD (ETH)");
    });

    it("should use 16px spacer between fund blocks", () => {
      const html = renderReportToHtml(mockInvestorData);
      expect(html).toContain("height:16px");
    });

    it("should include all table rows (Beginning, Additions, Redemptions, Net Income, Ending, Rate of Return)", () => {
      const html = renderReportToHtml(mockInvestorData);
      expect(html).toContain("Beginning Balance");
      expect(html).toContain("Additions");
      expect(html).toContain("Redemptions");
      expect(html).toContain("Net Income");
      expect(html).toContain("Ending Balance");
      expect(html).toContain("Rate of Return");
    });
  });

  describe("Responsive CSS Classes", () => {
    it("should include sm-w-full class", () => {
      const html = renderReportToHtml(mockInvestorData);
      expect(html).toContain("sm-w-full");
    });

    it("should include mobile-logo class", () => {
      const html = renderReportToHtml(mockInvestorData);
      expect(html).toContain("mobile-logo");
    });

    it("should include mobile-h1 class", () => {
      const html = renderReportToHtml(mockInvestorData);
      expect(html).toContain("mobile-h1");
    });

    it("should include mobile-table class", () => {
      const html = renderReportToHtml(mockInvestorData);
      expect(html).toContain("mobile-table");
    });

    it("should include mobile-header class", () => {
      const html = renderReportToHtml(mockInvestorData);
      expect(html).toContain("mobile-header");
    });

    it("should include mobile-cell class", () => {
      const html = renderReportToHtml(mockInvestorData);
      expect(html).toContain("mobile-cell");
    });

    it("should include mobile-footer-text class", () => {
      const html = renderReportToHtml(mockInvestorData);
      expect(html).toContain("mobile-footer-text");
    });
  });

  describe("Print CSS", () => {
    it("should include print-color-adjust CSS for background graphics", () => {
      const html = renderReportToHtml(mockInvestorData);
      expect(html).toContain("-webkit-print-color-adjust: exact");
      expect(html).toContain("print-color-adjust: exact");
    });
  });

  describe("MSO/Outlook Compatibility", () => {
    it("should include MSO conditional comments", () => {
      const html = renderReportToHtml(mockInvestorData);
      expect(html).toContain("<!--[if mso]>");
      expect(html).toContain("<![endif]-->");
    });

    it("should include OfficeDocumentSettings for Outlook", () => {
      const html = renderReportToHtml(mockInvestorData);
      expect(html).toContain("o:OfficeDocumentSettings");
      expect(html).toContain("PixelsPerInch");
    });
  });

  describe("Montserrat Font", () => {
    it("should include Montserrat font import", () => {
      const html = renderReportToHtml(mockInvestorData);
      expect(html).toContain("fonts.googleapis.com");
      expect(html).toContain("Montserrat");
    });

    it("should include Montserrat in font-family declarations", () => {
      const html = renderReportToHtml(mockInvestorData);
      expect(html).toContain("font-family: 'Montserrat'");
    });
  });

  describe("Bgcolor Count Verification", () => {
    it("should have at least 20 bgcolor attributes for comprehensive email compatibility", () => {
      const html = renderReportToHtml(mockInvestorData);
      const bgcolorCount = (html.match(/bgcolor="/g) || []).length;

      // With 2 funds and all the structural elements, we expect many bgcolor attributes
      expect(bgcolorCount).toBeGreaterThanOrEqual(20);
    });
  });
});
