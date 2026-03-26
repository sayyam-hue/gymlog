import { useState, useEffect } from "react";
import localforage from "localforage";

const MUSCLES = ["Chest","Back","Shoulders","Biceps","Triceps","Legs","Core","Full Body","Cardio"];

const fmt = (d) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const fmtShort = (d) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const toKey = (d) => d.toISOString().slice(0, 10);
const today = () => new Date();
const parseKey = (k) => new Date(k + "T00:00:00");

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function startOfWeek(d) {
  const r = new Date(d);
  const day = r.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  r.setDate(r.getDate() + diff);
  return r;
}

export default function App() {
  const [logs, setLogs] = useState({});
  const [weights, setWeights] = useState({});
  const [tab, setTab] = useState("home");
  const [showModal, setShowModal] = useState(false);
  const [modalDate, setModalDate] = useState(toKey(today()));
  const [modalActivity, setModalActivity] = useState("session");
  const [modalMuscles, setModalMuscles] = useState([]);
  const [modalNote, setModalNote] = useState("");
  const [calMonth, setCalMonth] = useState({ year: today().getFullYear(), month: today().getMonth() });
  const [insightMonth, setInsightMonth] = useState({ year: today().getFullYear(), month: today().getMonth() });
  const [selectedCalDay, setSelectedCalDay] = useState(null);
  const [wtStart, setWtStart] = useState("");
  const [wtEnd, setWtEnd] = useState("");

  useEffect(() => {
    localforage.getItem("gymlog_logs").then(v => { if (v) setLogs(v); });
    localforage.getItem("gymlog_weights").then(v => { if (v) setWeights(v); });
  }, []);

  useEffect(() => { autoMarkMissed(); }, [logs]);

  const saveLogs = (newLogs) => {
    setLogs(newLogs);
    localforage.setItem("gymlog_logs", newLogs);
  };

  const saveWeights = (newW) => {
    setWeights(newW);
    localforage.setItem("gymlog_weights", newW);
  };

  const autoMarkMissed = () => {
    const t = today();
    const newLogs = { ...logs };
    let changed = false;
    for (let i = 1; i <= 365; i++) {
      const d = addDays(t, -i);
      const k = toKey(d);
      if (!newLogs[k]) {
        newLogs[k] = { activity: "missed" };
        changed = true;
      }
    }
    if (changed) saveLogs(newLogs);
  };

  const openModal = (dateKey) => {
    const existing = logs[dateKey];
    setModalDate(dateKey);
    setModalActivity(existing ? existing.activity : "session");
    setModalMuscles(existing ? (existing.muscles || []) : []);
    setModalNote(existing ? (existing.note || "") : "");
    setShowModal(true);
  };

  const saveLog = () => {
    const entry = { activity: modalActivity };
    if (modalActivity === "session") {
      entry.muscles = modalMuscles;
      entry.note = modalNote;
    }
    const newLogs = { ...logs, [modalDate]: entry };
    saveLogs(newLogs);
    setShowModal(false);
  };

  const toggleMuscle = (m) => {
    setModalMuscles(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  };

  const getStreakInfo = () => {
    const t = today();
    const todayKey = toKey(t);
    let streak = 0;
    let streakStart = null;
    let streakEnd = null;
    let d = new Date(t);
    if (logs[todayKey]?.activity === "session") {
      streak = 1;
      streakEnd = new Date(t);
      d = addDays(t, -1);
      while (true) {
        const k = toKey(d);
        const a = logs[k]?.activity;
        if (a === "session") { streak++; d = addDays(d, -1); }
        else if (a === "rest") { d = addDays(d, -1); }
        else break;
      }
      streakStart = addDays(d, 1);
      return { type: "streak", count: streak, start: streakStart, end: streakEnd };
    } else {
      let missed = 0;
      let lastSession = null;
      let dd = new Date(t);
      while (true) {
        const k = toKey(dd);
        const a = logs[k]?.activity;
        if (!a || a === "missed") { missed++; dd = addDays(dd, -1); }
        else if (a === "rest") { dd = addDays(dd, -1); }
        else if (a === "session") { lastSession = new Date(dd); break; }
        else break;
        if (missed > 365) break;
      }
      return { type: "missed", count: missed, lastSession };
    }
  };

  const getLongestStreak = () => {
    const allKeys = Object.keys(logs).sort();
    if (!allKeys.length) return { count: 0, start: null, end: null };
    let best = 0, bestStart = null, bestEnd = null;
    let cur = 0, curStart = null;
    const first = parseKey(allKeys[0]);
    const last = parseKey(allKeys[allKeys.length - 1]);
    let d = new Date(first);
    while (d <= last) {
      const k = toKey(d);
      const a = logs[k]?.activity;
      if (a === "session") {
        if (cur === 0) curStart = new Date(d);
        cur++;
        if (cur > best) { best = cur; bestStart = new Date(curStart); bestEnd = new Date(d); }
      } else if (a === "rest") {
        // rest doesn't break streak
      } else {
        cur = 0; curStart = null;
      }
      d = addDays(d, 1);
    }
    return { count: best, start: bestStart, end: bestEnd };
  };

  const getBestWeek = () => {
    const allKeys = Object.keys(logs).sort();
    if (!allKeys.length) return { count: 0, weekStart: null };
    let best = 0, bestWeekStart = null;
    const seen = new Set();
    for (const k of allKeys) {
      if (logs[k]?.activity !== "session") continue;
      const d = parseKey(k);
      const ws = startOfWeek(d);
      const wk = toKey(ws);
      if (seen.has(wk)) continue;
      seen.add(wk);
      let count = 0;
      for (let i = 0; i < 7; i++) {
        const dk = toKey(addDays(ws, i));
        if (logs[dk]?.activity === "session") count++;
      }
      if (count > best) { best = count; bestWeekStart = new Date(ws); }
    }
    return { count: best, weekStart: bestWeekStart };
  };

  const getMissedThisMonth = () => {
    const t = today();
    const y = t.getFullYear(), m = t.getMonth();
    let count = 0;
    const days = getDaysInMonth(y, m);
    for (let i = 1; i <= days; i++) {
      const k = toKey(new Date(y, m, i));
      if (logs[k]?.activity === "missed") count++;
    }
    return count;
  };

  const getTotalSessions = () => Object.values(logs).filter(v => v.activity === "session").length;

  const getThisWeekDays = () => {
    const ws = startOfWeek(today());
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(ws, i);
      const k = toKey(d);
      return { d, k, label: ["M","T","W","T","F","S","S"][i], activity: logs[k]?.activity || null, isToday: toKey(d) === toKey(today()) };
    });
  };

  const getMonthReport = (year, month) => {
    const days = getDaysInMonth(year, month);
    let sessions = 0, missed = 0, rest = 0;
    const muscleCount = {};
    for (let i = 1; i <= days; i++) {
      const d = new Date(year, month, i);
      if (d > today()) continue;
      const k = toKey(d);
      const a = logs[k]?.activity;
      if (a === "session") {
        sessions++;
        (logs[k].muscles || []).forEach(m => { muscleCount[m] = (muscleCount[m] || 0) + 1; });
      } else if (a === "missed") missed++;
      else if (a === "rest") rest++;
    }
    const attendance = sessions + missed > 0 ? Math.round((sessions / (sessions + missed)) * 100) : 0;
    let gymStreak = 0, gymBest = 0, gymBestStart = null, gymBestEnd = null, curGymStart = null;
    let missStreak = 0, missBest = 0, missBestStart = null, missBestEnd = null, curMissStart = null;
    for (let i = 1; i <= days; i++) {
      const d = new Date(year, month, i);
      if (d > today()) break;
      const k = toKey(d);
      const a = logs[k]?.activity;
      if (a === "session") {
        if (gymStreak === 0) curGymStart = new Date(d);
        gymStreak++;
        if (gymStreak > gymBest) { gymBest = gymStreak; gymBestStart = new Date(curGymStart); gymBestEnd = new Date(d); }
        missStreak = 0; curMissStart = null;
      } else if (a === "missed") {
        if (missStreak === 0) curMissStart = new Date(d);
        missStreak++;
        if (missStreak > missBest) { missBest = missStreak; missBestStart = new Date(curMissStart); missBestEnd = new Date(d); }
        gymStreak = 0; curGymStart = null;
      } else {
        gymStreak = 0; missStreak = 0; curGymStart = null; curMissStart = null;
      }
    }
    const wk = `${year}-${String(month + 1).padStart(2, "0")}`;
    const w = weights[wk] || {};
    return { sessions, missed, rest, attendance, gymBest, gymBestStart, gymBestEnd, missBest, missBestStart, missBestEnd, muscleCount, startWeight: w.start || null, endWeight: w.end || null };
  };

  const getWeightHistory = () => {
    return Object.keys(weights).sort().reverse().map(k => {
      const [y, m] = k.split("-").map(Number);
      const label = new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
      const w = weights[k];
      const delta = w.start && w.end ? (w.end - w.start).toFixed(1) : null;
      return { k, label, start: w.start, end: w.end, delta };
    });
  };

  const getTotalWeightChange = () => {
    const hist = getWeightHistory().reverse();
    if (!hist.length) return null;
    const first = hist.find(h => h.start);
    const last = [...hist].reverse().find(h => h.end || h.start);
    if (!first) return null;
    const startVal = first.start;
    const endVal = last?.end || last?.start;
    if (!startVal || !endVal) return null;
    return (endVal - startVal).toFixed(1);
  };

  const streakInfo = getStreakInfo();
  const longestStreak = getLongestStreak();
  const bestWeek = getBestWeek();
  const missedMonth = getMissedThisMonth();
  const totalSessions = getTotalSessions();
  const weekDays = getThisWeekDays();
  const monthReport = getMonthReport(insightMonth.year, insightMonth.month);
  const weightHistory = getWeightHistory();
  const totalWeightChange = getTotalWeightChange();

  const monthLabel = (y, m) => new Date(y, m, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  const calDays = () => {
    const { year, month } = calMonth;
    const first = new Date(year, month, 1);
    const startDay = first.getDay() === 0 ? 6 : first.getDay() - 1;
    const days = getDaysInMonth(year, month);
    const cells = [];
    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let i = 1; i <= days; i++) cells.push(i);
    return cells;
  };

  const monthSessionCount = () => {
    const { year, month } = calMonth;
    let c = 0;
    const days = getDaysInMonth(year, month);
    for (let i = 1; i <= days; i++) {
      if (logs[toKey(new Date(year, month, i))]?.activity === "session") c++;
    }
    return c;
  };

  const activityColor = (a) => {
    if (a === "session") return { bg: "#1D9E75", color: "#E1F5EE" };
    if (a === "missed") return { bg: "#FCEBEB", color: "#A32D2D" };
    if (a === "rest") return { bg: "#FAEEDA", color: "#633806" };
    return { bg: "#f7f7f7", color: "#aaa" };
  };

  const insightMonths = () => {
    const months = [];
    const t = today();
    for (let i = 0; i < 12; i++) {
      const d = new Date(t.getFullYear(), t.getMonth() - i, 1);
      months.push({ year: d.getFullYear(), month: d.getMonth(), label: monthLabel(d.getFullYear(), d.getMonth()) });
    }
    return months;
  };

  const wk = `${insightMonth.year}-${String(insightMonth.month + 1).padStart(2, "0")}`;

  const saveWeight = () => {
    const entry = {};
    if (wtStart) entry.start = parseFloat(wtStart);
    if (wtEnd) entry.end = parseFloat(wtEnd);
    const newW = { ...weights, [wk]: { ...( weights[wk] || {}), ...entry } };
    saveWeights(newW);
    setWtStart(""); setWtEnd("");
  };

  const s = {
    app: { minHeight: "100vh", background: "#f0f0f0", display: "flex", justifyContent: "center", fontFamily: "system-ui, sans-serif" },
    phone: { width: "100%", maxWidth: 420, minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column" },
    body: { flex: 1, padding: "12px 16px 90px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 },
    nav: { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 420, display: "flex", justifyContent: "space-around", padding: "8px 0 20px", background: "#fff", borderTop: "0.5px solid #e0e0e0", zIndex: 10 },
    ni: (active) => ({ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, fontSize: 11, color: active ? "#0F6E56" : "#999", cursor: "pointer", background: "none", border: "none", padding: "4px 12px" }),
    nd: (active) => ({ width: 28, height: 4, borderRadius: 2, background: active ? "#1D9E75" : "#eee" }),
    pg: { fontSize: 18, fontWeight: 500, color: "#111", marginBottom: 2 },
    sec: { fontSize: 11, fontWeight: 500, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em" },
    card: { background: "#f7f7f7", borderRadius: 12, padding: "10px 12px" },
    g2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
    sv: { fontSize: 22, fontWeight: 500, color: "#111" },
    sl: { fontSize: 11, color: "#888", marginBottom: 2 },
    ss: { fontSize: 11, color: "#aaa" },
    gbtn: { background: "#1D9E75", color: "#fff", borderRadius: 14, padding: "12px 16px", textAlign: "center", fontSize: 15, fontWeight: 500, cursor: "pointer", border: "none", width: "100%" },
    chip: (on) => ({ padding: "5px 11px", borderRadius: 20, fontSize: 12, border: on ? "none" : "0.5px solid #ddd", color: on ? "#fff" : "#555", background: on ? "#1D9E75" : "#fff", cursor: "pointer" }),
    inp: { background: "#f7f7f7", borderRadius: 8, padding: "8px 10px", fontSize: 13, color: "#111", border: "0.5px solid #e0e0e0", width: "100%", boxSizing: "border-box" },
    overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 20, display: "flex", alignItems: "flex-end", justifyContent: "center" },
    modal: { background: "#fff", borderRadius: "20px 20px 0 0", padding: 20, width: "100%", maxWidth: 420, maxHeight: "90vh", overflowY: "auto" },
    mrow: { marginBottom: 12 },
    mlbl: { fontSize: 12, color: "#888", marginBottom: 4 },
    sel: { width: "100%", background: "#f7f7f7", borderRadius: 8, padding: "8px 10px", fontSize: 13, color: "#111", border: "0.5px solid #e0e0e0" },
    tag: (c) => ({ display: "inline-block", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 500, background: c === "g" ? "#E1F5EE" : c === "r" ? "#FCEBEB" : "#FAEEDA", color: c === "g" ? "#085041" : c === "r" ? "#791F1F" : "#633806" }),
  };

  return (
    <div style={s.app}>
      <div style={s.phone}>
        <div style={s.nav}>
          {[["home","Home"],["calendar","Calendar"],["insights","Insights"],["weight","Weight"]].map(([t2,l]) => (
            <button key={t2} style={s.ni(tab===t2)} onClick={() => setTab(t2)}>
              <div style={s.nd(tab===t2)}></div>
              {l}
            </button>
          ))}
        </div>

        {tab === "home" && (
          <div style={s.body}>
            <div style={s.pg}>Good morning, Sayyam</div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{ position: "relative", width: 110, height: 110 }}>
                <svg width="110" height="110" style={{ transform: "rotate(-90deg)" }}>
                  <circle cx="55" cy="55" r="46" fill="none" stroke={streakInfo.type === "missed" ? "#FCEBEB" : "#E1F5EE"} strokeWidth="8"/>
                  <circle cx="55" cy="55" r="46" fill="none"
                    stroke={streakInfo.type === "missed" ? "#E24B4A" : "#1D9E75"}
                    strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 46}`}
                    strokeDashoffset={`${2 * Math.PI * 46 * (1 - Math.min((streakInfo.count || 0) / 30, 1))}`}
                    strokeLinecap="round"/>
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 28, fontWeight: 500, color: streakInfo.type === "missed" ? "#A32D2D" : "#0F6E56", lineHeight: 1 }}>{streakInfo.count || 0}</span>
                  <span style={{ fontSize: 10, color: streakInfo.type === "missed" ? "#E24B4A" : "#1D9E75" }}>{streakInfo.type === "missed" ? "days missed" : "day streak"}</span>
                </div>
              </div>
              <span style={{ fontSize: 11, color: "#aaa" }}>
                {streakInfo.type === "streak"
                  ? `${fmtShort(streakInfo.start)} – ${fmtShort(streakInfo.end)}`
                  : streakInfo.lastSession ? `Last session: ${fmtShort(streakInfo.lastSession)}` : "No sessions yet"}
              </span>
            </div>

            <button style={s.gbtn} onClick={() => openModal(toKey(today()))}>Log today's activity</button>

            <div>
              <div style={s.sec}>This week</div>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                {weekDays.map((w, i) => {
                  const ac = activityColor(w.activity);
                  return (
                    <div key={i} onClick={() => openModal(w.k)} style={{ flex: 1, height: 42, borderRadius: 8, background: w.activity ? ac.bg : w.isToday ? "transparent" : "#f7f7f7", border: w.isToday ? "1.5px solid #1D9E75" : "none", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", gap: 2 }}>
                      <span style={{ fontSize: 10, fontWeight: 500, color: w.activity ? ac.color : w.isToday ? "#1D9E75" : "#aaa" }}>{w.label}</span>
                      {w.activity && <span style={{ fontSize: 8, color: ac.color }}>{w.activity === "session" ? "gym" : w.activity}</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={s.g2}>
              <div style={s.card}>
                <div style={s.sl}>Longest streak</div>
                <div style={s.sv}>{longestStreak.count}</div>
                <div style={s.ss}>{longestStreak.start && longestStreak.end ? `${fmtShort(longestStreak.start)} – ${fmtShort(longestStreak.end)}` : "—"}</div>
              </div>
              <div style={s.card}>
                <div style={s.sl}>Best week</div>
                <div style={s.sv}>{bestWeek.count}</div>
                <div style={s.ss}>{bestWeek.weekStart ? `${fmtShort(bestWeek.weekStart)} – ${fmtShort(addDays(bestWeek.weekStart, 6))}` : "—"}</div>
              </div>
              <div style={s.card}>
                <div style={s.sl}>Total sessions</div>
                <div style={s.sv}>{totalSessions}</div>
                <div style={s.ss}>all time</div>
              </div>
              <div style={s.card}>
                <div style={s.sl}>Days missed</div>
                <div style={{ ...s.sv, color: missedMonth > 0 ? "#E24B4A" : "#111" }}>{missedMonth}</div>
                <div style={s.ss}>this month</div>
              </div>
            </div>
          </div>
        )}

        {tab === "calendar" && (
          <div style={s.body}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#555" }} onClick={() => setCalMonth(p => { const d = new Date(p.year, p.month - 1, 1); return { year: d.getFullYear(), month: d.getMonth() }; })}>‹</button>
              <div style={s.pg}>{monthLabel(calMonth.year, calMonth.month)}</div>
              <button style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#555" }} onClick={() => setCalMonth(p => { const d = new Date(p.year, p.month + 1, 1); return { year: d.getFullYear(), month: d.getMonth() }; })}>›</button>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span style={s.tag("g")}>{monthSessionCount()} gym</span>
              <span style={s.tag("r")}>{(() => { const { year, month } = calMonth; let c = 0; for (let i = 1; i <= getDaysInMonth(year, month); i++) { if (logs[toKey(new Date(year, month, i))]?.activity === "missed") c++; } return c; })()} missed</span>
              <span style={s.tag("y")}>{(() => { const { year, month } = calMonth; let c = 0; for (let i = 1; i <= getDaysInMonth(year, month); i++) { if (logs[toKey(new Date(year, month, i))]?.activity === "rest") c++; } return c; })()} rest</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
              {["M","T","W","T","F","S","S"].map((d, i) => <div key={i} style={{ textAlign: "center", fontSize: 11, color: "#aaa", fontWeight: 500, padding: "4px 0" }}>{d}</div>)}
              {calDays().map((day, i) => {
                if (!day) return <div key={i}/>;
                const k = toKey(new Date(calMonth.year, calMonth.month, day));
                const a = logs[k]?.activity;
                const ac = activityColor(a);
                const isTod = k === toKey(today());
                return (
                  <div key={i} onClick={() => openModal(k)} style={{ aspectRatio: "1", borderRadius: 6, background: a ? ac.bg : isTod ? "transparent" : "#f7f7f7", border: isTod ? "1.5px solid #1D9E75" : "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: a ? ac.color : isTod ? "#1D9E75" : "#aaa", cursor: "pointer", fontWeight: a === "session" ? 500 : 400 }}>
                    {day}
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {[["gym","#1D9E75",""],["missed","#FCEBEB","0.5px solid #E24B4A"],["rest","#FAEEDA",""]].map(([l,bg,border]) => (
                <div key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: bg, border }}></div>
                  <span style={{ fontSize: 11, color: "#888" }}>{l}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "insights" && (
          <div style={s.body}>
            <div style={s.pg}>Insights</div>
            <div>
              <div style={s.mlbl}>Select month</div>
              <select style={s.sel} value={`${insightMonth.year}-${insightMonth.month}`} onChange={e => { const [y,m] = e.target.value.split("-"); setInsightMonth({ year: +y, month: +m }); }}>
                {insightMonths().map(m => <option key={m.label} value={`${m.year}-${m.month}`}>{m.label}</option>)}
              </select>
            </div>
            <div style={s.g2}>
              <div style={s.card}><div style={s.sl}>Sessions</div><div style={s.sv}>{monthReport.sessions}</div></div>
              <div style={s.card}><div style={s.sl}>Missed</div><div style={{ ...s.sv, color: monthReport.missed > 0 ? "#E24B4A" : "#111" }}>{monthReport.missed}</div></div>
              <div style={s.card}><div style={s.sl}>Rest days</div><div style={{ ...s.sv, color: "#BA7517" }}>{monthReport.rest}</div></div>
              <div style={s.card}><div style={s.sl}>Attendance</div><div style={s.sv}>{monthReport.attendance}%</div></div>
            </div>
            <div style={s.g2}>
              <div style={s.card}>
                <div style={s.sl}>Longest gym streak</div>
                <div style={s.sv}>{monthReport.gymBest}</div>
                <div style={s.ss}>{monthReport.gymBestStart && monthReport.gymBestEnd ? `${fmtShort(monthReport.gymBestStart)} – ${fmtShort(monthReport.gymBestEnd)}` : "—"}</div>
              </div>
              <div style={s.card}>
                <div style={s.sl}>Longest miss streak</div>
                <div style={{ ...s.sv, color: monthReport.missBest > 0 ? "#E24B4A" : "#111" }}>{monthReport.missBest}</div>
                <div style={s.ss}>{monthReport.missBestStart && monthReport.missBestEnd ? `${fmtShort(monthReport.missBestStart)} – ${fmtShort(monthReport.missBestEnd)}` : "—"}</div>
              </div>
            </div>
            <div>
              <div style={s.sec}>Muscle breakdown</div>
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                {Object.entries(monthReport.muscleCount).sort((a,b) => b[1]-a[1]).map(([m, c]) => (
                  <div key={m} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, color: "#555", width: 75 }}>{m}</span>
                    <div style={{ flex: 1, height: 6, background: "#f0f0f0", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", background: "#1D9E75", borderRadius: 3, width: `${monthReport.sessions > 0 ? Math.round((c / monthReport.sessions) * 100) : 0}%` }}></div>
                    </div>
                    <span style={{ fontSize: 11, color: "#aaa", width: 20, textAlign: "right" }}>{c}</span>
                  </div>
                ))}
                {Object.keys(monthReport.muscleCount).length === 0 && <span style={{ fontSize: 12, color: "#aaa" }}>No sessions logged this month</span>}
              </div>
            </div>
            {(monthReport.startWeight || monthReport.endWeight) && (
              <div style={s.card}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={s.sl}>Start weight</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#111" }}>{monthReport.startWeight ? `${monthReport.startWeight} kg` : "—"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={s.sl}>End weight</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#1D9E75" }}>
                    {monthReport.endWeight ? `${monthReport.endWeight} kg` : "—"}
                    {monthReport.startWeight && monthReport.endWeight ? `  (${(monthReport.endWeight - monthReport.startWeight).toFixed(1)} kg)` : ""}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "weight" && (
          <div style={s.body}>
            <div style={s.pg}>Weight log</div>
            <div style={{ ...s.card, border: "1.5px solid #1D9E75" }}>
              <div style={s.sl}>Log for {monthLabel(insightMonth.year, insightMonth.month)}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: "#aaa", marginBottom: 4 }}>Start weight (kg)</div>
                  <input style={s.inp} type="number" step="0.1" placeholder={weights[wk]?.start ? String(weights[wk].start) : "e.g. 78.5"} value={wtStart} onChange={e => setWtStart(e.target.value)}/>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: "#aaa", marginBottom: 4 }}>End weight (kg)</div>
                  <input style={s.inp} type="number" step="0.1" placeholder={weights[wk]?.end ? String(weights[wk].end) : "e.g. 76.0"} value={wtEnd} onChange={e => setWtEnd(e.target.value)}/>
                </div>
              </div>
              <button style={{ ...s.gbtn, marginTop: 10, fontSize: 13, padding: "9px" }} onClick={saveWeight}>Save</button>
            </div>
            <div style={s.sec}>History</div>
            {weightHistory.length === 0 && <span style={{ fontSize: 13, color: "#aaa" }}>No weight entries yet</span>}
            {weightHistory.map(h => (
              <div key={h.k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "0.5px solid #f0f0f0" }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: "#111" }}>{h.label}</span>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, color: "#888" }}>{h.start ? `${h.start}` : "—"} → {h.end ? `${h.end} kg` : "pending"}</div>
                  {h.delta && <div style={{ fontSize: 12, fontWeight: 500, color: parseFloat(h.delta) < 0 ? "#1D9E75" : "#E24B4A" }}>{parseFloat(h.delta) > 0 ? "+" : ""}{h.delta} kg</div>}
                </div>
              </div>
            ))}
            {totalWeightChange && (
              <div style={{ background: "#E1F5EE", borderRadius: 10, padding: "8px 12px", fontSize: 12, color: "#085041" }}>
                Total change since first entry: {parseFloat(totalWeightChange) > 0 ? "+" : ""}{totalWeightChange} kg
              </div>
            )}
          </div>
        )}

        {showModal && (
          <div style={s.overlay} onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
            <div style={s.modal}>
              <div style={{ fontSize: 16, fontWeight: 500, color: "#111", marginBottom: 16 }}>Log activity</div>
              <div style={s.mrow}>
                <div style={s.mlbl}>Date</div>
                <input type="date" style={s.inp} value={modalDate} max={toKey(today())} onChange={e => setModalDate(e.target.value)}/>
              </div>
              <div style={s.mrow}>
                <div style={s.mlbl}>Activity</div>
                <select style={{ ...s.sel, background: modalActivity === "session" ? "#E1F5EE" : "#f7f7f7", color: modalActivity === "session" ? "#085041" : "#111", borderColor: modalActivity === "session" ? "#1D9E75" : "#e0e0e0" }} value={modalActivity} onChange={e => setModalActivity(e.target.value)}>
                  <option value="session">Session done</option>
                  <option value="missed">Missed</option>
                  <option value="rest">Rest day</option>
                </select>
              </div>
              {modalActivity === "session" && (
                <>
                  <div style={s.mrow}>
                    <div style={s.mlbl}>Muscles trained</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
                      {MUSCLES.map(m => <button key={m} style={s.chip(modalMuscles.includes(m))} onClick={() => toggleMuscle(m)}>{m}</button>)}
                    </div>
                  </div>
                  <div style={s.mrow}>
                    <div style={s.mlbl}>Note (optional)</div>
                    <textarea style={{ ...s.inp, minHeight: 60, resize: "vertical" }} placeholder="How did it go?" value={modalNote} onChange={e => setModalNote(e.target.value)}/>
                  </div>
                </>
              )}
              <button style={s.gbtn} onClick={saveLog}>Save</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}