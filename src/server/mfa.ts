import { supabase } from "@/integrations/supabase/client";

export type TotpStatus = "disabled" | "pending" | "enabled";
export type InitTotp = { otpauth_url: string; secret_masked?: string };

async function callMfaFunction<T>(functionName: string, body?: any): Promise<T> {
  const { data, error } = await supabase.functions.invoke(functionName, {
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (error) {
    throw new Error(error.message || "MFA function call failed");
  }

  return data;
}

export async function getTotpStatus(): Promise<{ status: TotpStatus }> {
  try {
    return await callMfaFunction("mfa-totp-status");
  } catch {
    return { status: "disabled" };
  }
}

export async function initTotp(): Promise<InitTotp> {
  return await callMfaFunction("mfa-totp-initiate", {});
}

export async function verifyTotp(code: string): Promise<{ enabled: boolean }> {
  return await callMfaFunction("mfa-totp-verify", { code });
}

export async function disableTotp(code: string): Promise<{ disabled: boolean }> {
  return await callMfaFunction("mfa-totp-disable", { code });
}
