/**
 * Shared Alerting Module
 *
 * Provides unified alerting capabilities for edge functions.
 * Supports Slack webhooks and email via Resend.
 *
 * Environment Variables:
 *   - SLACK_WEBHOOK_URL: Slack incoming webhook URL
 *   - RESEND_API_KEY: Resend API key for email alerts
 *   - ALERT_EMAIL_FROM: Sender email (e.g., "alerts@indigo.yield")
 *   - ALERT_EMAIL_TO: Recipient email(s), comma-separated
 */

export interface AlertPayload {
  /** Alert title/subject */
  title: string;
  /** Alert message body */
  message: string;
  /** Severity level */
  severity: "info" | "warning" | "critical";
  /** Optional structured data */
  data?: Record<string, unknown>;
  /** Source of the alert */
  source?: string;
  /** Timestamp (defaults to now) */
  timestamp?: string;
}

interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
    emoji?: boolean;
  };
  fields?: Array<{
    type: string;
    text: string;
  }>;
}

/**
 * Send alert to Slack webhook
 */
export async function sendSlackAlert(payload: AlertPayload): Promise<boolean> {
  const webhookUrl = Deno.env.get("SLACK_WEBHOOK_URL");
  if (!webhookUrl) {
    console.warn("SLACK_WEBHOOK_URL not configured, skipping Slack alert");
    return false;
  }

  const emoji = {
    info: ":information_source:",
    warning: ":warning:",
    critical: ":rotating_light:",
  }[payload.severity];

  const color = {
    info: "#36a64f",
    warning: "#ffcc00",
    critical: "#ff0000",
  }[payload.severity];

  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${emoji} ${payload.title}`,
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: payload.message,
      },
    },
  ];

  // Add data fields if present
  if (payload.data && Object.keys(payload.data).length > 0) {
    const fields = Object.entries(payload.data).map(([key, value]) => ({
      type: "mrkdwn",
      text: `*${key}:* ${JSON.stringify(value)}`,
    }));

    blocks.push({
      type: "section",
      fields: fields.slice(0, 10), // Slack limits to 10 fields
    });
  }

  // Add footer with source and timestamp
  blocks.push({
    type: "context",
    text: {
      type: "mrkdwn",
      text: `Source: ${payload.source || "indigo-platform"} | ${payload.timestamp || new Date().toISOString()}`,
    },
  } as SlackBlock);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attachments: [
          {
            color,
            blocks,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("Slack alert failed:", response.status, await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error sending Slack alert:", error);
    return false;
  }
}

/**
 * Send alert via email using Resend
 */
export async function sendEmailAlert(payload: AlertPayload): Promise<boolean> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("ALERT_EMAIL_FROM") || "Indigo Alerts <alerts@indigo.yield>";
  const to = Deno.env.get("ALERT_EMAIL_TO");

  if (!apiKey || !to) {
    console.warn("RESEND_API_KEY or ALERT_EMAIL_TO not configured, skipping email alert");
    return false;
  }

  const severityEmoji = {
    info: "ℹ️",
    warning: "⚠️",
    critical: "🚨",
  }[payload.severity];

  const severityColor = {
    info: "#36a64f",
    warning: "#ffcc00",
    critical: "#ff0000",
  }[payload.severity];

  // Build HTML email
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; }
        .header { background: ${severityColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 18px; }
        .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: 0; }
        .message { color: #333; line-height: 1.6; }
        .data { background: #fff; border: 1px solid #eee; padding: 15px; margin-top: 15px; border-radius: 4px; }
        .data-item { margin: 5px 0; }
        .data-key { color: #666; font-weight: 600; }
        .footer { padding: 15px 20px; font-size: 12px; color: #999; border: 1px solid #ddd; border-top: 0; border-radius: 0 0 8px 8px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${severityEmoji} ${payload.title}</h1>
        </div>
        <div class="content">
          <div class="message">${payload.message.replace(/\n/g, "<br>")}</div>
          ${
            payload.data && Object.keys(payload.data).length > 0
              ? `
            <div class="data">
              ${Object.entries(payload.data)
                .map(
                  ([key, value]) =>
                    `<div class="data-item"><span class="data-key">${key}:</span> ${JSON.stringify(value)}</div>`
                )
                .join("")}
            </div>
          `
              : ""
          }
        </div>
        <div class="footer">
          Source: ${payload.source || "indigo-platform"}<br>
          Timestamp: ${payload.timestamp || new Date().toISOString()}
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: to.split(",").map((e) => e.trim()),
        subject: `[${payload.severity.toUpperCase()}] ${payload.title}`,
        html,
      }),
    });

    if (!response.ok) {
      console.error("Email alert failed:", response.status, await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error sending email alert:", error);
    return false;
  }
}

/**
 * Send alert through all configured channels
 */
export async function sendAlert(
  payload: AlertPayload
): Promise<{ slack: boolean; email: boolean }> {
  const [slack, email] = await Promise.all([sendSlackAlert(payload), sendEmailAlert(payload)]);

  return { slack, email };
}

/**
 * Send integrity check alert (convenience wrapper)
 */
export async function sendIntegrityAlert(
  issues: Array<{ view_name: string; issue_count: number; status: string }>,
  snapshotId?: string
): Promise<{ slack: boolean; email: boolean }> {
  const criticalIssues = issues.filter((i) => i.status === "critical");
  const warningIssues = issues.filter((i) => i.status === "warning");
  const totalIssues = issues.reduce((sum, i) => sum + i.issue_count, 0);

  const severity =
    criticalIssues.length > 0 ? "critical" : warningIssues.length > 0 ? "warning" : "info";

  const title =
    severity === "critical"
      ? "Critical Integrity Issues Detected"
      : severity === "warning"
        ? "Integrity Warnings Detected"
        : "Integrity Check Complete";

  const message =
    totalIssues > 0
      ? `Found ${totalIssues} issue(s) across ${issues.filter((i) => i.issue_count > 0).length} check(s):\n\n` +
        issues
          .filter((i) => i.issue_count > 0)
          .map((i) => `• ${i.view_name}: ${i.issue_count} issue(s) [${i.status}]`)
          .join("\n")
      : "All integrity checks passed successfully.";

  return sendAlert({
    title,
    message,
    severity,
    source: "scheduled-integrity-check",
    data: {
      total_issues: totalIssues,
      critical_count: criticalIssues.length,
      warning_count: warningIssues.length,
      snapshot_id: snapshotId || "N/A",
    },
  });
}
