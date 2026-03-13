```dataviewjs
// ═══════════════════════════════════
//  SLEEP LOG  —  dataviewjs widget
// ═══════════════════════════════════
const SK = "mv11_sleep";
let saved = {};
try { saved = JSON.parse(localStorage.getItem(SK) || "{}"); } catch(e) {}
const persist = () => { try { localStorage.setItem(SK, JSON.stringify(saved)); } catch(e) {} };

const now = new Date();
const YEAR  = now.getFullYear();
const MONTH = now.getMonth();         // 0-indexed
const TODAY = now.getDate();

if (!saved.month || saved.month !== MONTH || saved.year !== YEAR) {
  // keep data if same month, reset otherwise only if new month
}
if (!saved.data)   saved.data   = {};  // key: "YYYY-MM-DD" → {bed, wake}
if (!saved.year)   saved.year   = YEAR;
if (!saved.month)  saved.month  = MONTH;

const MONTH_NAMES = ["January","February","March","April","May","June",
  "July","August","September","October","November","December"];
const DAYS_IN_MONTH = new Date(YEAR, MONTH + 1, 0).getDate();

// Hours shown on axis: 20,21,22,23,0,1,2,3,4,5,6,7,8,9,10
const HOURS = [20,21,22,23,0,1,2,3,4,5,6,7,8,9,10];
const H_COUNT = HOURS.length;          // 15 columns
const CELL_W  = 14;
const CELL_H  = 16;
const ROW_LABEL_W = 28;
const COL_LABEL_H = 20;
const CANVAS_W = ROW_LABEL_W + H_COUNT * CELL_W + 1;
const CANVAS_H = COL_LABEL_H + DAYS_IN_MONTH * CELL_H + 1;

const P = {
  bg:      "#1e1e1e",
  card:    "#262626",
  border:  "#333",
  stripe:  "#404040",
  accent:  "#b07070",        // muted rose — matches the photo vibe
  accentL: "#c08888",
  fill:    "#7a4545",        // dark dusty rose fill
  fillA:   0.55,
  text:    "#666",
  textDim: "#444",
  textMid: "#888",
  grid:    "#2d2d2d",
  today:   "#504040",
};

// ── Styles ───────────────────────────────────────────────
const style = document.createElement("style");
style.textContent = `
  .sl-wrap { background:${P.bg}; width:100%; box-sizing:border-box; font-family:monospace; user-select:none; }
  .sl-card { background:${P.card}; border:1px solid ${P.border}; border-radius:8px; padding:18px 20px; display:inline-flex; flex-direction:column; gap:12px; }
  .sl-header { display:flex; align-items:center; justify-content:space-between; }
  .sl-title { font-size:13px; font-weight:700; color:#ccc; letter-spacing:0.12em; text-transform:uppercase; }
  .sl-sub { font-size:9px; color:${P.textDim}; letter-spacing:0.06em; }
  .sl-canvas-wrap { position:relative; cursor:crosshair; }
  canvas.sl-cv { display:block; }
  .sl-popup { position:fixed; background:#242424; border:1px solid ${P.border}; border-radius:8px; padding:14px 16px; z-index:10000; width:220px; box-shadow:0 8px 32px rgba(0,0,0,0.6); display:none; }
  .sl-popup-date { font-size:11px; color:${P.accent}; margin-bottom:10px; font-weight:700; letter-spacing:0.06em; }
  .sl-popup-row { display:flex; flex-direction:column; gap:6px; }
  .sl-popup-lbl { font-size:9px; color:${P.textDim}; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:2px; }
  .sl-popup-inp { background:#1a1a1a; border:1px solid ${P.border}; border-radius:5px; padding:6px 9px; font-size:12px; font-family:monospace; color:#bbb; outline:none; width:100%; box-sizing:border-box; }
  .sl-popup-inp:focus { border-color:${P.stripe}; }
  .sl-popup-btns { display:flex; gap:6px; margin-top:10px; }
  .sl-popup-save { flex:1; background:${P.fill}; border:none; border-radius:5px; color:#ddd; font-size:11px; font-family:monospace; padding:7px; cursor:pointer; transition:background 0.15s; }
  .sl-popup-save:hover { background:${P.accentL}; color:#111; }
  .sl-popup-del { background:none; border:1px solid ${P.border}; border-radius:5px; color:${P.textDim}; font-size:11px; font-family:monospace; padding:7px 10px; cursor:pointer; }
  .sl-popup-del:hover { color:#cc5555; border-color:#cc555544; }
  .sl-popup-close { float:right; background:none; border:none; color:${P.textDim}; font-size:13px; cursor:pointer; padding:0; }
  .sl-legend { display:flex; align-items:center; gap:14px; }
  .sl-leg-item { display:flex; align-items:center; gap:5px; }
  .sl-leg-box { width:10px; height:10px; border-radius:2px; }
  .sl-leg-lbl { font-size:9px; color:${P.textDim}; }
  .sl-stats { display:flex; gap:14px; }
  .sl-stat { background:#1a1a1a; border-radius:5px; padding:7px 12px; }
  .sl-stat-v { font-size:14px; color:#ccc; font-weight:700; }
  .sl-stat-l { font-size:8px; color:${P.textDim}; text-transform:uppercase; letter-spacing:0.05em; margin-top:1px; }
`;
document.head.appendChild(style);

// ── DOM ──────────────────────────────────────────────────
const wrap = document.createElement("div");
wrap.className = "sl-wrap";
const card = document.createElement("div");
card.className = "sl-card";

// header
const hdr = document.createElement("div");
hdr.className = "sl-header";
const title = document.createElement("div");
title.className = "sl-title";
title.textContent = "— Sleep Log —";
const sub = document.createElement("div");
sub.className = "sl-sub";
sub.textContent = `${MONTH_NAMES[MONTH].toUpperCase()} ${YEAR}`;
hdr.appendChild(title); hdr.appendChild(sub);
card.appendChild(hdr);

// canvas
const cvWrap = document.createElement("div");
cvWrap.className = "sl-canvas-wrap";
const cv = document.createElement("canvas");
cv.className = "sl-cv";
cv.width  = CANVAS_W;
cv.height = CANVAS_H;
cvWrap.appendChild(cv);
card.appendChild(cvWrap);

// stats row
const statsRow = document.createElement("div");
statsRow.className = "sl-stats";
card.appendChild(statsRow);

// legend
const legend = document.createElement("div");
legend.className = "sl-legend";
[["#7a4545","Сон"], ["#404040","Цель (23–07)"]].forEach(([col, lbl]) => {
  const li = document.createElement("div"); li.className = "sl-leg-item";
  const box = document.createElement("div"); box.className = "sl-leg-box"; box.style.background = col;
  const l = document.createElement("div"); l.className = "sl-leg-lbl"; l.textContent = lbl;
  li.appendChild(box); li.appendChild(l); legend.appendChild(li);
});
card.appendChild(legend);

wrap.appendChild(card);
this.container.appendChild(wrap);

// ── Popup ────────────────────────────────────────────────
const popup = document.createElement("div");
popup.className = "sl-popup";
document.body.appendChild(popup);
let activeKey = null;

const closePopup = () => { popup.style.display = "none"; activeKey = null; drawAll(); };
document.addEventListener("click", e => { if (popup.style.display !== "none" && !popup.contains(e.target)) closePopup(); }, true);

const openPopup = (day, rect) => {
  const key = `${YEAR}-${String(MONTH+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
  activeKey = key;
  const existing = saved.data[key] || {};
  popup.innerHTML = "";

  const hd = document.createElement("div"); hd.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;";
  hd.appendChild(Object.assign(document.createElement("div"), { className:"sl-popup-date", textContent:`День ${day} — ${MONTH_NAMES[MONTH]}` }));
  const cl = Object.assign(document.createElement("button"), { className:"sl-popup-close", textContent:"✕" });
  cl.addEventListener("click", closePopup);
  hd.appendChild(cl); popup.appendChild(hd);

  const row = document.createElement("div"); row.className = "sl-popup-row";

  const mkField = (lbl, id, val) => {
    const l = Object.assign(document.createElement("div"), { className:"sl-popup-lbl", textContent:lbl });
    const inp = Object.assign(document.createElement("input"), { className:"sl-popup-inp", type:"time", value:val||"", id });
    row.appendChild(l); row.appendChild(inp);
    return inp;
  };

  const bedInp  = mkField("Лёг спать", "sl_bed",  existing.bed  || "");
  const wakeInp = mkField("Проснулся",  "sl_wake", existing.wake || "");
  popup.appendChild(row);

  const btns = document.createElement("div"); btns.className = "sl-popup-btns";
  const sv = Object.assign(document.createElement("button"), { className:"sl-popup-save", textContent:"Сохранить" });
  sv.addEventListener("click", () => {
    const b = bedInp.value, w = wakeInp.value;
    if (b || w) { saved.data[key] = { bed: b, wake: w }; } else { delete saved.data[key]; }
    persist(); closePopup();
  });
  const dl = Object.assign(document.createElement("button"), { className:"sl-popup-del", textContent:"Удалить" });
  dl.addEventListener("click", () => { delete saved.data[key]; persist(); closePopup(); });
  btns.appendChild(sv); btns.appendChild(dl); popup.appendChild(btns);

  const pr = cvWrap.getBoundingClientRect();
  const px = Math.min(pr.left + ROW_LABEL_W + rect.col * CELL_W, window.innerWidth - 240);
  const py = pr.top + COL_LABEL_H + (rect.row) * CELL_H + window.scrollY;
  popup.style.cssText = `display:block;left:${px}px;top:${py + CELL_H + 4}px;`;
  setTimeout(() => bedInp.focus(), 50);
};

// ── Draw ─────────────────────────────────────────────────
const timeToIdx = (t) => {
  // t = "HH:MM", returns float index in HOURS array
  if (!t) return null;
  const [hh, mm] = t.split(":").map(Number);
  // find position in HOURS
  let base = HOURS.indexOf(hh);
  if (base < 0) {
    // find nearest
    for (let i = 0; i < HOURS.length; i++) {
      if (HOURS[i] === hh) { base = i; break; }
    }
  }
  if (base < 0) base = 0;
  return base + mm / 60;
};

const drawAll = () => {
  const ctx = cv.getContext("2d");
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  // background
  ctx.fillStyle = P.bg;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // col headers (hours)
  ctx.font = "9px monospace";
  ctx.textAlign = "center";
  HOURS.forEach((h, i) => {
    const x = ROW_LABEL_W + i * CELL_W + CELL_W / 2;
    ctx.fillStyle = P.text;
    ctx.fillText(String(h).padStart(2, "0"), x, COL_LABEL_H - 6);
  });

  // grid lines & row labels
  for (let d = 0; d <= DAYS_IN_MONTH; d++) {
    const y = COL_LABEL_H + d * CELL_H;
    ctx.strokeStyle = P.grid;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ROW_LABEL_W, y); ctx.lineTo(CANVAS_W, y); ctx.stroke();

    if (d < DAYS_IN_MONTH) {
      const day = d + 1;
      ctx.textAlign = "right";
      ctx.font = day === TODAY ? "bold 9px monospace" : "9px monospace";
      ctx.fillStyle = day === TODAY ? P.accentL : P.text;
      ctx.fillText(String(day), ROW_LABEL_W - 4, COL_LABEL_H + d * CELL_H + CELL_H / 2 + 3);
    }
  }

  // vertical grid lines
  for (let i = 0; i <= H_COUNT; i++) {
    const x = ROW_LABEL_W + i * CELL_W;
    ctx.strokeStyle = i % 4 === 0 ? P.stripe : P.grid;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, COL_LABEL_H); ctx.lineTo(x, CANVAS_H); ctx.stroke();
  }

  // today highlight row
  if (TODAY >= 1 && TODAY <= DAYS_IN_MONTH) {
    const y = COL_LABEL_H + (TODAY - 1) * CELL_H;
    ctx.fillStyle = P.today;
    ctx.fillRect(ROW_LABEL_W, y, H_COUNT * CELL_W, CELL_H);
  }

  // sleep bars
  for (let d = 1; d <= DAYS_IN_MONTH; d++) {
    const key = `${YEAR}-${String(MONTH+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const entry = saved.data[key];
    if (!entry || !entry.bed || !entry.wake) continue;

    let bedIdx  = timeToIdx(entry.bed);
    let wakeIdx = timeToIdx(entry.wake);

    // if wake < bed in index (crossed midnight), adjust
    if (wakeIdx <= bedIdx) wakeIdx += H_COUNT;
    if (wakeIdx > H_COUNT) wakeIdx = H_COUNT;

    const y  = COL_LABEL_H + (d - 1) * CELL_H;
    const x1 = ROW_LABEL_W + bedIdx * CELL_W;
    const w  = (wakeIdx - bedIdx) * CELL_W;

    // filled rect
    ctx.fillStyle = P.fill;
    ctx.globalAlpha = P.fillA;
    ctx.fillRect(x1, y + 1, w, CELL_H - 2);
    ctx.globalAlpha = 1;

    // border
    ctx.strokeStyle = P.accent;
    ctx.lineWidth = 1;
    ctx.strokeRect(x1 + 0.5, y + 1.5, w - 1, CELL_H - 3);
  }

  // active key highlight
  if (activeKey) {
    const parts = activeKey.split("-");
    const d = parseInt(parts[2]);
    if (d >= 1 && d <= DAYS_IN_MONTH) {
      const y = COL_LABEL_H + (d - 1) * CELL_H;
      ctx.strokeStyle = P.accentL;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(ROW_LABEL_W + 0.5, y + 0.5, H_COUNT * CELL_W - 1, CELL_H - 1);
    }
  }

  updateStats();
};

// ── Stats ────────────────────────────────────────────────
const updateStats = () => {
  statsRow.innerHTML = "";
  let totalHrs = 0, count = 0;

  for (let d = 1; d <= DAYS_IN_MONTH; d++) {
    const key = `${YEAR}-${String(MONTH+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const e = saved.data[key];
    if (!e || !e.bed || !e.wake) continue;
    let bi = timeToIdx(e.bed), wi = timeToIdx(e.wake);
    if (wi <= bi) wi += H_COUNT;
    const hrs = (wi - bi);
    if (hrs > 0 && hrs < 14) { totalHrs += hrs; count++; }
  }

  const avg = count ? (totalHrs / count).toFixed(1) : "—";
  const logged = count;
  const fill = count ? Math.round((count / DAYS_IN_MONTH) * 100) : 0;

  [
    [avg + (count ? "ч" : ""), "Средний сон"],
    [logged + "/" + DAYS_IN_MONTH, "Дней записано"],
    [fill + "%", "Заполнено"],
  ].forEach(([v, l]) => {
    const s = document.createElement("div"); s.className = "sl-stat";
    s.appendChild(Object.assign(document.createElement("div"), { className:"sl-stat-v", textContent:v }));
    s.appendChild(Object.assign(document.createElement("div"), { className:"sl-stat-l", textContent:l }));
    statsRow.appendChild(s);
  });
};

// ── Click handler ────────────────────────────────────────
cv.addEventListener("click", (e) => {
  const rect = cv.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  if (mx < ROW_LABEL_W || my < COL_LABEL_H) return;

  const col = Math.floor((mx - ROW_LABEL_W) / CELL_W);
  const row = Math.floor((my - COL_LABEL_H) / CELL_H);
  const day = row + 1;

  if (day < 1 || day > DAYS_IN_MONTH) return;

  openPopup(day, { col, row });
  drawAll();
});

// ── Init ─────────────────────────────────────────────────
drawAll();
```
