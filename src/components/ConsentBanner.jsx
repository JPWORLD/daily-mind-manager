import React, { useEffect, useState } from 'react';

export default function ConsentBanner({ onConsentChange }) {
  const [visible, setVisible] = useState(() => !localStorage.getItem('ads_consent'));

  useEffect(() => {
    const v = !localStorage.getItem('ads_consent');
    setVisible(v);
  }, []);

  const accept = (persist=true) => {
    try { localStorage.setItem('ads_consent', 'granted'); } catch(e){}
    setVisible(false);
    if (typeof onConsentChange === 'function') onConsentChange(true);
  };

  const decline = () => {
    try { localStorage.setItem('ads_consent', 'denied'); } catch(e){}
    setVisible(false);
    if (typeof onConsentChange === 'function') onConsentChange(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto bg-white border rounded-xl p-4 shadow-lg z-50">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="text-sm font-bold">We use cookies & ads</div>
          <div className="text-xs text-slate-600">We use analytics and ads to keep the app free. Allow personalized ads and analytics?</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={decline} className="px-3 py-1 rounded bg-slate-100 text-sm">No</button>
          <button onClick={() => accept()} className="px-3 py-1 rounded bg-indigo-600 text-white text-sm">Yes</button>
        </div>
      </div>
    </div>
  );
}
