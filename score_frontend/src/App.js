import React, { useState, useEffect, useRef } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { useSpeechSynthesis } from 'react-speech-kit';
import './App.css';

// === Theme Tokens ===
const THEME = {
  primary: '#4CAF50',
  accent: '#FFEB3B',
  secondary: '#FFFFFF',
};

const WAKE_WORD = 'pickle';
const QUERY_PHRASE = [
  "hey pickle, what's the score",
  'what is the score',
  'hey pickle whats the score',
  'pickle what is the score',
  'pickle, what is the score',
];

// PUBLIC_INTERFACE
function formatScore(score) {
  if (!score || score.a === undefined || score.b === undefined) return '-';
  return `${score.a}-${score.b}`;
}

// PUBLIC_INTERFACE
function parseVoiceCommand(text) {
  const t = text.trim().toLowerCase();

  // Score query
  if (
    QUERY_PHRASE.some(q => t.includes(q)) ||
    /(hey\s*)?pickle[, ]*(what(’|')?s|is)?[ ]*the score/.test(t)
  ) {
    return { type: 'query' };
  }

  // e.g. 'pickle 7 5' or 'hey pickle 8 4', flexible numbers
  const rx = /^(?:hey\s*)?pickle\s+(\d+|zero|one|two|three|four|five|six|seven|eight|nine|ten)[\s,]+(\d+|zero|one|two|three|four|five|six|seven|eight|nine|ten)/i;
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
      return { type: 'score', data: { a, b } };
    }
  }
  return { type: 'unknown' };
}

// PUBLIC_INTERFACE
function App() {
  // Score State
  const [score, setScore] = useState({ a: 0, b: 0 });
  const [history, setHistory] = useState([{ a: 0, b: 0, timestamp: Date.now() }]);
  const [statusMsg, setStatusMsg] = useState('');
  const [theme, setTheme] = useState('light');
  const [manuallyListening, setManuallyListening] = useState(false);

  // Speech Recognition (react-speech-recognition)
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();
  // Text-to-Speech (react-speech-kit)
  const { speak, speaking, supported: ttsSupported, voices } = useSpeechSynthesis();

  const ignoreWake = useRef(false);

  // Theme system: CSS root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.setProperty('--pb-primary', THEME.primary);
    document.documentElement.style.setProperty('--pb-accent', THEME.accent);
    document.documentElement.style.setProperty('--pb-secondary', THEME.secondary);
  }, [theme]);

  // PUBLIC_INTERFACE
  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  // PUBLIC_INTERFACE
  // Listen for wake word in transcript
  useEffect(() => {
    if (!listening && transcript && !manuallyListening) {
      // On transcript, parse
      handleVoice(transcript);
      resetTranscript();
    }
    // eslint-disable-next-line
  }, [transcript, listening, manuallyListening]);

  // PUBLIC_INTERFACE
  // Start continuous listening for the wake word unless TTS is active
  useEffect(() => {
    if (!browserSupportsSpeechRecognition) return;
    if (speaking) {
      SpeechRecognition.abortListening();
    } else if (!listening && !manuallyListening) {
      SpeechRecognition.startListening({ continuous: true, language: 'en-US' });
    }
    // Stop listening when window hidden (power-optimize)
    const onBlur = () => SpeechRecognition.abortListening();
    const onFocus = () => {
      if (!speaking && !manuallyListening) {
        SpeechRecognition.startListening({ continuous: true, language: 'en-US' });
      }
    };
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      SpeechRecognition.abortListening();
    };
    // eslint-disable-next-line
  }, [browserSupportsSpeechRecognition, speaking, manuallyListening]);

  // PUBLIC_INTERFACE
  // Handles any transcript
  function handleVoice(txt) {
    const cmd = parseVoiceCommand(txt);
    if (cmd.type === 'score') {
      setScore(cmd.data);
      setHistory(prev => [{ ...cmd.data, timestamp: Date.now() }, ...prev]);
      tts(`Score recorded: ${cmd.data.a} to ${cmd.data.b}`);
      setStatusMsg(`Score updated: ${cmd.data.a} - ${cmd.data.b}`);
    } else if (cmd.type === 'query') {
      tts(`The score is ${score.a} to ${score.b}`);
      setStatusMsg('Answered with the current score.');
    } else {
      tts("Sorry, I didn't understand. Please say 'pickle' and then the scores.");
      setStatusMsg("Not understood. Say: 'pickle [score]' or 'hey pickle, what’s the score?'");
    }
  }

  // PUBLIC_INTERFACE
  // Manual Listening (voice input button)
  function startManualListening() {
    if (!browserSupportsSpeechRecognition) {
      setStatusMsg('Speech Recognition not supported in this browser.');
      return;
    }
    setManuallyListening(true);
    setStatusMsg("Listening... Say something with 'pickle'");
    resetTranscript();
    SpeechRecognition.startListening({ continuous: false, language: 'en-US' });
  }
  useEffect(() => {
    if (!manuallyListening) return;
    if (!listening && transcript) {
      handleVoice(transcript);
      setManuallyListening(false);
      resetTranscript();
    }
    // eslint-disable-next-line
  }, [listening, transcript, manuallyListening]);

  // PUBLIC_INTERFACE
  // Text-to-speech wrapper: use react-speech-kit or fallback to native API
  function tts(text) {
    if (ttsSupported && voices && voices.length > 0) {
      speak({ text, voice: voices.find(v => v.lang.startsWith('en')) || voices[0] });
    } else if ('speechSynthesis' in window) {
      const utter = new window.SpeechSynthesisUtterance(text);
      utter.lang = 'en-US';
      window.speechSynthesis.speak(utter);
    }
  }

  // Manual form handler
  // PUBLIC_INTERFACE
  function handleManualScoreInput(evt) {
    evt.preventDefault();
    const form = evt.target;
    const a = parseInt(form.a.value, 10);
    const b = parseInt(form.b.value, 10);
    if (!isNaN(a) && !isNaN(b)) {
      setScore({ a, b });
      setHistory(prev => [{ a, b, timestamp: Date.now() }, ...prev]);
      setStatusMsg(`Score manually set: ${a} - ${b}`);
      tts(`Score updated: ${a} to ${b}`);
    }
  }

  // PUBLIC_INTERFACE
  function resetScores() {
    setScore({ a: 0, b: 0 });
    setHistory([{ a: 0, b: 0, timestamp: Date.now() }]);
    setStatusMsg('Scores reset.');
    tts('Scores have been reset.');
  }

  // Help text
  const helpText =
    "Say 'pickle' and a score to record (for example: 'pickle seven five'), or say 'hey pickle, what’s the score?' to ask for the score. You can use the voice button or the manual form as backup.";

  // Layout
  return (
    <div
      className="pb-app-root"
      style={{
        background: THEME.secondary,
        minHeight: '100vh',
        color: '#222',
        fontFamily: 'Inter, Segoe UI, Arial, sans-serif'
      }}
    >
      {/* Theme toggle */}
      <button
        className="theme-toggle"
        style={{ right: 32, top: 20 }}
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      >
        {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
      </button>

      <div className="pb-main-layout" style={{ display: 'flex', minHeight: '100vh' }}>
        {/* Sidebar/history */}
        <aside
          className="pb-history-bar"
          style={{
            background: THEME.secondary,
            borderRight: `2px solid ${THEME.primary}22`,
            width: 220,
            padding: '40px 14px 10px 14px',
            boxSizing: 'border-box',
            minWidth: 170,
            maxWidth: 300,
            gap: 12,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
          }}
        >
          <h4 style={{ color: THEME.primary, marginBottom: 6 }}>History</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, width: '100%' }}>
            {history.map((s, idx) => (
              <li
                key={s.timestamp || idx}
                style={{
                  margin: '6px 0',
                  padding: '4px 9px',
                  background: idx === 0 ? THEME.accent + '33' : 'transparent',
                  borderRadius: 8,
                  fontWeight: idx === 0 ? 600 : 400,
                  color: idx === 0 ? '#333' : '#888',
                  border: idx === 0 ? `1px solid ${THEME.primary}` : 'none',
                  fontSize: 15,
                }}
              >
                {formatScore(s)}{' '}
                <span style={{ fontSize: 11, color: '#bbb', marginLeft: 8 }}>
                  {new Date(s.timestamp).toLocaleTimeString([], { timeStyle: 'short' })}
                </span>
              </li>
            ))}
          </ul>
          <button
            onClick={resetScores}
            style={{
              marginTop: 'auto',
              background: '#F8F8F8',
              border: `1px solid ${THEME.primary}44`,
              color: THEME.primary,
              borderRadius: 8,
              fontWeight: 600,
              padding: '7px 12px',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Reset
          </button>
        </aside>
        {/* Main score panel */}
        <main
          className="pb-score-panel"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 20px 90px 20px',
            position: 'relative',
            background: '#FCFCFC',
          }}
        >
          <h2
            className="pb-title"
            style={{
              margin: '10px 0 8px 0',
              fontWeight: 700,
              fontSize: 32,
              letterSpacing: '0.04em',
              color: THEME.primary,
              textShadow: `0 2px 8px ${THEME.primary}22`,
            }}
          >
            Pickleball Score
          </h2>
          <div
            className="pb-current-score"
            style={{
              fontSize: 70,
              fontWeight: 700,
              color: THEME.primary,
              margin: '30px 0 12px 0',
              letterSpacing: 3,
              background: `linear-gradient(90deg, ${THEME.primary} 60%, ${THEME.accent} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {score && score.a !== undefined ? formatScore(score) : '-'}
          </div>
          <div
            style={{
              color: '#888',
              fontSize: 16,
              marginBottom: 16,
            }}
          >
            Say{' '}
            <span
              style={{
                fontWeight: 600,
                background: THEME.accent + '88',
                borderRadius: 5,
                padding: '1px 7px',
              }}
            >
              pickle 5 3
            </span>{' '}
            or{' '}
            <span
              style={{
                fontWeight: 600,
                background: THEME.accent + '88',
                borderRadius: 5,
                padding: '1px 7px',
              }}
            >
              "hey pickle, what's the score?"
            </span>
          </div>

          <button
            className="pb-voice-btn"
            data-testid="voice-command-btn"
            onClick={startManualListening}
            aria-label={manuallyListening || listening ? 'Stop listening' : 'Start listening'}
            style={{
              margin: '20px 0 12px 0',
              padding: '18px 35px',
              fontSize: 18,
              fontWeight: 700,
              borderRadius: 32,
              border: 'none',
              background: manuallyListening || listening ? THEME.accent : THEME.primary,
              color: manuallyListening || listening ? '#333' : '#fff',
              boxShadow:
                manuallyListening || listening
                  ? `0 0 0 4px ${THEME.accent}66`
                  : '0 3px 8px #4442',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            disabled={speaking}
          >
            <span role="img" aria-label="microphone">
              {manuallyListening || listening ? '🎤' : '🎙️'}
            </span>{' '}
            {manuallyListening || listening ? ' Listening…' : ' Voice Command'}
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
              border: transcript ? `1.5px solid ${THEME.primary}33` : 'none',
              maxWidth: 260,
            }}
          >
            {transcript}
          </div>
          {/* Manual entry fallback */}
          <form
            className="pb-manual-form"
            style={{
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
              marginRight: 'auto',
            }}
            onSubmit={handleManualScoreInput}
          >
            <span
              style={{
                color: THEME.primary,
                fontWeight: 600,
                fontSize: 15,
              }}
            >
              Manual
            </span>
            <input
              name="a"
              aria-label="Score for Side A"
              type="number"
              min="0"
              max="99"
              required
              placeholder="A"
              defaultValue={score.a}
              style={{
                width: 46,
                padding: 6,
                border: `1.5px solid ${THEME.primary}33`,
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 18,
              }}
            />
            <span style={{ fontSize: 22, color: '#bbb', margin: '0 2px' }}>-</span>
            <input
              name="b"
              aria-label="Score for Side B"
              type="number"
              min="0"
              max="99"
              required
              placeholder="B"
              defaultValue={score.b}
              style={{
                width: 46,
                padding: 6,
                border: `1.5px solid ${THEME.primary}33`,
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 18,
              }}
            />
            <button
              type="submit"
              style={{
                padding: '7px 13px',
                background: THEME.primary,
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 14,
                marginLeft: 8,
                boxShadow: '0 1px 6px #0001',
                cursor: 'pointer',
              }}
            >
              Set
            </button>
          </form>
          <div
            style={{
              marginTop: 14,
              color: statusMsg.includes('error') ? '#E3414E' : '#717171',
              fontSize: 13,
              minHeight: 22,
            }}
          >
            {statusMsg}
          </div>
        </main>
      </div>
      {/* Bottom nav */}
      <nav
        className="pb-bottom-nav"
        style={{
          background: '#F8F9FA',
          borderTop: `2px solid ${THEME.primary}11`,
          height: 58,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          position: 'fixed',
          bottom: 0,
          width: '100vw',
          left: 0,
          boxShadow: '0 -1px 8px #ddd2',
        }}
      >
        <button
          style={{
            background: 'none',
            border: 'none',
            color: THEME.primary,
            fontWeight: 700,
            fontSize: 15,
            cursor: 'pointer',
          }}
          onClick={() => alert('Settings feature coming soon.')}
        >
          <span role="img" aria-label="settings" style={{ fontSize: 19 }}>
            ⚙️
          </span>{' '}
          Settings
        </button>
        <button
          style={{
            background: 'none',
            border: 'none',
            color: THEME.primary,
            fontWeight: 700,
            fontSize: 15,
            cursor: 'pointer',
          }}
          onClick={() => alert(helpText)}
        >
          <span role="img" aria-label="help" style={{ fontSize: 19 }}>
            ❓
          </span>{' '}
          Help
        </button>
      </nav>
    </div>
  );
}

export default App;
