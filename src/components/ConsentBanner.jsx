import React, { useEffect, useState } from 'react';

export default function ConsentBanner({ onConsentChange }) {
  const [visible, setVisible] = useState(() => {
    // show if neither consent key is present
    return !(localStorage.getItem('analytics_consent') || localStorage.getItem('ads_personalization'));
  });

  useEffect(() => {
    const v = !(localStorage.getItem('analytics_consent') || localStorage.getItem('ads_personalization'));
    setVisible(v);
  }, []);

  const setConsents = (analyticsGranted, adsGranted) => {
    try { localStorage.setItem('analytics_consent', analyticsGranted ? 'granted' : 'denied'); } catch(e){}
    try { localStorage.setItem('ads_personalization', adsGranted ? 'granted' : 'denied'); } catch(e){}
    setVisible(false);
    if (typeof onConsentChange === 'function') onConsentChange({ analytics: !!analyticsGranted, ads: !!adsGranted });
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto bg-white border rounded-xl p-4 shadow-lg z-50">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="text-sm font-bold">We use cookies & ads</div>
          <div className="text-xs text-slate-600">We use analytics and ads to keep the app free. Choose what you allow.</div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button onClick={() => setConsents(false, false)} className="px-3 py-1 rounded bg-slate-100 text-sm">Reject All</button>
          <button onClick={() => setConsents(true, false)} className="px-3 py-1 rounded bg-slate-200 text-sm">Analytics Only</button>
          <button onClick={() => setConsents(true, true)} className="px-3 py-1 rounded bg-indigo-600 text-white text-sm">Allow Personalized Ads</button>
        </div>
      </div>
      <div className="mt-3 text-[11px] text-slate-500">You can change these later in Settings. Privacy: <a href="/privacy.html" className="underline">privacy</a>.</div>
    </div>
  );
}
