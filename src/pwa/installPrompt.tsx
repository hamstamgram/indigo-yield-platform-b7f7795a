import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string[] }>;
};

const DISMISS_KEY = 'pwaInstallDismissedUntil';
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const until = Number(localStorage.getItem(DISMISS_KEY) || 0);
    const now = Date.now();
    const onBeforeInstall = (e: Event) => {
      e.preventDefault?.();
      if (now < until) return; // still dismissed
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall as any);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall as any);
  }, []);

  if (!visible || !deferred) return null;

  const hideForAWhile = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_MS));
    setVisible(false);
    setDeferred(null);
  };

  const onInstall = async () => {
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } finally {
      hideForAWhile();
    }
  };

  return (
    <div style={{position:'fixed',bottom:16,left:0,right:0,display:'flex',justifyContent:'center',zIndex:50}}>
      <div style={{display:'flex',gap:8,alignItems:'center',padding:'10px 12px',borderRadius:12,boxShadow:'0 4px 16px rgba(0,0,0,0.12)',background:'#0f172a',color:'#fff'}}>
        <span>Install Indigo for a faster, app-like experience?</span>
        <button onClick={onInstall} style={{padding:'6px 10px',borderRadius:8,background:'#22c55e',color:'#0b0f1a',border:'none',cursor:'pointer'}}>Install</button>
        <button onClick={hideForAWhile} style={{padding:'6px 10px',borderRadius:8,background:'transparent',color:'#fff',border:'1px solid rgba(255,255,255,0.2)',cursor:'pointer'}}>Not now</button>
      </div>
    </div>
  );
}
