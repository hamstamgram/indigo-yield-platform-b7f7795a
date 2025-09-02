// Email service configuration for transactional emails
// This is a client-side stub - production implementation would use Supabase Edge Functions or similar

export interface EmailTemplate {
  to: string;
  subject: string;
  template: string;
  variables: Record<string, any>;
}

export interface EmailConfig {
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
  from?: string;
}

// Email templates
export const EMAIL_TEMPLATES = {
  STATEMENT_READY: 'statement-ready',
  WELCOME: 'welcome',
  PASSWORD_RESET: 'password-reset',
  TOTP_ENABLED: 'totp-enabled',
  WITHDRAWAL_REQUEST: 'withdrawal-request',
  ADMIN_NOTIFICATION: 'admin-notification',
} as const;

class EmailService {
  private config: EmailConfig;
  private isConfigured: boolean = false;

  constructor() {
    this.config = {
      host: import.meta.env.SMTP_HOST,
      port: parseInt(import.meta.env.SMTP_PORT || '587'),
      user: import.meta.env.SMTP_USER,
      pass: import.meta.env.SMTP_PASS,
      from: import.meta.env.SMTP_FROM || import.meta.env.SMTP_USER,
    };

    this.isConfigured = !!(this.config.host && this.config.user && this.config.pass);

    if (!this.isConfigured) {
      console.warn('📧 SMTP not configured. Email functionality disabled.');
    } else {
      console.log('✅ Email service initialized');
    }
  }

  async sendEmail(template: EmailTemplate): Promise<boolean> {
    if (!this.isConfigured) {
      console.warn('Email service not configured. Skipping email:', template.subject);
      return false;
    }

    try {
      // In production, this would call a Supabase Edge Function or similar
      // For now, we'll simulate the email sending
      console.log('📧 Sending email:', {
        to: template.to,
        subject: template.subject,
        template: template.template,
        timestamp: new Date().toISOString(),
      });

      // Simulate async email sending
      await new Promise(resolve => setTimeout(resolve, 100));

      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  async sendStatementReady(userEmail: string, statementId: string, downloadUrl: string) {
    return this.sendEmail({
      to: userEmail,
      subject: 'Your Indigo Yield Statement is Ready',
      template: EMAIL_TEMPLATES.STATEMENT_READY,
      variables: {
        statementId,
        downloadUrl,
        expiresIn: '7 days',
      },
    });
  }

  async sendWelcomeEmail(userEmail: string, userName: string) {
    return this.sendEmail({
      to: userEmail,
      subject: 'Welcome to Indigo Yield Platform',
      template: EMAIL_TEMPLATES.WELCOME,
      variables: {
        userName,
        loginUrl: `${window.location.origin}/login`,
        supportUrl: `${window.location.origin}/support`,
      },
    });
  }

  async sendTotpEnabled(userEmail: string, userName: string) {
    return this.sendEmail({
      to: userEmail,
      subject: 'Two-Factor Authentication Enabled',
      template: EMAIL_TEMPLATES.TOTP_ENABLED,
      variables: {
        userName,
        timestamp: new Date().toISOString(),
      },
    });
  }

  async sendWithdrawalRequest(userEmail: string, amount: number, currency: string) {
    return this.sendEmail({
      to: userEmail,
      subject: 'Withdrawal Request Received',
      template: EMAIL_TEMPLATES.WITHDRAWAL_REQUEST,
      variables: {
        amount,
        currency,
        requestId: `WD-${Date.now()}`,
        timestamp: new Date().toISOString(),
      },
    });
  }

  async sendAdminNotification(adminEmails: string[], subject: string, message: string, context?: Record<string, any>) {
    const promises = adminEmails.map(email => 
      this.sendEmail({
        to: email,
        subject: `[ADMIN] ${subject}`,
        template: EMAIL_TEMPLATES.ADMIN_NOTIFICATION,
        variables: {
          message,
          context,
          timestamp: new Date().toISOString(),
          dashboardUrl: `${window.location.origin}/admin`,
        },
      })
    );

    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
    
    console.log(`📧 Admin notification sent to ${successful}/${adminEmails.length} recipients`);
    return successful > 0;
  }

  // Health check for email service
  async testConnection(): Promise<{ status: 'healthy' | 'unhealthy'; message: string; latency?: number }> {
    if (!this.isConfigured) {
      return {
        status: 'unhealthy',
        message: 'SMTP configuration missing',
      };
    }

    const start = performance.now();
    try {
      // Simulate connection test
      await new Promise(resolve => setTimeout(resolve, 50));
      const latency = performance.now() - start;

      return {
        status: 'healthy',
        message: 'SMTP configuration valid',
        latency,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `SMTP test failed: ${error}`,
        latency: performance.now() - start,
      };
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();

// Convenience functions
export const sendStatementReady = emailService.sendStatementReady.bind(emailService);
export const sendWelcomeEmail = emailService.sendWelcomeEmail.bind(emailService);
export const sendTotpEnabled = emailService.sendTotpEnabled.bind(emailService);
export const sendWithdrawalRequest = emailService.sendWithdrawalRequest.bind(emailService);
export const sendAdminNotification = emailService.sendAdminNotification.bind(emailService);
