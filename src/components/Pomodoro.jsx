import React, { useEffect, useRef, useState } from 'react';

const DEFAULT_CONFIG = {
  work: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
  sessionsBeforeLongBreak: 4
};

function formatTime(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function Pomodoro({ onSessionComplete, t: _t }) {
  const [mode, setMode] = useState('work'); // work, shortBreak, longBreak
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [remaining, setRemaining] = useState(DEFAULT_CONFIG.work);
  const [running, setRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [ambient, setAmbient] = useState(localStorage.getItem('pomoAmbient') || 'none'); // none | rain | sea
  const [ambientVolume, setAmbientVolume] = useState(Number(localStorage.getItem('pomoAmbientVol') || 0.3));
  const [alarm, setAlarm] = useState(localStorage.getItem('pomoAlarm') || 'beep'); // 'beep' | 'chime' | 'custom'
  const [alarmVol, setAlarmVol] = useState(Number(localStorage.getItem('pomoAlarmVol') || 1));
  const [customAlarmUrl, setCustomAlarmUrl] = useState(localStorage.getItem('pomoAlarmCustom') || '');
  const [customAlarmName, setCustomAlarmName] = useState(localStorage.getItem('pomoAlarmCustomName') || '');
  const intervalRef = useRef(null);
  const audioCtxRef = useRef(null);
  const ambientNodesRef = useRef(null);

  // Load state from localStorage (MVP persistence)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('pomoState');
      if (raw) {
        const s = JSON.parse(raw);
        setMode(s.mode || 'work');
        setRemaining(s.remaining ?? DEFAULT_CONFIG.work);
        setCompletedSessions(s.completedSessions || 0);
        if (s.config) setConfig(s.config);
        if (typeof s.soundEnabled === 'boolean') setSoundEnabled(s.soundEnabled);
      }
    } catch {}
  }, []);

  // ensure AudioContext exists
  useEffect(() => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {}
  }, []);

  // ambient sound management (prefers /ambient assets, falls back to procedural noise)
  useEffect(() => {
    const ctx = audioCtxRef.current;
    // stop existing ambient
    if (ambientNodesRef.current) {
      try { if (ambientNodesRef.current.source && typeof ambientNodesRef.current.source.pause === 'function') ambientNodesRef.current.source.pause(); } catch (e) {}
      try { if (ambientNodesRef.current.gain && ambientNodesRef.current.gain.gain) ambientNodesRef.current.gain.gain.cancelScheduledValues(0); } catch (e) {}
      ambientNodesRef.current = null;
    }
    if (ambient === 'none') return;

    const tryUseAsset = async (name) => {
      try {
        const res = await fetch(`/ambient/${name}`, { method: 'HEAD' });
        return res.ok;
      } catch (e) { return false; }
    };

    (async () => {
      const assetName = ambient === 'rain' ? 'rain.mp3' : ambient === 'sea' ? 'sea.mp3' : null;
      if (assetName && await tryUseAsset(assetName)) {
        try {
          const audio = new Audio(`/ambient/${assetName}`);
          audio.loop = true;
          audio.volume = ambientVolume;
          await audio.play().catch(()=>{});
          ambientNodesRef.current = { source: audio, gain: { gain: { cancelScheduledValues: ()=>{} } } };
          localStorage.setItem('pomoAmbient', ambient);
          localStorage.setItem('pomoAmbientVol', String(ambientVolume));
          return;
        } catch (e) {
          // fallback to procedural
        }
      }

      if (!ctx) return;
      // fallback: create noise buffer
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3;

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      if (ambient === 'rain') {
        filter.type = 'highpass';
        filter.frequency.value = 800;
      } else if (ambient === 'sea') {
        filter.type = 'lowpass';
        filter.frequency.value = 800;
      }

      const gain = ctx.createGain();
      gain.gain.value = ambientVolume;

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start();
      ambientNodesRef.current = { source, filter, gain };
      localStorage.setItem('pomoAmbient', ambient);
      localStorage.setItem('pomoAmbientVol', String(ambientVolume));
    })();

    return () => {
      try { if (ambientNodesRef.current && ambientNodesRef.current.source && typeof ambientNodesRef.current.source.pause === 'function') ambientNodesRef.current.source.pause(); } catch (e) {}
      ambientNodesRef.current = null;
    };
  }, [ambient, ambientVolume]);

  const handlePeriodEnd = () => {
    // notify (desktop notifications)
    try {
      if (Notification && Notification.permission === 'granted') {
        new Notification('Pomodoro', { body: mode === 'work' ? 'Work session complete' : 'Break over' });
      }
    } catch (e) {}

    // vibration (if supported)
    try { if (navigator.vibrate) navigator.vibrate(200); } catch (e) {}

    // sound (WebAudio beep)
    try {
      if (soundEnabled) playAlarm();
    } catch (e) {}

    if (mode === 'work') {
      const nextCount = completedSessions + 1;
      setCompletedSessions(nextCount);
      if (onSessionComplete) onSessionComplete(nextCount);
      if (nextCount % config.sessionsBeforeLongBreak === 0) {
        setMode('longBreak');
        setRemaining(config.longBreak);
      } else {
        setMode('shortBreak');
        setRemaining(config.shortBreak);
      }
    } else {
      setMode('work');
      setRemaining(config.work);
    }
  };

  const start = () => {
    if (remaining <= 0) return;
    setRunning(true);
  };

  const pause = () => {
    setRunning(false);
    clearInterval(intervalRef.current);
  };

  const reset = () => {
    setRunning(false);
    clearInterval(intervalRef.current);
    setMode('work');
    setRemaining(config.work);
    setCompletedSessions(0);
  };

  const requestNotification = async () => {
    try {
      if ('Notification' in window && Notification.permission !== 'granted') {
        await Notification.requestPermission();
      }
    } catch {}
  };

  const saveConfig = (newConfig) => {
    setConfig(newConfig);
    // apply durations immediately if currently on that mode
    if (mode === 'work') setRemaining(newConfig.work);
    if (mode === 'shortBreak') setRemaining(newConfig.shortBreak);
    if (mode === 'longBreak') setRemaining(newConfig.longBreak);
    localStorage.setItem('pomoConfig', JSON.stringify(newConfig));
    localStorage.setItem('pomoState', JSON.stringify({ mode, remaining, completedSessions, config: newConfig, soundEnabled }));
  };

  // alarm play supporting beep, chime, or custom audio
  const playAlarm = async () => {
    try {
      const stored = localStorage.getItem('pomoAlarm') || 'beep';
      const vol = Number(localStorage.getItem('pomoAlarmVol') || 1);
      if (stored === 'beep') return playBeep();
      if (stored === 'chime') {
        // small chime via WebAudio (harmonic)
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'triangle';
        o.frequency.value = 880;
        g.gain.value = 0.0001;
        o.connect(g);
        g.connect(ctx.destination);
        g.gain.exponentialRampToValueAtTime(vol * 0.2, ctx.currentTime + 0.01);
        o.start();
        g.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 1.2);
        setTimeout(()=>{ try { o.stop(); ctx.close(); } catch(e){} }, 1400);
        return;
      }
      // custom (object URL stored separately)
      if (stored === 'custom') {
        const url = localStorage.getItem('pomoAlarmCustom');
        if (url) {
          const a = new Audio(url);
          a.volume = vol;
          a.play().catch(()=>{});
          return;
        }
      }
    } catch(e) { console.error('playAlarm failed', e); }
  };

  // simple beep via WebAudio
  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = 880;
      g.gain.value = 0.0001;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.5);
      setTimeout(() => { try { o.stop(); ctx.close(); } catch (e) {} }, 700);
    } catch (e) { console.error('beep failed', e); }
  };

    const handleAlarmFile = (e) => {
      try {
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        const url = URL.createObjectURL(f);
        setCustomAlarmUrl(url);
        setAlarm('custom');
        try { localStorage.setItem('pomoAlarmCustom', url); } catch (e) {}
        try { localStorage.setItem('pomoAlarm', 'custom'); } catch (e) {}
        try { setCustomAlarmName(f.name || 'custom'); localStorage.setItem('pomoAlarmCustomName', f.name || 'custom'); } catch (e) {}
      } catch (e) { console.error('alarm upload', e); }
    };

    const t = (a,b) => {
      if (typeof _t === 'function') return _t(a,b);
      return a;
    };

  return (
    <div className="bg-white p-4 rounded-2xl shadow mt-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold">Pomodoro</h3>
          <p className="text-xs text-slate-400">Work focused sessions with short breaks</p>
        </div>
        <div className="text-xs text-slate-500">Completed: <span className="font-bold">{completedSessions}</span></div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <div className="text-3xl font-mono">{formatTime(remaining)}</div>
        <div className="flex gap-2">
          {!running ? (
            <button onClick={start} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Start</button>
          ) : (
            <button onClick={pause} className="px-4 py-2 bg-yellow-400 text-white rounded-lg">Pause</button>
          )}
          <button onClick={reset} className="px-4 py-2 bg-slate-100 rounded-lg">Reset</button>
          <button onClick={requestNotification} className="px-3 py-2 bg-slate-100 rounded-lg text-xs">Notify</button>
        </div>
        <div className="flex gap-2 text-xs mt-2">
          <button onClick={() => { setMode('work'); setRemaining(config.work); setRunning(false); }} className={`px-2 py-1 rounded ${mode==='work'?'bg-indigo-100':'bg-slate-50'}`}>Work</button>
          <button onClick={() => { setMode('shortBreak'); setRemaining(config.shortBreak); setRunning(false); }} className={`px-2 py-1 rounded ${mode==='shortBreak'?'bg-indigo-100':'bg-slate-50'}`}>Short</button>
          <button onClick={() => { setMode('longBreak'); setRemaining(config.longBreak); setRunning(false); }} className={`px-2 py-1 rounded ${mode==='longBreak'?'bg-indigo-100':'bg-slate-50'}`}>Long</button>
        </div>
        <div className="w-full mt-3 flex items-center justify-between">
            <button onClick={() => setShowSettings(s => !s)} className="text-xs text-indigo-600">{showSettings ? t('Close','बंद') : t('Settings','सेटिंग्स')}</button>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={soundEnabled} onChange={(e)=>{ setSoundEnabled(e.target.checked); localStorage.setItem('pomoState', JSON.stringify({ mode, remaining, completedSessions, config, soundEnabled: e.target.checked })); }} /> {t('Sound','ध्वनि')}</label>
        </div>
        {showSettings && (
          <div className="w-full mt-3 p-3 bg-slate-50 rounded-lg border">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <label className="block text-[10px] text-slate-500">Work (min)</label>
                <input type="number" min="1" value={Math.floor(config.work/60)} onChange={(e)=>{ const v = Math.max(1, Number(e.target.value)); saveConfig({ ...config, work: v*60 }); }} className="w-full p-1 rounded" />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500">Short (min)</label>
                <input type="number" min="1" value={Math.floor(config.shortBreak/60)} onChange={(e)=>{ const v = Math.max(1, Number(e.target.value)); saveConfig({ ...config, shortBreak: v*60 }); }} className="w-full p-1 rounded" />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500">Long (min)</label>
                <input type="number" min="1" value={Math.floor(config.longBreak/60)} onChange={(e)=>{ const v = Math.max(1, Number(e.target.value)); saveConfig({ ...config, longBreak: v*60 }); }} className="w-full p-1 rounded" />
              </div>
            </div>
            <div className="mt-2 text-[10px] text-slate-500">{t('Sessions before long break','लॉन्ग ब्रेक से पहले सत्र')}</div>
            <input type="number" min="1" value={config.sessionsBeforeLongBreak} onChange={(e)=>{ const v = Math.max(1, Number(e.target.value)); saveConfig({ ...config, sessionsBeforeLongBreak: v }); }} className="w-24 p-1 rounded mt-1" />

            <div className="mt-3 border-t pt-3 text-xs">
              <div className="mb-2 text-[11px] font-semibold text-slate-600">{t('Ambient','प्राकृतिक ध्वनि')}</div>
              <div className="flex items-center gap-2">
                <select value={ambient} onChange={(e)=>{ setAmbient(e.target.value); localStorage.setItem('pomoAmbient', e.target.value); }} className="p-1 rounded text-xs">
                  <option value="none">{t('None','नहीं')}</option>
                  <option value="rain">{t('Rain','बारिश')}</option>
                  <option value="sea">{t('Sea','समुद्र')}</option>
                </select>
                <div className="flex items-center gap-2">
                  <input type="range" min="0" max="1" step="0.01" value={ambientVolume} onChange={(e)=>{ const v = Number(e.target.value); setAmbientVolume(v); localStorage.setItem('pomoAmbientVol', String(v)); }} />
                  <div className="text-[11px] text-slate-500">Vol</div>
                </div>
              </div>
            </div>

            <div className="mt-3 border-t pt-3 text-xs">
              <div className="mb-2 text-[11px] font-semibold text-slate-600">{t('Alarm','अलार्म')}</div>
              <div className="flex items-center gap-2 mb-2">
                <select value={alarm} onChange={(e)=>{ setAlarm(e.target.value); try { localStorage.setItem('pomoAlarm', e.target.value); } catch(e){} }} className="p-1 rounded text-xs">
                  <option value="beep">{t('Beep','बिप')}</option>
                  <option value="chime">{t('Chime','घंटी')}</option>
                  <option value="custom">{customAlarmName ? `${t('Custom','कस्टम')} (${customAlarmName})` : t('Custom','कस्टम')}</option>
                </select>
                <div className="flex items-center gap-2">
                  <input type="range" min="0" max="1" step="0.01" value={alarmVol} onChange={(e)=>{ const v = Number(e.target.value); setAlarmVol(v); try{ localStorage.setItem('pomoAlarmVol', String(v)); }catch(e){} }} />
                  <div className="text-[11px] text-slate-500">Vol</div>
                </div>
              </div>
              <div className="text-[11px] text-slate-500">{t('Upload custom alarm (mp3, wav)','कस्टम अलार्म अपलोड (mp3, wav)')}</div>
              <input type="file" accept="audio/*" onChange={handleAlarmFile} className="mt-1 text-xs" />
              {customAlarmUrl && (
                <div className="mt-2 text-[11px]">
                  <div className="text-[11px] text-slate-600 mb-1">{t('Uploaded:','अपलोड किया गया:')} {customAlarmName || customAlarmUrl}</div>
                  <audio src={customAlarmUrl} controls className="w-full" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
