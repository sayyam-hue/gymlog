import { useState, useEffect } from "react";
import localforage from "localforage";

const MUSCLES = ["Chest","Back","Shoulders","Biceps","Triceps","Legs","Core","Full Body","Cardio"];
const APP_START = "2026-03-27";
const REWARDS_UNLOCK_DATE = "2026-06-01";

const fmtShort = (d) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const toKey = (d) => d.toISOString().slice(0, 10);
const today = () => new Date();
const parseKey = (k) => new Date(k + "T00:00:00");

function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function startOfWeek(d) { const r = new Date(d); const day = r.getDay(); r.setDate(r.getDate() + (day === 0 ? -6 : 1 - day)); return r; }

const MILESTONES = [
  { id:"m1",  cat:"Streak",      name:"Warming Up",        coins:0.5, type:"one-time",   desc:"3 day streak" },
  { id:"m2",  cat:"Streak",      name:"On Fire",           coins:0.5, type:"one-time",   desc:"7 day streak" },
  { id:"m3",  cat:"Streak",      name:"Unstoppable",       coins:1,   type:"one-time",   desc:"14 day streak" },
  { id:"m4",  cat:"Streak",      name:"Habit Locked",      coins:2,   type:"one-time",   desc:"21 day streak" },
  { id:"m5",  cat:"Streak",      name:"Iron Will",         coins:3,   type:"one-time",   desc:"30 day streak" },
  { id:"m6",  cat:"Streak",      name:"Machine",           coins:6,   type:"one-time",   desc:"60 day streak" },
  { id:"m7",  cat:"Streak",      name:"Legend",            coins:15,  type:"one-time",   desc:"100 day streak" },
  { id:"m8",  cat:"Sessions",    name:"Halfway Hero",      coins:2,   type:"one-time",   desc:"50 total sessions" },
  { id:"m9",  cat:"Sessions",    name:"Grinder",           coins:3,   type:"one-time",   desc:"75 total sessions" },
  { id:"m10", cat:"Sessions",    name:"Century Club",      coins:3,   type:"one-time",   desc:"100 total sessions" },
  { id:"m11", cat:"Sessions",    name:"Elite",             coins:10,  type:"one-time",   desc:"200 total sessions" },
  { id:"m12", cat:"Sessions",    name:"Untouchable",       coins:15,  type:"one-time",   desc:"300 total sessions" },
  { id:"m13", cat:"Sessions",    name:"One a Day",         coins:20,  type:"one-time",   desc:"365 total sessions" },
  { id:"m14", cat:"Weekly",      name:"Perfect Week",      coins:3,   type:"one-time",   desc:"7/7 days, zero misses" },
  { id:"m15", cat:"Weekly",      name:"Month of Months",   coins:4,   type:"one-time",   desc:"4 perfect weeks" },
  { id:"m16", cat:"Weekly",      name:"Double Down",       coins:5,   type:"one-time",   desc:"8 perfect weeks" },
  { id:"m17", cat:"Weekly",      name:"Locked In",         coins:3,   type:"one-time",   desc:"4 consecutive 4+ session weeks" },
  { id:"m18", cat:"Weekly",      name:"New Peak",          coins:0.5, type:"repeatable", desc:"Beat your best week ever" },
  { id:"m19", cat:"Muscle",      name:"Full Arsenal",      coins:2,   type:"one-time",   desc:"Train all 9 muscle groups" },
  { id:"m20", cat:"Muscle",      name:"Full Body Warrior", coins:1,   type:"one-time",   desc:"3+ muscles in a session, 10 times" },
  { id:"m21", cat:"Muscle",      name:"Expert",            coins:2,   type:"one-time",   desc:"Any muscle trained 25 times" },
  { id:"m22", cat:"Muscle",      name:"Master",            coins:2,   type:"one-time",   desc:"Any muscle trained 50 times" },
  { id:"m23", cat:"Muscle",      name:"Quad Destroyer",    coins:2,   type:"one-time",   desc:"Legs trained 25 times" },
  { id:"m24", cat:"Muscle",      name:"Solid Foundation",  coins:2,   type:"one-time",   desc:"Core trained 20 times" },
  { id:"m25", cat:"Consistency", name:"Show Up",           coins:0.5, type:"one-time",   desc:"Log any activity 7 consecutive days" },
  { id:"m26", cat:"Consistency", name:"Smart Athlete",     coins:0.5, type:"one-time",   desc:"First rest day logged" },
  { id:"m27", cat:"Consistency", name:"Never Miss a Day",  coins:2,   type:"one-time",   desc:"Log any activity 30 consecutive days" },
  { id:"m28", cat:"Consistency", name:"Recovery Pro",      coins:1,   type:"one-time",   desc:"10 rest days logged" },
  { id:"m29", cat:"Consistency", name:"Near Perfect Month",coins:3,   type:"repeatable", desc:"Max 4 missed days in a month" },
  { id:"m30", cat:"Consistency", name:"Perfect Month",     coins:9,   type:"repeatable", desc:"Zero missed days in a month" },
  { id:"m31", cat:"Consistency", name:"Bulletproof",       coins:12,  type:"one-time",   desc:"3 perfect months" },
  { id:"m32", cat:"Consistency", name:"The Comeback",      coins:0.5, type:"repeatable", desc:"Return after 7+ missed days" },
  { id:"m33", cat:"Consistency", name:"Rise Again",        coins:0.5, type:"repeatable", desc:"Return after 14+ missed days" },
  { id:"m34", cat:"Monthly",     name:"High Output",       coins:2,   type:"one-time",   desc:"20+ sessions in a month" },
  { id:"m35", cat:"Monthly",     name:"Beast Month",       coins:4,   type:"one-time",   desc:"25+ sessions in a month" },
  { id:"m36", cat:"Monthly",     name:"Consistent Beast",  coins:2,   type:"one-time",   desc:"3 months with 15+ sessions" },
  { id:"m37", cat:"Monthly",     name:"Almost Perfect",    coins:4,   type:"repeatable", desc:"90%+ attendance in a month" },
  { id:"m38", cat:"Monthly",     name:"Reliable",          coins:8,   type:"one-time",   desc:"80%+ attendance 3 consecutive months" },
];

const REWARDS = [
  { id:"r1", name:"Spa / massage session",     coins:10, repeatable:true },
  { id:"r2", name:"New sneakers",              coins:12, repeatable:false },
  { id:"r3", name:"Office bag",               coins:15, repeatable:false },
  { id:"r4", name:"Expensive perfume",         coins:18, repeatable:false },
  { id:"r5", name:"Suit",                      coins:30, repeatable:false },
  { id:"r6", name:"Watch",                     coins:45, repeatable:false },
  { id:"r7", name:"DJ Set / music instrument", coins:55, repeatable:false },
];

export default function App() {
  const [logs, setLogs] = useState({});
  const [weights, setWeights] = useState({});
  const [earnedBadges, setEarnedBadges] = useState({});
  const [redemptions, setRedemptions] = useState([]);
  const [customRewards, setCustomRewards] = useState([]);
  const [tab, setTab] = useState("home");
  const [showModal, setShowModal] = useState(false);
  const [modalDate, setModalDate] = useState(toKey(today()));
  const [modalActivity, setModalActivity] = useState("session");
  const [modalMuscles, setModalMuscles] = useState([]);
  const [modalNote, setModalNote] = useState("");
  const [calMonth, setCalMonth] = useState({ year: today().getFullYear(), month: today().getMonth() });
  const [insightMonth, setInsightMonth] = useState({ year: today().getFullYear(), month: today().getMonth() });
  const [wtStart, setWtStart] = useState("");
  const [wtEnd, setWtEnd] = useState("");
  const [badgeFilter, setBadgeFilter] = useState("All");
  const [pendingPopups, setPendingPopups] = useState([]);
  const [showPopup, setShowPopup] = useState(null);
  const [showRedeemConfirm, setShowRedeemConfirm] = useState(null);
  const [showAddReward, setShowAddReward] = useState(false);
  const [newRewardName, setNewRewardName] = useState("");
  const [newRewardCoins, setNewRewardCoins] = useState("");
  const [newRewardRepeatable, setNewRewardRepeatable] = useState(false);

  useEffect(() => {
    Promise.all([
      localforage.getItem("gymlog_logs"),
      localforage.getItem("gymlog_weights"),
      localforage.getItem("gymlog_badges"),
      localforage.getItem("gymlog_redemptions"),
      localforage.getItem("gymlog_custom_rewards"),
    ]).then(([l, w, b, r, cr]) => {
      if (l) setLogs(l);
      if (w) setWeights(w);
      if (b) setEarnedBadges(b);
      if (r) setRedemptions(r);
      if (cr) setCustomRewards(cr);
    });
  }, []);

  useEffect(() => { autoMarkMissed(); }, [logs]);
  useEffect(() => { if (Object.keys(logs).length > 0) checkMilestones(); }, [logs, earnedBadges]);

  const saveLogs = (v) => { setLogs(v); localforage.setItem("gymlog_logs", v); };
  const saveWeights = (v) => { setWeights(v); localforage.setItem("gymlog_weights", v); };
  const saveBadges = (v) => { setEarnedBadges(v); localforage.setItem("gymlog_badges", v); };
  const saveRedemptions = (v) => { setRedemptions(v); localforage.setItem("gymlog_redemptions", v); };
  const saveCustomRewards = (v) => { setCustomRewards(v); localforage.setItem("gymlog_custom_rewards", v); };

  const autoMarkMissed = () => {
    const t = today();
    const newLogs = { ...logs };
    let changed = false;
    let d = parseKey(APP_START);
    const yesterday = addDays(t, -1);
    while (d <= yesterday) {
      const k = toKey(d);
      if (!newLogs[k]) { newLogs[k] = { activity: "missed" }; changed = true; }
      d = addDays(d, 1);
    }
    if (changed) saveLogs(newLogs);
  };

  const openModal = (dateKey) => {
    if (dateKey < APP_START) return;
    const existing = logs[dateKey];
    setModalDate(dateKey);
    setModalActivity(existing ? existing.activity : "session");
    setModalMuscles(existing ? (existing.muscles || []) : []);
    setModalNote(existing ? (existing.note || "") : "");
    setShowModal(true);
  };

  const saveLog = () => {
    const entry = { activity: modalActivity };
    if (modalActivity === "session") { entry.muscles = modalMuscles; entry.note = modalNote; }
    const newLogs = { ...logs, [modalDate]: entry };
    saveLogs(newLogs);
    setShowModal(false);
  };

  const toggleMuscle = (m) => setModalMuscles(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);

  const getTotalSessions = (l = logs) => Object.entries(l).filter(([k, v]) => k >= APP_START && v.activity === "session").length;

  const getCurrentStreak = (l = logs) => {
    const t = today(); const todayKey = toKey(t);
    if (l[todayKey]?.activity === "session") {
      let streak = 1; let d = addDays(t, -1);
      while (toKey(d) >= APP_START) {
        const a = l[toKey(d)]?.activity;
        if (a === "session") { streak++; d = addDays(d, -1); }
        else if (a === "rest") { d = addDays(d, -1); }
        else break;
      }
      return streak;
    }
    return 0;
  };

  const getStreakInfo = () => {
    const t = today(); const todayKey = toKey(t);
    if (logs[todayKey]?.activity === "session") {
      let streak = 1; let d = addDays(t, -1);
      while (toKey(d) >= APP_START) {
        const a = logs[toKey(d)]?.activity;
        if (a === "session") { streak++; d = addDays(d, -1); }
        else if (a === "rest") { d = addDays(d, -1); }
        else break;
      }
      return { type:"streak", count:streak, start:addDays(d,1), end:new Date(t) };
    }
    let missed = 0; let lastSession = null; let dd = new Date(t);
    while (toKey(dd) >= APP_START) {
      const a = logs[toKey(dd)]?.activity;
      if (!a || a === "missed") { missed++; dd = addDays(dd, -1); }
      else if (a === "rest") { dd = addDays(dd, -1); }
      else if (a === "session") { lastSession = new Date(dd); break; }
      else break;
    }
    return { type:"missed", count:missed, lastSession };
  };

  const getLongestStreak = () => {
    const allKeys = Object.keys(logs).filter(k => k >= APP_START).sort();
    if (!allKeys.length) return { count:0, start:null, end:null };
    let best=0, bestStart=null, bestEnd=null, cur=0, curStart=null;
    let d = parseKey(allKeys[0]); const last = parseKey(allKeys[allKeys.length-1]);
    while (d <= last) {
      const k = toKey(d); const a = logs[k]?.activity;
      if (a === "session") { if (cur===0) curStart=new Date(d); cur++; if (cur>best) { best=cur; bestStart=new Date(curStart); bestEnd=new Date(d); } }
      else if (a !== "rest") { cur=0; curStart=null; }
      d = addDays(d, 1);
    }
    return { count:best, start:bestStart, end:bestEnd };
  };

  const getBestWeek = () => {
    const allKeys = Object.keys(logs).filter(k => k >= APP_START).sort();
    if (!allKeys.length) return { count:0, weekStart:null };
    let best=0, bestWeekStart=null; const seen=new Set();
    for (const k of allKeys) {
      if (logs[k]?.activity !== "session") continue;
      const ws = startOfWeek(parseKey(k)); const wk = toKey(ws);
      if (seen.has(wk)) continue; seen.add(wk);
      let count=0;
      for (let i=0;i<7;i++) { if (logs[toKey(addDays(ws,i))]?.activity==="session") count++; }
      if (count>best) { best=count; bestWeekStart=new Date(ws); }
    }
    return { count:best, weekStart:bestWeekStart };
  };

  const getMissedThisMonth = () => {
    const t=today(); const y=t.getFullYear(), m=t.getMonth(); let count=0;
    for (let i=1;i<=getDaysInMonth(y,m);i++) { const k=toKey(new Date(y,m,i)); if(k>=APP_START&&logs[k]?.activity==="missed") count++; }
    return count;
  };

  const getThisWeekDays = () => {
    const ws = startOfWeek(today());
    return Array.from({length:7},(_,i) => {
      const d=addDays(ws,i); const k=toKey(d); const beforeStart=k<APP_START;
      return { d, k, label:["M","T","W","T","F","S","S"][i], activity:beforeStart?null:(logs[k]?.activity||null), isToday:toKey(d)===toKey(today()), beforeStart };
    });
  };

  const getMuscleCount = () => {
    const counts={};
    Object.entries(logs).forEach(([k,v]) => { if(k>=APP_START&&v.activity==="session") (v.muscles||[]).forEach(m => { counts[m]=(counts[m]||0)+1; }); });
    return counts;
  };

  const getMultiMuscleSessionCount = () => Object.entries(logs).filter(([k,v]) => k>=APP_START&&v.activity==="session"&&(v.muscles||[]).length>=3).length;
  const getRestDaysTotal = () => Object.entries(logs).filter(([k,v]) => k>=APP_START&&v.activity==="rest").length;

  const getPerfectWeeksCount = () => {
    const seen=new Set(); let count=0;
    Object.keys(logs).filter(k=>k>=APP_START).forEach(k => {
      const ws=startOfWeek(parseKey(k)); const wk=toKey(ws);
      if (seen.has(wk)) return; seen.add(wk);
      let perfect=true;
      for (let i=0;i<7;i++) { const dk=toKey(addDays(ws,i)); if(dk>toKey(today())) break; if(dk>=APP_START&&logs[dk]?.activity==="missed") { perfect=false; break; } }
      if (perfect) count++;
    });
    return count;
  };

  const getConsecutive4PlusWeeks = () => {
    const seen=new Set(); const weeks=[];
    Object.keys(logs).filter(k=>k>=APP_START).sort().forEach(k => {
      const ws=startOfWeek(parseKey(k)); const wk=toKey(ws);
      if (seen.has(wk)) return; seen.add(wk);
      let count=0;
      for (let i=0;i<7;i++) { if(logs[toKey(addDays(ws,i))]?.activity==="session") count++; }
      weeks.push(count);
    });
    let best=0, cur=0;
    for (const w of weeks) { if(w>=4){cur++;best=Math.max(best,cur);}else cur=0; }
    return best;
  };

  const getMonthStats = (year, month) => {
    const days=getDaysInMonth(year,month); let sessions=0,missed=0,rest=0; const muscleCount={};
    for (let i=1;i<=days;i++) {
      const d=new Date(year,month,i); if(d>today()) continue;
      const k=toKey(d); if(k<APP_START) continue;
      const a=logs[k]?.activity;
      if(a==="session"){sessions++;(logs[k].muscles||[]).forEach(m=>{muscleCount[m]=(muscleCount[m]||0)+1;});}
      else if(a==="missed") missed++;
      else if(a==="rest") rest++;
    }
    const attendance=sessions+missed>0?Math.round(sessions/(sessions+missed)*100):0;
    let gymStreak=0,gymBest=0,gymBestStart=null,gymBestEnd=null,curGS=null;
    let missStreak=0,missBest=0,missBestStart=null,missBestEnd=null,curMS=null;
    for (let i=1;i<=days;i++) {
      const d=new Date(year,month,i); if(d>today()) break;
      const k=toKey(d); if(k<APP_START) continue;
      const a=logs[k]?.activity;
      if(a==="session"){if(!curGS)curGS=new Date(d);gymStreak++;if(gymStreak>gymBest){gymBest=gymStreak;gymBestStart=new Date(curGS);gymBestEnd=new Date(d);}missStreak=0;curMS=null;}
      else if(a==="missed"){if(!curMS)curMS=new Date(d);missStreak++;if(missStreak>missBest){missBest=missStreak;missBestStart=new Date(curMS);missBestEnd=new Date(d);}gymStreak=0;curGS=null;}
      else{gymStreak=0;missStreak=0;curGS=null;curMS=null;}
    }
    const wk=`${year}-${String(month+1).padStart(2,"0")}`; const w=weights[wk]||{};
    return {sessions,missed,rest,attendance,gymBest,gymBestStart,gymBestEnd,missBest,missBestStart,missBestEnd,muscleCount,startWeight:w.start||null,endWeight:w.end||null};
  };

  const getTotalCoinsEarned = () => Object.values(earnedBadges).reduce((sum,b) => sum+(b.totalCoins||0), 0);
  const getTotalCoinsSpent = () => redemptions.reduce((sum,r) => sum+r.coins, 0);
  const getAvailableCoins = () => Math.max(0, getTotalCoinsEarned()-getTotalCoinsSpent());
  const isRewardsUnlocked = () => toKey(today()) >= REWARDS_UNLOCK_DATE;
  const getDaysUntilRewards = () => Math.ceil((parseKey(REWARDS_UNLOCK_DATE)-today())/(1000*60*60*24));

  const isRewardRedeemed = (rewardId) => {
    const r = [...REWARDS,...customRewards].find(r=>r.id===rewardId);
    if (!r||r.repeatable) return false;
    return redemptions.some(red=>red.rewardId===rewardId);
  };

  const redeemReward = (reward) => {
    const newRedemptions=[...redemptions,{rewardId:reward.id,name:reward.name,coins:reward.coins,date:toKey(today())}];
    saveRedemptions(newRedemptions);
    setShowRedeemConfirm(null);
  };

  const checkMilestones = () => {
    const newBadges={...earnedBadges}; const newPopups=[];
    const streak=getCurrentStreak(); const totalSess=getTotalSessions();
    const muscleCount=getMuscleCount(); const restTotal=getRestDaysTotal();
    const perfectWeeks=getPerfectWeeksCount(); const consec4=getConsecutive4PlusWeeks();
    const multiMuscle=getMultiMuscleSessionCount(); const bestWeek=getBestWeek();
    const todayMonth={year:today().getFullYear(),month:today().getMonth()};
    const monthStats=getMonthStats(todayMonth.year,todayMonth.month);

    const award=(id,extraKey=null)=>{
      const key=extraKey||id; const m=MILESTONES.find(m=>m.id===id);
      if(!m||newBadges[key]) return;
      newBadges[key]={earnedDate:toKey(today()),coins:m.coins,totalCoins:m.coins};
      newPopups.push({...m,key});
    };

    const awardRepeatable=(id,contextKey)=>{
      const key=`${id}_${contextKey}`; const m=MILESTONES.find(m=>m.id===id);
      if(!m||newBadges[key]) return;
      newBadges[key]={earnedDate:toKey(today()),coins:m.coins,totalCoins:m.coins};
      newPopups.push({...m,key});
    };

    if(streak>=3) award("m1");
    if(streak>=7) award("m2");
    if(streak>=14) award("m3");
    if(streak>=21) award("m4");
    if(streak>=30) award("m5");
    if(streak>=60) award("m6");
    if(streak>=100) award("m7");
    if(totalSess>=50) award("m8");
    if(totalSess>=75) award("m9");
    if(totalSess>=100) award("m10");
    if(totalSess>=200) award("m11");
    if(totalSess>=300) award("m12");
    if(totalSess>=365) award("m13");
    if(perfectWeeks>=1) award("m14");
    if(perfectWeeks>=4) award("m15");
    if(perfectWeeks>=8) award("m16");
    if(consec4>=4) award("m17");
    if(bestWeek.count>0) awardRepeatable("m18",`${bestWeek.count}`);
    if(Object.keys(muscleCount).length>=9) award("m19");
    if(multiMuscle>=10) award("m20");
    const maxMuscle=Math.max(...Object.values(muscleCount),0);
    if(maxMuscle>=25) award("m21");
    if(maxMuscle>=50) award("m22");
    if((muscleCount["Legs"]||0)>=25) award("m23");
    if((muscleCount["Core"]||0)>=20) award("m24");

    // Show Up — 7 consecutive manually logged days (not auto-missed)
    let consec7=0; let d7=addDays(today(),-1);
    for(let i=0;i<7;i++){const a=logs[toKey(d7)]?.activity;if(a&&a!=="missed"){consec7++;d7=addDays(d7,-1);}else break;}
    if(consec7>=7) award("m25");

    if(Object.entries(logs).some(([k,v])=>k>=APP_START&&v.activity==="rest")) award("m26");

    // Never Miss a Day — 30 consecutive manually logged days
    let consec30=0; let d30=addDays(today(),-1);
    for(let i=0;i<30;i++){const a=logs[toKey(d30)]?.activity;if(a&&a!=="missed"){consec30++;d30=addDays(d30,-1);}else break;}
    if(consec30>=30) award("m27");

    if(restTotal>=10) award("m28");

    // Month badges — require at least 1 session
    if(monthStats.sessions>=1&&monthStats.missed<=4) awardRepeatable("m29",`${todayMonth.year}-${todayMonth.month}`);
    if(monthStats.sessions>=1&&monthStats.missed===0) awardRepeatable("m30",`${todayMonth.year}-${todayMonth.month}`);

    const perfectMonthCount=Object.keys(newBadges).filter(k=>k.startsWith("m30_")).length;
    if(perfectMonthCount>=3) award("m31");

    const todayKey=toKey(today());
    if(logs[todayKey]?.activity==="session"){
      let missRun=0; let dm=addDays(today(),-1);
      while(toKey(dm)>=APP_START){if(logs[toKey(dm)]?.activity==="missed"){missRun++;dm=addDays(dm,-1);}else break;}
      if(missRun>=7) awardRepeatable("m32",todayKey);
      if(missRun>=14) awardRepeatable("m33",todayKey);
    }

    // Monthly badges — require at least 1 session
    if(monthStats.sessions>=20) awardRepeatable("m34",`${todayMonth.year}-${todayMonth.month}`);
    if(monthStats.sessions>=25) awardRepeatable("m35",`${todayMonth.year}-${todayMonth.month}`);

    let months15=0;
    for(let i=0;i<12;i++){const d=new Date(today().getFullYear(),today().getMonth()-i,1);const ms=getMonthStats(d.getFullYear(),d.getMonth());if(ms.sessions>=15)months15++;}
    if(months15>=3) award("m36");

    if(monthStats.sessions>=1&&monthStats.attendance>=90) awardRepeatable("m37",`${todayMonth.year}-${todayMonth.month}`);

    let consec80=0;
    for(let i=0;i<12;i++){const d=new Date(today().getFullYear(),today().getMonth()-i,1);const ms=getMonthStats(d.getFullYear(),d.getMonth());if(ms.sessions>=1&&ms.attendance>=80)consec80++;else break;}
    if(consec80>=3) award("m38");

    if(newPopups.length>0){saveBadges(newBadges);setPendingPopups(prev=>[...prev,...newPopups]);}
  };

  useEffect(()=>{
    if(pendingPopups.length>0&&!showPopup){setShowPopup(pendingPopups[0]);setPendingPopups(prev=>prev.slice(1));}
  },[pendingPopups,showPopup]);

  const dismissPopup=()=>setShowPopup(null);

  const streakInfo=getStreakInfo();
  const longestStreak=getLongestStreak();
  const bestWeek=getBestWeek();
  const missedMonth=getMissedThisMonth();
  const totalSessions=getTotalSessions();
  const weekDays=getThisWeekDays();
  const monthReport=getMonthStats(insightMonth.year,insightMonth.month);
  const availableCoins=getAvailableCoins();
  const totalEarned=getTotalCoinsEarned();
  const totalSpent=getTotalCoinsSpent();

  const monthLabel=(y,m)=>new Date(y,m,1).toLocaleDateString("en-IN",{month:"long",year:"numeric"});

  const calDays=()=>{
    const {year,month}=calMonth; const first=new Date(year,month,1);
    const startDay=first.getDay()===0?6:first.getDay()-1;
    const cells=[]; for(let i=0;i<startDay;i++)cells.push(null);
    for(let i=1;i<=getDaysInMonth(year,month);i++)cells.push(i); return cells;
  };

  const activityColor=(a)=>{
    if(a==="session") return {bg:"#1D9E75",color:"#E1F5EE"};
    if(a==="missed")  return {bg:"#FCEBEB",color:"#A32D2D"};
    if(a==="rest")    return {bg:"#FAEEDA",color:"#633806"};
    return {bg:"#f7f7f7",color:"#aaa"};
  };

  const insightMonths=()=>{
    const months=[]; const t=today();
    for(let i=0;i<12;i++){const d=new Date(t.getFullYear(),t.getMonth()-i,1);months.push({year:d.getFullYear(),month:d.getMonth(),label:monthLabel(d.getFullYear(),d.getMonth())});}
    return months;
  };

  const wk=`${insightMonth.year}-${String(insightMonth.month+1).padStart(2,"0")}`;

  const saveWeight=()=>{
    const entry={};
    if(wtStart) entry.start=parseFloat(wtStart);
    if(wtEnd) entry.end=parseFloat(wtEnd);
    const newW={...weights,[wk]:{...(weights[wk]||{}),...entry}};
    saveWeights(newW); setWtStart(""); setWtEnd("");
  };

  const getWeightHistory=()=>Object.keys(weights).sort().reverse().map(k=>{
    const [y,m]=k.split("-").map(Number);
    const label=new Date(y,m-1,1).toLocaleDateString("en-IN",{month:"long",year:"numeric"});
    const w=weights[k]; const delta=w.start&&w.end?(w.end-w.start).toFixed(1):null;
    return {k,label,start:w.start,end:w.end,delta};
  });

  const getTotalWeightChange=()=>{
    const hist=getWeightHistory().reverse(); if(!hist.length) return null;
    const first=hist.find(h=>h.start); const last=[...hist].reverse().find(h=>h.end||h.start);
    if(!first) return null; const endVal=last?.end||last?.start; if(!endVal) return null;
    return (endVal-first.start).toFixed(1);
  };

  const getBadgeEarnedCount=()=>new Set(Object.keys(earnedBadges).map(k=>k.split("_")[0])).size;
  const getCatBadges=(cat)=>MILESTONES.filter(m=>cat==="All"||m.cat===cat);
  const isBadgeEarned=(id)=>Object.keys(earnedBadges).some(k=>k===id||k.startsWith(id+"_"));

  const getBadgeProgress=(m)=>{
    const totalSess=getTotalSessions(); const streak=getCurrentStreak(); const muscleCount=getMuscleCount();
    const map={
      m1:[streak,3],m2:[streak,7],m3:[streak,14],m4:[streak,21],m5:[streak,30],m6:[streak,60],m7:[streak,100],
      m8:[totalSess,50],m9:[totalSess,75],m10:[totalSess,100],m11:[totalSess,200],m12:[totalSess,300],m13:[totalSess,365],
      m14:[getPerfectWeeksCount(),1],m15:[getPerfectWeeksCount(),4],m16:[getPerfectWeeksCount(),8],m17:[getConsecutive4PlusWeeks(),4],
      m19:[Object.keys(muscleCount).length,9],m20:[getMultiMuscleSessionCount(),10],
      m21:[Math.max(...Object.values(muscleCount),0),25],m22:[Math.max(...Object.values(muscleCount),0),50],
      m23:[muscleCount["Legs"]||0,25],m24:[muscleCount["Core"]||0,20],m28:[getRestDaysTotal(),10],
    };
    return map[m.id]||null;
  };

  const CATS=["All","Streak","Sessions","Weekly","Muscle","Consistency","Monthly"];

  const s={
    app:{minHeight:"100vh",background:"#f0f0f0",display:"flex",justifyContent:"center",fontFamily:"system-ui, sans-serif"},
    phone:{width:"100%",maxWidth:420,minHeight:"100vh",background:"#fff",display:"flex",flexDirection:"column"},
    body:{flex:1,padding:"12px 16px 90px",overflowY:"auto",display:"flex",flexDirection:"column",gap:12},
    nav:{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:420,display:"flex",justifyContent:"space-around",padding:"6px 0 18px",background:"#fff",borderTop:"0.5px solid #e0e0e0",zIndex:10},
    ni:(a)=>({display:"flex",flexDirection:"column",alignItems:"center",gap:2,fontSize:10,color:a?"#0F6E56":"#999",cursor:"pointer",background:"none",border:"none",padding:"3px 8px"}),
    nd:(a)=>({width:24,height:4,borderRadius:2,background:a?"#1D9E75":"#eee"}),
    pg:{fontSize:18,fontWeight:500,color:"#111",marginBottom:2},
    sec:{fontSize:10,fontWeight:500,color:"#888",textTransform:"uppercase",letterSpacing:"0.05em"},
    card:{background:"#f7f7f7",borderRadius:12,padding:"10px 12px"},
    g2:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8},
    sv:{fontSize:22,fontWeight:500,color:"#111"},
    sl:{fontSize:11,color:"#888",marginBottom:2},
    ss:{fontSize:11,color:"#aaa"},
    gbtn:{background:"#1D9E75",color:"#fff",borderRadius:14,padding:"12px 16px",textAlign:"center",fontSize:15,fontWeight:500,cursor:"pointer",border:"none",width:"100%"},
    chip:(on)=>({padding:"5px 11px",borderRadius:20,fontSize:12,border:on?"none":"0.5px solid #ddd",color:on?"#fff":"#555",background:on?"#1D9E75":"#fff",cursor:"pointer"}),
    inp:{background:"#f7f7f7",borderRadius:8,padding:"8px 10px",fontSize:13,color:"#111",border:"0.5px solid #e0e0e0",width:"100%",boxSizing:"border-box"},
    overlay:{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:20,display:"flex",alignItems:"flex-end",justifyContent:"center"},
    modal:{background:"#fff",borderRadius:"20px 20px 0 0",padding:20,width:"100%",maxWidth:420,maxHeight:"90vh",overflowY:"auto"},
    mrow:{marginBottom:12},
    mlbl:{fontSize:12,color:"#888",marginBottom:4},
    sel:{width:"100%",background:"#f7f7f7",borderRadius:8,padding:"8px 10px",fontSize:13,color:"#111",border:"0.5px solid #e0e0e0"},
    tag:(c)=>({display:"inline-block",padding:"2px 8px",borderRadius:10,fontSize:11,fontWeight:500,background:c==="g"?"#E1F5EE":c==="r"?"#FCEBEB":"#FAEEDA",color:c==="g"?"#085041":c==="r"?"#791F1F":"#633806"}),
  };

  return (
    <div style={s.app}>
      <div style={s.phone}>
        <div style={s.nav}>
          {[["home","Home"],["calendar","Cal"],["insights","Insights"],["badges","Badges"],["rewards","Rewards"]].map(([t2,l])=>(
            <button key={t2} style={s.ni(tab===t2)} onClick={()=>setTab(t2)}>
              <div style={s.nd(tab===t2)}></div>{l}
            </button>
          ))}
        </div>

        {/* HOME */}
        {tab==="home"&&(
          <div style={s.body}>
            <div style={s.pg}>Good morning, Sayyam</div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
              <div style={{position:"relative",width:110,height:110}}>
                <svg width="110" height="110" style={{transform:"rotate(-90deg)"}}>
                  <circle cx="55" cy="55" r="46" fill="none" stroke={streakInfo.type==="missed"?"#FCEBEB":"#E1F5EE"} strokeWidth="8"/>
                  <circle cx="55" cy="55" r="46" fill="none" stroke={streakInfo.type==="missed"?"#E24B4A":"#1D9E75"} strokeWidth="8"
                    strokeDasharray={`${2*Math.PI*46}`}
                    strokeDashoffset={`${2*Math.PI*46*(1-Math.min((streakInfo.count||0)/30,1))}`}
                    strokeLinecap="round"/>
                </svg>
                <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                  <span style={{fontSize:28,fontWeight:500,color:streakInfo.type==="missed"?"#A32D2D":"#0F6E56",lineHeight:1}}>{streakInfo.count||0}</span>
                  <span style={{fontSize:10,color:streakInfo.type==="missed"?"#E24B4A":"#1D9E75"}}>{streakInfo.type==="missed"?"days missed":"day streak"}</span>
                </div>
              </div>
              <span style={{fontSize:11,color:"#aaa"}}>
                {streakInfo.type==="streak"?`${fmtShort(streakInfo.start)} – ${fmtShort(streakInfo.end)}`:streakInfo.lastSession?`Last session: ${fmtShort(streakInfo.lastSession)}`:"Starting 27 Mar 2026"}
              </span>
            </div>
            <button style={s.gbtn} onClick={()=>openModal(toKey(today()))}>Log today's activity</button>
            <div>
              <div style={s.sec}>This week</div>
              <div style={{display:"flex",gap:6,marginTop:8}}>
                {weekDays.map((w,i)=>{
                  const ac=activityColor(w.activity);
                  return(
                    <div key={i} onClick={()=>!w.beforeStart&&openModal(w.k)} style={{flex:1,height:42,borderRadius:8,background:w.beforeStart?"#fafafa":w.activity?ac.bg:w.isToday?"transparent":"#f7f7f7",border:w.isToday?"1.5px solid #1D9E75":"none",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:w.beforeStart?"default":"pointer",gap:2,opacity:w.beforeStart?0.3:1}}>
                      <span style={{fontSize:10,fontWeight:500,color:w.activity?ac.color:w.isToday?"#1D9E75":"#aaa"}}>{w.label}</span>
                      {w.activity&&<span style={{fontSize:8,color:ac.color}}>{w.activity==="session"?"gym":w.activity}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={s.g2}>
              <div style={s.card}><div style={s.sl}>Longest streak</div><div style={s.sv}>{longestStreak.count}</div><div style={s.ss}>{longestStreak.start&&longestStreak.end?`${fmtShort(longestStreak.start)} – ${fmtShort(longestStreak.end)}`:"—"}</div></div>
              <div style={s.card}><div style={s.sl}>Best week</div><div style={s.sv}>{bestWeek.count}</div><div style={s.ss}>{bestWeek.weekStart?`${fmtShort(bestWeek.weekStart)} – ${fmtShort(addDays(bestWeek.weekStart,6))}`:"—"}</div></div>
              <div style={s.card}><div style={s.sl}>Total sessions</div><div style={s.sv}>{totalSessions}</div><div style={s.ss}>all time</div></div>
              <div style={s.card}><div style={s.sl}>Days missed</div><div style={{...s.sv,color:missedMonth>0?"#E24B4A":"#111"}}>{missedMonth}</div><div style={s.ss}>this month</div></div>
            </div>
            <div style={{background:"#E1F5EE",borderRadius:12,padding:"10px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><div style={{fontSize:11,color:"#1D9E75"}}>Available coins</div><div style={{fontSize:20,fontWeight:500,color:"#0F6E56"}}>{availableCoins.toFixed(1)}</div></div>
              <div style={{textAlign:"right"}}><div style={{fontSize:11,color:"#1D9E75"}}>Badges earned</div><div style={{fontSize:20,fontWeight:500,color:"#0F6E56"}}>{getBadgeEarnedCount()}</div></div>
            </div>
          </div>
        )}

        {/* CALENDAR */}
        {tab==="calendar"&&(
          <div style={s.body}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <button style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:"#555"}} onClick={()=>setCalMonth(p=>{const d=new Date(p.year,p.month-1,1);return{year:d.getFullYear(),month:d.getMonth()};})}>‹</button>
              <div style={s.pg}>{monthLabel(calMonth.year,calMonth.month)}</div>
              <button style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:"#555"}} onClick={()=>setCalMonth(p=>{const d=new Date(p.year,p.month+1,1);return{year:d.getFullYear(),month:d.getMonth()};})}>›</button>
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {["gym","missed","rest"].map((l,i)=>{
                const c=i===0?"g":i===1?"r":"y"; let count=0;
                for(let d=1;d<=getDaysInMonth(calMonth.year,calMonth.month);d++){const k=toKey(new Date(calMonth.year,calMonth.month,d));if(k>=APP_START&&logs[k]?.activity===(l==="gym"?"session":l))count++;}
                return <span key={l} style={s.tag(c)}>{count} {l}</span>;
              })}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
              {["M","T","W","T","F","S","S"].map((d,i)=><div key={i} style={{textAlign:"center",fontSize:11,color:"#aaa",fontWeight:500,padding:"4px 0"}}>{d}</div>)}
              {calDays().map((day,i)=>{
                if(!day) return <div key={i}/>;
                const k=toKey(new Date(calMonth.year,calMonth.month,day));
                const beforeStart=k<APP_START; const a=beforeStart?null:logs[k]?.activity;
                const ac=activityColor(a); const isTod=k===toKey(today());
                return <div key={i} onClick={()=>!beforeStart&&openModal(k)} style={{aspectRatio:"1",borderRadius:6,background:beforeStart?"#fafafa":a?ac.bg:isTod?"transparent":"#f7f7f7",border:isTod?"1.5px solid #1D9E75":"none",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:beforeStart?"#ddd":a?ac.color:isTod?"#1D9E75":"#aaa",cursor:beforeStart?"default":"pointer",fontWeight:a==="session"?500:400}}>{day}</div>;
              })}
            </div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              {[["gym","#1D9E75",""],["missed","#FCEBEB","0.5px solid #E24B4A"],["rest","#FAEEDA",""]].map(([l,bg,border])=>(
                <div key={l} style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:10,height:10,borderRadius:2,background:bg,border}}></div><span style={{fontSize:11,color:"#888"}}>{l}</span></div>
              ))}
            </div>
          </div>
        )}

        {/* INSIGHTS */}
        {tab==="insights"&&(
          <div style={s.body}>
            <div style={s.pg}>Insights</div>
            <div>
              <div style={s.mlbl}>Select month</div>
              <select style={s.sel} value={`${insightMonth.year}-${insightMonth.month}`} onChange={e=>{const [y,m]=e.target.value.split("-");setInsightMonth({year:+y,month:+m});}}>
                {insightMonths().map(m=><option key={m.label} value={`${m.year}-${m.month}`}>{m.label}</option>)}
              </select>
            </div>
            <div style={s.g2}>
              <div style={s.card}><div style={s.sl}>Sessions</div><div style={s.sv}>{monthReport.sessions}</div></div>
              <div style={s.card}><div style={s.sl}>Missed</div><div style={{...s.sv,color:monthReport.missed>0?"#E24B4A":"#111"}}>{monthReport.missed}</div></div>
              <div style={s.card}><div style={s.sl}>Rest days</div><div style={{...s.sv,color:"#BA7517"}}>{monthReport.rest}</div></div>
              <div style={s.card}><div style={s.sl}>Attendance</div><div style={s.sv}>{monthReport.attendance}%</div></div>
            </div>
            <div style={s.g2}>
              <div style={s.card}><div style={s.sl}>Longest gym streak</div><div style={s.sv}>{monthReport.gymBest}</div><div style={s.ss}>{monthReport.gymBestStart&&monthReport.gymBestEnd?`${fmtShort(monthReport.gymBestStart)} – ${fmtShort(monthReport.gymBestEnd)}`:"—"}</div></div>
              <div style={s.card}><div style={s.sl}>Longest miss streak</div><div style={{...s.sv,color:monthReport.missBest>0?"#E24B4A":"#111"}}>{monthReport.missBest}</div><div style={s.ss}>{monthReport.missBestStart&&monthReport.missBestEnd?`${fmtShort(monthReport.missBestStart)} – ${fmtShort(monthReport.missBestEnd)}`:"—"}</div></div>
            </div>
            <div>
              <div style={s.sec}>Muscle breakdown</div>
              <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:6}}>
                {Object.entries(monthReport.muscleCount).sort((a,b)=>b[1]-a[1]).map(([m,c])=>(
                  <div key={m} style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:12,color:"#555",width:75}}>{m}</span>
                    <div style={{flex:1,height:6,background:"#f0f0f0",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",background:"#1D9E75",borderRadius:3,width:`${monthReport.sessions>0?Math.round(c/monthReport.sessions*100):0}%`}}></div></div>
                    <span style={{fontSize:11,color:"#aaa",width:20,textAlign:"right"}}>{c}</span>
                  </div>
                ))}
                {Object.keys(monthReport.muscleCount).length===0&&<span style={{fontSize:12,color:"#aaa"}}>No sessions logged this month</span>}
              </div>
            </div>
            {(monthReport.startWeight||monthReport.endWeight)&&(
              <div style={s.card}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={s.sl}>Start weight</span><span style={{fontSize:13,fontWeight:500,color:"#111"}}>{monthReport.startWeight?`${monthReport.startWeight} kg`:"—"}</span></div>
                <div style={{display:"flex",justifyContent:"space-between"}}><span style={s.sl}>End weight</span><span style={{fontSize:13,fontWeight:500,color:"#1D9E75"}}>{monthReport.endWeight?`${monthReport.endWeight} kg`:"—"}{monthReport.startWeight&&monthReport.endWeight?` (${(monthReport.endWeight-monthReport.startWeight).toFixed(1)} kg)`:""}</span></div>
              </div>
            )}
          </div>
        )}

        {/* BADGES */}
        {tab==="badges"&&(
          <div style={s.body}>
            <div style={s.pg}>Badges</div>
            <div style={{background:"#E1F5EE",borderRadius:12,padding:"10px 12px",display:"flex",justifyContent:"space-between"}}>
              <div><div style={{fontSize:11,color:"#1D9E75"}}>Available coins</div><div style={{fontSize:22,fontWeight:500,color:"#0F6E56"}}>{availableCoins.toFixed(1)}</div></div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:11,color:"#1D9E75"}}>Total earned</div>
                <div style={{fontSize:14,fontWeight:500,color:"#0F6E56"}}>{totalEarned.toFixed(1)}</div>
                <div style={{fontSize:10,color:"#1D9E75"}}>Spent: {totalSpent.toFixed(1)}</div>
              </div>
            </div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {CATS.map(c=>(
                <button key={c} onClick={()=>setBadgeFilter(c)} style={{padding:"4px 10px",borderRadius:20,fontSize:11,border:"0.5px solid #ddd",color:badgeFilter===c?"#fff":"#555",background:badgeFilter===c?"#1D9E75":"#fff",cursor:"pointer"}}>{c}</button>
              ))}
            </div>
            {["Earned","Locked"].map(section=>{
              const badges=getCatBadges(badgeFilter).filter(m=>section==="Earned"?isBadgeEarned(m.id):!isBadgeEarned(m.id));
              if(!badges.length) return null;
              return(
                <div key={section}>
                  <div style={s.sec}>{section}</div>
                  {badges.map(m=>{
                    const earned=isBadgeEarned(m.id);
                    const progress=!earned?getBadgeProgress(m):null;
                    const earnedEntry=Object.entries(earnedBadges).find(([k])=>k===m.id||k.startsWith(m.id+"_"));
                    return(
                      <div key={m.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"0.5px solid #f0f0f0"}}>
                        <div style={{width:44,height:44,borderRadius:"50%",background:earned?"#E1F5EE":"#f0f0f0",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          <svg width="20" height="20" viewBox="0 0 20 20">
                            {earned?<><circle cx="10" cy="10" r="8" fill="#1D9E75"/><path d="M6 10l3 3 5-5" stroke="#E1F5EE" strokeWidth="2" fill="none" strokeLinecap="round"/></>:<><circle cx="10" cy="10" r="8" fill="#e0e0e0"/><rect x="7" y="9" width="6" height="5" rx="1" fill="#aaa"/><path d="M8 9V7a2 2 0 014 0v2" stroke="#aaa" strokeWidth="1.5" fill="none"/></>}
                          </svg>
                        </div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:13,fontWeight:500,color:earned?"#111":"#888"}}>{m.name}</div>
                          <div style={{fontSize:11,color:"#aaa"}}>{earned?(earnedEntry?`Earned ${earnedEntry[1].earnedDate}`:""):m.desc}</div>
                          {progress&&(
                            <div style={{marginTop:4}}>
                              <div style={{height:4,background:"#f0f0f0",borderRadius:2,overflow:"hidden",width:"80%"}}><div style={{height:"100%",background:"#1D9E75",borderRadius:2,width:`${Math.min(Math.round(progress[0]/progress[1]*100),100)}%`}}></div></div>
                              <div style={{fontSize:9,color:"#aaa",marginTop:2}}>{progress[0]} / {progress[1]}</div>
                            </div>
                          )}
                        </div>
                        <span style={{fontSize:11,fontWeight:500,padding:"2px 8px",borderRadius:10,background:earned?"#E1F5EE":"#f0f0f0",color:earned?"#0F6E56":"#aaa",whiteSpace:"nowrap"}}>{earned?"+":""}{m.coins}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* REWARDS */}
        {tab==="rewards"&&(
          <div style={s.body}>
            <div style={s.pg}>Rewards</div>
            <div style={{background:"#E1F5EE",borderRadius:12,padding:"10px 12px"}}>
              <div style={{fontSize:11,color:"#1D9E75"}}>Available to spend</div>
              <div style={{fontSize:22,fontWeight:500,color:"#0F6E56"}}>{availableCoins.toFixed(1)} coins</div>
            </div>
            {!isRewardsUnlocked()&&(
              <div style={{background:"#FAEEDA",borderRadius:12,padding:"12px",textAlign:"center"}}>
                <div style={{fontSize:13,fontWeight:500,color:"#633806"}}>Rewards unlock on 1 Jun 2026</div>
                <div style={{fontSize:22,fontWeight:500,color:"#BA7517",marginTop:4}}>{getDaysUntilRewards()} days to go</div>
                <div style={{fontSize:11,color:"#854F0B",marginTop:2}}>Keep earning coins in the meantime</div>
              </div>
            )}
            {[1,2,3].map(tier=>{
              const tierCosts={1:[10,12,15],2:[18],3:[30,45,55]};
              const tierRewards=REWARDS.filter(r=>tierCosts[tier]?.includes(r.coins));
              if(!tierRewards.length) return null;
              const tierColors={1:["#E1F5EE","#085041"],2:["#FAEEDA","#633806"],3:["#FCEBEB","#791F1F"]};
              return(
                <div key={tier}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                    <span style={{fontSize:10,fontWeight:500,padding:"2px 8px",borderRadius:8,background:tierColors[tier][0],color:tierColors[tier][1]}}>Tier {tier}</span>
                  </div>
                  {tierRewards.map(r=>{
                    const redeemed=isRewardRedeemed(r.id);
                    const canAfford=availableCoins>=r.coins;
                    const unlocked=isRewardsUnlocked();
                    const redemptionRecord=redemptions.find(red=>red.rewardId===r.id);
                    return(
                      <div key={r.id} style={{background:"#fff",border:"0.5px solid #e0e0e0",borderRadius:12,padding:"10px 12px",display:"flex",alignItems:"center",gap:10,marginBottom:8,opacity:redeemed?0.45:1}}>
                        <div style={{flex:1}}>
                          <div style={{fontSize:13,fontWeight:500,color:redeemed?"#888":"#111"}}>{r.name}</div>
                          <div style={{fontSize:11,color:"#aaa",marginTop:1}}>{r.coins} coins · {r.repeatable?"repeatable":"one-time"}{redemptionRecord?` · redeemed ${redemptionRecord.date}`:""}</div>
                        </div>
                        {redeemed?(<div style={{fontSize:11,color:"#aaa",background:"#f7f7f7",padding:"5px 10px",borderRadius:8}}>Redeemed</div>)
                        :!unlocked?(<div style={{fontSize:11,color:"#BA7517",background:"#FAEEDA",padding:"5px 10px",borderRadius:8,whiteSpace:"nowrap"}}>Locked</div>)
                        :canAfford?(<button onClick={()=>setShowRedeemConfirm(r)} style={{background:"#1D9E75",color:"#fff",border:"none",borderRadius:8,padding:"6px 12px",fontSize:12,fontWeight:500,cursor:"pointer",whiteSpace:"nowrap"}}>Redeem</button>)
                        :(<div style={{fontSize:11,color:"#aaa",background:"#f7f7f7",padding:"5px 10px",borderRadius:8,whiteSpace:"nowrap"}}>Need {r.coins}</div>)}
                      </div>
                    );
                  })}
                </div>
              );
            })}

            <button onClick={()=>setShowAddReward(true)} style={{width:"100%",background:"none",border:"1px dashed #1D9E75",borderRadius:12,padding:"10px",fontSize:13,color:"#1D9E75",cursor:"pointer",marginTop:4}}>+ Add custom reward</button>

            {customRewards.length>0&&(
              <div>
                <div style={s.sec}>My custom rewards</div>
                {customRewards.map((r,i)=>{
                  const redeemed=!r.repeatable&&redemptions.some(red=>red.rewardId===r.id);
                  const canAfford=availableCoins>=r.coins;
                  const unlocked=isRewardsUnlocked();
                  const redemptionRecord=redemptions.find(red=>red.rewardId===r.id);
                  return(
                    <div key={r.id} style={{background:"#fff",border:"0.5px solid #e0e0e0",borderRadius:12,padding:"10px 12px",display:"flex",alignItems:"center",gap:10,marginBottom:8,opacity:redeemed?0.45:1}}>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:500,color:redeemed?"#888":"#111"}}>{r.name}</div>
                        <div style={{fontSize:11,color:"#aaa",marginTop:1}}>{r.coins} coins · {r.repeatable?"repeatable":"one-time"}{redemptionRecord?` · redeemed ${redemptionRecord.date}`:""}</div>
                      </div>
                      <button onClick={()=>{const updated=customRewards.filter((_,idx)=>idx!==i);saveCustomRewards(updated);}} style={{fontSize:11,color:"#E24B4A",background:"none",border:"none",cursor:"pointer",padding:"4px",marginRight:4}}>✕</button>
                      {redeemed?(<div style={{fontSize:11,color:"#aaa",background:"#f7f7f7",padding:"5px 10px",borderRadius:8}}>Redeemed</div>)
                      :!unlocked?(<div style={{fontSize:11,color:"#BA7517",background:"#FAEEDA",padding:"5px 10px",borderRadius:8,whiteSpace:"nowrap"}}>Locked</div>)
                      :canAfford?(<button onClick={()=>setShowRedeemConfirm(r)} style={{background:"#1D9E75",color:"#fff",border:"none",borderRadius:8,padding:"6px 12px",fontSize:12,fontWeight:500,cursor:"pointer",whiteSpace:"nowrap"}}>Redeem</button>)
                      :(<div style={{fontSize:11,color:"#aaa",background:"#f7f7f7",padding:"5px 10px",borderRadius:8,whiteSpace:"nowrap"}}>Need {r.coins}</div>)}
                    </div>
                  );
                })}
              </div>
            )}

            {redemptions.length>0&&(
              <div>
                <div style={s.sec}>Redemption history</div>
                {[...redemptions].reverse().map((r,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"0.5px solid #f0f0f0"}}>
                    <span style={{fontSize:12,color:"#111"}}>{r.name}</span>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:12,color:"#E24B4A"}}>–{r.coins} coins</div>
                      <div style={{fontSize:10,color:"#aaa"}}>{r.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* LOG MODAL */}
        {showModal&&(
          <div style={s.overlay} onClick={e=>{if(e.target===e.currentTarget)setShowModal(false);}}>
            <div style={s.modal}>
              <div style={{fontSize:16,fontWeight:500,color:"#111",marginBottom:16}}>Log activity</div>
              <div style={s.mrow}><div style={s.mlbl}>Date</div><input type="date" style={s.inp} value={modalDate} min={APP_START} max={toKey(today())} onChange={e=>setModalDate(e.target.value)}/></div>
              <div style={s.mrow}>
                <div style={s.mlbl}>Activity</div>
                <select style={{...s.sel,background:modalActivity==="session"?"#E1F5EE":"#f7f7f7",color:modalActivity==="session"?"#085041":"#111",borderColor:modalActivity==="session"?"#1D9E75":"#e0e0e0"}} value={modalActivity} onChange={e=>setModalActivity(e.target.value)}>
                  <option value="session">Session done</option>
                  <option value="missed">Missed</option>
                  <option value="rest">Rest day</option>
                </select>
              </div>
              {modalActivity==="session"&&(
                <>
                  <div style={s.mrow}>
                    <div style={s.mlbl}>Muscles trained</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:2}}>
                      {MUSCLES.map(m=><button key={m} style={s.chip(modalMuscles.includes(m))} onClick={()=>toggleMuscle(m)}>{m}</button>)}
                    </div>
                  </div>
                  <div style={s.mrow}>
                    <div style={s.mlbl}>Note (optional)</div>
                    <textarea style={{...s.inp,minHeight:60,resize:"vertical"}} placeholder="How did it go?" value={modalNote} onChange={e=>setModalNote(e.target.value)}/>
                  </div>
                </>
              )}
              <button style={s.gbtn} onClick={saveLog}>Save</button>
            </div>
          </div>
        )}

        {/* MILESTONE POPUP */}
        {showPopup&&(
          <div style={{...s.overlay,alignItems:"center",padding:20}}>
            <div style={{background:"#fff",borderRadius:20,padding:24,width:"100%",maxWidth:380,textAlign:"center"}}>
              <div style={{width:72,height:72,borderRadius:"50%",background:"#E1F5EE",border:"3px solid #1D9E75",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <path d="M16 4c0 6-6 8-6 12h12c0-4-6-6-6-12z" fill="#1D9E75"/>
                  <rect x="10" y="22" width="12" height="3" rx="1.5" fill="#1D9E75"/>
                  <rect x="12" y="26" width="8" height="2" rx="1" fill="#0F6E56"/>
                </svg>
              </div>
              <div style={{fontSize:11,fontWeight:500,color:"#1D9E75",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4}}>Badge unlocked</div>
              <div style={{fontSize:22,fontWeight:500,color:"#111",marginBottom:6}}>{showPopup.name}</div>
              <div style={{fontSize:13,color:"#888",marginBottom:16}}>{showPopup.desc}</div>
              <div style={{background:"#E1F5EE",borderRadius:10,padding:12,marginBottom:16}}>
                <div style={{fontSize:11,color:"#1D9E75",marginBottom:2}}>Coins earned</div>
                <div style={{fontSize:28,fontWeight:500,color:"#0F6E56"}}>+{showPopup.coins}</div>
                <div style={{fontSize:11,color:"#1D9E75"}}>New balance: {availableCoins.toFixed(1)}</div>
              </div>
              <button style={s.gbtn} onClick={dismissPopup}>Claim it</button>
              {pendingPopups.length>0&&<div style={{fontSize:11,color:"#aaa",marginTop:8}}>{pendingPopups.length} more badge{pendingPopups.length>1?"s":""} waiting</div>}
            </div>
          </div>
        )}

        {/* REDEEM CONFIRMATION */}
        {showRedeemConfirm&&(
          <div style={{...s.overlay,alignItems:"center",padding:20}}>
            <div style={{background:"#fff",borderRadius:20,padding:24,width:"100%",maxWidth:380,textAlign:"center"}}>
              <div style={{width:60,height:60,borderRadius:"50%",background:"#FAEEDA",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}>
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="10" stroke="#BA7517" strokeWidth="2"/><path d="M14 8v6l4 2" stroke="#BA7517" strokeWidth="2" strokeLinecap="round"/></svg>
              </div>
              <div style={{fontSize:17,fontWeight:500,color:"#111",marginBottom:6}}>Redeem {showRedeemConfirm.name}?</div>
              <div style={{fontSize:12,color:"#888",marginBottom:16}}>This will deduct {showRedeemConfirm.coins} coins. You've earned this — go get it.</div>
              <div style={{background:"#f7f7f7",borderRadius:10,padding:12,marginBottom:16,display:"flex",justifyContent:"space-between"}}>
                <div style={{textAlign:"left"}}><div style={{fontSize:10,color:"#888"}}>Current balance</div><div style={{fontSize:15,fontWeight:500,color:"#0F6E56"}}>{availableCoins.toFixed(1)}</div></div>
                <div style={{textAlign:"right"}}><div style={{fontSize:10,color:"#888"}}>After redemption</div><div style={{fontSize:15,fontWeight:500,color:"#E24B4A"}}>{Math.max(0,availableCoins-showRedeemConfirm.coins).toFixed(1)}</div></div>
              </div>
              <button style={{...s.gbtn,marginBottom:8}} onClick={()=>redeemReward(showRedeemConfirm)}>Yes, redeem</button>
              <button style={{width:"100%",background:"none",color:"#888",border:"0.5px solid #ddd",borderRadius:14,padding:"12px",fontSize:14,cursor:"pointer"}} onClick={()=>setShowRedeemConfirm(null)}>Cancel</button>
            </div>
          </div>
        )}

        {/* ADD CUSTOM REWARD MODAL */}
        {showAddReward&&(
          <div style={{...s.overlay,alignItems:"center",padding:20}}>
            <div style={{background:"#fff",borderRadius:20,padding:24,width:"100%",maxWidth:380}}>
              <div style={{fontSize:16,fontWeight:500,color:"#111",marginBottom:16}}>Add custom reward</div>
              <div style={s.mrow}>
                <div style={s.mlbl}>Reward name</div>
                <input style={s.inp} placeholder="e.g. New headphones" value={newRewardName} onChange={e=>setNewRewardName(e.target.value)}/>
              </div>
              <div style={s.mrow}>
                <div style={s.mlbl}>Cost (coins)</div>
                <input style={s.inp} type="number" placeholder="e.g. 20" value={newRewardCoins} onChange={e=>setNewRewardCoins(e.target.value)}/>
              </div>
              <div style={{...s.mrow,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div style={s.mlbl}>Repeatable?</div>
                <button onClick={()=>setNewRewardRepeatable(p=>!p)} style={{padding:"5px 14px",borderRadius:20,fontSize:12,border:"none",background:newRewardRepeatable?"#1D9E75":"#f0f0f0",color:newRewardRepeatable?"#fff":"#888",cursor:"pointer"}}>{newRewardRepeatable?"Yes":"No"}</button>
              </div>
              <button style={{...s.gbtn,marginBottom:8}} onClick={()=>{
                if(!newRewardName||!newRewardCoins) return;
                const newR={id:`cr_${Date.now()}`,name:newRewardName,coins:parseFloat(newRewardCoins),repeatable:newRewardRepeatable};
                saveCustomRewards([...customRewards,newR]);
                setNewRewardName("");setNewRewardCoins("");setNewRewardRepeatable(false);
                setShowAddReward(false);
              }}>Save reward</button>
              <button style={{width:"100%",background:"none",color:"#888",border:"0.5px solid #ddd",borderRadius:14,padding:"12px",fontSize:14,cursor:"pointer"}} onClick={()=>setShowAddReward(false)}>Cancel</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
