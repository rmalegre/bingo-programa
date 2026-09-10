import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { jsPDF } from "jspdf";
import "./styles.css";

const KEY = "sorteo-100-state-v2";
const THEME_KEY = "sorteo-100-theme";
const AUTH_KEY = "sorteo-100-authenticated";
const RAFFLE_NUMBER_KEY = "sorteo-100-raffle-number";

function freshState() {
  return {
    available: Array.from({ length: 100 }, (_, i) => i + 1),
    drawn: [],
    current: null
  };
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && Array.isArray(saved.available) && Array.isArray(saved.drawn)) return saved;
  } catch {}
  return freshState();
}

function loadTheme() {
  return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
}

function loadAuthentication() {
  return localStorage.getItem(AUTH_KEY) === "true";
}

function loadRaffleNumber() {
  const saved = Number.parseInt(localStorage.getItem(RAFFLE_NUMBER_KEY), 10);
  return Number.isInteger(saved) && saved > 0 ? saved : 1;
}

function numberToWords(number) {
  const units = ["cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"];
  const teens = ["diez", "once", "doce", "trece", "catorce", "quince", "dieciseis", "diecisiete", "dieciocho", "diecinueve"];
  const tens = ["", "", "veinte", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];

  if (number < 10) return units[number];
  if (number < 20) return teens[number - 10];
  if (number === 100) return "cien";
  if (number === 20) return "veinte";

  const ten = Math.floor(number / 10);
  const unit = number % 10;
  return unit === 0 ? tens[ten] : `${tens[ten]} y ${units[unit]}`;
}

function announceNumber(number) {
  if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) return;

  const speech = window.speechSynthesis;
  speech.cancel();
  speech.resume();

  const announcement = new window.SpeechSynthesisUtterance(`Número ${numberToWords(number)}`);
  const voices = speech.getVoices();
  const preferredVoice = voices.find(voice => ["es-419", "es-MX", "es-US", "es-CO", "es-AR", "es-CL", "es-PE"].includes(voice.lang))
    || voices.find(voice => voice.lang.toLowerCase().startsWith("es-"));

  announcement.lang = preferredVoice?.lang || "es-MX";
  if (preferredVoice) announcement.voice = preferredVoice;
  announcement.rate = 0.9;
  announcement.pitch = 1;
  speech.speak(announcement);
}

function LandingPage({ theme, onToggleTheme, onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submitLogin = event => {
    event.preventDefault();
    if (username === "admin" && password === "admin123") {
      localStorage.setItem(AUTH_KEY, "true");
      onLogin();
      return;
    }
    setError("Usuario o clave incorrectos.");
  };

  return (
    <main className="landing-shell">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />
      <button
        className="landing-theme-btn"
        onClick={onToggleTheme}
        aria-label={theme === "dark" ? "Activar modo claro" : "Activar modo oscuro"}
        title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
      >
        {theme === "dark" ? "☀" : "☾"}
      </button>

      <section className="landing-content">
     
        <form className="login-card" onSubmit={submitLogin}>
          <div className="login-card-heading">
            <span className="login-icon">→</span>
            <div><p>ÁREA PRIVADA</p><h2>Iniciar sesión</h2></div>
          </div>
          <p className="login-help">Ingresa tus datos para abrir el panel de bingo.</p>
          <label htmlFor="username">Usuario</label>
          <input id="username" value={username} onChange={event => { setUsername(event.target.value); setError(""); }} autoComplete="username" placeholder="Escribe tu usuario" />
          <label htmlFor="password">Clave</label>
          <input id="password" type="password" value={password} onChange={event => { setPassword(event.target.value); setError(""); }} autoComplete="current-password" placeholder="Escribe tu clave" />
          {error && <p className="login-error" role="alert">{error}</p>}
          <button className="login-btn" type="submit">Entrar al bingo <span>↗</span></button>
          <p className="login-note">Acceso protegido para administradores</p>
        </form>
      </section>
      <footer>✨ Bingo 100 · Juego de números sin repetición</footer>
    </main>
  );
}

function DrawApp({ theme, onToggleTheme, onLogout }) {
  const [state, setState] = useState(loadState);
  const [raffleNumber, setRaffleNumber] = useState(loadRaffleNumber);
  const [rolling, setRolling] = useState(false);
  const [display, setDisplay] = useState(state.current);
  const [finished, setFinished] = useState(state.available.length === 0);
  const [projection, setProjection] = useState(false);
  const [reveal, setReveal] = useState(false);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    localStorage.setItem(RAFFLE_NUMBER_KEY, String(raffleNumber));
  }, [raffleNumber]);

  useEffect(() => () => {
    window.speechSynthesis?.cancel();
  }, []);

  useEffect(() => {
    const speech = window.speechSynthesis;
    if (!speech) return undefined;
    speech.getVoices();
    const loadVoices = () => speech.getVoices();
    speech.addEventListener("voiceschanged", loadVoices);
    return () => speech.removeEventListener("voiceschanged", loadVoices);
  }, []);

  const progress = useMemo(() => state.drawn.length, [state.drawn.length]);

  useEffect(() => {
    const onFullscreen = () => setProjection(document.fullscreenElement != null);
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => document.removeEventListener("fullscreenchange", onFullscreen);
  }, []);

  const toggleProjection = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setProjection(true);
      } else {
        await document.exitFullscreen();
        setProjection(false);
      }
    } catch {
      setProjection(v => !v);
    }
  };

  const draw = () => {
    if (rolling || state.available.length === 0) return;

    window.speechSynthesis?.resume();
    setRolling(true);
    setReveal(false);
    const pool = [...state.available];
    const winner = pool[Math.floor(Math.random() * pool.length)];

    let ticks = 0;
    const timer = setInterval(() => {
      setDisplay(pool[Math.floor(Math.random() * pool.length)]);
      ticks++;

      if (ticks >= 20) {
        clearInterval(timer);
        setDisplay(winner);
        setState(prev => ({
          available: prev.available.filter(n => n !== winner),
          drawn: [...prev.drawn, winner],
          current: winner
        }));
        announceNumber(winner);
        setRolling(false);
        setReveal(true);
        setFinished(pool.length === 1);
      }
    }, 70);
  };

  const undoLast = () => {
    if (rolling || state.drawn.length === 0) return;

    const previousNumber = state.drawn.length > 1 ? state.drawn[state.drawn.length - 2] : null;
    const lastNumber = state.drawn[state.drawn.length - 1];

    setState(prev => ({
      available: [...prev.available, lastNumber].sort((a, b) => a - b),
      drawn: prev.drawn.slice(0, -1),
      current: previousNumber
    }));
    setDisplay(previousNumber);
    setFinished(false);
    setReveal(false);
  };

  const downloadPdf = () => {
    const pdf = new jsPDF();
    const date = new Date().toLocaleDateString("es-ES");

    pdf.setFillColor(35, 42, 82);
    pdf.rect(0, 0, 210, 42, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(24);
    pdf.setFont("helvetica", "bold");
    pdf.text("BINGO 100", 20, 20);
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Numero de bingo: ${raffleNumber}`, 20, 30);
    pdf.text(`Fecha: ${date}`, 135, 30);

    pdf.setTextColor(45, 53, 80);
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text(`Numeros cantados (${state.drawn.length}/100)`, 20, 58);

    state.drawn.forEach((number, index) => {
      const column = index % 10;
      const row = Math.floor(index / 10);
      const x = 20 + column * 18;
      const y = 70 + row * 14;
      pdf.setFillColor(221, 232, 255);
      pdf.setDrawColor(157, 185, 237);
      pdf.roundedRect(x, y - 8, 14, 10, 2, 2, "FD");
      pdf.setTextColor(66, 97, 165);
      pdf.setFontSize(11);
      pdf.text(String(number).padStart(2, "0"), x + 7, y - 1, { align: "center" });
    });

    if (state.drawn.length === 0) {
      pdf.setTextColor(105, 112, 135);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(12);
      pdf.text("Todavia no hay numeros cantados.", 20, 74);
    }

    pdf.setTextColor(105, 112, 135);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text("Bingo 100 - Sin repeticion", 20, 285);
    pdf.save(`bingo-${raffleNumber}.pdf`);
  };

  const reset = () => {
    if (window.confirm("¿Comenzar un nuevo bingo? Se perderá el historial actual.")) {
      const next = freshState();
      setState(next);
      setRaffleNumber(current => current + 1);
      setDisplay(null);
      setFinished(false);
      setReveal(false);
    }
  };

  const shownHistory = [...state.drawn].reverse().slice(0, projection ? 12 : 30);

  return (
    <main className={"app-shell " + (projection ? "projection" : "") + (finished ? " completed" : "")}>
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />

      <header className="header">
        <div className="brand">
          <span className="brand-icon">🎲</span>
          <div>
            <h1>BINGO <span>100</span></h1>
            <p>{projection ? "MODO PROYECCIÓN · TV / PROYECTOR" : "Bingo de números sin repetición"}</p>
          </div>
          <span className="raffle-badge">Bingo #{raffleNumber}</span>
        </div>
        <div className="header-actions">
          <button
            className="theme-btn"
            onClick={onToggleTheme}
            aria-label={theme === "dark" ? "Activar modo claro" : "Activar modo oscuro"}
            title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>
          {!projection && <button className="reset-btn" onClick={reset}>↻ Nuevo bingo</button>}
          {!projection && <button className="logout-btn" onClick={onLogout}>↪ Salir</button>}
          <button className="pdf-btn" onClick={downloadPdf} title="Descargar PDF">⇩ PDF</button>
          <button className="fullscreen-btn" onClick={toggleProjection}>
            {projection ? "⛶ Salir de pantalla completa" : "⛶ Pantalla completa"}
          </button>
        </div>
      </header>

      <section className="hero-grid">
        <div className={"number-card " + (rolling ? "rolling" : "") + (reveal ? "reveal" : "")}>
          <div className="card-label">{finished ? "BINGO FINALIZADO" : rolling ? "SACANDO NÚMERO..." : "NÚMERO ACTUAL"}</div>
          <div className="big-number">{display ?? "—"}</div>
          <div className="number-caption">
            {finished ? "🎉 ¡LOS 100 NÚMEROS FUERON CANTADOS!" : rolling ? "Mezclando números..." : "Listo para el próximo número"}
          </div>
          <div className="glow-ring" />
          {reveal && !finished && <div className="sparkles">✦ ✧ ✦</div>}
        </div>

        <aside className="stats-card">
          <div className="stat"><span>Cantados</span><strong>{state.drawn.length}</strong></div>
          <div className="stat"><span>Restantes</span><strong>{state.available.length}</strong></div>
          <div className="progress-wrap">
            <div className="progress-top"><span>Progreso</span><b>{progress}%</b></div>
            <div className="progress"><i style={{width: `${progress}%`}} /></div>
          </div>
          <button className="draw-btn" onClick={draw} disabled={rolling || finished}>
            <span>🎲</span> {finished ? "BINGO COMPLETO" : rolling ? "SACANDO..." : "SACAR NÚMERO"}
          </button>
          <button className="undo-btn" onClick={undoLast} disabled={rolling || state.drawn.length === 0}>
            ↶ Deshacer último número
          </button>
          <p className="safe-note">✓ Sin repetición · Guardado automático</p>
        </aside>
      </section>

      <section className="panel history-panel">
        <div className="section-heading">
          <div><h2>Últimos números cantados</h2><p>El más reciente aparece destacado.</p></div>
          <span className="counter">{state.drawn.length}/100</span>
        </div>
        {shownHistory.length === 0 ? (
          <div className="empty">Todavía no hay números cantados.</div>
        ) : (
          <div className="history">
            {shownHistory.map((n, i) => <span key={n} className={i === 0 ? "last" : ""}>{String(n).padStart(2, "0")}</span>)}
          </div>
        )}
      </section>

      {!projection && (
        <section className="panel board-panel">
          <div className="section-heading">
            <div><h2>Tablero de números</h2><p>Los números ya cantados quedan bloqueados.</p></div>
            <span className="counter">{state.drawn.length}/100</span>
          </div>
          <div className="number-grid">
            {Array.from({ length: 100 }, (_, i) => i + 1).map(n => {
              const drawn = state.drawn.includes(n);
              const current = state.current === n;
              return (
                <div key={n} className={"cell " + (drawn ? "drawn" : "") + (current ? " current" : "")}>
                  <span>{String(n).padStart(2, "0")}</span>{drawn && <small>✓</small>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {finished && (
        <div className="finish-overlay" aria-live="polite">
          <div className="finish-card">
            <div className="finish-icon">🎉</div>
            <h2>¡BINGO COMPLETADO!</h2>
            <p>Los 100 números fueron cantados sin repetición.</p>
            <button className="undo-btn" onClick={undoLast}>↶ DESHACER ÚLTIMO NÚMERO</button>
            {!projection && <button className="draw-btn" onClick={reset}>↻ NUEVO BINGO</button>}
          </div>
        </div>
      )}

      <footer>✨ Bingo 100 · {projection ? "Modo Proyección" : "Modo Control"} · Sin repetición · Persistencia local</footer>
    </main>
  );
}

function App() {
  const [authenticated, setAuthenticated] = useState(loadAuthentication);
  const [theme, setTheme] = useState(loadTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => setTheme(current => current === "dark" ? "light" : "dark");
  const logout = () => {
    localStorage.removeItem(AUTH_KEY);
    setAuthenticated(false);
  };

  if (!authenticated) {
    return <LandingPage theme={theme} onToggleTheme={toggleTheme} onLogin={() => setAuthenticated(true)} />;
  }

  return <DrawApp theme={theme} onToggleTheme={toggleTheme} onLogout={logout} />;
}

createRoot(document.getElementById("root")).render(<App />);
