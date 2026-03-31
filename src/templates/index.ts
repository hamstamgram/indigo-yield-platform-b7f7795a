/**
 * Transactional Email Template Factory
 * All templates follow the Indigo brand system (Montserrat, #edf0fe header, #4f46e5 CTA)
 *
 * Usage:
 *   import { renderTemplate } from '@/templates';
 *   const html = renderTemplate('invite-investor', { INVESTOR_NAME: 'João', ... });
 */

// ─── Template imports (Vite raw string imports) ───────────────────────────
import inviteInvestorHtml from "./invite-investor.html?raw";
import passwordResetHtml from "./password-reset.html?raw";
import welcomeHtml from "./welcome.html?raw";
import statementReadyHtml from "./statement-ready.html?raw";
import documentUploadedHtml from "./document-uploaded.html?raw";

// ─── Template variable maps ────────────────────────────────────────────────

export interface InviteInvestorVars {
  INVESTOR_NAME: string;
  INVESTOR_EMAIL: string;
  MANAGER_NAME: string;
  INVITATION_LINK: string;
  EXPIRY_DATE: string;
  YEAR?: string;
  PRIVACY_URL?: string;
  TERMS_URL?: string;
}

export interface PasswordResetVars {
  USER_EMAIL: string;
  RESET_LINK: string;
  REQUEST_TIME: string;
  REQUEST_IP: string;
  YEAR?: string;
  PRIVACY_URL?: string;
  TERMS_URL?: string;
}

export interface WelcomeVars {
  INVESTOR_NAME: string;
  DASHBOARD_URL: string;
  YEAR?: string;
  PRIVACY_URL?: string;
  TERMS_URL?: string;
}

export interface StatementReadyVars {
  INVESTOR_NAME: string;
  PERIOD_LABEL: string;
  NAV_VALUE: string;
  ACCRUED_YIELD: string;
  YTD_RETURN: string;
  VIEW_STATEMENT_URL: string;
  DOWNLOAD_PDF_URL: string;
  YEAR?: string;
  PRIVACY_URL?: string;
  TERMS_URL?: string;
  UNSUBSCRIBE_URL?: string;
}

export interface DocumentUploadedVars {
  DOCUMENT_NAME: string;
  DOCUMENT_TYPE: string;
  UPLOAD_DATE: string;
  DOCUMENT_URL: string;
  MANAGER_NOTE?: string;
  YEAR?: string;
  PRIVACY_URL?: string;
  TERMS_URL?: string;
  UNSUBSCRIBE_URL?: string;
}

export type TemplateVars =
  | InviteInvestorVars
  | PasswordResetVars
  | WelcomeVars
  | StatementReadyVars
  | DocumentUploadedVars;

export type TemplateName =
  | "invite-investor"
  | "password-reset"
  | "welcome"
  | "statement-ready"
  | "document-uploaded";

const TEMPLATES: Record<TemplateName, string> = {
  "invite-investor": inviteInvestorHtml,
  "password-reset": passwordResetHtml,
  welcome: welcomeHtml,
  "statement-ready": statementReadyHtml,
  "document-uploaded": documentUploadedHtml,
};

// ─── Defaults ─────────────────────────────────────────────────────────────

const DEFAULTS = {
  YEAR: new Date().getFullYear().toString(),
  PRIVACY_URL: "https://app.indigo-yield.com/privacy",
  TERMS_URL: "https://app.indigo-yield.com/terms",
  UNSUBSCRIBE_URL: "https://app.indigo-yield.com/notifications",
  MANAGER_NOTE: "No additional note.",
};

// ─── Core renderer ────────────────────────────────────────────────────────

export function renderTemplate(name: TemplateName, vars: Record<string, string>): string {
  const raw = TEMPLATES[name];
  if (!raw) {
    throw new Error(`Template not found: ${name}`);
  }

  const merged = { ...DEFAULTS, ...vars };

  return Object.entries(merged).reduce((html, [key, value]) => {
    // Replace all occurrences of [KEY] with value
    return html.replaceAll(`[${key}]`, value ?? "");
  }, raw);
}

// ─── Subject line helpers ─────────────────────────────────────────────────

export const SUBJECTS: Record<TemplateName, (vars: Record<string, string>) => string> = {
  "invite-investor": (v) => `You've been invited to Indigo, ${v.INVESTOR_NAME}`,
  "password-reset": () => "Reset your Indigo password",
  welcome: (v) => `Welcome to Indigo, ${v.INVESTOR_NAME}`,
  "statement-ready": (v) => `Your ${v.PERIOD_LABEL} statement is ready`,
  "document-uploaded": (v) => `New document: ${v.DOCUMENT_NAME}`,
};

export function getSubject(name: TemplateName, vars: Record<string, string>): string {
  return SUBJECTS[name](vars);
}
