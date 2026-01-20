import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, setDoc } from 'firebase/firestore';
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

// Firebase Configuration from environment
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

const App = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('daily');
  const [showSettings, setShowSettings] = useState(false);
  const [syncStatus, setSyncStatus] = useState('idle'); // idle, syncing, synced, error

  // App State
  const [mood, setMood] = useState(null);
  const [todayTask, setTodayTask] = useState("");
  const [isTaskDone, setIsTaskDone] = useState(false);
  const [noiseList, setNoiseList] = useState([]);
  const [holdItems, setHoldItems] = useState([
    { id: 1, title: "Guitar Seekhna", status: "Hold", icon: "Music" },
    { id: 2, title: "Car Seekhna/Lena", status: "Hold", icon: "Cloud" },
    { id: 3, title: "AWS Architect Level", status: "Hold", icon: "Smartphone" },
    { id: 4, title: "iPhone & Investments", status: "Hold", icon: "Heart" }
  ]);
  const [aqiData, setAqiData] = useState(null);
  const [blogPosts, setBlogPosts] = useState([]);

  const fileInputRef = useRef(null);

  // 1. Authentication (Anonymous for "No Login" feel)
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth error", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // 2. Real-time Data Sync (Firestore)
  useEffect(() => {
    if (!user) return;

    setSyncStatus('syncing');
    const userDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'userState');
    
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
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
    }, (error) => {
      console.error("Sync error:", error);
      setSyncStatus('error');
    });

    return () => unsubscribe();
  }, [user]);

  // 3. Save Logic
  const saveData = async (updates) => {
    if (!user) return;
    setSyncStatus('syncing');
    
    const userDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'userState');
    const currentState = {
      mood, todayTask, isTaskDone, noiseList, holdItems,
      lastUpdated: new Date().toISOString(),
      ...updates
    };

    try {
      await setDoc(userDocRef, currentState, { merge: true });
      setSyncStatus('synced');
    } catch (err) {
      setSyncStatus('error');
    }
  };

  // Fetch AQI
  const fetchAQI = async () => {
    try {
      const response = await fetch('https://api.waqi.info/feed/here/?token=demo'); // Replace with real token
      const data = await response.json();
      setAqiData(data.data);
    } catch (err) {
      console.error('AQI fetch error', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'aqi') fetchAQI();
    if (activeTab === 'inspire') fetchBlogPosts();
  }, [activeTab]);

  const fetchBlogPosts = async () => {
    try {
      const res = await fetch('/api/posts');
      const posts = await res.json();
      setBlogPosts(posts);
    } catch (err) {
      console.error('Blog fetch error', err);
    }
  };

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
    const dataStr = JSON.stringify({ mood, todayTask, isTaskDone, noiseList, holdItems });
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
        saveData(json);
        setShowSettings(false);
      } catch (err) {
        console.error("Import failed", err);
      }
    };
  };

  // Render Helpers
  const getIcon = (iconName) => {
    switch(iconName) {
      case 'Music': return <Music className="w-4 h-4" />;
      case 'Car': return <Car className="w-4 h-4" />;
      case 'Cloud': return <Cloud className="w-4 h-4" />;
      case 'Smartphone': return <Smartphone className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-20">
      <style>{`
        body { -webkit-tap-highlight-color: transparent; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-100 p-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-8 h-8 text-indigo-600" />
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-none">Mind Manager</h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-tighter">Powered by Cloud Sync</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {syncStatus === 'syncing' && <RefreshCw className="w-3 h-3 text-indigo-500 animate-spin" />}
              {syncStatus === 'synced' && <div className="w-2 h-2 bg-green-500 rounded-full"></div>}
              {syncStatus === 'error' && <AlertCircle className="w-3 h-3 text-red-500" />}
            </div>
            <button onClick={() => setShowSettings(true)} className="p-2 hover:bg-slate-100 rounded-full">
              <Settings className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">
        {/* Tab Selection */}
        <div className="flex bg-white rounded-xl shadow-sm p-1 border border-slate-100">
          <button 
            onClick={() => setActiveTab('daily')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'daily' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}
          >
            Aaj Ka Din
          </button>
          <button 
            onClick={() => setActiveTab('hold')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'hold' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}
          >
            Hold List
          </button>
          <button 
            onClick={() => setActiveTab('aqi')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'aqi' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}
          >
            Air Quality
          </button>
          <button 
            onClick={() => setActiveTab('inspire')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'inspire' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}
          >
            Inspire
          </button>
        </div>

        {activeTab === 'daily' ? (
          <>
            {/* Mood Tracker */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-2">
              <h2 className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-widest">Mera Mood Abhi Kaisa Hai?</h2>
              <div className="flex justify-around items-center">
                <button onClick={() => handleMoodChange('happy')} className={`p-4 rounded-full transition-all ${mood === 'happy' ? 'bg-green-100 scale-125' : 'bg-slate-50 opacity-40 hover:opacity-100'}`}>
                  <Smile className={`w-10 h-10 ${mood === 'happy' ? 'text-green-600' : 'text-slate-400'}`} />
                </button>
                <button onClick={() => handleMoodChange('neutral')} className={`p-4 rounded-full transition-all ${mood === 'neutral' ? 'bg-yellow-100 scale-125' : 'bg-slate-50 opacity-40 hover:opacity-100'}`}>
                  <Meh className={`w-10 h-10 ${mood === 'neutral' ? 'text-yellow-600' : 'text-slate-400'}`} />
                </button>
                <button onClick={() => handleMoodChange('sad')} className={`p-4 rounded-full transition-all ${mood === 'sad' ? 'bg-red-100 scale-125' : 'bg-slate-50 opacity-40 hover:opacity-100'}`}>
                  <Frown className={`w-10 h-10 ${mood === 'sad' ? 'text-red-600' : 'text-slate-400'}`} />
                </button>
              </div>
            </section>

            {/* The Rule of One Task */}
            <section className="bg-indigo-600 p-6 rounded-3xl shadow-xl shadow-indigo-200 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <BrainCircuit className="w-20 h-20" />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Sirf Ek Kaam (15 Min)
              </h2>
              <input 
                type="text" 
                placeholder="Aaj ka sabse zaruri kaam..." 
                className="w-full bg-indigo-500/30 border-none rounded-xl p-4 text-white placeholder:text-indigo-200 focus:ring-2 focus:ring-white mb-4 shadow-inner"
                value={todayTask}
                onChange={(e) => {
                  setTodayTask(e.target.value);
                  saveData({ todayTask: e.target.value });
                }}
              />
              {todayTask && (
                <button 
                  onClick={toggleTask}
                  className={`w-full p-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all ${isTaskDone ? 'bg-white text-indigo-600 shadow-lg scale-95' : 'bg-indigo-400 text-white'}`}
                >
                  {isTaskDone ? <><CheckCircle2 /> Kaam Ho Gaya!</> : 'Isse Poora Karein'}
                </button>
              )}
            </section>

            {/* Noise / Brain Dump */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h2 className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-widest flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-orange-500" /> Dimag Ka Shor (Brain Dump)
              </h2>
              <div className="flex gap-2 mb-4">
                <input 
                  type="text" 
                  placeholder="Jo bhi pareshan kare likh do..." 
                  className="flex-1 p-3 bg-slate-50 rounded-xl border-none text-sm focus:ring-1 focus:ring-slate-200"
                  value={noiseInput}
                  onChange={(e) => setNoiseInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addNoise()}
                />
                <button onClick={addNoise} className="bg-indigo-600 p-3 rounded-xl text-white shadow-md active:scale-90 transition-transform">
                  <PlusCircle className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-3 max-h-60 overflow-y-auto pr-2 no-scrollbar">
                {noiseList.map(item => (
                  <div key={item.id} className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100 group animate-in slide-in-from-left-2">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
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
          </>
        ) : (
          <section className="space-y-4 animate-in fade-in slide-in-from-right-2">
             <div className="bg-blue-600 p-6 rounded-3xl text-white shadow-lg">
                <h2 className="text-lg font-bold mb-1">Dream Parking Lot</h2>
                <p className="text-xs text-blue-100 leading-relaxed">Inhe "Hold" par rakha hai taaki aaj aap shanti se kaam kar sakein.</p>
             </div>
             <div className="grid gap-3">
               {holdItems.map(item => (
                 <div key={item.id} className="flex items-center gap-4 p-5 bg-white rounded-2xl shadow-sm border border-slate-100">
                   <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                     {getIcon(item.icon)}
                   </div>
                   <div className="flex-1">
                     <h3 className="text-sm font-bold text-slate-800">{item.title}</h3>
                     <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest mt-0.5">{item.status}</p>
                   </div>
                   <span className="text-[10px] bg-slate-100 px-2 py-1 rounded-md text-slate-400 font-bold">SAVED</span>
                 </div>
               ))}
             </div>
             <div className="p-6 bg-pink-50 rounded-2xl border border-pink-100 mt-6 shadow-sm">
                <h3 className="text-xs font-bold text-pink-700 uppercase mb-2 flex items-center gap-2">
                  <Heart className="w-4 h-4" /> Family Corner
                </h3>
                <p className="text-xs text-pink-600 italic leading-relaxed">"Main ghar ke tanav ko solve nahi kar sakta, main sirf apni pragati par focus kar sakta hoon."</p>
             </div>
          </section>
        )}

        {activeTab === 'aqi' && (
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-2">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Air Quality Index</h2>
            {aqiData ? (
              <div className="space-y-4">
                <div className="text-center">
                  <div className={`text-4xl font-bold ${aqiData.aqi < 50 ? 'text-green-600' : aqiData.aqi < 100 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {aqiData.aqi}
                  </div>
                  <p className="text-sm text-slate-500">AQI Level</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500">PM2.5</p>
                    <p className="text-lg font-bold">{aqiData.iaqi.pm25?.v || 'N/A'}</p>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500">PM10</p>
                    <p className="text-lg font-bold">{aqiData.iaqi.pm10?.v || 'N/A'}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 text-center">Data from WAQI</p>
              </div>
            ) : (
              <p className="text-center text-slate-500">Loading AQI data...</p>
            )}
          </section>
        )}

        {activeTab === 'inspire' && (
          <section className="animate-in fade-in slide-in-from-bottom-2">
            <h2 className="text-lg font-bold text-slate-900 mb-4 text-center">Inspiration from Our Blog</h2>
            {blogPosts.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {blogPosts.map(post => (
                  <a key={post.id} href={`/blog/${post.slug}.html`} className="block bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 no-underline text-inherit">
                    <img src={post.image || '/pwa-192.png'} alt={post.title} className="w-full h-32 object-cover rounded mb-3" />
                    <h3 className="text-md font-bold text-slate-800 mb-2">{post.title}</h3>
                    <p className="text-sm text-slate-600 mb-2">{post.content.substring(0, 100)}...</p>
                    <div className="text-xs text-slate-400">{new Date(post.createdAt).toLocaleDateString()}</div>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-500">Loading blog posts...</p>
            )}
          </section>
        )}
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold">Settings & Backup</h2>
              <button onClick={() => setShowSettings(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Cloud Sync Status */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <h3 className="text-sm font-bold">Auto Cloud Sync</h3>
                  <p className="text-xs text-slate-500">Hamesha on rehta hai (Anonymous Auth)</p>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase ${syncStatus === 'synced' ? 'bg-green-100 text-green-700' : 'bg-indigo-100 text-indigo-700'}`}>
                  {syncStatus === 'synced' ? <><Check className="w-3 h-3"/> Connected</> : 'Syncing...'}
                </div>
              </div>

              {/* Install PWA Instruction */}
              <div className="p-4 border-2 border-indigo-50 rounded-2xl bg-indigo-50/30">
                <h3 className="text-sm font-bold mb-1 text-indigo-900">Install to Mobile Home Screen</h3>
                <p className="text-xs text-indigo-700 mb-2">Browser menu mein "Add to Home Screen" select karein.</p>
                <p className="text-[10px] text-indigo-500 italic">Issey ye app bina browser ke asli app ki tarah chalegi.</p>
              </div>

              {/* Data Management */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Data Management</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={exportData}
                    className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-2xl hover:border-indigo-300 hover:bg-indigo-50 transition-all gap-2 shadow-sm"
                  >
                    <Download className="w-6 h-6 text-indigo-600" />
                    <span className="text-xs font-bold">Manual Backup</span>
                  </button>
                  <button 
                    onClick={() => fileInputRef.current.click()}
                    className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-2xl hover:border-indigo-300 hover:bg-indigo-50 transition-all gap-2 shadow-sm"
                  >
                    <Upload className="w-6 h-6 text-indigo-600" />
                    <span className="text-xs font-bold">Restore Backup</span>
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

              <div className="text-center text-[10px] text-slate-300 select-none pb-2">
                Device Hash: {user?.uid ? user.uid.substring(0, 12) + '...' : 'Connecting...'}
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
          <BrainCircuit className="w-3 h-3" /> Jay's Peaceful Space
        </div>
        <p className="text-[10px] text-slate-400 font-medium leading-relaxed max-w-[250px] mx-auto">
          "Aap ek survivor hain. Apne dimaag ko shant rakhne ke liye sirf aaj par dhyan dein."
        </p>
      </footer>
    </div>
  );
};

export default App;