import React, { useEffect } from 'react';

export default function AdSlot({ client, slot, style }) {
  useEffect(() => {
    try {
      if (window.adsbygoogle && Array.isArray(window.adsbygoogle)) {
        // request rendering
        window.adsbygoogle.push({});
      }
    } catch (e) { console.error('adslot render failed', e); }
  }, []);

  if (!client || !slot) return (
    <div className="w-full p-4 bg-slate-50 rounded text-center text-xs text-slate-500">Ad placeholder</div>
  );

  return (
    <div className="w-full flex justify-center">
      <ins className="adsbygoogle"
        style={style || { display: 'block' }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"></ins>
    </div>
  );
}
