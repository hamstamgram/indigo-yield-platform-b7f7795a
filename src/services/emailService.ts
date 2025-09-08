import { supabase } from '@/lib/supabase';

interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  fromName?: string;
  replyTo?: string;
  tags?: string[];
}

interface MailerLiteResponse {
  success: boolean;
  data?: any;
  error?: string;
}

class EmailService {
  private apiKey: string;
  private baseUrl = 'https://api.mailerlite.com/api/v2';
  private isEnabled: boolean;

  constructor() {
    this.apiKey = import.meta.env.VITE_MAILERLITE_API_TOKEN || '';
    this.isEnabled = !!this.apiKey;
    
    if (!this.isEnabled) {
      console.warn('⚠️ MailerLite API key not configured. Email service disabled.');
    } else {
      console.log('✅ Email service initialized with MailerLite');
    }
  }

  /**
   * Send transactional email via MailerLite
   */
  async sendEmail(data: EmailData): Promise<MailerLiteResponse> {
    if (!this.isEnabled) {
      console.warn('Email service disabled. Skipping email to:', data.to);
      return { success: false, error: 'Email service not configured' };
    }

    try {
      // Log email activity to database
      await this.logEmailActivity({
        recipient: data.to,
        subject: data.subject,
        type: 'transactional',
        status: 'pending',
      });

      // Send via MailerLite API
      const response = await fetch(`${this.baseUrl}/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-MailerLite-ApiKey': this.apiKey,
        },
        body: JSON.stringify({
          type: 'regular',
          subject: data.subject,
          from: data.from || 'noreply@indigo.fund',
          from_name: data.fromName || 'Indigo Yield Platform',
          reply_to: data.replyTo || 'support@indigo.fund',
          content: data.html,
          plain_text: data.text || this.stripHtml(data.html),
          groups: [], // You can specify MailerLite groups here
        }),
      });

      const result = await response.json();

      if (response.ok) {
        await this.logEmailActivity({
          recipient: data.to,
          subject: data.subject,
          type: 'transactional',
          status: 'sent',
          metadata: { mailerlite_id: result.id },
        });

        return { success: true, data: result };
      } else {
        throw new Error(result.error || 'Failed to send email');
      }
    } catch (error) {
      console.error('Email sending failed:', error);
      
      await this.logEmailActivity({
        recipient: data.to,
        subject: data.subject,
        type: 'transactional',
        status: 'failed',
        metadata: { error: error.message },
      });

      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Send monthly statement email
   */
  async sendMonthlyStatement(
    investor: { email: string; firstName: string; lastName: string },
    statementUrl: string,
    month: string,
    year: number
  ): Promise<MailerLiteResponse> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1a1a2e; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .button { 
              display: inline-block; 
              padding: 12px 24px; 
              background: #4CAF50; 
              color: white; 
              text-decoration: none; 
              border-radius: 4px; 
              margin: 20px 0;
            }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Indigo Yield Platform</h1>
              <p>Monthly Statement Available</p>
            </div>
            <div class="content">
              <h2>Hello ${investor.firstName} ${investor.lastName},</h2>
              <p>Your monthly statement for ${month} ${year} is now available for download.</p>
              
              <p>This statement includes:</p>
              <ul>
                <li>Portfolio performance summary</li>
                <li>Transaction history</li>
                <li>Current holdings</li>
                <li>Yield calculations</li>
              </ul>
              
              <center>
                <a href="${statementUrl}" class="button">Download Statement</a>
              </center>
              
              <p><small>This link will expire in 7 days for security purposes. 
              You can always access your statements from your dashboard.</small></p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Indigo Yield Platform. All rights reserved.</p>
              <p>This is an automated email. Please do not reply directly to this message.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: investor.email,
      subject: `Your Indigo Yield Statement - ${month} ${year}`,
      html,
      tags: ['statement', 'monthly', `${month}-${year}`],
    });
  }

  /**
   * Send deposit confirmation email
   */
  async sendDepositConfirmation(
    investor: { email: string; firstName: string },
    amount: number,
    currency: string,
    transactionId: string
  ): Promise<MailerLiteResponse> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1a1a2e; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .amount { font-size: 24px; color: #4CAF50; font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Deposit Confirmed</h1>
            </div>
            <div class="content">
              <h2>Hello ${investor.firstName},</h2>
              <p>We have successfully received your deposit:</p>
              
              <center>
                <p class="amount">${currency} ${amount.toLocaleString()}</p>
              </center>
              
              <p><strong>Transaction ID:</strong> ${transactionId}</p>
              <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
              
              <p>Your funds will be allocated according to your investment strategy 
              and will begin earning yields immediately.</p>
              
              <p>You can view this transaction in your dashboard at any time.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Indigo Yield Platform. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: investor.email,
      subject: `Deposit Confirmed - ${currency} ${amount.toLocaleString()}`,
      html,
      tags: ['deposit', 'confirmation'],
    });
  }

  /**
   * Send withdrawal processed email
   */
  async sendWithdrawalProcessed(
    investor: { email: string; firstName: string },
    amount: number,
    currency: string,
    transactionId: string,
    bankDetails?: string
  ): Promise<MailerLiteResponse> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1a1a2e; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .amount { font-size: 24px; color: #f44336; font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Withdrawal Processed</h1>
            </div>
            <div class="content">
              <h2>Hello ${investor.firstName},</h2>
              <p>Your withdrawal request has been processed:</p>
              
              <center>
                <p class="amount">${currency} ${amount.toLocaleString()}</p>
              </center>
              
              <p><strong>Transaction ID:</strong> ${transactionId}</p>
              <p><strong>Processing Date:</strong> ${new Date().toLocaleString()}</p>
              ${bankDetails ? `<p><strong>Sent to:</strong> ${bankDetails}</p>` : ''}
              
              <p>Funds typically arrive within 1-3 business days depending on your bank.</p>
              
              <p>If you have any questions about this withdrawal, please contact support.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Indigo Yield Platform. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: investor.email,
      subject: `Withdrawal Processed - ${currency} ${amount.toLocaleString()}`,
      html,
      tags: ['withdrawal', 'processed'],
    });
  }

  /**
   * Send system notification email
   */
  async sendSystemNotification(
    recipients: string[],
    subject: string,
    message: string,
    priority: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<MailerLiteResponse[]> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { 
              background: ${priority === 'high' ? '#f44336' : '#1a1a2e'}; 
              color: white; 
              padding: 20px; 
              text-align: center; 
            }
            .content { padding: 20px; background: #f9f9f9; }
            .priority { 
              display: inline-block; 
              padding: 4px 8px; 
              background: ${priority === 'high' ? '#f44336' : priority === 'medium' ? '#ff9800' : '#4CAF50'}; 
              color: white; 
              border-radius: 4px; 
              font-size: 12px; 
            }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>System Notification</h1>
              <span class="priority">${priority.toUpperCase()} PRIORITY</span>
            </div>
            <div class="content">
              <h2>${subject}</h2>
              <div>${message}</div>
              <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Indigo Yield Platform. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const results = await Promise.all(
      recipients.map(email =>
        this.sendEmail({
          to: email,
          subject: `[${priority.toUpperCase()}] ${subject}`,
          html,
          tags: ['system', 'notification', priority],
        })
      )
    );

    return results;
  }

  /**
   * Log email activity to database
   */
  private async logEmailActivity(data: {
    recipient: string;
    subject: string;
    type: string;
    status: string;
    metadata?: any;
  }) {
    try {
      await supabase.from('email_logs').insert({
        recipient: data.recipient,
        subject: data.subject,
        type: data.type,
        status: data.status,
        metadata: data.metadata || {},
        sent_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log email activity:', error);
    }
  }

  /**
   * Strip HTML tags from content
   */
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim();
  }

  /**
   * Test email configuration
   */
  async testConfiguration(): Promise<{ success: boolean; message: string }> {
    if (!this.isEnabled) {
      return { 
        success: false, 
        message: 'MailerLite API key not configured' 
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/groups`, {
        method: 'GET',
        headers: {
          'X-MailerLite-ApiKey': this.apiKey,
        },
      });

      if (response.ok) {
        return { 
          success: true, 
          message: 'MailerLite connection successful' 
        };
      } else {
        throw new Error('Invalid API key or connection failed');
      }
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Connection test failed' 
      };
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();

// Export convenience functions
export const sendMonthlyStatement = emailService.sendMonthlyStatement.bind(emailService);
export const sendDepositConfirmation = emailService.sendDepositConfirmation.bind(emailService);
export const sendWithdrawalProcessed = emailService.sendWithdrawalProcessed.bind(emailService);
export const sendSystemNotification = emailService.sendSystemNotification.bind(emailService);
