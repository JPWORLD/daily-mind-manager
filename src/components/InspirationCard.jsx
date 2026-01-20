import React, { useState, useRef } from 'react';

export default function InspirationCard({ item, onRemove, onSubscribe }) {
  const [dragX, setDragX] = useState(0);
  const startX = useRef(null);

  const handleTouchStart = (e) => { startX.current = e.touches[0].clientX; };
  const handleTouchMove = (e) => { if (startX.current === null) return; setDragX(e.touches[0].clientX - startX.current); };
  const handleTouchEnd = () => {
    if (dragX > 80) { if (onRemove) onRemove(item.id, 'right'); }
    else if (dragX < -80) { if (onRemove) onRemove(item.id, 'left'); }
    setDragX(0); startX.current = null;
  };

  const share = async () => {
    const text = `${item.title} — via Daily Mind Manager`;
    try {
      if (navigator.share) await navigator.share({ title: item.title, text, url: window.location.href });
      else { await navigator.clipboard.writeText(text); alert('Copied to clipboard'); }
    } catch (e) { console.error('share failed', e); }
  };

  return (
    <div
      className="w-full rounded-2xl overflow-hidden shadow-lg relative touch-pan-y"
      style={{ transform: `translateX(${dragX}px)` }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="h-44 bg-cover bg-center flex items-end p-4" style={{ backgroundImage: `url(${item.image || '/pwa-192.svg'})` }}>
        <div className="backdrop-blur-sm bg-white/60 p-3 rounded-md w-full">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">{item.title}</div>
            <div className="flex items-center gap-2">
              <button onClick={share} className="p-2 bg-white rounded">Share</button>
              <button onClick={() => onSubscribe && onSubscribe(item.id)} className="p-2 bg-indigo-600 text-white rounded">Subscribe</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
