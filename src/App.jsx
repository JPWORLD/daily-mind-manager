import React, { useState, useEffect, useRef, Suspense } from 'react';
import { getQueue, pushQueue, popQueue, clearQueue } from './utils/persistence';
import { 
  PlusCircle, 
  CheckCircle2, 
  AlertCircle, 
  Music, 
  Car, 
  Cloud, 
  Smartphone, 
  Heart, 
  Trash2, 
  Save, 
  BrainCircuit,
  Smile,
  Frown,
  Meh,
  Settings,
  Download,
  Upload,
  RefreshCw,
  X,
  Check
} from 'lucide-react';
const Pomodoro = React.lazy(() => import('./components/Pomodoro'));

// Read Firebase config from Vite env (set VITE_FIREBASE_CONFIG to JSON string)
const firebaseConfig = (() => {
  try { return JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG || '{}'); } catch { return {}; }
})();
const appId = import.meta.env.VITE_APP_ID || 'default-app-id';
const INITIAL_AUTH_TOKEN = import.meta.env.VITE_INITIAL_AUTH_TOKEN || '';

const App = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [notifPermission, setNotifPermission] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'default');
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('daily');
  const [showSettings, setShowSettings] = useState(false);
  const [syncStatus, setSyncStatus] = useState('idle'); // idle, syncing, synced, error
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showScorecard, setShowScorecard] = useState(false);
  const [scoreRange, setScoreRange] = useState('7d');
  const [username, setUsername] = useState(localStorage.getItem('dmm_username') || '');
  const [lang, setLang] = useState(localStorage.getItem('dmm_lang') || 'en'); // 'en' | 'hi'
  const [temperature, setTemperature] = useState(null);
  const [themeMode, setThemeMode] = useState('default'); // e.g., sunny, rainy, sea, default
  const [greeting, setGreeting] = useState('');
  const [showAnalytics, setShowAnalytics] = useState(false);

  // derived accent classes so theme changes apply across components
  const accentBg = themeMode==='sunny' ? 'bg-yellow-500' : themeMode==='rainy' ? 'bg-blue-600' : themeMode==='sea' ? 'bg-teal-600' : 'bg-indigo-600';
  const accentText = themeMode==='sunny' ? 'text-yellow-500' : themeMode==='rainy' ? 'text-blue-500' : themeMode==='sea' ? 'text-teal-500' : 'text-indigo-600';
  const accentLight = themeMode==='sunny' ? 'bg-yellow-100' : themeMode==='rainy' ? 'bg-blue-100' : themeMode==='sea' ? 'bg-teal-100' : 'bg-indigo-100';
  const accent50 = themeMode==='sunny' ? 'bg-yellow-50' : themeMode==='rainy' ? 'bg-blue-50' : themeMode==='sea' ? 'bg-teal-50' : 'bg-indigo-50';
  const accentSoft = themeMode==='sunny' ? 'bg-yellow-400' : themeMode==='rainy' ? 'bg-blue-400' : themeMode==='sea' ? 'bg-teal-400' : 'bg-indigo-400';

  // App State
  const [mood, setMood] = useState(null);
  const [todayTask, setTodayTask] = useState("");
  const [isTaskDone, setIsTaskDone] = useState(false);
  const [noiseList, setNoiseList] = useState([]);
  const [holdItems, setHoldItems] = useState([
    { id: 1, title: "Guitar Seekhna", status: "Hold", icon: "Music" },
    { id: 2, title: "Car Seekhna/Lena", status: "Hold", icon: "Car" },
    { id: 3, title: "AWS Architect Level", status: "Hold", icon: "Cloud" },
    { id: 4, title: "iPhone & Investments", status: "Hold", icon: "Smartphone" }
  ]);
  const [noiseInput, setNoiseInput] = useState("");

  const fileInputRef = useRef(null);

  // 1. Authentication (Anonymous for "No Login" feel)
  useEffect(() => {
    let unsubAuth = null;
    const initAuth = async () => {
      try {
        const mod = await import('./firebase/lazy');
        await mod.init(firebaseConfig, appId);
        if (INITIAL_AUTH_TOKEN) {
          await mod.signInWithCustomTokenWrapper(INITIAL_AUTH_TOKEN);
        } else {
          await mod.signInAnonymouslyWrapper();
        }
        unsubAuth = mod.onAuthStateChanged(setUser);
      } catch (err) {
        console.error("Auth error", err);
      }
    };
    initAuth();
    return () => { if (unsubAuth) unsubAuth(); };
  }, []);

  // Load local app state before remote sync (offline-first)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('dmm_state_v1');
      if (raw) {
        const s = JSON.parse(raw);
        if (s.mood) setMood(s.mood);
        if (s.todayTask) setTodayTask(s.todayTask);
        if (s.isTaskDone !== undefined) setIsTaskDone(s.isTaskDone);
        if (s.noiseList) setNoiseList(s.noiseList);
        if (s.holdItems) setHoldItems(s.holdItems);
      }
      // ensure onboarding appears if username empty (do not rely on seen flag)
      if (!localStorage.getItem('dmm_username') || !localStorage.getItem('dmm_username').trim()) {
        setShowOnboarding(true);
      }
    } catch (e) {
      console.error('load local state failed', e);
    }
  }, []);

  // load greetings (try remote && cache fallback) and rotate index
  useEffect(() => {
    const local = localStorage.getItem('dmm_greetings');
    const pickFrom = (arr) => {
      if (!arr || !arr.length) return '';
      // prefer time-based greeting by hour
      const h = new Date().getHours();
      let candidates = arr.filter(q => !!q && typeof q === 'string');
      if (!candidates.length) candidates = arr.map(a=>a.text||a);
      const idxKey = 'dmm_greeting_index';
      let idx = Number(localStorage.getItem(idxKey) || 0) % candidates.length;
      const msg = candidates[idx];
      idx = (idx + 1) % candidates.length;
      localStorage.setItem(idxKey, String(idx));
      return msg || '';
    };

    (async () => {
      try {
        if (!local) {
          const res = await fetch('https://type.fit/api/quotes');
          if (res.ok) {
            const data = await res.json();
            const texts = data.slice(0, 40).map(d => (d && d.text) ? d.text : '').filter(Boolean);
            if (texts.length) {
              localStorage.setItem('dmm_greetings', JSON.stringify(texts));
              setGreeting(pickFrom(texts));
              return;
            }
          }
        }
      } catch (e) {
        // network failed, fall through to cached or local fallback
      }

      try {
        const cached = localStorage.getItem('dmm_greetings');
        if (cached) {
          const a = JSON.parse(cached);
          setGreeting(pickFrom(a));
          return;
        }
      } catch (e) {}

      // fallback greetings
      const fallback = [
        'Good morning — make today count!',
        'Hello — small steps add up.',
        'Hi there — one focused session at a time.',
        'Greetings — breathe and begin.'
      ];
      setGreeting(pickFrom(fallback));
    })();
  }, []);

  // Persist local app state as a fallback
  useEffect(() => {
    try {
      const snapshot = { mood, todayTask, isTaskDone, noiseList, holdItems };
      localStorage.setItem('dmm_state_v1', JSON.stringify(snapshot));
    } catch (e) {
      console.error('persist local state failed', e);
    }
  }, [mood, todayTask, isTaskDone, noiseList, holdItems]);

  // Capture PWA install prompt
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return;
    try {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return choice;
    } catch (e) {
      console.error('Install prompt failed', e);
    }
  };

  const requestNotifications = async () => {
    try {
      if ('Notification' in window) {
        const p = await Notification.requestPermission();
        setNotifPermission(p);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 2. Real-time Data Sync (Firestore)
  useEffect(() => {
    if (!user) return;

    let unsub = null;
    setSyncStatus('syncing');
    (async () => {
      try {
        const mod = await import('./firebase/lazy');
        unsub = mod.subscribeUserDoc(user.uid, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.mood) setMood(data.mood);
            if (data.todayTask) setTodayTask(data.todayTask);
            if (data.isTaskDone !== undefined) setIsTaskDone(data.isTaskDone);
            if (data.noiseList) setNoiseList(data.noiseList);
            if (data.holdItems) setHoldItems(data.holdItems);
            setSyncStatus('synced');
          } else {
            setSyncStatus('idle');
          }
        });
      } catch (error) {
        console.error('Sync error:', error);
        setSyncStatus('error');
      }
    })();

    return () => { if (unsub) unsub(); };
  }, [user]);

  // 3. Save Logic
  const saveData = async (updates) => {
    if (!user) return;
    setSyncStatus('syncing');
    
    const currentState = {
      mood, todayTask, isTaskDone, noiseList, holdItems,
      lastUpdated: new Date().toISOString(),
      ...updates
    };

    try {
      const mod = await import('./firebase/lazy');
      await mod.setUserDoc(user.uid, currentState);
      setSyncStatus('synced');
    } catch (err) {
      // queue for later sync (store uid + data)
      pushQueue({ uid: user.uid, data: currentState });
      setSyncStatus('error');
    }
  };

  // Attempt to flush queued saves when online / when user becomes available
  const flushQueue = async () => {
    if (!user) return;
    let item = null;
    const mod = await import('./firebase/lazy');
    while ((item = getQueue()[0])) {
      try {
        await mod.setUserDoc(item.uid, item.data);
        popQueue();
        setSyncStatus('synced');
      } catch (e) {
        console.error('Flush failed, will retry later', e);
        setSyncStatus('error');
        break;
      }
    }
  };

  useEffect(() => {
    // flush when we go online
    const onOnline = () => flushQueue();
    window.addEventListener('online', onOnline);
    // try flush once when user becomes available
    if (user) flushQueue();
    return () => window.removeEventListener('online', onOnline);
  }, [user]);

  // Actions
  const addNoise = () => {
    if (!noiseInput.trim()) return;
    const newList = [...noiseList, { id: Date.now(), text: noiseInput, time: new Date().toLocaleTimeString() }];
    setNoiseList(newList);
    setNoiseInput("");
    saveData({ noiseList: newList });
  };

  const deleteNoise = (id) => {
    const newList = noiseList.filter(item => item.id !== id);
    setNoiseList(newList);
    saveData({ noiseList: newList });
  };

  const toggleTask = () => {
    const newVal = !isTaskDone;
    setIsTaskDone(newVal);
    saveData({ isTaskDone: newVal });
  };

  const handleMoodChange = (newMood) => {
    setMood(newMood);
    saveData({ mood: newMood });
  };

  // Export/Backup
  const exportData = () => {
    // include additional app metadata: pomo history, settings, theme, user
    const pomoHistory = (() => { try { return JSON.parse(localStorage.getItem('pomo_history') || '[]'); } catch { return []; } })();
    const pomoState = (() => { try { return JSON.parse(localStorage.getItem('pomoState') || '{}'); } catch { return {}; } })();
    const meta = { themeMode, username, lang, lastPomodoroCount: localStorage.getItem('lastPomodoroCount') || null };
    // compute achievements from history
    const computeAchievements = (hist) => {
      const total = (hist || []).length;
      const badges = [];
      if (total >= 10) badges.push({ id: '10', title: '10 Sessions' });
      if (total >= 50) badges.push({ id: '50', title: '50 Sessions' });
      if (total >= 100) badges.push({ id: '100', title: '100 Sessions' });
      return badges;
    };
    const achievements = computeAchievements(pomoHistory);
    const dataStr = JSON.stringify({ mood, todayTask, isTaskDone, noiseList, holdItems, pomoHistory, pomoState, meta, achievements });
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `mind_manager_backup_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // Import/Restore
  const importData = (event) => {
    const fileReader = new FileReader();
    fileReader.readAsText(event.target.files[0], "UTF-8");
    fileReader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        setMood(json.mood || null);
        setTodayTask(json.todayTask || "");
        setIsTaskDone(json.isTaskDone || false);
        setNoiseList(json.noiseList || []);
        setHoldItems(json.holdItems || []);
        // restore pomo history and state
        try { if (json.pomoHistory) localStorage.setItem('pomo_history', JSON.stringify(json.pomoHistory)); } catch(e){}
        try { if (json.pomoState) localStorage.setItem('pomoState', JSON.stringify(json.pomoState)); } catch(e){}
        try { if (json.achievements) localStorage.setItem('pomo_achievements', JSON.stringify(json.achievements)); } catch(e){}
        try { if (json.meta && json.meta.themeMode) { setThemeMode(json.meta.themeMode); localStorage.setItem('dmm_theme', json.meta.themeMode); } } catch(e){}
        try { if (json.meta && json.meta.username) { setUsername(json.meta.username); localStorage.setItem('dmm_username', json.meta.username); } } catch(e){}
        try { if (json.meta && json.meta.lang) { setLang(json.meta.lang); localStorage.setItem('dmm_lang', json.meta.lang); } } catch(e){}
        saveData(json);
        setShowSettings(false);
      } catch (err) {
        console.error("Import failed", err);
      }
    };

  };

    // Onboarding actions: save username + language and optionally prepopulate hold list
    const completeOnboarding = (name, chosenLang) => {
      const uname = (name || '').trim();
      if (uname) {
        setUsername(uname);
        localStorage.setItem('dmm_username', uname);
      }
      if (chosenLang) {
        setLang(chosenLang);
        localStorage.setItem('dmm_lang', chosenLang);
      }
      // prepopulate holdItems if empty
      if (!holdItems || holdItems.length === 0) {
        const seed = [
          { id: 1, title: "Learn Guitar", status: "Hold", icon: "🎸" },
          { id: 2, title: "Buy a Car", status: "Hold", icon: "🚗" },
          { id: 3, title: "AWS Cert", status: "Hold", icon: "☁️" },
          { id: 4, title: "iPhone & Investments", status: "Hold", icon: "📱" }
        ];
        setHoldItems(seed);
        saveData({ holdItems: seed });
      }
      setShowOnboarding(false);
      localStorage.setItem('dmm_seen_onboarding', '1');
    };

    // Geolocation + weather (optional: requires VITE_OPENWEATHER_KEY)
    useEffect(() => {
      const key = import.meta.env.VITE_OPENWEATHER_KEY || '';
      const fetchWeather = async (lat, lon) => {
        try {
          if (!key) return;
          const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${key}`);
          if (!res.ok) return;
          const j = await res.json();
          setTemperature(Math.round(j.main.temp));
          const weather = (j.weather && j.weather[0] && j.weather[0].main) || '';
          if (/rain/i.test(weather)) setThemeMode('rainy');
          else if (/cloud/i.test(weather)) setThemeMode('cloudy');
          else if (/clear/i.test(weather)) setThemeMode('sunny');
          else setThemeMode('default');
        } catch (e) { console.error('weather fetch failed', e); }
      };

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          const { latitude, longitude } = pos.coords;
          fetchWeather(latitude, longitude);
        }, (err) => {
          // fallback: try IP-based location (no API key)
          fetch('https://ipapi.co/json/').then(r=>r.json()).then(d=>{
            if (d && d.latitude && d.longitude) fetchWeather(d.latitude, d.longitude);
          }).catch(()=>{});
        });
      }
    }, []);

    // Hold list CRUD with emoji/icon support
    const addHoldItem = (title, icon) => {
      const item = { id: Date.now(), title: title || 'Untitled', status: 'Hold', icon: icon || '📝' };
      const next = [...holdItems, item];
      setHoldItems(next);
      saveData({ holdItems: next });
    };

    const updateHoldItem = (id, patch) => {
      const next = holdItems.map(h => h.id === id ? { ...h, ...patch } : h);
      setHoldItems(next);
      saveData({ holdItems: next });
    };

    const removeHoldItem = (id) => {
      const next = holdItems.filter(h => h.id !== id);
      setHoldItems(next);
      saveData({ holdItems: next });
    };

  // Simple translation helper
  const t = (en, hi) => (lang === 'hi' ? (hi || en) : en);

  // compute scorecard stats for given rangeStart (Date)
  const computeStats = (rangeStart) => {
    const raw = localStorage.getItem('pomo_history');
    let hist = [];
    try { hist = raw ? JSON.parse(raw) : []; } catch(e) { hist = []; }
    const from = rangeStart ? new Date(rangeStart) : null;
    const filtered = from ? hist.filter(h => new Date(h.ts) >= from) : hist;
    const total = filtered.length;
    const byDay = {};
    filtered.forEach(h => { const d = new Date(h.ts).toISOString().slice(0,10); byDay[d] = (byDay[d]||0)+1; });
    const daysActive = Object.keys(byDay).length;
    return { total, daysActive, byDay };
  };

  // family corner rotating messages
  const familyMessages = [
    '"Main ghar ke tanav ko solve nahi kar sakta, main sirf apni pragati par focus kar sakta hoon."',
    '"Parivar ka pyaar hi asli sahara hai — chhote kadam roz hain."',
    '"Rishton ko samay dein, lekin aaj par dhyan rakhein."'
  ];
  const familyMsgIndex = Number(localStorage.getItem('dmm_family_msg_index') || 0) % familyMessages.length;
  const familyMsg = familyMessages[familyMsgIndex];
  // increment for next load
  useEffect(() => { try { localStorage.setItem('dmm_family_msg_index', String((familyMsgIndex + 1) % familyMessages.length)); } catch(e){} }, []);

  // Render Helpers
  const getIcon = (iconName) => {
    // icon colors adapt to the selected theme
    const colorClass = themeMode === 'sunny' ? 'text-yellow-500' : themeMode === 'rainy' ? 'text-blue-500' : themeMode === 'sea' ? 'text-teal-500' : 'text-indigo-600';
    switch(iconName) {
      case 'Music': return <Music className={`w-4 h-4 ${colorClass}`} />;
      case 'Car': return <Car className={`w-4 h-4 ${colorClass}`} />;
      case 'Cloud': return <Cloud className={`w-4 h-4 ${colorClass}`} />;
      case 'Smartphone': return <Smartphone className={`w-4 h-4 ${colorClass}`} />;
      default: return <AlertCircle className={`w-4 h-4 ${colorClass}`} />;
    }
  };

  return (
    <div className={`min-h-screen bg-slate-50 text-slate-800 font-sans pb-20 ${themeMode==='sunny'?'theme-sunny':''} ${themeMode==='rainy'?'theme-rainy':''} ${themeMode==='sea'?'theme-sea':''}`}>
      <style>{`
        body { -webkit-tap-highlight-color: transparent; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .theme-sunny { background-image: linear-gradient(180deg,#fff7ed,#fff); }
        .theme-rainy { background-image: linear-gradient(180deg,#e6f0ff,#f8fafc); }
        .theme-sea { background-image: linear-gradient(180deg,#e6fff7,#f8fffd); }
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-100 p-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrainCircuit className={`w-8 h-8 ${accentText}`} />
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-none">{t('Mind Manager','माइंड मैनेजर')}</h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-tighter">{t('Powered by Bitmenders','Bitmenders द्वारा संचालित')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {syncStatus === 'syncing' && <RefreshCw className={`w-3 h-3 ${accentText} animate-spin`} />}
              {syncStatus === 'synced' && <div className="w-2 h-2 bg-green-500 rounded-full"></div>}
              {syncStatus === 'error' && <AlertCircle className="w-3 h-3 text-red-500" />}
            </div>
            <div className="flex items-center gap-3">
              {temperature !== null && <div className="text-sm text-slate-600">{temperature}°C</div>}
              <button onClick={() => setShowScorecard(true)} className="p-2 hover:bg-slate-100 rounded-full" title={t('Scorecard','स्कोरकार्ड')}>
                    <CheckCircle2 className="w-5 h-5 text-slate-500" />
                  </button>
                  <button onClick={() => setShowSettings(true)} className="p-2 hover:bg-slate-100 rounded-full">
                    <Settings className="w-5 h-5 text-slate-500" />
                  </button>
              <button onClick={() => {
                  const modes = ['default','sunny','rainy','sea'];
                  const idx = modes.indexOf(themeMode);
                  const next = modes[(idx + 1) % modes.length];
                  setThemeMode(next);
                  localStorage.setItem('dmm_theme', next);
                }} title={t('Toggle theme','थीम बदलें')} className="p-2 hover:bg-slate-100 rounded-full">
                <div className="w-5 h-5 flex items-center justify-center text-slate-500">🌓</div>
              </button>
              <div onClick={() => setShowOnboarding(true)} className="text-xs text-slate-500 flex items-center gap-2 cursor-pointer">
                {username ? username : ''} {greeting ? <span className="text-[10px] text-slate-400 italic">{greeting}</span> : null}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">
        {/* Tab Selection */}
        <div className="flex bg-white rounded-xl shadow-sm p-1 border border-slate-100">
          <button 
            onClick={() => setActiveTab('daily')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'daily' ? `${accentBg} text-white shadow-md` : 'text-slate-400'}`}>
            {t('Today','आज')}
          </button>
          <button 
            onClick={() => setActiveTab('hold')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'hold' ? `${accentBg} text-white shadow-md` : 'text-slate-400'}`}>
            {t('Hold List','होल्ड सूची')}
          </button>
        </div>

        {activeTab === 'daily' ? (
          <>
            {/* Mood Tracker */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-2">
              <h2 className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-widest">{t('How are you feeling now?','मेरा मूड अभी कैसा है?')}</h2>
                <div className="flex justify-between items-center flex-wrap gap-2">
                  {[
                    { key: 'very_happy', label: t('Very Happy','बहुत खुश'), emoji: '🤩' },
                    { key: 'happy', label: t('Happy','खुश'), emoji: '😄' },
                    { key: 'neutral', label: t('Neutral','तटस्थ'), emoji: '😐' },
                    { key: 'sad', label: t('Sad','उदास'), emoji: '😔' },
                    { key: 'angry', label: t('Angry','गुस्सा'), emoji: '😡' },
                    { key: 'anxious', label: t('Anxious','चिंतित'), emoji: '😰' },
                    { key: 'tired', label: t('Tired','थका हुआ'), emoji: '😴' }
                  ].map(mo => (
                    <button key={mo.key} title={mo.label} aria-label={mo.label} onClick={() => handleMoodChange(mo.key)} className={`p-3 rounded-full text-2xl transition-all ${mood === mo.key ? 'scale-110 ring-2 ring-indigo-200' : 'opacity-70 hover:opacity-100 bg-slate-50'}`}>
                      <span>{mo.emoji}</span>
                    </button>
                  ))}
                </div>
            </section>

            {/* The Rule of One Task */}
            <section className={`${accentBg} p-6 rounded-3xl shadow-xl text-white relative overflow-hidden`}>
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <BrainCircuit className="w-20 h-20" />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> {t('One Task (15 Min)','Sirf Ek Kaam (15 Min)')}
              </h2>
              <input 
                type="text" 
                placeholder={t('Today\'s most important task...','आज का सबसे जरूरी काम...')} 
                className="w-full rounded-xl p-4 text-white placeholder:text-white/80 mb-4 shadow-inner"
                style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: 'none' }}
                value={todayTask}
                onChange={(e) => {
                  setTodayTask(e.target.value);
                  saveData({ todayTask: e.target.value });
                }}
              />
                {todayTask && (
                <button 
                  onClick={toggleTask}
                  className={`w-full p-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all ${isTaskDone ? `bg-white ${accentText} shadow-lg scale-95` : `${accentSoft} text-white`}`}
                >
                  {isTaskDone ? <><CheckCircle2 /> Kaam Ho Gaya!</> : 'Isse Poora Karein'}
                </button>
              )}
                  {/* Pomodoro component (lazy-loaded) */}
                  <Suspense fallback={<div className="mt-4 p-4 bg-white rounded-2xl text-center">{t('Loading timer…','टाइमर लोड हो रहा है…')}</div>}>
                      <Pomodoro onSessionComplete={(count) => {
                        try { saveData({ lastPomodoroCount: count }); } catch {}
                      }} t={t} accent={accentBg} accentText={accentText} accentLight={accentLight} />
                  </Suspense>
            </section>

            {/* Noise / Brain Dump */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h2 className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-widest flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-orange-500" /> Dimag Ka Shor (Brain Dump)
              </h2>
              <div className="flex gap-2 mb-4">
                <input 
                  type="text" 
                  placeholder={t('Write whatever is bothering you...','जो भी परेशान करे लिख दें...')} 
                  className="flex-1 p-3 bg-slate-50 rounded-xl border-none text-sm focus:ring-1 focus:ring-slate-200"
                  value={noiseInput}
                  onChange={(e) => setNoiseInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addNoise()}
                />
                <button onClick={addNoise} className={`${accentBg} p-3 rounded-xl text-white shadow-md active:scale-90 transition-transform`}>
                  <PlusCircle className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-3 max-h-60 overflow-y-auto pr-2 no-scrollbar">
                {noiseList.map(item => (
                  <div key={item.id} className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100 group animate-in slide-in-from-left-2">
                    <div className={`w-2 h-2 ${accentSoft} rounded-full`}></div>
                    <span className="flex-1 text-sm text-slate-600 font-medium">{item.text}</span>
                    <button onClick={() => deleteNoise(item.id)} className="p-1 hover:text-red-500 text-slate-300">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {noiseList.length === 0 && (
                  <div className="text-center py-8 opacity-40">
                    <Cloud className="w-12 h-12 mx-auto mb-2" />
                    <p className="text-xs">Abhi koi shor nahi hai...</p>
                  </div>
                )}
              </div>
            </section>
            
            {/* Hold list moved to Hold tab to keep Today focused */}
          </>
        ) : (
          <section className="space-y-4 animate-in fade-in slide-in-from-right-2">
             <div className="bg-blue-600 p-6 rounded-3xl text-white shadow-lg">
               <h2 className="text-lg font-bold mb-1">{t('Dream Parking Lot','ड्रीम पार्किंग लॉट')}</h2>
               <p className="text-xs text-blue-100 leading-relaxed">{t('These are parked so you can work peacefully today.','इन्हें "Hold" पर रखा है ताकि आप आज शांति से काम कर सकें।')}</p>
             </div>
             <div className="grid gap-3">
               <div className="flex gap-2 mb-4">
                 <input placeholder={t('Add new hold item...','नया होल्ड आइटम जोड़ें...')} className="flex-1 p-3 bg-slate-50 rounded-xl border-none text-sm" id="hold-new-input-tab" />
                 <input placeholder={t('Icon (emoji)','Icon (इमोजी)')} id="hold-new-icon-tab" className="w-24 p-3 bg-slate-50 rounded-xl border-none text-sm" />
                 <button onClick={() => { const el = document.getElementById('hold-new-input-tab'); const ic = document.getElementById('hold-new-icon-tab'); if (el) { addHoldItem(el.value, ic ? ic.value : '📝'); el.value=''; if (ic) ic.value=''; } }} className={`${accentBg} p-3 rounded-xl text-white shadow-md`}>{t('Add','जोड़ें')}</button>
               </div>
               {holdItems.map(item => (
                 <div key={item.id} className="flex items-center gap-4 p-5 bg-white rounded-2xl shadow-sm border border-slate-100">
                   <div className={`${accent50} w-12 h-12 rounded-2xl flex items-center justify-center ${accentText}`}>
                     {getIcon(item.icon)}
                   </div>
                   <div className="flex-1">
                     <h3 className="text-sm font-bold text-slate-800">{item.title}</h3>
                     <p className={`text-[10px] ${accentText} font-bold uppercase tracking-widest mt-0.5`}>{item.status}</p>
                   </div>
                   <div className="flex flex-col items-end gap-2">
                     <button onClick={() => { setTodayTask(item.title); removeHoldItem(item.id); saveData({ todayTask: item.title }); }} className={`px-2 py-1 text-xs ${accentBg} text-white rounded-md`}>{t('Move to Today','आज पर ले जाएँ')}</button>
                     <span className="text-[10px] bg-slate-100 px-2 py-1 rounded-md text-slate-400 font-bold">SAVED</span>
                   </div>
                 </div>
               ))}
             </div>
             <div className="p-6 bg-pink-50 rounded-2xl border border-pink-100 mt-6 shadow-sm">
                <h3 className="text-xs font-bold text-pink-700 uppercase mb-2 flex items-center gap-2">
                  <Heart className="w-4 h-4" /> {t('Family Corner','परिवार कोना')}
                </h3>
                <p className="text-xs text-pink-600 italic leading-relaxed">{t(familyMsg, familyMsg)}</p>
             </div>
          </section>
        )}
      </main>

      {/* Floating Pomodoro widget toggle */}
      <div className="fixed bottom-6 right-6 z-50">
        <FloatingPomodoro accent={accentBg} accentText={accentText} accentLight={accentLight} />
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold">{t('Settings & Backup','सेटिंग्स और बैकअप')}</h2>
              <button onClick={() => setShowSettings(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Cloud Sync Status */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <h3 className="text-sm font-bold">{t('Auto Cloud Sync','ऑटो क्लाउड सिंक')}</h3>
                  <p className="text-xs text-slate-500">{t('Always on (Anonymous Auth)','हमेशा चालू (गुमनाम ऑथ)')}</p>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase ${syncStatus === 'synced' ? 'bg-green-100 text-green-700' : `${accentLight} ${accentText.replace('text-','text-')}`}`}>
                  {syncStatus === 'synced' ? <><Check className="w-3 h-3"/> Connected</> : 'Syncing...'}
                </div>
              </div>

              {/* Install PWA Instruction */}
              <div className={`p-4 border-2 rounded-2xl`} style={{ backgroundColor: 'rgba(249,250,251,0.6)' }}>
                <h3 className="text-sm font-bold mb-1 text-indigo-900">{t('Install to Mobile Home Screen','मोबाइल होम स्क्रीन पर इंस्टॉल करें')}</h3>
                <p className="text-xs text-indigo-700 mb-2">{t('Use browser menu -> Add to Home Screen','ब्राउज़र मेनू -> Add to Home Screen चुनें')}</p>
                <p className="text-[10px] text-indigo-500 italic">{t('This lets the app run like a real app without the browser.','यह ऐप को बिना ब्राउज़र के असली ऐप की तरह चलने देगा।')}</p>
                {deferredPrompt && (
                  <div className="mt-3">
                    <button onClick={promptInstall} className={`w-full px-3 py-2 ${accentBg} text-white rounded-lg`}>Install App</button>
                  </div>
                )}
                {!deferredPrompt && (
                  <div className={`mt-3 text-[10px] ${accentText}`}>Install via browser menu if available.</div>
                )}
              </div>

              {/* Data Management */}
                <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('Data Management','डेटा प्रबंधन')}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={exportData}
                    className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-2xl hover:border-indigo-300 hover:bg-indigo-50 transition-all gap-2 shadow-sm"
                  >
                    <Download className={`w-6 h-6 ${accentText}`} />
                    <span className="text-xs font-bold">{t('Manual Backup','मैनुअल बैकअप')}</span>
                  </button>
                  <button 
                    onClick={() => fileInputRef.current.click()}
                    className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-2xl hover:border-indigo-300 hover:bg-indigo-50 transition-all gap-2 shadow-sm"
                  >
                    <Upload className={`w-6 h-6 ${accentText}`} />
                    <span className="text-xs font-bold">{t('Restore Backup','बैकअप पुनर्स्थापित करें')}</span>
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".json" 
                    onChange={importData} 
                  />
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Scorecard</h3>
                <div className="flex gap-2">
                  <button onClick={() => setShowScorecard(true)} className="flex-1 p-2 bg-white border rounded-2xl">Show Scorecard</button>
                  <button onClick={() => setShowAnalytics(true)} className="flex-1 p-2 bg-white border rounded-2xl">Analytics</button>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('Notifications','नोटिफिकेशन')}</h3>
                <div className="flex gap-2">
                  <button onClick={requestNotifications} className="flex-1 p-2 bg-white border rounded-2xl">{t('Enable Notifications','नोटिफिकेशन सक्षम करें')}</button>
                  <div className="px-3 py-2 rounded-2xl bg-slate-50 text-[10px]">{notifPermission}</div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Theme</h3>
                <div className="flex gap-2">
                  <button onClick={() => { setThemeMode('default'); localStorage.setItem('dmm_theme', 'default'); }} className={`flex-1 p-2 rounded-2xl ${themeMode==='default'?accentLight:'bg-white'}`}>Default</button>
                  <button onClick={() => { setThemeMode('sunny'); localStorage.setItem('dmm_theme', 'sunny'); }} className={`flex-1 p-2 rounded-2xl ${themeMode==='sunny'?accentLight:'bg-white'}`}>Sunny</button>
                  <button onClick={() => { setThemeMode('rainy'); localStorage.setItem('dmm_theme', 'rainy'); }} className={`flex-1 p-2 rounded-2xl ${themeMode==='rainy'?accentLight:'bg-white'}`}>Rainy</button>
                </div>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => { setThemeMode('sea'); localStorage.setItem('dmm_theme', 'sea'); }} className={`flex-1 p-2 rounded-2xl ${themeMode==='sea'?accentLight:'bg-white'}`}>Sea</button>
                </div>
              </div>

              <div className="text-center text-[10px] text-slate-300 select-none pb-2">
                Device Hash: {user?.uid ? user.uid.substring(0, 12) + '...' : 'Connecting...'}
              </div>
            </div>
          </div>
        </div>
      )}

      {showScorecard && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Scorecard & Achievements</h3>
              <button onClick={() => setShowScorecard(false)} className="p-2">Close</button>
            </div>
            <div className="flex gap-2 mb-4">
              <button onClick={() => setScoreRange('7d')} className={`px-3 py-2 ${accent50} rounded`}>1 week</button>
              <button onClick={() => setScoreRange('30d')} className={`px-3 py-2 ${accent50} rounded`}>1 month</button>
              <button onClick={() => setScoreRange('90d')} className={`px-3 py-2 ${accent50} rounded`}>3 months</button>
              <button onClick={() => setScoreRange('180d')} className="px-3 py-2 bg-indigo-50 rounded">6 months</button>
            </div>
            <ScorecardContent rangeKey={scoreRange} computeStats={computeStats} />
          </div>
        </div>
      )}

      {showAnalytics && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Analytics</h3>
              <button onClick={() => setShowAnalytics(false)} className="p-2">Close</button>
            </div>
            <div className="mb-4 text-sm">
              {(function(){
                try {
                  const raw = localStorage.getItem('pomo_history');
                  const hist = raw ? JSON.parse(raw) : [];
                  const total = hist.length;
                  const totalSeconds = hist.reduce((s,h)=>s + (h.duration || 0), 0);
                  const avgMin = total ? Math.round((totalSeconds/total)/60) : 0;
                  return (
                    <div>
                      <div>Total sessions: <strong>{total}</strong></div>
                      <div>Total focus time: <strong>{Math.round(totalSeconds/60)} min</strong></div>
                      <div>Average session: <strong>{avgMin} min</strong></div>
                    </div>
                  );
                } catch (e) { return <div className="text-xs text-slate-500">No analytics available</div>; }
              })()}
            </div>
          </div>
        </div>
      )}

      {showOnboarding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 text-center">
            <h2 className="text-lg font-bold mb-2">{t('Welcome to Mind Manager','माइंड मैनेजर में आपका स्वागत है')}</h2>
            <p className="text-sm text-slate-600 mb-4">{t('A focused place to manage your day: one task, brain dump, and short pomodoro sessions.','आपके दिन पर ध्यान केंद्रित करने के लिए: एक कार्य, ब्रेन डंप, और छोटे पोमोडोरो सत्र।')}</p>
            <div className="space-y-3 text-left">
              <label className="text-sm font-bold">{t('Your name','आपका नाम')}</label>
              <input className="w-full p-3 rounded" defaultValue={username} id="onboard-name" placeholder={t('Enter your name','अपना नाम दर्ज करें')} />
              <label className="text-sm font-bold">{t('Language / भाषा')}</label>
              <div className="flex gap-2">
                <button onClick={() => { document.getElementById('onboard-name') && completeOnboarding(document.getElementById('onboard-name').value, 'en'); }} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded">{t('English','English')}</button>
                <button onClick={() => { document.getElementById('onboard-name') && completeOnboarding(document.getElementById('onboard-name').value, 'hi'); }} className="flex-1 px-4 py-2 bg-slate-100 rounded">{t('Hindi','हिन्दी')}</button>
              </div>
              <div className="flex gap-2 justify-center mt-3">
                <button onClick={() => { setShowOnboarding(false); localStorage.setItem('dmm_seen_onboarding', '1'); }} className="px-4 py-2 bg-slate-200 rounded">{t('Maybe Later','बाद में')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Persistence Notification (Local Warning) */}
      <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto pointer-events-none z-40">
        {syncStatus === 'error' && (
          <div className="bg-red-600 text-white p-4 rounded-2xl shadow-xl flex items-center gap-3 animate-bounce pointer-events-auto">
            <AlertCircle className="w-5 h-5" />
            <p className="text-xs font-bold">Sync Error! Kripya backup download kar lein.</p>
          </div>
        )}
      </div>

      <footer className="max-w-md mx-auto mt-8 px-4 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-900 text-white px-4 py-2 rounded-full text-[10px] shadow-lg mb-4">
          <BrainCircuit className="w-3 h-3" /> {username ? `${username}'s Peaceful Space` : "Peaceful Space"}
        </div>
        <p className="text-[10px] text-slate-400 font-medium leading-relaxed max-w-[250px] mx-auto">
          "Aap ek survivor hain. Apne dimaag ko shant rakhne ke liye sirf aaj par dhyan dein."
        </p>
      </footer>
    </div>
  );
};

export default App;

// Small helper component for scorecard content
function ScorecardContent({ rangeKey, computeStats }) {
  const getFrom = (k) => {
    const now = new Date();
    if (k === '7d') { const d = new Date(now); d.setDate(now.getDate() - 7); return d; }
    if (k === '30d') { const d = new Date(now); d.setDate(now.getDate() - 30); return d; }
    if (k === '90d') { const d = new Date(now); d.setDate(now.getDate() - 90); return d; }
    if (k === '180d') { const d = new Date(now); d.setDate(now.getDate() - 180); return d; }
    return null;
  };
  const from = getFrom(rangeKey);
  const stats = computeStats(from);
  // compute achievements from cached pomo_history or from stats
  const achievements = (() => {
    try {
      const raw = localStorage.getItem('pomo_achievements');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    // fallback compute from history
    try {
      const raw2 = localStorage.getItem('pomo_history');
      const hist = raw2 ? JSON.parse(raw2) : [];
      const total = hist.length;
      const badges = [];
      if (total >= 10) badges.push({ id: '10', title: '10 Sessions' });
      if (total >= 50) badges.push({ id: '50', title: '50 Sessions' });
      if (total >= 100) badges.push({ id: '100', title: '100 Sessions' });
      return badges;
    } catch (e) { return []; }
  })();
  return (
    <div>
      <div className="mb-2">Total sessions: <strong>{stats.total}</strong></div>
      <div className="mb-2">Active days: <strong>{stats.daysActive}</strong></div>
      <div className="mb-4">Achievements:</div>
      <div className="flex gap-2 mb-4">
        {achievements.length === 0 ? <div className="text-xs text-slate-400 italic">No achievements yet</div> : achievements.map(a => (
          <div key={a.id} className="px-3 py-1 bg-yellow-50 text-yellow-800 rounded-full text-sm font-semibold">{a.title}</div>
        ))}
      </div>
      <div className="text-xs text-slate-500">Daily breakdown (date: sessions):</div>
      <div className="mt-2 max-h-40 overflow-auto text-sm border rounded p-2 bg-slate-50">
        {Object.entries(stats.byDay).length === 0 ? <div className="italic text-[12px] text-slate-400">No sessions in range</div> : Object.entries(stats.byDay).sort((a,b)=>b[0].localeCompare(a[0])).map(([d,c])=> (
          <div key={d} className="flex justify-between"><span>{d}</span><span>{c}</span></div>
        ))}
      </div>
    </div>
  );
}

// Floating Pomodoro quick widget
function FloatingPomodoro({ accent, accentText, accentLight }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      {open && (
        <div className="mb-3">
          <div className="bg-white rounded-2xl p-2 shadow">
            <Suspense fallback={<div className="p-2">Loading...</div>}>
              <Pomodoro compact={true} t={(a,b)=>a} accent={accent} accentText={accentText} accentLight={accentLight} />
            </Suspense>
          </div>
        </div>
      )}
      <button onClick={() => setOpen(o=>!o)} className={`w-12 h-12 rounded-full ${accent} text-white shadow-lg flex items-center justify-center`}>{open? '✕' : '🍅'}</button>
    </div>
  );
}
