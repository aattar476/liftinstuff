// ============================================================
// HOME: week banner, timeline, today's sessions, week grid
// + session preview, program settings, next cycle, repeat week
// ============================================================

async function saveProgram(){await dbPut('settings',JSON.parse(JSON.stringify(state.program)));backupToFirebase()}

const DOW=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const weekColor=w=>w.kind==='deload'?'var(--walk)':w.kind==='trip'?'var(--hike)':'var(--lower)';

function todaysLogged(sessionId,date){
  const k=dayKey(date||new Date());
  return state.workouts.find(w=>w.program&&w.program.sessionId===sessionId&&dayKey(new Date(w.startTime))===k);
}

function renderHome(){
  const cfg=state.program,today=new Date(),plan=todayPlan(today,cfg);
  const curIdx=plan.week?plan.week.idx:-1;
  const selIdx=state.homeWeekIdx!=null?state.homeWeekIdx:Math.max(0,curIdx);
  const sel=weekAt(selIdx,cfg);
  const banners=renderHomeBanners(plan);

  const track=timelineWeeks(cfg,today).map(w=>`<button class="tl-week ${w.idx===curIdx?'is-now':''}" style="--c:${weekColor(w)}" aria-pressed="${w.idx===selIdx}" onclick="selectHomeWeek(${w.idx})">
      <span class="wk">${w.label}</span><span class="dt num">${w.dates}</span>${w.idx===curIdx?'<span class="now">This week</span>':''}</button>`).join('');

  const head=plan.before
    ?`<div class="sel-banner"><strong>Starts ${fmtDate(cfg.startDate+'T12:00')}</strong><span class="focus">${plan.daysUntil} day${plan.daysUntil===1?'':'s'} to go. Set your working weights in More → Program.</span></div>`
    :`<div class="sel-banner"><strong>${sel.label}</strong><span class="num">${sel.dates}</span><span class="focus">${sel.focus}</span>${selIdx!==curIdx?`<button class="link" onclick="selectHomeWeek(null)">Back to this week</button>`:''}</div>`;

  const todayCards=plan.before?'':`<section class="today">
      <div class="sec-head"><h2>Today</h2><span class="eyebrow">${DOW[plan.dow]} · ${today.toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span></div>
      ${renderTodayCard('AM',plan.am,plan.week)}
      ${renderTodayCard('PM',plan.pm,plan.week)}
    </section>`;

  const grid=weekLayout(sel).map((d,i)=>{
    const isToday=sel.idx===curIdx&&i===plan.dow;
    return `<div class="day ${isToday?'is-today':''}"><div class="day-h">${DOW[i]}<small class="num">${addDays(parseDay(sel.start),i).getDate()}</small></div>
      <div class="slot"><span class="when">AM</span>${chip(d.am,sel,i)}</div>
      <div class="slot"><span class="when">PM</span>${chip(d.pm,sel,i)}</div></div>`;
  }).join('');

  return `<div class="home">
    ${banners}
    <section class="timeline" aria-label="Program timeline">
      ${head}
      <div class="tl-track">${track}</div>
    </section>
    ${todayCards}
    <section>
      <div class="sec-head"><h2>${sel.idx===curIdx?'This week':sel.label}</h2>
        <div class="legend"><span><i class="sw" style="background:var(--kb)"></i>KB</span><span><i class="sw" style="background:var(--lower)"></i>Lower</span><span><i class="sw" style="background:var(--upper)"></i>Upper</span><span><i class="sw" style="background:var(--hike)"></i>Hike</span><span><i class="sw" style="background:var(--walk)"></i>Walk</span></div></div>
      <div class="week">${grid}</div>
      ${sel.idx===curIdx&&sel.kind!=='trip'?`<button class="btn btn-ghost mt-8" onclick="state._sheet='repeat';render()">Missed reps? Repeat this week</button>`:''}
    </section>
    ${state._sheet==='repeat'?renderRepeatSheet():''}
  </div>`;
}

function renderHomeBanners(plan){
  const out=[];
  if(state.session)out.push(`<div class="banner accent"><span><b>${esc(state.session.name)}</b> is in progress.</span><button class="btn btn-sm" onclick="resumeSession()">Resume</button></div>`);
  if(state.pendingBackup)out.push(`<div class="banner"><span>The update saved a backup of your old data on this phone.</span><div class="banner-act"><button class="btn btn-sm" onclick="downloadPendingBackup()">Download it</button><button class="btn btn-sm btn-ghost" onclick="dismissPendingBackup()">Dismiss</button></div></div>`);
  if(plan.week&&needsNextCycle(plan.week,state.program))out.push(`<div class="banner accent"><span>Cycle ${plan.week.cyc} starts this week. Load the heavier weights.</span><button class="btn btn-sm" onclick="openNextCycle()">Start next cycle</button></div>`);
  const W=state.program.W;
  if(!W.squat||!W.bench||!W.deadlift||!W.ohp)out.push(`<div class="banner"><span>Set your working weight (W) for each main lift so sets come prefilled.</span><button class="btn btn-sm" onclick="openProgramSettings()">Set weights</button></div>`);
  if(exportOverdue())out.push(`<div class="banner"><span>${state.lastExport?'Last export was '+daysSince(state.lastExport)+' days ago':'You haven’t exported a backup yet'}. iPhones can wipe app data that sits unopened for a week.</span><button class="btn btn-sm" onclick="exportData()">Export now</button></div>`);
  return out.length?`<div class="banners">${out.join('')}</div>`:'';
}

function chip(id,w,dow){
  if(!id)return '<span class="chip none">—</span>';
  if(id==='rest')return '<span class="chip" style="--c:var(--walk)"><b>Rest</b></span>';
  const m=SESSION_META[id],sess=buildSessionFor(id,w);
  const sub=w.kind==='deload'&&m.gym?m.sub+' · 2 sets':id==='fullSS'&&sess.steps[1]?sess.steps[1].every+' s swings':m.sub;
  return `<button class="chip" style="--c:${CAT_COLOR[m.cat]}" onclick="openPreview('${id}',${w.idx})"><b>${m.name}</b><i>${esc(sub)}</i></button>`;
}

function renderTodayCard(slot,id,w){
  if(!id)return '';
  if(id==='rest')return `<article class="card today-card muted-card" style="--c:var(--walk)"><div class="card-h"><span class="tag">${slot}</span></div><h3>Rest</h3><p class="muted">Nothing planned. Recover.</p></article>`;
  const sess=buildSessionFor(id,w),done=todaysLogged(id);
  if(sess.taper)return '';
  const lines=sess.steps.filter(s=>s.kind!=='block'||!sess.gym).slice(0,sess.gym?5:4).map(s=>`<li><span>${esc(s.title)}</span><span class="num">${esc(s.rx)}</span></li>`).join('');
  const strip=sess.gym?renderStrip(sess):'';
  const inProgress=state.session&&state.session.program&&state.session.program.sessionId===id;
  return `<article class="card today-card" style="--c:${CAT_COLOR[sess.cat]}">
    <div class="card-h"><span class="tag">${slot} · ${esc(sess.sub)}</span><span class="total">≈ <b>${sess.estMin.total} min</b></span></div>
    <h3>${esc(sess.name)}</h3>
    ${strip}
    <ul class="rx-list">${lines}</ul>
    ${done?`<div class="done-note">Done · ${fmtDuration(done.durationSec||0)} · <button class="link" onclick="viewWorkout('${done.id}')">view</button></div>`
      :inProgress?`<button class="btn btn-big" onclick="resumeSession()">Resume</button>`
      :`<button class="btn btn-big" onclick="startProgramSession('${id}')">Start ${esc(sess.name)}</button>`}
  </article>`;
}

function renderStrip(sess){
  const e=sess.estMin,tot=Math.max(1,e.mob+e.lift+e.cardio),pct=v=>(v/tot*100).toFixed(1)+'%';
  return `<div class="strip" role="img" aria-label="Mobility ${e.mob} min, lifting ${e.lift} min, walk ${e.cardio} min">
    <div class="mob" style="width:${pct(e.mob)}">Mob ${e.mob}</div><div class="lift" style="width:${pct(e.lift)}">Lift ${e.lift}</div><div class="cardio" style="width:${pct(e.cardio)}">Walk ${e.cardio}</div></div>`;
}

function selectHomeWeek(idx){state.homeWeekIdx=idx;render()}
function resumeSession(){state.subPage=state.session.kind==='program'?'run':'active-workout';render()}

// ---- session preview ----
function openPreview(id,weekIdx){state._preview={id,weekIdx};state.subPage='preview';render()}
function renderPreview(){
  const {id,weekIdx}=state._preview,w=weekAt(weekIdx,state.program),sess=buildSessionFor(id,w);
  if(sess.taper)return `<div class="card" style="--c:${CAT_COLOR[sess.cat]}"><h3>${sess.name}</h3><p class="taper">Taper week. No lifting: 20 min of mobility and an easy walk, then go ride.</p></div>`;
  const rows=sess.steps.map(s=>`<tr><td><span class="ex">${esc(s.title)}</span>${s.exs[0].cue?`<span class="note">${esc(s.exs.map(e=>e.cue).join(' '))}</span>`:''}</td><td class="rx">${esc(s.rx)}</td></tr>`).join('');
  return `<article class="card" style="--c:${CAT_COLOR[sess.cat]}">
    <div class="card-h"><h3>${esc(sess.name)}</h3><span class="tag">${esc(w.label)} · ${esc(sess.sub)}</span></div>
    <div class="total">About <b>${sess.estMin.total} min</b></div>
    ${sess.gym?renderStrip(sess):''}
    <div class="scroll"><table class="sets"><thead><tr><th>Exercise</th><th>Prescription</th></tr></thead><tbody>${rows}</tbody></table></div>
    ${sess.gym?`<div class="rule">Rest ${restSec(w)} s between sets this week.</div>`:''}
  </article>
  <button class="btn btn-big mt-12" onclick="state.subPage=null;startProgramSession('${id}',${weekIdx})">${state.session?'Resume current session':'Start this session now'}</button>`;
}

// ---- repeat week ----
function renderRepeatSheet(){
  const w=weekForDate(new Date(),state.program);
  return `<div class="modal-overlay" onclick="if(event.target===this){state._sheet=null;render()}"><div class="modal" role="dialog" aria-label="Repeat this week">
    <div class="modal-title">Repeat ${w.label}?</div>
    <p class="muted mb-12">The whole calendar slides back one week: next week runs ${w.label} again with the same weights, and every later week (including the deload and trip weeks) moves a week later.</p>
    <button class="btn btn-big mb-8" onclick="repeatThisWeek()">Repeat this week</button>
    <button class="btn btn-outline" onclick="state._sheet=null;render()">Cancel</button>
  </div></div>`;
}
async function repeatThisWeek(){
  state.program.offsetWeeks=(state.program.offsetWeeks||0)+1;
  await saveProgram();state._sheet=null;state.homeWeekIdx=null;
  toast('Calendar pushed back one week');render();
}

// ---- next cycle ----
function openNextCycle(){state._cycleDraft=nextCycleProposal(state.program);state.subPage='next-cycle';render()}
function renderNextCycle(){
  const d=state._cycleDraft,cur=state.program;
  const field=(label,path,val,unit,was)=>`<label class="field"><span>${label}</span><span class="field-in"><input type="number" inputmode="decimal" data-sid="nc-${path}" value="${val}" onchange="setDraft('${path}',this.value)"><span class="unit">${unit}</span></span>${was!=null?`<small class="muted num">was ${was}</small>`:''}</label>`;
  return `<p class="muted mb-12">Cycle ${d.cycle}. These are last cycle's numbers plus the standard jumps (squat and deadlift +10 lb, bench and OHP +5 lb, bell +4 kg, vest +5 lb). Accessories that hit the top of their rep range get +5 lb. Change anything before confirming.</p>
    <div class="card"><h3>Main lifts (W)</h3>
      ${field('Squat','W.squat',d.W.squat,'lb',cur.W.squat)}${field('Bench','W.bench',d.W.bench,'lb',cur.W.bench)}
      ${field('Deadlift','W.deadlift',d.W.deadlift,'lb',cur.W.deadlift)}${field('Overhead press','W.ohp',d.W.ohp,'lb',cur.W.ohp)}</div>
    <div class="card"><h3>Kettlebell + vest</h3>${field('Kettlebell','kbKg',d.kbKg,'kg',cur.kbKg)}${field('Vest','vestLb',d.vestLb,'lb',cur.vestLb)}</div>
    <div class="card"><h3>Accessories</h3>${Object.entries(ACCESSORIES).map(([k,l])=>field(l+(cur.accReady[k]?' <span class="badge">+5</span>':''),'acc.'+k,d.acc[k],'lb',cur.acc[k])).join('')}</div>
    <button class="btn btn-big" onclick="confirmNextCycle()">Start cycle ${d.cycle}</button>`;
}
function setDraft(path,v){const [a,b]=path.split('.');if(b)state._cycleDraft[a][b]=parseFloat(v)||0;else state._cycleDraft[a]=parseFloat(v)||0}
async function confirmNextCycle(){
  const d=state._cycleDraft,p=state.program;
  p.cycleHistory=[...(p.cycleHistory||[]),{cycle:p.cycleStarted,W:{...p.W},acc:{...p.acc},kbKg:p.kbKg,vestLb:p.vestLb,endedAt:new Date().toISOString()}];
  Object.assign(p,{cycleStarted:d.cycle,W:{...d.W},acc:{...d.acc},kbKg:d.kbKg,vestLb:d.vestLb,accReady:{}});
  await saveProgram();state._cycleDraft=null;state.subPage=null;
  toast('Cycle '+d.cycle+' loaded');render();
}

// ---- program settings ----
function openProgramSettings(){state.subPage='program';render()}
function renderProgramSettings(){
  const p=state.program,w=weekForDate(new Date(),p);
  const num=(label,path,val,unit)=>`<label class="field"><span>${label}</span><span class="field-in"><input type="number" inputmode="decimal" data-sid="ps-${path}" value="${val||0}" onchange="setProgramField('${path}',this.value)"><span class="unit">${unit}</span></span></label>`;
  return `<div class="card"><h3>Calendar</h3>
      <label class="field"><span>Program start (a Monday)</span><span class="field-in"><input type="date" data-sid="ps-start" value="${p.startDate}" onchange="setProgramStart(this.value)"></span></label>
      ${num('Trip length','tripWeeks',p.tripWeeks,'weeks')}
      <p class="muted">Today is <b>${w?w.label:'before the start'}</b>${p.offsetWeeks?` · calendar pushed back ${p.offsetWeeks} week${p.offsetWeeks>1?'s':''} <button class="link" onclick="undoRepeat()">undo one</button>`:''}.</p>
    </div>
    <div class="card"><h3>Working weights · cycle ${p.cycleStarted}</h3>
      <p class="muted mb-8">W is fixed for the whole cycle. Pick it so week 3 lands around RPE 7.</p>
      ${num('Squat','W.squat',p.W.squat,'lb')}${num('Bench','W.bench',p.W.bench,'lb')}${num('Deadlift','W.deadlift',p.W.deadlift,'lb')}${num('Overhead press','W.ohp',p.W.ohp,'lb')}
      ${num('Kettlebell','kbKg',p.kbKg,'kg')}${num('Vest','vestLb',p.vestLb,'lb')}
    </div>
    <div class="card"><h3>Accessory weights</h3>
      ${Object.entries(ACCESSORIES).map(([k,l])=>num(l+(p.accReady[k]?' <span class="badge">ready +5</span>':''),'acc.'+k,p.acc[k],'lb')).join('')}
    </div>
    <button class="btn btn-outline mb-8" onclick="openNextCycle()">Start next cycle…</button>
    ${(p.cycleHistory||[]).length?`<div class="card"><h3>Past cycles</h3>${p.cycleHistory.slice().reverse().map(c=>`<div class="kv"><span>Cycle ${c.cycle}</span><span class="num">S ${c.W.squat} · B ${c.W.bench} · D ${c.W.deadlift} · O ${c.W.ohp} · ${c.kbKg} kg</span></div>`).join('')}</div>`:''}`;
}
async function setProgramField(path,v){
  const [a,b]=path.split('.'),n=parseFloat(v)||0;
  if(b)state.program[a][b]=n;else state.program[a]=a==='tripWeeks'?Math.max(1,Math.round(n)):n;
  await saveProgram();
}
async function setProgramStart(v){if(!v)return;state.program.startDate=v;await saveProgram();render()}
async function undoRepeat(){state.program.offsetWeeks=Math.max(0,(state.program.offsetWeeks||0)-1);await saveProgram();render()}

// ---- backup reminders ----
const daysSince=iso=>Math.floor((Date.now()-new Date(iso).getTime())/864e5);
function exportOverdue(){
  if(state.workouts.length===0)return false;
  return !state.lastExport||daysSince(state.lastExport)>=14;
}
async function downloadPendingBackup(){
  const b=state.pendingBackup;if(!b)return;
  downloadJSON(b,'liftinstuff-before-update-'+b.createdAt.slice(0,10)+'.json');
  await dismissPendingBackup();
}
async function dismissPendingBackup(){
  if(state.pendingBackup){state.pendingBackup.acknowledged=true;await dbPut('backups',state.pendingBackup)}
  state.pendingBackup=null;render();
}
