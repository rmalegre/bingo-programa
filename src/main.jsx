import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const KEY = "sorteo-100-state-v2";

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

function App() {
  const [state, setState] = useState(loadState);
  const [rolling, setRolling] = useState(false);
  const [display, setDisplay] = useState(state.current);
  const [finished, setFinished] = useState(state.available.length === 0);
  const [projection, setProjection] = useState(false);
  const [reveal, setReveal] = useState(false);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(state));
  }, [state]);

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
        setRolling(false);
        setReveal(true);
        setFinished(pool.length === 1);
      }
    }, 70);
  };

  const reset = () => {
    if (window.confirm("¿Comenzar un nuevo sorteo? Se perderá el historial actual.")) {
      const next = freshState();
      setState(next);
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
            <h1>SORTEO <span>100</span></h1>
            <p>{projection ? "MODO PROYECCIÓN · TV / PROYECTOR" : "Sorteador aleatorio sin repetición"}</p>
          </div>
        </div>
        <div className="header-actions">
          {!projection && <button className="reset-btn" onClick={reset}>↻ Nuevo sorteo</button>}
          <button className="fullscreen-btn" onClick={toggleProjection}>
            {projection ? "⛶ Salir de pantalla completa" : "⛶ Pantalla completa"}
          </button>
        </div>
      </header>

      <section className="hero-grid">
        <div className={"number-card " + (rolling ? "rolling" : "") + (reveal ? "reveal" : "")}>
          <div className="card-label">{finished ? "SORTEO FINALIZADO" : rolling ? "SORTEANDO..." : "NÚMERO ACTUAL"}</div>
          <div className="big-number">{display ?? "—"}</div>
          <div className="number-caption">
            {finished ? "🎉 ¡LOS 100 NÚMEROS FUERON SORTEADOS!" : rolling ? "Mezclando números..." : "Listo para el próximo número"}
          </div>
          <div className="glow-ring" />
          {reveal && !finished && <div className="sparkles">✦ ✧ ✦</div>}
        </div>

        <aside className="stats-card">
          <div className="stat"><span>Sorteados</span><strong>{state.drawn.length}</strong></div>
          <div className="stat"><span>Restantes</span><strong>{state.available.length}</strong></div>
          <div className="progress-wrap">
            <div className="progress-top"><span>Progreso</span><b>{progress}%</b></div>
            <div className="progress"><i style={{width: `${progress}%`}} /></div>
          </div>
          <button className="draw-btn" onClick={draw} disabled={rolling || finished}>
            <span>🎲</span> {finished ? "SORTEO COMPLETO" : rolling ? "SORTEANDO..." : "SORTEAR NÚMERO"}
          </button>
          <p className="safe-note">✓ Sin repetición · Guardado automático</p>
        </aside>
      </section>

      <section className="panel history-panel">
        <div className="section-heading">
          <div><h2>Últimos números sorteados</h2><p>El más reciente aparece destacado.</p></div>
          <span className="counter">{state.drawn.length}/100</span>
        </div>
        {shownHistory.length === 0 ? (
          <div className="empty">Todavía no hay números sorteados.</div>
        ) : (
          <div className="history">
            {shownHistory.map((n, i) => <span key={n} className={i === 0 ? "last" : ""}>{String(n).padStart(2, "0")}</span>)}
          </div>
        )}
      </section>

      {!projection && (
        <section className="panel board-panel">
          <div className="section-heading">
            <div><h2>Tablero de números</h2><p>Los números ya sorteados quedan bloqueados.</p></div>
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
            <h2>¡SORTEO COMPLETADO!</h2>
            <p>Los 100 números fueron sorteados sin repetición.</p>
            {!projection && <button className="draw-btn" onClick={reset}>↻ NUEVO SORTEO</button>}
          </div>
        </div>
      )}

      <footer>✨ Sorteo 100 · {projection ? "Modo Proyección" : "Modo Control"} · Sin repetición · Persistencia local</footer>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
