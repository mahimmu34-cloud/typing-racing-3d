import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, AudioLines, CarFront, Check, ChevronDown, CircleHelp, Coins, Gauge, Globe2, Keyboard, Menu, Pause, Play, RotateCcw, Settings2, ShieldCheck, Sparkles, Trophy, Volume2, VolumeX, Zap } from "lucide-react";
import RaceScene from "./components/RaceScene.jsx";
import audioManager from "./audio/audioManager.js";

const passages = {
  English: "Speed grows when focus meets practice and every correct word moves you forward.",
  বাংলা: "মনোযোগ দিয়ে প্রতিটি সঠিক শব্দ টাইপ করো আর তোমার গাড়িকে সামনে এগিয়ে নাও।",
  हिन्दी: "तेज़ टाइप करो और अपनी रेसिंग कार को फिनिश लाइन तक पहुँचाओ।",
  العربية: "اكتب بدقة وسرعة حتى تصل سيارتك إلى خط النهاية",
  Español: "Cada palabra correcta te acerca más a la línea de meta.",
  Français: "Chaque mot correctement tapé rapproche votre voiture de la victoire.",
  Deutsch: "Jedes richtig geschriebene Wort bringt dich näher ans Ziel.",
  Русский: "Каждое правильно набранное слово приближает тебя к финишу.",
  日本語: "正確にタイピングしてゴールまでレースを進めよう。",
  中文: "准确输入文字，让你的赛车更快冲向终点。"
};
const languageNames = Object.keys(passages);
const soundControls = [
  ["typing","Typing"],["error","Error"],["coin","Coin pickup"],["countdown","Countdown"],
  ["engine","Engine"],["nitro","Nitro"],["ui","UI"],["victory","Victory"],
  ["defeat","Defeat"],["levelUp","Level up"],["achievement","Achievement"]
];

function getWpm(chars, seconds) {
  return seconds > 0 ? Math.round((chars / 5) / (seconds / 60)) : 0;
}

export default function App() {
  const [language, setLanguage] = useState("English");
  const [typed, setTyped] = useState("");
  const [startedAt, setStartedAt] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [coins, setCoins] = useState(120);
  const [collected, setCollected] = useState([]);
  const [status, setStatus] = useState("ready");
  const [progress, setProgress] = useState(0);
  const [nitro, setNitro] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [audioSettings, setAudioSettings] = useState(() => audioManager.get());
  const [showHelp, setShowHelp] = useState(false);
  const [toast, setToast] = useState("");
  const inputRef = useRef(null);
  const correctChars = useMemo(() => {
    const target = Array.from(passages[language]);
    const chars = Array.from(typed);
    let count = 0;
    for (let i = 0; i < chars.length; i++) if (chars[i] === target[i]) count++;
    return count;
  }, [typed, language]);
  const accuracy = typed.length ? Math.round(correctChars / Array.from(typed).length * 100) : 100;
  const wpm = getWpm(correctChars, Math.max(elapsed, 1));
  const targetLength = Array.from(passages[language]).length;
  const completion = Math.min(100, Math.round(correctChars / targetLength * 100));

  useEffect(() => {
    if (status !== "racing" || startedAt == null) return;
    const id = setInterval(() => setElapsed((Date.now() - startedAt) / 1000), 200);
    return () => clearInterval(id);
  }, [status, startedAt]);

  useEffect(() => {
    if (status !== "racing") return;
    const p = Math.min(100, Math.round(correctChars / targetLength * 100));
    setProgress(p);
    audioManager.updateEngine(Math.min(1, wpm / 100));
    if (p >= 100) finishRace(true);
  }, [correctChars, targetLength, status]);

  useEffect(() => () => audioManager.stopEngine(), []);

  async function enableAudio() {
    try {
      await audioManager.activate();
      setAudioReady(true);
      setAudioSettings(audioManager.get());
      audioManager.ui();
      setToast("Audio enabled");
      setTimeout(() => setToast(""), 1800);
    } catch {
      setToast("এই ব্রাউজারে অডিও চালু করা যায়নি");
      setTimeout(() => setToast(""), 2200);
    }
  }
  function setVolume(name, value) {
    audioManager.set(name, value);
    setAudioSettings(audioManager.get());
  }
  function toggleMute() {
    audioManager.mute(!audioSettings.muted);
    setAudioSettings(audioManager.get());
  }
  async function startRace() {
    if (!audioReady) await enableAudio();
    audioManager.stopEngine();
    setTyped(""); setProgress(0); setElapsed(0); setCollected([]);
    setStartedAt(Date.now()); setStatus("racing");
    audioManager.startEngine();
    [3,2,1,0].forEach((n, i) => setTimeout(() => audioManager.countdown(n), i * 650));
    setTimeout(() => inputRef.current?.focus(), 200);
  }
  function finishRace(won) {
    if (status !== "racing") return;
    setStatus(won ? "won" : "finished");
    setProgress(won ? 100 : progress);
    audioManager.stopEngine();
    won ? audioManager.victory() : audioManager.defeat();
    if (won) {
      setCoins(c => c + 100);
      setToast("+100 demo coins · Race completed");
      setTimeout(() => setToast(""), 2500);
    }
  }
  function resetRace() {
    audioManager.stopEngine();
    setStatus("ready"); setTyped(""); setElapsed(0); setProgress(0); setStartedAt(null); setCollected([]);
    audioManager.ui();
  }
  function handleChange(e) {
    const value = e.target.value;
    if (status === "ready") {
      setStatus("racing"); setStartedAt(Date.now());
      if (audioReady) audioManager.startEngine();
    }
    if (status !== "racing" && status !== "ready") return;
    const old = Array.from(typed), next = Array.from(value), target = Array.from(passages[language]);
    if (next.length > old.length) {
      const index = next.length - 1;
      if (next[index] === target[index]) {
        if (audioReady) audioManager.typing();
      } else if (audioReady) audioManager.error();
    } else if (next.length < old.length && audioReady) {
      audioManager.typing();
    }
    setTyped(value);
    const newCorrect = next.reduce((n, ch, i) => n + (ch === target[i] ? 1 : 0), 0);
    const newProgress = Math.min(100, Math.round(newCorrect / target.length * 100));
    const thresholds = [20, 40, 60, 80];
    for (const t of thresholds) {
      if (newProgress >= t && !collected.includes(t)) {
        setCollected(oldCollected => oldCollected.includes(t) ? oldCollected : [...oldCollected, t]);
        setCoins(c => c + 5);
        if (audioReady) audioManager.coin();
        break;
      }
    }
    if (next.length >= target.length && newCorrect === target.length) {
      setTimeout(() => finishRace(true), 80);
    }
  }
  function chooseLanguage(name) {
    setLanguage(name); setTyped(""); setProgress(0); setCollected([]);
    if (status === "racing") { setStatus("ready"); audioManager.stopEngine(); }
  }
  function toggleNitro() {
    if (status !== "racing") return;
    setNitro(true);
    if (audioReady) audioManager.nitro();
    setTimeout(() => setNitro(false), 1300);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" onClick={e => e.preventDefault()}>
          <div className="brand-mark"><CarFront size={24}/></div>
          <div><strong>TYPING<span>RACING</span></strong><small>3D · TYPE. DRIVE. WIN.</small></div>
        </a>
        <nav className="top-nav">
          <a className="nav-active" href="#race">Race</a>
          <a href="#garage" onClick={e => {e.preventDefault(); setToast("Garage will be added in a later milestone."); setTimeout(()=>setToast(""),2200)}}>Garage</a>
          <a href="#leaderboard" onClick={e => {e.preventDefault(); setToast("Online leaderboard is not connected in this prototype."); setTimeout(()=>setToast(""),2400)}}>Leaderboard</a>
        </nav>
        <div className="top-actions">
          <div className="coin-pill"><Coins size={16}/><b>{coins.toLocaleString()}</b><span>COINS</span></div>
          <button className="icon-button" aria-label="Audio settings" onClick={() => {setSettingsOpen(v=>!v); if(audioReady) audioManager.ui()}}><AudioLines size={19}/></button>
          <button className="profile-button" onClick={() => {setToast("Profiles arrive in the account milestone."); setTimeout(()=>setToast(""),2200)}}>GUEST <span className="avatar">G</span></button>
        </div>
      </header>

      <main className="main-content" id="race">
        <section className="hero-row">
          <div>
            <div className="eyebrow"><span className="live-dot"></span> RACING PROTOTYPE <span className="eyebrow-divider">/</span> BUILD 0.1</div>
            <h1>Type fast.<br/><span>Drive faster.</span></h1>
            <p className="hero-copy">Every correct character pushes you closer to the finish line. Tune in, focus up, and race your own pace.</p>
          </div>
          <div className="mode-card">
            <div className="mode-icon"><Zap size={18}/></div>
            <div><span className="mini-label">CURRENT MODE</span><strong>Solo Sprint</strong><small>Practice · AI rival preview</small></div>
            <span className="mode-badge">BETA</span>
          </div>
        </section>

        <section className="game-grid">
          <div className="race-panel panel">
            <div className="panel-top">
              <div className="section-label"><span className="status-dot"></span> NEON COAST CIRCUIT</div>
              <div className="race-status">{status === "racing" ? <><span className="live-dot"/> LIVE RACE</> : status === "won" ? "FINISHED" : "READY"}</div>
            </div>
            <div className="scene-wrap">
              <RaceScene progress={progress} nitro={nitro} running={status === "racing"}/>
              <div className="scene-vignette"></div>
              <div className="scene-hud">
                <div className="hud-chip"><span>POSITION</span><b>{status === "won" ? "1st" : "2nd"} <small>/ 2</small></b></div>
                <div className="hud-chip hud-time"><span>RACE TIME</span><b>{elapsed.toFixed(1)}<small>s</small></b></div>
                <div className="hud-chip"><span>YOUR SPEED</span><b>{wpm}<small> WPM</small></b></div>
              </div>
              <div className="scene-bottom">
                <div><span className="mini-label">RACE PROGRESS</span><div className="progress-track"><div style={{width:`${progress}%`}}/></div></div>
                <div className="progress-number">{progress}%</div>
              </div>
              {status === "won" && <div className="result-overlay"><div className="result-card"><Trophy size={34}/><span className="mini-label">RACE COMPLETE</span><h2>Victory!</h2><p>Clean typing. Clean finish.</p><button className="primary-button" onClick={resetRace}><RotateCcw size={16}/> Race again</button></div></div>}
              {status === "finished" && <div className="result-overlay"><div className="result-card"><Gauge size={34}/><span className="mini-label">RACE ENDED</span><h2>Keep practicing</h2><p>Every race makes you sharper.</p><button className="primary-button" onClick={resetRace}><RotateCcw size={16}/> Try again</button></div></div>}
            </div>
            <div className="race-footer">
              <div className="race-metrics">
                <div><span>WPM</span><strong>{wpm}</strong><small>Words / min</small></div>
                <div><span>ACCURACY</span><strong>{accuracy}%</strong><small>Correct input</small></div>
                <div><span>COLLECTED</span><strong>{collected.length}<small> / 4</small></strong><small>Coin drops</small></div>
              </div>
              <div className="race-actions">
                <button className="secondary-button" onClick={toggleNitro} disabled={status !== "racing"}><Zap size={16}/> Nitro</button>
                <button className="primary-button" onClick={status === "racing" ? () => finishRace(false) : startRace}>{status === "racing" ? <><Pause size={16}/> End race</> : <><Play size={16}/> {status === "won" || status === "finished" ? "Race again" : "Start race"}</>}</button>
              </div>
            </div>
          </div>

          <aside className="side-column">
            <section className="panel typing-panel">
              <div className="panel-heading"><div><span className="mini-label">YOUR CHALLENGE</span><h2>Typing console</h2></div><div className="keyboard-icon"><Keyboard size={20}/></div></div>
              <label className="language-label" htmlFor="language-select"><Globe2 size={15}/> LANGUAGE</label>
              <div className="select-wrap"><select id="language-select" value={language} onChange={e=>chooseLanguage(e.target.value)}>{languageNames.map(n=><option key={n}>{n}</option>)}</select><ChevronDown size={16}/></div>
              <div className="passage-box" onClick={() => inputRef.current?.focus()}>
                <p>{Array.from(passages[language]).map((ch,i)=><span key={`${i}-${ch}`} className={i < Array.from(typed).length ? (Array.from(typed)[i] === ch ? "char-correct" : "char-wrong") : "char-pending"}>{ch}</span>)}</p>
              </div>
              <textarea ref={inputRef} className="typing-input" value={typed} onChange={handleChange} onCompositionStart={()=>{}} placeholder="Click here and start typing…" aria-label="Type the displayed passage" rows={3} disabled={status === "won" || status === "finished"} />
              <div className="typing-hint"><span><span className="hint-dot green"/> Correct</span><span><span className="hint-dot red"/> Incorrect</span><span><CircleHelp size={13}/> Type the text above</span></div>
              <div className="typing-stats">
                <div><span>LIVE WPM</span><b>{wpm}</b></div><div><span>ACCURACY</span><b>{accuracy}%</b></div><div><span>PROGRESS</span><b>{completion}%</b></div>
              </div>
              <div className="typing-actions"><button className="text-button" onClick={() => {setTyped(""); setProgress(0); if(audioReady) audioManager.ui(); inputRef.current?.focus()}}><RotateCcw size={14}/> Reset text</button><button className="text-button" onClick={()=>setShowHelp(v=>!v)}><CircleHelp size={14}/> How to play</button></div>
              {showHelp && <div className="help-box">Type the passage exactly as shown. Correct characters increase progress. Collectible milestones add demo coins. Start race before typing for the full race HUD and engine sound.</div>}
            </section>
            <section className="panel rewards-panel">
              <div className="panel-heading"><div><span className="mini-label">RACE REWARDS</span><h2>Keep progressing</h2></div><Trophy size={19} className="gold-icon"/></div>
              <div className="reward-row"><div className="reward-icon coin-icon"><Coins size={18}/></div><div className="reward-copy"><strong>Coin drops</strong><span>Reach typing milestones</span></div><b>+5 <small>each</small></b></div>
              <div className="reward-row"><div className="reward-icon xp-icon"><Sparkles size={18}/></div><div className="reward-copy"><strong>Race finish</strong><span>Complete a practice run</span></div><b>+100 <small>demo coins</small></b></div>
              <div className="reward-note"><ShieldCheck size={15}/> Demo rewards only. Online server validation is not connected.</div>
            </section>
          </aside>
        </section>

        <section className="bottom-strip">
          <div className="strip-item"><div className="strip-icon"><Activity size={18}/></div><div><strong>Track your rhythm</strong><span>Live typing performance</span></div></div>
          <div className="strip-item"><div className="strip-icon"><AudioLines size={18}/></div><div><strong>Immersive audio</strong><span>Custom synthesized effects</span></div></div>
          <div className="strip-item"><div className="strip-icon"><Globe2 size={18}/></div><div><strong>10 sample languages</strong><span>More can be added</span></div></div>
        </section>
        <footer><span>© 2026 TYPING RACING 3D</span><span>PROTOTYPE BUILD · NOT ONLINE MULTIPLAYER YET</span><button onClick={()=>setSettingsOpen(v=>!v)}><Settings2 size={14}/> Audio settings</button></footer>
      </main>

      {settingsOpen && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setSettingsOpen(false)}}><section className="settings-modal panel">
        <div className="modal-title"><div><span className="mini-label">GAME PREFERENCES</span><h2>Audio settings</h2></div><button className="icon-button" onClick={()=>setSettingsOpen(false)}>×</button></div>
        <p className="modal-copy">Premium Mechanical · original synthesized sound design</p>
        {!audioReady && <button className="primary-button enable-audio" onClick={enableAudio}><Volume2 size={16}/> Enable game audio</button>}
        <div className="volume-row"><label>Master volume <b>{Math.round(audioSettings.master*100)}%</b></label><input type="range" min="0" max="1" step=".05" value={audioSettings.master} onChange={e=>setVolume("master",e.target.value)}/></div>
        <button className="secondary-button mute-button" onClick={toggleMute}>{audioSettings.muted ? <Volume2 size={16}/> : <VolumeX size={16}/>} {audioSettings.muted ? "Unmute all sounds" : "Mute all sounds"}</button>
        <div className="volume-list">{soundControls.map(([name,label])=><div className="volume-row" key={name}><label>{label}<b>{Math.round(audioSettings[name]*100)}%</b></label><input aria-label={`${label} volume`} type="range" min="0" max="1" step=".05" value={audioSettings[name]} onChange={e=>setVolume(name,e.target.value)}/></div>)}</div>
        <div className="audio-footnote">Settings save in this browser. Audio begins only after you interact with the page.</div>
      </section></div>}
      {toast && <div className="toast"><Check size={16}/>{toast}</div>}
    </div>
  );
}
