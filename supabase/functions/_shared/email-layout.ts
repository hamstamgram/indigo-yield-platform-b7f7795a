const LOGO_URL =
  "https://nkfimvovosdehmyyjubn.supabase.co/storage/v1/object/public/public-assets/indigo_logo.png";

const SOCIAL_LINKS = {
  linkedin: {
    url: "https://www.linkedin.com/company/indigo-fund/",
    icon: "https://nkfimvovosdehmyyjubn.supabase.co/storage/v1/object/public/public-assets/linkedin.png",
  },
  instagram: {
    url: "https://www.instagram.com/indigofund/",
    icon: "https://nkfimvovosdehmyyjubn.supabase.co/storage/v1/object/public/public-assets/instagram.png",
  },
  twitter: {
    url: "https://x.com/indigofund",
    icon: "https://nkfimvovosdehmyyjubn.supabase.co/storage/v1/object/public/public-assets/x.png",
  },
};

/**
 * Wraps any internal HTML block within the exact branded Indigo layout used by
 * the official Monthly Yield Report.
 * @param title The title displayed on the right side of the header
 * @param innerContentHtml The raw HTML injected deeply inside the content box
 * @returns The fully constructed HTML string ready for Resend
 */
export function generateUnifiedEmailHtml(title: string, innerContentHtml: string): string {
  // Use current year in the footer dynamically
  const currentYear = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="x-apple-disable-message-reformatting">
  <meta http-equiv="x-ua-compatible" content="ie=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
  <!--[if mso]>
    <xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
    <style>td,th,div,p,a,h1,h2,h3,h4,h5,h6 {font-family: "Segoe UI", sans-serif !important; mso-line-height-rule: exactly;}</style>
  <![endif]-->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    body, table, td, p, h1, h2 { font-family: 'Montserrat', Arial, sans-serif; }
    @media (max-width:600px) {
      .sm-w-full { width: 100% !important }
      .mobile-logo { height: 22px !important; width: auto !important }
      .mobile-h1 { font-size: 18px !important }
      .mobile-table { font-size: 11px !important }
      .mobile-header { font-size: 10px !important; padding: 8px 6px !important }
      .mobile-cell { font-size: 11px !important; padding: 8px 6px !important }
      .mobile-footer-text { font-size: 10px !important; }
    }
    @media (max-width:480px) {
      .mobile-h1 { font-size: 16px !important }
      .mobile-table { font-size: 10px !important }
      .mobile-header { font-size: 9px !important; padding: 6px 4px !important }
      .mobile-cell { font-size: 10px !important; padding: 6px 4px !important }
      .mobile-footer-text { font-size: 9px !important; }
    }
    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
  </style>
</head>
<body style="margin:0;padding:0;width:100%;background-color:#f1f5f9;-webkit-font-smoothing:antialiased;" bgcolor="#f1f5f9">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f1f5f9;" bgcolor="#f1f5f9">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="sm-w-full" style="max-width:600px;width:100%;background-color:#ffffff;" bgcolor="#ffffff">

          <!-- Brand Header -->
          <tr>
            <td style="background-color:#edf0fe;padding:20px 24px;border-radius:10px 10px 0 0;" bgcolor="#edf0fe">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td valign="middle">
                    <img src="${LOGO_URL}" alt="Indigo Logo" height="28" class="mobile-logo" style="display:block;border:0;height:28px;width:auto;">
                  </td>
                  <td valign="middle" align="right">
                    <h1 style="margin:0;font-size:22px;line-height:1.2;color:#0f172a;font-weight:700;" class="mobile-h1">${title}</h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Area -->
          <tr>
            <td style="padding:24px;background-color:#ffffff;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;border-radius:0 0 10px 10px;border-bottom:1px solid #e2e8f0;" bgcolor="#ffffff">
              ${innerContentHtml}
            </td>
          </tr>

          <!-- Spacer after content -->
          <tr>
            <td style="height:24px;"></td>
          </tr>

          <!-- Disclaimer / Legal (matches Investor Report Footer) -->
          <tr>
            <td style="padding:0 24px 24px 24px;background-color:#f1f5f9;" bgcolor="#f1f5f9">
              <p style="margin:0;font-size:11px;line-height:1.6;color:#94a3b8;text-align:center;" class="mobile-footer-text">
                This document is confidential and intended solely for the named recipient. It is not an offer to sell or a solicitation of an offer to buy any securities. Any such offer or solicitation will be made only by means of a complete offering document and only in those jurisdictions where permitted by law.
              </p>
            </td>
          </tr>

          <!-- Social Links (icon-based) -->
          <tr>
            <td align="center" style="padding-bottom:16px;background-color:#f1f5f9;" bgcolor="#f1f5f9">
              <a href="${SOCIAL_LINKS.linkedin.url}" target="_blank" style="text-decoration:none;padding:0 8px;display:inline-block;">
                <img src="${SOCIAL_LINKS.linkedin.icon}" alt="LinkedIn" width="24" height="24" style="display:inline-block;border:0;" />
              </a>
              <a href="${SOCIAL_LINKS.instagram.url}" target="_blank" style="text-decoration:none;padding:0 8px;display:inline-block;">
                <img src="${SOCIAL_LINKS.instagram.icon}" alt="Instagram" width="24" height="24" style="display:inline-block;border:0;" />
              </a>
              <a href="${SOCIAL_LINKS.twitter.url}" target="_blank" style="text-decoration:none;padding:0 8px;display:inline-block;">
                <img src="${SOCIAL_LINKS.twitter.icon}" alt="X" width="24" height="24" style="display:inline-block;border:0;" />
              </a>
            </td>
          </tr>

          <!-- Copyright -->
          <tr>
            <td align="center" style="padding-bottom:24px;background-color:#f1f5f9;" bgcolor="#f1f5f9">
              <p style="margin:0;font-size:12px;color:#94a3b8;" class="mobile-footer-text">© ${currentYear} Indigo Fund. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
