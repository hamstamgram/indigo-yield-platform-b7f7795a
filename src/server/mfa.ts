export type TotpStatus = 'disabled'|'pending'|'enabled';
export type InitTotp = { otpauth_url: string; secret_masked?: string };

const API = {
  status: '/api/mfa/totp/status',
  init: '/api/mfa/totp/initiate',
  verify: '/api/mfa/totp/verify',
  disable: '/api/mfa/totp/disable'
};

async function j<T>(r: Response): Promise<T>{ if(!r.ok) throw new Error(await r.text()); return r.json(); }

export async function getTotpStatus(): Promise<{ status: TotpStatus }>{
  try { const r = await fetch(API.status, { credentials: 'include' }); return j(r); } catch { return { status: 'disabled' }; }
}
export async function initTotp(): Promise<InitTotp>{
  // Server should create a fresh secret, store it server-side, return otpauth_url (and optionally masked secret)
  const r = await fetch(API.init, { method: 'POST', credentials: 'include' }); return j(r);
}
export async function verifyTotp(code: string): Promise<{ enabled: boolean }>{
  const r = await fetch(API.verify, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ code }) }); return j(r);
}
export async function disableTotp(code: string): Promise<{ disabled: boolean }>{
  const r = await fetch(API.disable, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ code }) }); return j(r);
}
