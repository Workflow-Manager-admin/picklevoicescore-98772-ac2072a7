import React, { useState, useEffect, useRef } from 'react';
import './App.css';

// Color/Theme System
const THEME_COLORS = {
  primary: '#4CAF50', // Main
  secondary: '#FFFFFF', // Background/Sidebar
  accent: '#FFEB3B', // Accent/Highlight
};

// Utility: Format score object for display ("7-5")
function formatScore(score) {
  if (!score || score.a === undefined || score.b === undefined) return "-";
  return `${score.a}-${score.b}`;
}

// Parses voice command text for 'pickle' commands, returns object {type,data}
function parseVoiceCommand(text) {
  // Normalize
  const t = text.trim().toLowerCase();
  if (t.includes("what’s the score") || t.includes("whats the score")) {
    return { type: "query" };
  }

  // Score pattern: e.g., "pickle seven five", "pickle 7 5"
  const rx = /^pickle\s+(\d+|zero|one|two|three|four|five|six|seven|eight|nine|ten)\s+(\d+|zero|one|two|three|four|five|six|seven|eight|nine|ten)$/i;
  const match = t.match(rx);
  if (match) {
    const wordsToNum = w => {
      const m = {
        zero: 0, one: 1, two: 2, three: 3, four: 4,
        five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
      };
      return /^\d+$/.test(w) ? parseInt(w, 10) : m[w] ?? null;
    };
    const a = wordsToNum(match[1]);
    const b = wordsToNum(match[2]);
    if (a !== null && b !== null) {
      return { type: "score", data: { a, b } };
    }
  }
  return { type: "unknown" };
}

// PUBLIC_INTERFACE
function App() {
  const [theme, setTheme] = useState('light');
  const [score, setScore] = useState({ a: 0, b: 0 });
  const [history, setHistory] = useState([{ a: 0, b: 0, timestamp: Date.now() }]);
  const [statusMsg, setStatusMsg] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [speaking, setSpeaking] = useState(false);

  // refs to SpeechRecognition and SpeechSynthesis instances
  const recognitionRef = useRef(null);

  // COLORS: CSS custom properties for dynamic accents
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.setProperty('--pb-primary', THEME_COLORS.primary);
    document.documentElement.style.setProperty('--pb-accent', THEME_COLORS.accent);
    document.documentElement.style.setProperty('--pb-secondary', THEME_COLORS.secondary);
  }, [theme]);

  // PUBLIC_INTERFACE
  const toggleTheme = () => {
    setTheme(t => (t === 'light' ? 'dark' : 'light'));
  };

  // PUBLIC_INTERFACE
  // Speech Recognition Setup
  useEffect(() => {
    // Do one-time SpeechRecognition setup (if supported)
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setStatusMsg('Speech Recognition not supported in this browser.');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);

    recognition.onresult = event => {
      const txt = event.results[0][0].transcript;
      setTranscript(txt);

      const command = parseVoiceCommand(txt);
      if (command.type === "score") {
        setScore(command.data);
        setHistory(prev => [{ ...command.data, timestamp: Date.now() }, ...prev]);
        // Speak out confirmation
        speakText(`Score recorded: ${command.data.a} to ${command.data.b}`);
        setStatusMsg(`Score updated: ${command.data.a} - ${command.data.b}`);
      } else if (command.type === "query") {
        speakText(`The score is ${score.a} to ${score.b}`);
        setStatusMsg("Answered with the current score.");
      } else {
        speakText("Sorry, I didn't understand. Please try again.");
        setStatusMsg("Unrecognized. Say: 'pickle [your score]' or 'hey pickle, what's the score?'");
      }
    };
    recognition.onerror = event => {
      setStatusMsg(`Recognition error: ${event.error}`);
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    // No cleanup needed (instance is persistent)
  }, [score]);

  // PUBLIC_INTERFACE
  // TTS: Speak text
  function speakText(txt) {
    // Simple SpeechSynthesis API
    setSpeaking(true);
    const u = new window.SpeechSynthesisUtterance(txt);
    u.lang = "en-US";
    u.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  }

  // PUBLIC_INTERFACE
  // Manual start/stop listening
  const handleListen = () => {
    if (!recognitionRef.current) {
      setStatusMsg("Speech recognition unavailable.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setTranscript('');
      setStatusMsg("Listening... Use the trigger word 'pickle'");
      recognitionRef.current.start();
    }
  };

  // PUBLIC_INTERFACE
  // Manual text input field (backup for voice input)
  function handleManualScoreInput(evt) {
    evt.preventDefault();
    const form = evt.target;
    const a = parseInt(form.a.value, 10);
    const b = parseInt(form.b.value, 10);
    if (!isNaN(a) && !isNaN(b)) {
      setScore({ a, b });
      setHistory(prev => [{ a, b, timestamp: Date.now() }, ...prev]);
      setStatusMsg(`Score manually set: ${a} - ${b}`);
      speakText(`Score updated: ${a} to ${b}`);
    }
  }

  // PUBLIC_INTERFACE
  // Reset history and score
  function resetScores() {
    setScore({ a: 0, b: 0 });
    setHistory([{ a: 0, b: 0, timestamp: Date.now() }]);
    setStatusMsg("Scores reset.");
    speakText("Scores have been reset.");
  }

  // Layout as described: main panel (score), voice cmd button, history sidebar, bottom nav
  return (
    <div className="pb-app-root" style={{ background: THEME_COLORS.secondary, minHeight: '100vh', fontFamily: 'Inter, "Segoe UI", Arial, sans-serif', color: '#222' }}>
      {/* Top theme toggle button */}
      <button className="theme-toggle" style={{ right: 32, top: 20 }} onClick={toggleTheme}
        aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}>
        {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
      </button>
      <div className="pb-main-layout" style={{ display: 'flex', minHeight: '100vh' }}>
        {/* LEFT: Sidebar history */}
        <aside className="pb-history-bar"
          style={{
            background: THEME_COLORS.secondary,
            borderRight: `2px solid ${THEME_COLORS.primary}22`,
            width: 220,
            padding: '40px 14px 10px 14px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            minWidth: 170,
            maxWidth: 300,
            gap: '12px',
          }}>
          <h4 style={{ color: THEME_COLORS.primary, marginBottom: 6 }}>History</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, width: '100%' }}>
            {history.map((s, idx) => (
              <li key={s.timestamp || idx} style={{
                margin: '6px 0',
                padding: '4px 9px',
                background: idx === 0 ? THEME_COLORS.accent + "33" : 'transparent',
                borderRadius: 8,
                fontWeight: idx === 0 ? 600 : 400,
                color: idx === 0 ? '#333' : '#888',
                border: idx === 0 ? `1px solid ${THEME_COLORS.primary}` : 'none',
                fontSize: 15,
              }}>
                {formatScore(s)} <span style={{ fontSize: 11, color: '#bbb', marginLeft: 8 }}>{new Date(s.timestamp).toLocaleTimeString([], { timeStyle: 'short' })}</span>
              </li>
            ))}
          </ul>
          <button onClick={resetScores} style={{
            marginTop: 'auto',
            background: '#F8F8F8',
            border: `1px solid ${THEME_COLORS.primary}44`,
            color: THEME_COLORS.primary,
            borderRadius: 8,
            fontWeight: 600,
            padding: '7px 12px',
            cursor: 'pointer',
            fontSize: 13
          }}>Reset</button>
        </aside>
        {/* CENTER: Score board + input/voice controls */}
        <main className="pb-score-panel" style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 20px 90px 20px',
          position: 'relative',
          background: '#FCFCFC'
        }}>
          <h2 className="pb-title" style={{
            margin: '10px 0 8px 0',
            fontWeight: 700,
            fontSize: 32,
            letterSpacing: '0.04em',
            color: THEME_COLORS.primary,
            textShadow: `0 2px 8px ${THEME_COLORS.primary}22`
          }}>Pickleball Score</h2>
          <div className="pb-current-score" style={{
            fontSize: 70,
            fontWeight: 700,
            color: THEME_COLORS.primary,
            margin: '30px 0 12px 0',
            letterSpacing: 3,
            background: `linear-gradient(90deg, ${THEME_COLORS.primary} 60%, ${THEME_COLORS.accent} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            {score && score.a !== undefined ? formatScore(score) : "-"}
          </div>
          <div style={{ color: "#888", fontSize: 16, marginBottom: 16 }}>Say <span style={{
            fontWeight: 600,
            background: THEME_COLORS.accent + "88",
            borderRadius: 5,
            padding: '1px 7px'
          }}>pickle 5 3</span> or <span style={{
            fontWeight: 600,
            background: THEME_COLORS.accent + "88",
            borderRadius: 5,
            padding: '1px 7px'
          }}>"hey pickle, what's the score?"</span></div>

          <button
            className="pb-voice-btn"
            data-testid="voice-command-btn"
            style={{
              margin: '20px 0 12px 0',
              padding: '18px 35px',
              fontSize: 18,
              fontWeight: 700,
              borderRadius: '32px',
              border: 'none',
              background: isListening ? THEME_COLORS.accent : THEME_COLORS.primary,
              color: isListening ? '#333' : '#fff',
              boxShadow: isListening ? `0 0 0 4px ${THEME_COLORS.accent}66` : '0 3px 8px #4442',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onClick={handleListen}
            aria-label={isListening ? "Stop listening" : "Start listening"}
            disabled={speaking}
          >
            <span role="img" aria-label="microphone">{isListening ? '🎤' : '🎙️'}</span>
            {isListening ? ' Listening…' : ' Voice Command'}
          </button>
          <div
            className="pb-transcript"
            style={{
              minHeight: 28,
              color: '#222',
              margin: '8px 0',
              fontSize: 15,
              opacity: transcript ? 0.95 : 0.6,
              background: transcript ? '#f5f5f5' : 'transparent',
              borderRadius: 5,
              padding: transcript ? '6px 12px' : 0,
              border: transcript ? `1.5px solid ${THEME_COLORS.primary}33` : 'none',
              maxWidth: 260
            }}
          >{transcript}</div>
          {/* Manual entry fallback */}
          <form className="pb-manual-form" style={{
            marginTop: 18,
            display: 'flex',
            flexDirection: 'row',
            gap: 10,
            alignItems: 'center',
            background: '#F6F7F8',
            padding: '10px 18px',
            borderRadius: 13,
            boxShadow: '0 2px 12px #1231',
            maxWidth: 370,
            marginLeft: 'auto',
            marginRight: 'auto'
          }} onSubmit={handleManualScoreInput}>
            <span style={{ color: THEME_COLORS.primary, fontWeight: 600, fontSize: 15 }}>
              Manual
            </span>
            <input name="a" aria-label="Score for Side A" type="number" min="0" max="99" required placeholder="A"
              defaultValue={score.a} style={{
                width: 46, padding: 6, border: `1.5px solid ${THEME_COLORS.primary}33`, borderRadius: 6, fontWeight: 600,
                fontSize: 18
              }} />
            <span style={{ fontSize: 22, color: "#bbb", margin: "0 2px" }}>-</span>
            <input name="b" aria-label="Score for Side B" type="number" min="0" max="99" required placeholder="B"
              defaultValue={score.b} style={{
                width: 46, padding: 6, border: `1.5px solid ${THEME_COLORS.primary}33`, borderRadius: 6, fontWeight: 600,
                fontSize: 18
              }} />
            <button type="submit" style={{
              padding: '7px 13px',
              background: THEME_COLORS.primary,
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontWeight: 600,
              fontSize: 14,
              marginLeft: 8,
              boxShadow: '0 1px 6px #0001',
              cursor: 'pointer'
            }}>Set</button>
          </form>
          {/* Status message */}
          <div style={{
            marginTop: 14,
            color: statusMsg.includes("error") ? "#E3414E" : "#717171",
            fontSize: 13,
            minHeight: 22
          }}>{statusMsg}</div>
        </main>
      </div>
      {/* Bottom navigation */}
      <nav className="pb-bottom-nav" style={{
        background: '#F8F9FA',
        borderTop: `2px solid ${THEME_COLORS.primary}11`,
        height: 58,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        position: 'fixed',
        bottom: 0,
        width: '100vw',
        left: 0,
        boxShadow: '0 -1px 8px #ddd2'
      }}>
        <button style={{
          background: 'none', border: 'none', color: THEME_COLORS.primary, fontWeight: 700, fontSize: 15, cursor: 'pointer'
        }}
          onClick={() => alert("Settings feature coming soon.")}>
          <span role="img" aria-label="settings" style={{ fontSize: 19 }}>⚙️</span> Settings
        </button>
        <button style={{
          background: 'none', border: 'none', color: THEME_COLORS.primary, fontWeight: 700, fontSize: 15, cursor: 'pointer'
        }}
          onClick={() => alert("Say 'pickle' and the score to record.\nSay 'hey pickle, what’s the score?' to query.\nOr use the manual inputs.")}>
          <span role="img" aria-label="help" style={{ fontSize: 19 }}>❓</span> Help
        </button>
      </nav>
    </div>
  );
}

export default App;
