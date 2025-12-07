/**
 * Email Templates Service
 * Provides reusable email templates with consistent branding
 *
 * Templates:
 * - Password Reset
 * - Platform Invitation
 * - Welcome Email
 * - Withdrawal Confirmation
 * - Transaction Confirmation
 * - Security Alert
 */

// CDN Assets
const LOGO_URL =
  "https://storage.mlcdn.com/account_image/855106/VpM1KYxEPvOaeLNp7IkP6K0xfOMSx6VmPaGM6vu7.png";
const TWITTER_ICON =
  "https://storage.mlcdn.com/account_image/855106/ynQCiRhVa69hFdZz7wjBbKPlNaOPYQpZ8zBqzAJc.png";
const LINKEDIN_ICON =
  "https://storage.mlcdn.com/account_image/855106/aXU7WPG09xNjxKv9R9sWo0K5fU00FrG9pC37H2Lz.png";
const INSTAGRAM_ICON =
  "https://storage.mlcdn.com/account_image/855106/pOPJaKxGjuVs2k9Oixh9CkxPGKDjsqDMXDPb4Wyu.png";

/**
 * Email Base Styles
 */
const baseStyles = `
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: 'Montserrat', Arial, sans-serif;
      background-color: #f3f4f6;
    }
    @media only screen and (max-width: 600px) {
      .container {
        width: 100% !important;
        padding: 16px !important;
      }
      .content-padding {
        padding: 24px 16px !important;
      }
    }
  </style>
`;

/**
 * Email Header Component
 */
function renderEmailHeader(subtitle?: string): string {
  return `
    <tr>
      <td class="content-padding" style="padding: 32px 40px; border-bottom: 1px solid #e5e7eb;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <img src="${LOGO_URL}" alt="Indigo Yield" style="height: 40px; display: block;" />
            </td>
            ${
              subtitle
                ? `
            <td align="right">
              <div style="font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; color: #6b7280; margin: 0;">${subtitle}</div>
            </td>
            `
                : ""
            }
          </tr>
        </table>
      </td>
    </tr>
  `;
}

/**
 * Email Footer Component
 */
function renderEmailFooter(): string {
  const currentYear = new Date().getFullYear();

  return `
    <tr>
      <td class="content-padding" style="padding: 32px 40px; border-top: 1px solid #e5e7eb; background-color: #f9fafb;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-bottom: 16px;">
              <p style="font-family: 'Montserrat', Arial, sans-serif; font-size: 13px; color: #6b7280; line-height: 1.6; margin: 0;">
                If you have any questions or need assistance, please don't hesitate to reach out to our support team.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 16px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right: 12px;">
                    <a href="https://twitter.com/indigoyield" style="text-decoration: none;">
                      <img src="${TWITTER_ICON}" alt="Twitter" style="width: 24px; height: 24px; display: block;" />
                    </a>
                  </td>
                  <td style="padding-right: 12px;">
                    <a href="https://linkedin.com/company/indigoyield" style="text-decoration: none;">
                      <img src="${LINKEDIN_ICON}" alt="LinkedIn" style="width: 24px; height: 24px; display: block;" />
                    </a>
                  </td>
                  <td>
                    <a href="https://instagram.com/indigoyield" style="text-decoration: none;">
                      <img src="${INSTAGRAM_ICON}" alt="Instagram" style="width: 24px; height: 24px; display: block;" />
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td>
              <p style="font-family: 'Montserrat', Arial, sans-serif; font-size: 12px; color: #9ca3af; margin: 0;">
                © ${currentYear} Indigo Yield. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
}

/**
 * Email Wrapper Function
 */
function wrapEmailContent(title: string, content: string, headerSubtitle?: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
  <title>${title}</title>
  ${baseStyles}
</head>
<body style="margin: 0; padding: 0; font-family: 'Montserrat', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table class="container" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          ${renderEmailHeader(headerSubtitle)}
          ${content}
          ${renderEmailFooter()}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Password Reset Email Template
 */
export interface PasswordResetData {
  userName: string;
  resetLink: string;
  expiresIn: string; // e.g., "24 hours"
}

export function generatePasswordResetEmail(data: PasswordResetData): string {
  const content = `
    <tr>
      <td class="content-padding" style="padding: 32px 40px;">
        <h1 style="font-family: 'Montserrat', Arial, sans-serif; font-size: 24px; font-weight: 700; color: #111827; margin: 0 0 16px 0;">Reset Your Password</h1>
        <p style="font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; color: #6b7280; line-height: 1.6; margin: 0 0 24px 0;">
          Hi ${data.userName},
        </p>
        <p style="font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; color: #6b7280; line-height: 1.6; margin: 0 0 24px 0;">
          We received a request to reset your password for your Indigo Yield account. Click the button below to create a new password.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding: 24px 0;">
              <a href="${data.resetLink}" style="display: inline-block; padding: 14px 32px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 8px; font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; font-weight: 600;">
                Reset Password
              </a>
            </td>
          </tr>
        </table>
        <p style="font-family: 'Montserrat', Arial, sans-serif; font-size: 13px; color: #6b7280; line-height: 1.6; margin: 0 0 16px 0;">
          This link will expire in ${data.expiresIn}. If you didn't request this password reset, please ignore this email or contact support if you have concerns.
        </p>
        <div style="background-color: #f9fafb; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 4px; margin-top: 24px;">
          <p style="font-family: 'Montserrat', Arial, sans-serif; font-size: 12px; color: #6b7280; line-height: 1.5; margin: 0;">
            <strong>Security Tip:</strong> Never share your password with anyone. Indigo Yield will never ask for your password via email.
          </p>
        </div>
      </td>
    </tr>
  `;

  return wrapEmailContent("Reset Your Password - Indigo Yield", content);
}

/**
 * Platform Invitation Email Template
 */
export interface PlatformInvitationData {
  recipientName: string;
  inviterName: string;
  inviteLink: string;
  expiresIn: string; // e.g., "7 days"
}

export function generatePlatformInvitationEmail(data: PlatformInvitationData): string {
  const content = `
    <tr>
      <td class="content-padding" style="padding: 32px 40px;">
        <h1 style="font-family: 'Montserrat', Arial, sans-serif; font-size: 24px; font-weight: 700; color: #111827; margin: 0 0 16px 0;">You're Invited to Indigo Yield</h1>
        <p style="font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; color: #6b7280; line-height: 1.6; margin: 0 0 24px 0;">
          Hi ${data.recipientName},
        </p>
        <p style="font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; color: #6b7280; line-height: 1.6; margin: 0 0 16px 0;">
          ${data.inviterName} has invited you to join Indigo Yield, a premium investment platform for cryptocurrency yield funds.
        </p>
        <p style="font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; color: #6b7280; line-height: 1.6; margin: 0 0 24px 0;">
          Accept this invitation to gain access to:
        </p>
        <ul style="font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; color: #6b7280; line-height: 1.8; margin: 0 0 24px 0; padding-left: 20px;">
          <li>Professional-grade yield funds (BTC, ETH, SOL, USDT, EURC, xAUT, XRP)</li>
          <li>Real-time portfolio tracking and analytics</li>
          <li>Monthly performance reports and statements</li>
          <li>Secure withdrawals and deposits</li>
        </ul>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding: 24px 0;">
              <a href="${data.inviteLink}" style="display: inline-block; padding: 14px 32px; background-color: #10b981; color: #ffffff; text-decoration: none; border-radius: 8px; font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; font-weight: 600;">
                Accept Invitation
              </a>
            </td>
          </tr>
        </table>
        <p style="font-family: 'Montserrat', Arial, sans-serif; font-size: 13px; color: #6b7280; line-height: 1.6; margin: 0;">
          This invitation expires in ${data.expiresIn}. Click the button above to create your account and start investing.
        </p>
      </td>
    </tr>
  `;

  return wrapEmailContent("Your Invitation to Indigo Yield", content);
}

/**
 * Welcome Email Template
 */
export interface WelcomeEmailData {
  investorName: string;
  loginLink: string;
}

export function generateWelcomeEmail(data: WelcomeEmailData): string {
  const content = `
    <tr>
      <td class="content-padding" style="padding: 32px 40px;">
        <h1 style="font-family: 'Montserrat', Arial, sans-serif; font-size: 24px; font-weight: 700; color: #111827; margin: 0 0 16px 0;">Welcome to Indigo Yield!</h1>
        <p style="font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; color: #6b7280; line-height: 1.6; margin: 0 0 24px 0;">
          Dear ${data.investorName},
        </p>
        <p style="font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; color: #6b7280; line-height: 1.6; margin: 0 0 16px 0;">
          Welcome to Indigo Yield! We're thrilled to have you join our platform. Your account has been successfully created and you're ready to start your investment journey.
        </p>
        <div style="background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <h3 style="font-family: 'Montserrat', Arial, sans-serif; font-size: 16px; font-weight: 600; color: #166534; margin: 0 0 12px 0;">Getting Started</h3>
          <ol style="font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; color: #166534; line-height: 1.8; margin: 0; padding-left: 20px;">
            <li>Complete your profile and account settings</li>
            <li>Review available yield funds and investment strategies</li>
            <li>Make your first deposit</li>
            <li>Monitor your portfolio performance in real-time</li>
          </ol>
        </div>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding: 24px 0;">
              <a href="${data.loginLink}" style="display: inline-block; padding: 14px 32px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 8px; font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; font-weight: 600;">
                Access Your Dashboard
              </a>
            </td>
          </tr>
        </table>
        <p style="font-family: 'Montserrat', Arial, sans-serif; font-size: 13px; color: #6b7280; line-height: 1.6; margin: 24px 0 0 0;">
          Our support team is here to help you every step of the way. If you have any questions, don't hesitate to reach out.
        </p>
      </td>
    </tr>
  `;

  return wrapEmailContent("Welcome to Indigo Yield", content);
}

/**
 * Withdrawal Confirmation Email Template
 */
export interface WithdrawalConfirmationData {
  investorName: string;
  amount: number;
  currency: string;
  fundName: string;
  transactionId: string;
  withdrawalDate: string;
  expectedArrival: string;
  walletAddress: string;
}

export function generateWithdrawalConfirmationEmail(data: WithdrawalConfirmationData): string {
  const formattedAmount = data.amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });

  const content = `
    <tr>
      <td class="content-padding" style="padding: 32px 40px;">
        <h1 style="font-family: 'Montserrat', Arial, sans-serif; font-size: 24px; font-weight: 700; color: #111827; margin: 0 0 16px 0;">Withdrawal Confirmed</h1>
        <p style="font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; color: #6b7280; line-height: 1.6; margin: 0 0 24px 0;">
          Dear ${data.investorName},
        </p>
        <p style="font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; color: #6b7280; line-height: 1.6; margin: 0 0 24px 0;">
          Your withdrawal request has been approved and processed. Your funds are on their way.
        </p>

        <div style="background-color: #f9fafb; border-radius: 8px; padding: 24px; margin: 24px 0;">
          <h3 style="font-family: 'Montserrat', Arial, sans-serif; font-size: 16px; font-weight: 600; color: #111827; margin: 0 0 16px 0;">Withdrawal Details</h3>

          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding: 8px 0;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-family: 'Montserrat', Arial, sans-serif; font-size: 13px; color: #6b7280;">Amount</td>
                    <td align="right" style="font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; font-weight: 600; color: #111827;">${formattedAmount} ${data.currency}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-family: 'Montserrat', Arial, sans-serif; font-size: 13px; color: #6b7280;">Fund</td>
                    <td align="right" style="font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; font-weight: 600; color: #111827;">${data.fundName}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-family: 'Montserrat', Arial, sans-serif; font-size: 13px; color: #6b7280;">Transaction ID</td>
                    <td align="right" style="font-family: 'Montserrat', Arial, sans-serif; font-size: 12px; font-weight: 500; color: #111827; font-family: monospace;">${data.transactionId}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 16px 0 8px 0;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-family: 'Montserrat', Arial, sans-serif; font-size: 13px; color: #6b7280;">Withdrawal Date</td>
                    <td align="right" style="font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; font-weight: 600; color: #111827;">${data.withdrawalDate}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-family: 'Montserrat', Arial, sans-serif; font-size: 13px; color: #6b7280;">Expected Arrival</td>
                    <td align="right" style="font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; font-weight: 600; color: #10b981;">${data.expectedArrival}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="font-family: 'Montserrat', Arial, sans-serif; font-size: 12px; color: #6b7280; margin: 0 0 8px 0; font-weight: 600;">Destination Wallet:</p>
            <p style="font-family: 'Montserrat', Arial, sans-serif; font-size: 11px; color: #6b7280; margin: 0; font-family: monospace; word-break: break-all; line-height: 1.5;">${data.walletAddress}</p>
          </div>
        </div>

        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 4px; margin: 24px 0;">
          <p style="font-family: 'Montserrat', Arial, sans-serif; font-size: 13px; color: #92400e; line-height: 1.5; margin: 0;">
            <strong>Note:</strong> Withdrawal times may vary depending on network congestion. You can track your transaction using the transaction ID above.
          </p>
        </div>

        <p style="font-family: 'Montserrat', Arial, sans-serif; font-size: 13px; color: #6b7280; line-height: 1.6; margin: 24px 0 0 0;">
          If you didn't initiate this withdrawal or have any concerns, please contact our support team immediately.
        </p>
      </td>
    </tr>
  `;

  const withdrawalDateFormatted = new Date(data.withdrawalDate).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return wrapEmailContent("Withdrawal Confirmed - Indigo Yield", content, withdrawalDateFormatted);
}

/**
 * Security Alert Email Template
 */
export interface SecurityAlertData {
  userName: string;
  alertType: "login" | "password_change" | "withdrawal" | "suspicious_activity";
  alertDetails: string;
  timestamp: string;
  ipAddress?: string;
  location?: string;
  actionLink?: string;
}

export function generateSecurityAlertEmail(data: SecurityAlertData): string {
  const alertTitles = {
    login: "New Login Detected",
    password_change: "Password Changed",
    withdrawal: "Withdrawal Request",
    suspicious_activity: "Suspicious Activity Detected",
  };

  const content = `
    <tr>
      <td class="content-padding" style="padding: 32px 40px;">
        <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; border-radius: 4px; margin-bottom: 24px;">
          <h1 style="font-family: 'Montserrat', Arial, sans-serif; font-size: 20px; font-weight: 700; color: #991b1b; margin: 0;">
            🔔 ${alertTitles[data.alertType]}
          </h1>
        </div>

        <p style="font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; color: #6b7280; line-height: 1.6; margin: 0 0 24px 0;">
          Hi ${data.userName},
        </p>

        <p style="font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; color: #6b7280; line-height: 1.6; margin: 0 0 24px 0;">
          ${data.alertDetails}
        </p>

        <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding: 8px 0;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-family: 'Montserrat', Arial, sans-serif; font-size: 13px; color: #6b7280;">Time</td>
                    <td align="right" style="font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; font-weight: 600; color: #111827;">${data.timestamp}</td>
                  </tr>
                </table>
              </td>
            </tr>
            ${
              data.ipAddress
                ? `
            <tr>
              <td style="padding: 8px 0;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-family: 'Montserrat', Arial, sans-serif; font-size: 13px; color: #6b7280;">IP Address</td>
                    <td align="right" style="font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; font-weight: 600; color: #111827; font-family: monospace;">${data.ipAddress}</td>
                  </tr>
                </table>
              </td>
            </tr>
            `
                : ""
            }
            ${
              data.location
                ? `
            <tr>
              <td style="padding: 8px 0;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-family: 'Montserrat', Arial, sans-serif; font-size: 13px; color: #6b7280;">Location</td>
                    <td align="right" style="font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; font-weight: 600; color: #111827;">${data.location}</td>
                  </tr>
                </table>
              </td>
            </tr>
            `
                : ""
            }
          </table>
        </div>

        <p style="font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; color: #6b7280; line-height: 1.6; margin: 0 0 24px 0;">
          If this was you, you can safely ignore this email. If you didn't perform this action, please secure your account immediately.
        </p>

        ${
          data.actionLink
            ? `
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding: 16px 0;">
              <a href="${data.actionLink}" style="display: inline-block; padding: 14px 32px; background-color: #dc2626; color: #ffffff; text-decoration: none; border-radius: 8px; font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; font-weight: 600;">
                Secure My Account
              </a>
            </td>
          </tr>
        </table>
        `
            : ""
        }

        <div style="background-color: #f3f4f6; border-radius: 4px; padding: 16px; margin-top: 24px;">
          <p style="font-family: 'Montserrat', Arial, sans-serif; font-size: 12px; color: #6b7280; line-height: 1.5; margin: 0;">
            <strong>Security Tips:</strong><br>
            • Never share your password or 2FA codes with anyone<br>
            • Always log out from public or shared devices<br>
            • Enable two-factor authentication for added security<br>
            • Contact support immediately if you notice unauthorized activity
          </p>
        </div>
      </td>
    </tr>
  `;

  return wrapEmailContent(`Security Alert - ${alertTitles[data.alertType]}`, content);
}

// Export all template generators
export const emailTemplates = {
  passwordReset: generatePasswordResetEmail,
  platformInvitation: generatePlatformInvitationEmail,
  welcome: generateWelcomeEmail,
  withdrawalConfirmation: generateWithdrawalConfirmationEmail,
  securityAlert: generateSecurityAlertEmail,
};
