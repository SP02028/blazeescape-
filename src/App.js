import { useState, useEffect, useRef } from "react";
import "./App.css";

const W  = 420;
const H  = 540;
const PS = 24;
const WT = 14;
const CELL = 40;
const COLS = Math.floor((W - 2 * WT) / CELL);
const ROWS = Math.floor((H - 2 * WT) / CELL);
const SPEED = 2.5;

const wall = (x, y, w, h) => ({ x, y, w, h });

const makeMaze = (rows, cols) => {
  const cells = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ top: true, right: true, bottom: true, left: true, v: false }))
  );
  let seed = 123456789;
  const rand = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const stack = [[0, 0]];
  cells[0][0].v = true;

  const dirs = [
    { dr: -1, dc: 0, w: "top", o: "bottom" },
    { dr: 0, dc: 1, w: "right", o: "left" },
    { dr: 1, dc: 0, w: "bottom", o: "top" },
    { dr: 0, dc: -1, w: "left", o: "right" },
  ];

  while (stack.length) {
    const [r, c] = stack[stack.length - 1];
    const options = [];
    for (const d of dirs) {
      const nr = r + d.dr;
      const nc = c + d.dc;
      if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
      if (!cells[nr][nc].v) options.push({ nr, nc, ...d });
    }
    if (!options.length) {
      stack.pop();
      continue;
    }
    const pick = options[Math.floor(rand() * options.length)];
    cells[r][c][pick.w] = false;
    cells[pick.nr][pick.nc][pick.o] = false;
    cells[pick.nr][pick.nc].v = true;
    stack.push([pick.nr, pick.nc]);
  }

  return cells;
};

const buildWalls = (cells) => {
  const rows = cells.length;
  const cols = cells[0].length;
  const walls = [
    wall(0, 0, W, WT),
    wall(0, H - WT, W, WT),
    wall(0, 0, WT, H),
    wall(W - WT, 0, WT, H),
  ];

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const cell = cells[r][c];
      const x = WT + c * CELL;
      const y = WT + r * CELL;
      if (cell.top && r > 0) walls.push(wall(x, y, CELL, WT));
      if (cell.left && c > 0) walls.push(wall(x, y, WT, CELL));
    }
  }

  return walls;
};

const findPath = (cells) => {
  const rows = cells.length;
  const cols = cells[0].length;
  const q = [[0, 0]];
  const prev = Array.from({ length: rows }, () => Array(cols).fill(null));
  const seen = Array.from({ length: rows }, () => Array(cols).fill(false));
  seen[0][0] = true;

  while (q.length) {
    const [r, c] = q.shift();
    if (r === rows - 1 && c === cols - 1) break;
    const cell = cells[r][c];

    if (!cell.top && r > 0 && !seen[r - 1][c]) { seen[r - 1][c] = true; prev[r - 1][c] = [r, c]; q.push([r - 1, c]); }
    if (!cell.right && c < cols - 1 && !seen[r][c + 1]) { seen[r][c + 1] = true; prev[r][c + 1] = [r, c]; q.push([r, c + 1]); }
    if (!cell.bottom && r < rows - 1 && !seen[r + 1][c]) { seen[r + 1][c] = true; prev[r + 1][c] = [r, c]; q.push([r + 1, c]); }
    if (!cell.left && c > 0 && !seen[r][c - 1]) { seen[r][c - 1] = true; prev[r][c - 1] = [r, c]; q.push([r, c - 1]); }
  }

  const path = [];
  let cur = [rows - 1, cols - 1];
  while (cur) {
    path.push(cur);
    const [r, c] = cur;
    cur = prev[r][c];
  }
  return path.reverse();
};

const mazeCells = makeMaze(ROWS, COLS);
const WALLS = buildWalls(mazeCells);
const PATH = findPath(mazeCells);
const QS = [
  { q: "What should you do if your clothes catch on fire?",
    a: ["Run to find water", "Stop, Drop, and Roll", "Scream for help", "Rip off the clothes"], c: 1 },
  { q: "When evacuating, what should you AVOID?",
    a: ["Using elevators", "Using the stairs", "Staying low", "Following fire signs"], c: 0 },
  { q: "What's the FIRST thing to do when you hear a fire alarm?",
    a: ["Keep working", "Leave immediately", "Call 911 first", "Wait for an announcement"], c: 1 },
  { q: "Trapped in a room during a fire — what do you do?",
    a: ["Jump out the window", "Signal at the window & seal the door", "Hide under the bed", "Open the door to check"], c: 1 },
  { q: "How should you move through a smoke-filled hallway?",
    a: ["Run fast", "Crawl low under the smoke", "Walk upright", "Cover eyes only"], c: 1 },
  { q: "Before opening a door during a fire, you should:",
    a: ["Open it quickly", "Touch it — if hot, don't open", "Break it down", "Wait for it to open"], c: 1 },
  { q: "What does PASS mean when using a fire extinguisher?",
    a: ["Pull, Aim, Squeeze, Sweep", "Push, Attack, Spray, Stop", "Point, Activate, Spray, Spray", "Pull, Activate, Slam, Squeeze"], c: 0 },
  { q: "How often should you test smoke detectors?",
    a: ["Once a year", "Never", "Monthly", "Only after a fire"], c: 2 },
];
const OBS_R = 16;

const makeObstacles = (path, qs) => {
  const used = new Set();
  const maxIdx = Math.max(1, path.length - 2);
  return qs.map((q, i) => {
    let idx = Math.floor((i + 1) * maxIdx / (qs.length + 1));
    idx = Math.max(1, Math.min(maxIdx, idx));
    while (used.has(idx) && idx < maxIdx) idx += 1;
    used.add(idx);
    const [r, c] = path[idx];
    return { id: i + 1, x: WT + c * CELL + CELL / 2, y: WT + r * CELL + CELL / 2, ...q };
  });
};

const OBSTACLES = makeObstacles(PATH, QS);
const TROPHY = { x: WT + (COLS - 1) * CELL + CELL / 2, y: WT + (ROWS - 1) * CELL + CELL / 2 };
function Cat({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={{ display: "block" }}>
      <ellipse cx="16" cy="21" rx="9" ry="7.5" fill="#f5c842" />
      <circle cx="16" cy="12" r="8" fill="#f5c842" />
      <polygon points="9,7 6,1 13,5"  fill="#f5c842" />
      <polygon points="23,7 26,1 19,5" fill="#f5c842" />
      <polygon points="9.5,6.5 7,2 12,5"  fill="#f9a8a8" />
      <polygon points="22.5,6.5 25,2 20,5" fill="#f9a8a8" />
      <ellipse cx="13" cy="12" rx="1.8" ry="2.1" fill="#1e293b" />
      <ellipse cx="19" cy="12" rx="1.8" ry="2.1" fill="#1e293b" />
      <circle cx="13.7" cy="11.2" r="0.65" fill="white" />
      <circle cx="19.7" cy="11.2" r="0.65" fill="white" />
      <polygon points="16,14 14.8,15.3 17.2,15.3" fill="#e77" />
      <path d="M14.8,15.3 Q13.5,16.5 12,16" stroke="#c55" strokeWidth="0.8" fill="none" />
      <path d="M17.2,15.3 Q18.5,16.5 20,16" stroke="#c55" strokeWidth="0.8" fill="none" />
      <line x1="4"  y1="13" x2="13" y2="13.8" stroke="#aaa" strokeWidth="0.9" />
      <line x1="4"  y1="15" x2="13" y2="14.8" stroke="#aaa" strokeWidth="0.9" />
      <line x1="28" y1="13" x2="19" y2="13.8" stroke="#aaa" strokeWidth="0.9" />
      <line x1="28" y1="15" x2="19" y2="14.8" stroke="#aaa" strokeWidth="0.9" />
      <path d="M25,23 Q33,19 31,27" stroke="#f5c842" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
      <line x1="12" y1="19" x2="20" y2="19" stroke="#d4a017" strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="11" y1="22" x2="21" y2="22" stroke="#d4a017" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}
function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}
export default function App() {
  const startX = WT + CELL / 2 - PS / 2;
  const startY = WT + CELL / 2 - PS / 2;

  const [playerPos, setPlayerPos] = useState({ x: startX, y: startY });
  const [gameState, setGameState] = useState("playing");
  const [curQ,      setCurQ]      = useState(null);
  const [removed,   setRemoved]   = useState([]);
  const [feedback,  setFeedback]  = useState("");

  const keysRef    = useRef({});
  const stateRef   = useRef("playing");
  const curQRef    = useRef(null);
  const removedRef = useRef([]);
  const posRef     = useRef({ x: startX, y: startY });
  const rafRef     = useRef(null);
  const targetRef  = useRef(null);
  const arenaRef   = useRef(null);

  const sync = {
    state: (v) => { stateRef.current = v; setGameState(v); },
    pos:   (v) => { posRef.current   = v; setPlayerPos(v); },
    q:     (v) => { curQRef.current  = v; setCurQ(v); },
    rem:   (fn) => setRemoved(prev => { const n = fn(prev); removedRef.current = n; return n; }),
  };

  const answer = (idx) => {
    const q = curQRef.current;
    if (!q) return;
    if (idx === q.c) {
      setFeedback("Correct! ✅");
      sync.state("correct");
      setTimeout(() => {
        sync.rem(p => [...p, q.id]);
        sync.q(null);
        sync.state("playing");
        setFeedback("");
      }, 800);
    } else {
      setFeedback("Wrong — try again! ❌");
      sync.state("wrong");
      setTimeout(() => { sync.state("question"); setFeedback(""); }, 800);
    }
  };

  const handleClick = (e) => {
    if (stateRef.current !== "playing") return;
    const rect = arenaRef.current.getBoundingClientRect();
    targetRef.current = {
      x: Math.max(WT, Math.min(W - WT - PS, e.clientX - rect.left - PS / 2)),
      y: Math.max(WT, Math.min(H - WT - PS, e.clientY - rect.top  - PS / 2)),
    };
  };

  useEffect(() => {
    const dn = (e) => {
      if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) e.preventDefault();
      if (stateRef.current === "question") {
        const i = ["a","b","c","d"].indexOf(e.key.toLowerCase());
        if (i !== -1) answer(i);
        return;
      }
      keysRef.current[e.key] = true;
    };
    const up = (e) => { keysRef.current[e.key] = false; };
    window.addEventListener("keydown", dn);
    window.addEventListener("keyup",   up);
    return () => { window.removeEventListener("keydown", dn); window.removeEventListener("keyup", up); };
  }, []);

  useEffect(() => {
    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      if (stateRef.current !== "playing") return;

      const k = keysRef.current;
      let { x, y } = posRef.current;

      if (k["ArrowLeft"]  || k["a"] || k["A"]) x -= SPEED;
      if (k["ArrowRight"] || k["d"] || k["D"]) x += SPEED;
      if (k["ArrowUp"]    || k["w"] || k["W"]) y -= SPEED;
      if (k["ArrowDown"]  || k["s"] || k["S"]) y += SPEED;

      const anyKey = Object.values(k).some(Boolean);
      if (!anyKey && targetRef.current) {
        const { x: tx, y: ty } = targetRef.current;
        const dx = tx - x, dy = ty - y;
        const dist = Math.hypot(dx, dy);
        if (dist < SPEED) { x = tx; y = ty; targetRef.current = null; }
        else { x += (dx / dist) * SPEED; y += (dy / dist) * SPEED; }
      }

      x = Math.max(WT, Math.min(W - WT - PS, x));
      y = Math.max(WT, Math.min(H - WT - PS, y));

      const px = posRef.current;
      const hitX = WALLS.some(w => rectsOverlap(x, px.y, PS, PS, w.x, w.y, w.w, w.h));
      const hitY = WALLS.some(w => rectsOverlap(px.x, y, PS, PS, w.x, w.y, w.w, w.h));
      if (hitX) x = px.x;
      if (hitY) y = px.y;

      const cx = x + PS / 2;
      const cy = y + PS / 2;
      for (const obs of OBSTACLES) {
        if (removedRef.current.includes(obs.id)) continue;
        const dist = Math.hypot(cx - obs.x, cy - obs.y);
        if (dist < OBS_R + PS / 2) {
          sync.q(obs);
          sync.state("question");
          targetRef.current = null;
          return;
        }
      }
      const tdist = Math.hypot(cx - TROPHY.x, cy - TROPHY.y);
      if (tdist < 32) { sync.state("won"); return; }

      sync.pos({ x, y });
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div style={s.page}>
      <h1 style={s.title}>🔥 Blaze Escape</h1>
      <p style={s.sub}>Help the cat reach the trophy! Answer fire-safety questions to pass each flame.</p>
      <p style={s.hint}>Arrow keys / WASD · or click to move</p>

      <div ref={arenaRef} style={s.arena} onClick={handleClick}>
        <div style={s.trophyRoom} />
        {WALLS.map((w, i) => (
          <div key={i} style={{ ...s.wall, left: w.x, top: w.y, width: w.w, height: w.h }} />
        ))}
        {OBSTACLES.map(o => !removed.includes(o.id) && (
          <div key={o.id} style={{ ...s.fire, left: o.x - 12, top: o.y - 12 }}>🔥</div>
        ))}
        {gameState !== "won" && (
          <div style={{ ...s.trophy, left: TROPHY.x - 18, top: TROPHY.y - 18 }}>🏆</div>
        )}
        {gameState !== "won" && (
          <div style={{ ...s.player, left: playerPos.x, top: playerPos.y }}>
            <Cat size={PS + 6} />
          </div>
        )}
        <div style={s.startLabel}>START</div>
        {gameState === "question" && curQ && (
          <div style={s.overlay}>
            <div style={s.card}>
              <div style={{ fontSize: 26, textAlign: "center", marginBottom: 6 }}>🔥</div>
              <p style={s.qText}>{curQ.q}</p>
              <div style={s.ansGrid}>
                {curQ.a.map((ans, i) => (
                  <button key={i} style={s.ansBtn}
                    onClick={(e) => { e.stopPropagation(); answer(i); }}>
                    <span style={s.badge}>{["A","B","C","D"][i]}</span>
                    <span>{ans}</span>
                  </button>
                ))}
              </div>
              <p style={s.kbHint}>Press A / B / C / D</p>
            </div>
          </div>
        )}
        {(gameState === "correct" || gameState === "wrong") && (
          <div style={s.overlay}>
            <div style={{ ...s.fbBox, background: gameState === "correct" ? "#15803d" : "#b91c1c" }}>
              {feedback}
            </div>
          </div>
        )}
        {gameState === "won" && (
          <div style={s.overlay}>
            <div style={s.winCard}>
              <div style={{ fontSize: 52 }}>🏆</div>
              <div style={{ fontSize: 32, marginTop: 2 }}><Cat size={40} /></div>
              <h2 style={s.winTitle}>The Cat Escaped!</h2>
              <p style={{ color: "#94a3b8", fontSize: "0.85rem", margin: "0 0 18px" }}>
                Purrfect fire safety knowledge!
              </p>
              <button style={s.replayBtn} onClick={() => window.location.reload()}>Play Again</button>
            </div>
          </div>
        )}
      </div>
      <div style={s.progressWrap}>
        <div style={s.progressBar}>
          <div style={{ ...s.progressFill, width: `${(removed.length / OBSTACLES.length) * 100}%` }} />
        </div>
        <span style={s.progressLabel}>{removed.length}/{OBSTACLES.length} flames cleared</span>
      </div>
    </div>
  );
}

const s = {
  page: {
    display: "flex", flexDirection: "column", alignItems: "center",
    minHeight: "100vh", background: "#080f1a",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    padding: "14px 8px",
  },
  title: { color: "#f97316", fontSize: "1.7rem", margin: "0 0 4px", textShadow: "0 0 20px #f9731680" },
  sub:   { color: "#94a3b8", fontSize: "0.82rem", margin: "0 0 3px", textAlign: "center", maxWidth: 400 },
  hint:  { color: "#475569", fontSize: "0.74rem", margin: "0 0 10px" },
  arena: {
    position: "relative", width: W, height: H,
    background: "#111827",
    boxShadow: "0 0 0 3px #f97316, 0 0 50px #f9731622",
    borderRadius: 6, overflow: "hidden", flexShrink: 0,
    cursor: "crosshair",
  },
  trophyRoom: {
    position: "absolute",
    left: W - WT - CELL, top: (ROWS - 1) * CELL + WT,
    width: CELL, height: H - WT - ((ROWS - 1) * CELL + WT),
    background: "radial-gradient(ellipse at center, #1a2e0a 0%, #0d1a06 100%)",
    border: "1px solid #ffd70044",
    zIndex: 0,
  },
  wall: {
    position: "absolute",
    background: "linear-gradient(160deg, #374151, #1f2937)",
    boxShadow: "inset 0 1px 0 #ffffff10",
    zIndex: 2,
  },
  fire: {
    position: "absolute", width: 24, height: 24,
    fontSize: 20, lineHeight: "24px", textAlign: "center",
    filter: "drop-shadow(0 0 5px #f97316) drop-shadow(0 0 10px #f9731688)",
    zIndex: 10,
    animation: "flicker 1.2s ease-in-out infinite alternate",
  },
  trophy: {
    position: "absolute", width: 36, height: 36,
    fontSize: 28, lineHeight: "36px", textAlign: "center",
    filter: "drop-shadow(0 0 10px gold) drop-shadow(0 0 20px #ffd70088)",
    zIndex: 10,
  },
  player: {
    position: "absolute", zIndex: 20,
    filter: "drop-shadow(0 0 4px #facc15)",
  },
  startLabel: {
    position: "absolute", left: WT + 4, top: WT + 2,
    color: "#22c55e", fontSize: "0.6rem", fontWeight: 700,
    letterSpacing: 1, opacity: 0.8, zIndex: 3,
  },
  overlay: {
    position: "absolute", inset: 0, background: "rgba(0,0,0,0.86)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 50, padding: 12,
  },
  card: {
    background: "#1e293b", border: "2px solid #f97316",
    borderRadius: 14, padding: "16px 14px", maxWidth: 370, width: "100%",
    boxShadow: "0 0 32px #f9731444",
  },
  qText: {
    color: "#f1f5f9", fontSize: "0.9rem", lineHeight: 1.5,
    margin: "0 0 12px", fontWeight: 600, textAlign: "center",
  },
  ansGrid: { display: "flex", flexDirection: "column", gap: 6 },
  ansBtn: {
    display: "flex", alignItems: "center", gap: 10,
    background: "#0f172a", border: "1px solid #334155",
    borderRadius: 8, padding: "8px 12px",
    color: "#cbd5e1", fontSize: "0.82rem",
    cursor: "pointer", textAlign: "left", width: "100%",
  },
  badge: {
    background: "#f97316", color: "#fff",
    borderRadius: 4, padding: "2px 6px",
    fontWeight: 700, fontSize: "0.75rem", flexShrink: 0,
  },
  kbHint: { color: "#475569", fontSize: "0.7rem", textAlign: "center", margin: "10px 0 0" },
  fbBox: {
    borderRadius: 12, padding: "20px 40px",
    fontSize: "1.25rem", fontWeight: 700, color: "#fff",
  },
  winCard: {
    background: "#1e293b", border: "2px solid #ffd700",
    borderRadius: 16, padding: "26px 34px",
    textAlign: "center", boxShadow: "0 0 48px #ffd70066",
    display: "flex", flexDirection: "column", alignItems: "center",
  },
  winTitle: { color: "#ffd700", fontSize: "1.5rem", margin: "6px 0 6px" },
  replayBtn: {
    background: "#f97316", border: "none", borderRadius: 8,
    color: "#fff", padding: "9px 26px",
    fontSize: "0.92rem", fontWeight: 700, cursor: "pointer",
  },
  progressWrap: { display: "flex", alignItems: "center", gap: 10, marginTop: 10 },
  progressBar: {
    width: 180, height: 7, background: "#1e293b",
    borderRadius: 4, overflow: "hidden", border: "1px solid #334155",
  },
  progressFill: {
    height: "100%",
    background: "linear-gradient(90deg, #f97316, #fbbf24)",
    borderRadius: 4, transition: "width 0.4s ease",
  },
  progressLabel: { color: "#64748b", fontSize: "0.74rem" },
};
