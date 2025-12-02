import React from "react";
import { getTotpStatus, initTotp, verifyTotp, disableTotp } from "@/services/auth/mfaService";

type State = {
  status: "disabled" | "pending" | "enabled";
  otpauthUrl?: string;
  code: string;
  busy: boolean;
  error?: string;
  info?: string;
};

export default function TOTPManagement() {
  const [s, setS] = React.useState<State>({ status: "disabled", code: "", busy: false });

  React.useEffect(() => {
    (async () => {
      try {
        const res = await getTotpStatus();
        setS((x) => ({ ...x, status: res.status }));
      } catch {
        /* keep disabled */
      }
    })();
  }, []);

  const begin = async () => {
    setS((x) => ({ ...x, busy: true, error: undefined, info: undefined }));
    try {
      const res = await initTotp();
      setS((x) => ({
        ...x,
        status: "pending",
        otpauthUrl: res.otpauth_url,
        busy: false,
        info: "Scan the QR with your authenticator, then enter the 6-digit code.",
      }));
    } catch (e: any) {
      setS((x) => ({ ...x, busy: false, error: e.message || "Failed to start TOTP enrollment." }));
    }
  };

  const verify = async () => {
    if (!s.code) return;
    setS((x) => ({ ...x, busy: true, error: undefined, info: undefined }));
    try {
      const ok = await verifyTotp(s.code);
      if (ok.enabled)
        setS((x) => ({
          ...x,
          status: "enabled",
          busy: false,
          code: "",
          info: "Two-factor authentication is now enabled.",
        }));
      else setS((x) => ({ ...x, busy: false, error: "Verification failed. Try again." }));
    } catch (e: any) {
      setS((x) => ({ ...x, busy: false, error: e.message || "Verification failed." }));
    }
  };

  const disable = async () => {
    if (!s.code) return;
    setS((x) => ({ ...x, busy: true, error: undefined, info: undefined }));
    try {
      const ok = await disableTotp(s.code);
      if (ok.disabled)
        setS({
          status: "disabled",
          code: "",
          busy: false,
          info: "Two-factor authentication disabled.",
        });
      else setS((x) => ({ ...x, busy: false, error: "Disable failed. Check code." }));
    } catch (e: any) {
      setS((x) => ({ ...x, busy: false, error: e.message || "Disable failed." }));
    }
  };

  const QR = () => {
    if (!s.otpauthUrl) return null;
    // Render a QR without extra deps by using an <img> to Google Chart API as a fallback. Consider CSP.
    const url =
      "https://chart.googleapis.com/chart?chs=220x220&cht=qr&chl=" +
      encodeURIComponent(s.otpauthUrl);
    return <img alt="TOTP QR" src={url} width={220} height={220} style={{ borderRadius: 8 }} />;
  };

  return (
    <div className="p-4 border rounded-xl space-y-3">
      <h2 className="text-xl font-semibold">Two-Factor Authentication (TOTP)</h2>
      {s.error && <div className="text-red-600 text-sm">{s.error}</div>}
      {s.info && <div className="text-green-700 text-sm">{s.info}</div>}

      {s.status === "disabled" && (
        <div className="space-y-2">
          <p className="text-sm text-slate-600">
            Add a second step to your sign-in using an authenticator app (e.g., Google
            Authenticator, 1Password, Authy).
          </p>
          <button
            onClick={begin}
            disabled={s.busy}
            className="px-4 py-2 rounded bg-slate-900 text-white disabled:opacity-50"
          >
            Enable 2FA
          </button>
        </div>
      )}

      {s.status === "pending" && (
        <div className="space-y-3">
          <div className="flex gap-4 items-center flex-wrap">
            <QR />
            <div className="text-sm text-slate-600 max-w-sm">
              Scan the QR in your authenticator app. If you cannot scan, copy the code from your
              app's manual entry using the same account name shown there.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={s.code}
              onChange={(e) => setS((x) => ({ ...x, code: e.target.value }))}
              placeholder="Enter 6-digit code"
              className="border rounded px-3 py-2 w-40 tracking-widest"
            />
            <button
              onClick={verify}
              disabled={s.busy || s.code.length !== 6}
              className="px-4 py-2 rounded bg-emerald-600 text-white disabled:opacity-50"
            >
              Verify & Enable
            </button>
          </div>
        </div>
      )}

      {s.status === "enabled" && (
        <div className="space-y-2">
          <div className="text-sm text-slate-700">2FA is enabled on your account.</div>
          <div className="flex items-center gap-2">
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={s.code}
              onChange={(e) => setS((x) => ({ ...x, code: e.target.value }))}
              placeholder="Enter current 6-digit code"
              className="border rounded px-3 py-2 w-48 tracking-widest"
            />
            <button
              onClick={disable}
              disabled={s.busy || s.code.length !== 6}
              className="px-4 py-2 rounded bg-red-600 text-white disabled:opacity-50"
            >
              Disable 2FA
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
