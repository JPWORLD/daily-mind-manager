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

export default function Pomodoro({ onSessionComplete }) {
  const [mode, setMode] = useState('work'); // work, shortBreak, longBreak
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [remaining, setRemaining] = useState(DEFAULT_CONFIG.work);
  const [running, setRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const intervalRef = useRef(null);

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

  useEffect(() => {
    localStorage.setItem('pomoState', JSON.stringify({ mode, remaining, completedSessions, config, soundEnabled }));
  }, [mode, remaining, completedSessions]);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(intervalRef.current);
          setRunning(false);
          handlePeriodEnd();
          return 0;
        }
        return r - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [running]);

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
      if (soundEnabled) playBeep();
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
          <button onClick={() => setShowSettings(s => !s)} className="text-xs text-indigo-600">{showSettings ? 'Close' : 'Settings'}</button>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={soundEnabled} onChange={(e)=>{ setSoundEnabled(e.target.checked); localStorage.setItem('pomoState', JSON.stringify({ mode, remaining, completedSessions, config, soundEnabled: e.target.checked })); }} /> Sound</label>
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
            <div className="mt-2 text-[10px] text-slate-500">Sessions before long break</div>
            <input type="number" min="1" value={config.sessionsBeforeLongBreak} onChange={(e)=>{ const v = Math.max(1, Number(e.target.value)); saveConfig({ ...config, sessionsBeforeLongBreak: v }); }} className="w-24 p-1 rounded mt-1" />
          </div>
        )}
      </div>
    </div>
  );
}
