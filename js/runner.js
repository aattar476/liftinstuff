// ============================================================
// GUIDED SESSION RUNNER
// ============================================================
// One step (exercise) per screen. Sets come prefilled from the program; one
// tap logs a set and starts the rest timer. The whole session, including the
// running timer, is saved to IndexedDB after every change (saveSession), so a
// reload or crash picks up exactly where it left off.

const CAT_COLOR={lower:'var(--lower)',upper:'var(--upper)',kb:'var(--kb)',walk:'var(--walk)',hike:'var(--hike)'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Last weight logged for an exercise, converted to `unit` if it was logged in
// the other one (old quick workouts are always lb). Used for equipment swaps.
function lastWeightFor(libId,unit){
  let best=null,bestT='';
  for(const w of state.workouts){
    if(!(w.startTime>bestT))continue;
    const e=(w.exercises||[]).find(e=>e.exerciseId===libId);if(!e)continue;
    const ws=(e.sets||[]).filter(x=>x.done&&x.weight>0).map(x=>x.weight);if(!ws.length)continue;
    const from=(e.wUnit||e.unit)==='kg'?'kg':'lb';let wt=Math.max(...ws);
    if(from!==unit)wt=unit==='kg'?nearestBell(wt/KG_TO_LB):Math.round(wt*KG_TO_LB/5)*5;
    best=wt;bestT=w.startTime;
  }
  return best;
}
// Most recent logged workout for an exercise, preferring the same kind of
// step (so light-day get-ups compare with light-day get-ups).
function lastLogFor(libId,kind){
  let best=null,any=null;
  for(const w of state.workouts){
    const e=(w.exercises||[]).find(e=>e.exerciseId===libId&&!e.skipped&&((e.sets||[]).some(x=>x.done)||e.timeSec));
    if(!e)continue;
    if(!any||w.startTime>any.w.startTime)any={w,e};
    if(e.kind===kind&&(!best||w.startTime>best.w.startTime))best={w,e};
  }
  return best||any;
}
const fmtSecs=sec=>Math.floor(sec/60)+':'+String(Math.round(sec%60)).padStart(2,'0');
// "3×5 @ 185 lb" when every set is the same, else "5 @ 185, 4 @ 185 lb".
function summarizeSets(e){
  const sets=(e.sets||[]).filter(x=>x.done),u=e.wUnit||(e.unit==='kg'?'kg':'lb');
  if(!sets.length)return '';
  if(e.unit==='min')return (e.durationMin||sets[0].reps||0)+' min'+(sets[0].weight?', vest '+sets[0].weight+' lb':'');
  const one=x=>e.unit==='s'?(x.weight?x.weight+' '+u+' · ':'')+x.secs+' s':(x.reps||0)+(x.weight?' @ '+x.weight:'');
  const same=sets.every(x=>x.weight===sets[0].weight&&x.reps===sets[0].reps&&x.secs===sets[0].secs);
  if(same)return e.unit==='s'?sets.length+'×'+one(sets[0]):sets.length+'×'+(sets[0].reps||0)+(e.perSide?'/side':'')+(sets[0].weight?' @ '+sets[0].weight+' '+u+(e.perHand?' each':''):'');
  return sets.map(one).join(', ')+(e.unit!=='s'&&sets.some(x=>x.weight)?' '+u+(e.perHand?' each':''):'');
}
function renderLastTime(step){
  if(step.kind==='block'&&!step.vest)return '';
  const lines=step.exs.map(e=>{
    const l=lastLogFor(e.exerciseId,step.kind);if(!l)return '';
    const parts=[summarizeSets(l.e),l.e.timeSec?'took '+fmtSecs(l.e.timeSec):''].filter(Boolean);
    return parts.length?`<div>${step.exs.length>1?esc(e.name)+': ':''}${esc(parts.join(' · '))}</div>`:'';
  }).filter(Boolean);
  if(!lines.length)return '';
  const l=lastLogFor(step.exs[0].exerciseId,step.kind)||lastLogFor(step.exs[1].exerciseId,step.kind);
  return `<div class="last-time"><span class="eyebrow">Last time · ${esc(shortDate(l.w.startTime))}</span>${lines.join('')}</div>`;
}

// Optional stopwatch for untimed steps (e.g. 10 get-ups) so times can be
// compared week to week. Lives on the step, separate from the rest timer.
function swElapsed(sw){return sw?(sw.accMs||0)+(sw.startAt?Date.now()-sw.startAt:0):0}
function swToggle(si){
  unlockAudio();unskip(si);
  const st=state.session.steps[si],sw=st.sw||(st.sw={accMs:0,startAt:null});
  if(sw.startAt){sw.accMs+=Date.now()-sw.startAt;sw.startAt=null}else sw.startAt=Date.now();
  saveSession();render();
}
function swStop(st){const sw=st.sw;if(sw&&sw.startAt){sw.accMs+=Date.now()-sw.startAt;sw.startAt=null}}
function swReset(si){state.session.steps[si].sw=null;saveSession();render()}
function renderStopwatch(step,si){
  if(!step.timeIt)return '';
  const sw=step.sw,ms=swElapsed(sw),on=!!(sw&&sw.startAt);
  return `<div class="sw-row ${on?'on':''}"><span class="num sw-time" id="sw-time">${fmtSecs(ms/1000)}</span>
    <button class="btn btn-sm ${on?'btn-outline':''}" onclick="swToggle(${si})">${on?'Pause':ms?'Resume':'Start stopwatch'}</button>
    ${ms&&!on?`<button class="btn btn-sm btn-ghost" onclick="swReset(${si})">Reset</button>`:''}</div>`;
}

function buildSessionFor(id,w){return buildSession(id,w,state.program,{lastWeight:lastWeightFor})}

function startProgramSession(id,weekIdx){
  if(state.session){state.subPage=state.session.kind==='program'?'run':'active-workout';render();return}
  const w=weekIdx!=null?weekAt(weekIdx,state.program):weekForDate(new Date(),state.program);
  const sess=buildSessionFor(id,w);
  if(!sess||!sess.steps.length)return;
  unlockAudio();
  state.session={
    id:uid(),kind:'program',name:sess.name,startTime:new Date().toISOString(),
    program:{sessionId:id,weekId:w.id,weekLabel:w.label,weekIdx:w.idx,cycle:w.cyc,cat:sess.cat},
    steps:sess.steps.map(s=>({...JSON.parse(JSON.stringify(s)),status:'todo'})),
    stepIdx:0,notes:'',timer:null,suggest:[],exercises:[],
  };
  state.subPage='run';
  saveSession();render();
}

const curStep=()=>state.session.steps[state.session.stepIdx];

// ---- ticking ----
let runTick=null;
function ensureRunTicker(){
  clearInterval(runTick);runTick=null;
  if(state.session&&state.session.kind==='program')runTick=setInterval(runnerTick,200);
}
function runnerTick(){
  const s=state.session,t=s&&s.timer;
  if(!s||s.kind!=='program'){clearInterval(runTick);runTick=null;return}
  const el=document.getElementById('run-elapsed');
  if(el)el.textContent=fmtUp(Date.now()-new Date(s.startTime));
  const sw=document.getElementById('sw-time'),cs=s.steps[s.stepIdx];
  if(sw&&cs&&cs.sw&&cs.sw.startAt)sw.textContent=fmtSecs(swElapsed(cs.sw)/1000);
  if(!t)return;
  const ev=timerEvents(t);
  if(ev.length){playEvents(ev);saveSession()}
  if(ev.includes('end')){onTimerEnd(t);return}
  if(ev.includes('target'))render();
  else if(ev.includes('round'))render();
  else updateRunTimerDom(t);
}
// Recompute immediately when the screen comes back (setInterval is frozen while hidden).
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&state.session&&state.session.kind==='program')runnerTick()});

function setTimer(t){state.session.timer=t;saveSession();ensureRunTicker()}
function clearTimer(){state.session.timer=null;saveSession();ensureRunTicker()}

function startRest(sec,label){
  if(!sec)return clearTimer();
  setTimer(makeTimer('rest',{seconds:sec,label:label||'Rest'}));
}

function onTimerEnd(t){
  const s=state.session;
  if(t.type==='rest'){s.timer=null}
  else if(t.type==='hold'){
    const step=s.steps[t.ctx.step],set=step.exs[0].sets[t.ctx.set];
    set.done=true;set.secs=set.secs||Math.round((t.endAt-t.startedAt)/1000);
    s.timer=null;afterSetLogged(t.ctx.step);
  }else if(t.type==='interval'){
    const step=s.steps[t.ctx.step];
    step.exs[0].sets.forEach(x=>x.done=true);
    s.timer=null;completeStep(t.ctx.step);
    if(step.restAfter)startRest(step.restAfter,'Rest, then get-ups');
  }
  saveSession();ensureRunTicker();render();
}

function updateRunTimerDom(t){
  const big=document.getElementById('big-time'),rest=document.getElementById('rest-time');
  if(t.type==='rest'&&rest)rest.textContent=fmtClock(timerRemainingMs(t));
  if(!big)return;
  if(t.type==='hold')big.textContent=fmtClock(timerRemainingMs(t));
  else if(t.type==='stopwatch'||t.type==='block')big.textContent=fmtUp(timerElapsedMs(t));
  else if(t.type==='interval'){
    const st=intervalState(t);big.textContent=fmtClock(st.nextInMs);
    const r=document.getElementById('iv-round');if(r)r.textContent=st.round+' / '+t.rounds;
  }
  const bar=document.getElementById('block-bar');
  if(bar&&t.type==='block'&&t.targetSec)bar.style.width=Math.min(100,timerElapsedMs(t)/10/t.targetSec)+'%';
}

// Doing anything on a skipped step means you're doing it after all.
function unskip(si){const st=state.session.steps[si];if(st&&st.status==='skipped')st.status='todo'}

// ---- logging sets ----
function setLb(ex,set){return (set.weight||0)*(ex.unit==='kg'?KG_TO_LB:1)}

// New best = heavier than anything logged for this lift, or the same top
// weight for more reps. Needs some history, so a first-ever log isn't flagged.
function isNewBest(exerciseId,ex,set){
  const lb=setLb(ex,set);if(lb<=0||!set.reps)return false;
  let maxLb=0,repsAtMax=0,any=false;
  const consider=(e,x)=>{if(!x.done||x===set||e.unit==='s'||e.unit==='min')return;const l=setLb(e,x);any=true;
    if(l>maxLb){maxLb=l;repsAtMax=x.reps||0}else if(l===maxLb)repsAtMax=Math.max(repsAtMax,x.reps||0)};
  for(const w of state.workouts)for(const e of w.exercises)if(e.exerciseId===exerciseId)for(const x of e.sets||[])consider(e,x);
  for(const st of state.session.steps)for(const e of st.exs)if(e.exerciseId===exerciseId)for(const x of e.sets)consider(e,x);
  return any&&(lb>maxLb+1e-9||(Math.abs(lb-maxLb)<1e-9&&set.reps>repsAtMax));
}

function editSet(si,ei,i,field,val){
  const set=state.session.steps[si].exs[ei].sets[i];
  set[field]=parseFloat(val)||0;saveSession();
}

function toggleSetDone(si,ei,i){
  unlockAudio();
  unskip(si);
  const step=state.session.steps[si],ex=step.exs[ei],set=ex.sets[i];
  if(set.done){set.done=false;set.pr=false;step.status='todo';saveSession();render();return}
  set.done=true;set.pr=isNewBest(ex.exerciseId,ex,set);
  if(set.pr)toast('New best: '+ex.name+' '+set.weight+(ex.unit==='kg'?' kg':' lb')+' × '+set.reps);
  // Superset: rest only after the last exercise of the pair.
  const lastOfRound=ei===step.exs.length-1;
  if(lastOfRound)afterSetLogged(si);else{saveSession();render()}
}

function afterSetLogged(si){
  const step=state.session.steps[si];
  const allDone=step.exs.every(e=>e.sets.every(x=>x.done));
  if(allDone){completeStep(si);if(step.rest&&si<state.session.steps.length-1)startRest(step.rest);else clearTimer()}
  else startRest(step.rest);
  saveSession();render();
}

function completeStep(si){
  const s=state.session,step=s.steps[si];
  step.status='done';
  swStop(step);
  if(step.acc&&hitTopOfRange(step,step.exs[0].sets)&&!state.program.accReady[step.acc]){
    state.program.accReady[step.acc]=true;saveProgram();
    s.suggest.push({acc:step.acc,text:step.title+': every set hit '+step.topReps+' reps. Add 5 lb and drop back to the bottom of the range.'});
  }
  if(step.bwPlan&&!step._bwApplied){step._bwApplied=true;progressBodyweight(step)}
  if(si===s.stepIdx&&si<s.steps.length-1)s.stepIdx=si+1;
}

// Pull-ups / dips: remember the added weight used; every set at target means
// +1 rep next session, and at the top of the plan suggest +5 lb (BW_PLAN).
function progressBodyweight(step){
  const p=state.program;p.bw=p.bw||JSON.parse(JSON.stringify(DEFAULT_PROGRAM.bw));
  const notes=[];
  for(const e of step.exs){
    const plan=BW_PLAN[e.key];if(!plan)continue;
    const cur=p.bw[e.key]=p.bw[e.key]||{reps:plan.start,add:0};
    cur.add=Math.max(0,...e.sets.filter(x=>x.done).map(x=>x.weight||0));
    const r=bwNext(e.key,cur,e.sets);
    if(r&&r.reps){cur.reps=r.reps;notes.push(plan.label+' '+r.reps)}
    else if(r&&r.suggestAdd)state.session.suggest.push({bw:e.key,text:plan.label+': every set hit '+cur.reps+'. Add 5 lb and go back to '+plan.start+' reps next time.'});
  }
  saveProgram();
  if(notes.length)toast('Next time: '+notes.join(' · ')+' per set');
}

async function applySuggestion(i){
  const sug=state.session.suggest[i];if(!sug)return;
  if(sug.bw){const b=state.program.bw[sug.bw];b.add=(b.add||0)+5;b.reps=BW_PLAN[sug.bw].start}
  else{state.program.acc[sug.acc]=(state.program.acc[sug.acc]||0)+5;delete state.program.accReady[sug.acc]}
  await saveProgram();
  state.session.suggest.splice(i,1);saveSession();render();
}
function dismissSuggestion(i){state.session.suggest.splice(i,1);saveSession();render()}

// ---- holds, intervals, blocks ----
function startHold(si,i){
  unlockAudio();unskip(si);
  const step=state.session.steps[si],set=step.exs[0].sets[i];
  if(step.mode==='stopwatch')setTimer(makeTimer('stopwatch',{ctx:{step:si,set:i}}));
  else setTimer(makeTimer('hold',{seconds:set.secs||60,ctx:{step:si,set:i}}));
  render();
}
function stopHold(){
  const t=state.session.timer;if(!t)return;
  const step=state.session.steps[t.ctx.step],set=step.exs[0].sets[t.ctx.set];
  set.secs=Math.round(timerElapsedMs(t)/1000);set.done=true;
  state.session.timer=null;afterSetLogged(t.ctx.step);ensureRunTicker();
}
function startInterval(si){
  unlockAudio();unskip(si);
  const step=state.session.steps[si];
  setTimer(makeTimer('interval',{every:step.every,rounds:step.rounds,ctx:{step:si}}));
  playEvents(timerEvents(state.session.timer));   // round 1 beep now
  saveSession();render();
}
// Log every round as done, with or without the timer (going faster than the clock).
function logIntervalAll(si){
  const s=state.session,step=s.steps[si],t=s.timer;unskip(si);
  if(t&&t.type==='interval'&&t.ctx.step===si)s.timer=null;
  step.exs[0].sets.forEach(x=>x.done=true);
  completeStep(si);ensureRunTicker();
  if(step.restAfter&&t&&t.ctx&&t.ctx.step===si)startRest(step.restAfter,'Rest, then get-ups');
  saveSession();render();
}
// Bell weight (kg) for every kettlebell step not yet logged; saved as your bell.
function setBell(val){
  const v=Math.max(0,parseFloat(val)||0);if(!v)return;
  for(const st of state.session.steps){
    if(!st.kb)continue;
    for(const e of st.exs)for(const x of e.sets)if(!x.done)x.weight=v;
    st.rx=st.rx.replace(/· [\d.]+ kg/,'· '+v+' kg');
  }
  state.program.kbKg=v;saveProgram();saveSession();render();
}
function bellField(step){
  return `<label class="field bell-field"><span>Bell</span><span class="field-in"><input type="number" inputmode="decimal" data-sid="bell" value="${step.exs[0].sets[0].weight||''}" placeholder="kg" onfocus="this.select()" onchange="setBell(this.value)"><span class="unit">kg</span></span></label>`;
}
function stopIntervalEarly(){
  const t=state.session.timer;if(!t)return;
  const st=intervalState(t),step=state.session.steps[t.ctx.step];
  step.exs[0].sets.forEach((x,i)=>{x.done=i<st.round});
  state.session.timer=null;completeStep(t.ctx.step);ensureRunTicker();saveSession();render();
}
function startBlock(si){
  unlockAudio();unskip(si);
  const step=state.session.steps[si];
  setTimer(makeTimer('block',{targetSec:step.targetMin*60,ctx:{step:si}}));render();
}
function finishBlock(si){
  const s=state.session,step=s.steps[si],t=s.timer;
  const ms=t&&t.type==='block'&&t.ctx.step===si?timerElapsedMs(t):0;
  const set=step.exs[0].sets[0];unskip(si);
  set.reps=ms?Math.max(1,Math.round(ms/60000)):(set.reps||step.targetMin);set.done=true;
  if(t&&t.type==='block')s.timer=null;
  completeStep(si);ensureRunTicker();saveSession();render();
}
function toggleTimerPause(){
  const t=state.session.timer;if(!t)return;
  if(t.pausedAt)resumeTimer(t);else pauseTimer(t);
  saveSession();render();
}
function restPlus(sec){addTime(state.session.timer,sec);saveSession();render()}
function restSkip(){clearTimer();render()}

// ---- navigation ----
function goStep(i){const s=state.session;if(i<0||i>=s.steps.length)return;s.stepIdx=i;saveSession();render();scrollTop()}
function skipStep(){
  const s=state.session,step=curStep();
  if(step.status!=='done')step.status='skipped';
  if(s.timer&&s.timer.ctx&&s.timer.ctx.step===s.stepIdx)s.timer=null;
  ensureRunTicker();
  if(s.stepIdx<s.steps.length-1)s.stepIdx++;
  saveSession();render();scrollTop();
}
function scrollTop(){const c=document.getElementById('main-content');if(c)c.scrollTop=0}
function toggleCue(){state._showCue=!state._showCue;render()}
function toggleRamp(){state._showRamp=!state._showRamp;render()}
let _noteSave;
function editNote(v){state.session.notes=v;clearTimeout(_noteSave);_noteSave=setTimeout(saveSession,400)}
function editStepNote(si,v){state.session.steps[si].userNote=v;clearTimeout(_noteSave);_noteSave=setTimeout(saveSession,400)}

// ---- equipment swap ----
// Rebuilds this step for the chosen kit and remembers the choice for next time.
function swapEquip(si,choice){
  const s=state.session,old=s.steps[si];
  if(!old.swap||old.equipCur===choice||old.exs.some(e=>e.sets.some(x=>x.done)))return;
  state.program.equip={...(state.program.equip||{}),[old.swap]:choice};
  saveProgram();
  const fresh=buildSessionFor(s.program.sessionId,weekAt(s.program.weekIdx,state.program));
  const next=fresh&&fresh.steps.find(x=>x.swap===old.swap);
  if(!next)return;
  s.steps[si]={...JSON.parse(JSON.stringify(next)),status:'todo',userNote:old.userNote};
  saveSession();render();
}

// ---- incline-walk vest ----
function setVest(si,val){
  const step=state.session.steps[si],v=Math.max(0,parseFloat(val)||0);
  step.exs[0].sets[0].weight=v;
  step.rx=step.targetMin+' min'+(v?' · vest '+v+' lb':'');
  state.program.vestLb=v;saveProgram();
  saveSession();render();
}

// Weight moved so far (lb): kg converted, both hands counted for pairs of
// dumbbells/bells, both sides for per-side reps. Holds and timed blocks don't count.
function exVolumeLb(e,sets){
  if(e.isCardio||e.unit==='s'||e.unit==='min')return 0;
  const k=(e.unit==='kg'?KG_TO_LB:1)*(e.perHand?2:1)*(e.perSide?2:1);
  return (sets||e.sets||[]).reduce((n,x)=>n+(x.done?(x.weight||0)*(x.reps||0)*k:0),0);
}
function sessionVolumeLb(s){return Math.round(s.steps.reduce((n,st)=>n+st.exs.reduce((m,e)=>m+exVolumeLb(e),0),0))}

// ---- finish / discard ----
function askFinish(){
  // Prefill the length with the time since starting; editable in the sheet
  // (e.g. the session was left running overnight).
  state._finishMin=Math.max(1,Math.round((Date.now()-new Date(state.session.startTime))/60000));
  state._sheet='finish';render();
}
function setFinishLen(h,m){
  const cur=state._finishMin||0;
  const hh=h==null?Math.floor(cur/60):Math.max(0,parseInt(h)||0);
  const mm=m==null?cur%60:Math.max(0,parseInt(m)||0);
  state._finishMin=Math.max(1,hh*60+mm);
}
function closeSheet(){state._sheet=null;render()}
function minimizeSession(){state.subPage=null;state.tab='today';render()}

function sessionToWorkout(s,lenMin){
  const start=new Date(s.startTime);
  const end=lenMin?new Date(start.getTime()+lenMin*60000):new Date();
  const exercises=[];
  for(const step of s.steps)step.exs.forEach((e,ei)=>{
    exercises.push({exerciseId:e.exerciseId,name:e.name,body:e.body,equip:e.equip,isCardio:!!e.isCardio,
      unit:e.unit,wUnit:e.wUnit,perSide:!!e.perSide,perHand:!!e.perHand,key:e.key,kind:step.kind,skipped:step.status==='skipped',
      note:ei===0&&step.userNote?step.userNote:undefined,
      timeSec:ei===0&&swElapsed(step.sw)>=1000?Math.round(swElapsed(step.sw)/1000):undefined,
      durationMin:e.unit==='min'?(e.sets[0].done?e.sets[0].reps:0):undefined,
      sets:e.sets.map(x=>({weight:x.weight||0,reps:x.reps||0,secs:x.secs,done:!!x.done,pr:!!x.pr}))});
  });
  // JSON round trip drops undefined fields so the record is plain data.
  return JSON.parse(JSON.stringify({id:s.id,name:s.name,startTime:s.startTime,endTime:end.toISOString(),
    durationSec:Math.round((end-start)/1000),program:s.program,notes:s.notes||'',exercises,currentExIdx:0}));
}

async function finishProgramSession(){
  const s=state.session;if(!s)return;
  const workout=sessionToWorkout(s,state._finishMin);
  // Replace rather than add, in case an earlier save attempt already stored it.
  state.workouts=state.workouts.filter(w=>w.id!==workout.id);
  state.workouts.push(workout);
  await dbPut('workouts',workout);
  backupToFirebase();
  state.session=null;state.subPage=null;state._sheet=null;state.tab='today';
  clearInterval(runTick);runTick=null;releaseWakeLock();
  await dbDelete('activeSession','current');
  const sets=workout.exercises.reduce((n,e)=>n+e.sets.filter(x=>x.done).length,0);
  toast('Saved: '+workout.name+' · '+fmtDuration(workout.durationSec)+' · '+sets+' sets');
  render();
}
async function discardProgramSession(){
  state.session=null;state.subPage=null;state._sheet=null;
  clearInterval(runTick);runTick=null;releaseWakeLock();
  await dbDelete('activeSession','current');render();
}

// ---- rendering ----
function renderRunHeader(){
  const s=state.session;
  return `<div class="header run-head"><button class="header-back" aria-label="Back to home" onclick="minimizeSession()">${icons.back}</button>
    <div class="run-head-t"><span class="eyebrow">${esc(s.program.weekLabel)}</span><h1>${esc(s.name)}</h1></div>
    <button class="header-btn" onclick="askFinish()">Finish</button></div>`;
}

function renderRunner(){
  const s=state.session,step=curStep(),si=s.stepIdx,t=s.timer;
  const c=CAT_COLOR[s.program.cat]||'var(--accent)';
  const dots=s.steps.map((x,i)=>`<button class="dot ${x.status} ${i===si?'cur':''}" aria-label="Step ${i+1}: ${esc(x.title)}" onclick="goStep(${i})"></button>`).join('');
  const sug=s.suggest.map((x,i)=>`<div class="banner"><span>${esc(x.text)}</span><div class="banner-act"><button class="btn btn-sm" onclick="applySuggestion(${i})">Add 5 lb</button><button class="btn btn-sm btn-ghost" onclick="dismissSuggestion(${i})">Later</button></div></div>`).join('');
  const cue=step.exs.map(e=>e.cue).filter(Boolean).join(' ');
  let body='';
  if(step.kind==='weights')body=renderWeightRows(step,si);
  else if(step.kind==='hold')body=renderHold(step,si,t);
  else if(step.kind==='interval')body=renderInterval(step,si,t);
  else if(step.kind==='block')body=renderBlock(step,si,t);
  const ramp=step.warmup&&step.warmup.length?`<div class="ramp">
      <button class="ramp-h" onclick="toggleRamp()" aria-expanded="${!!state._showRamp}">Warm-up ramp <span class="muted">(optional)</span><span class="num">${state._showRamp?'−':'+'}</span></button>
      ${state._showRamp?`<table class="sets"><tbody>${step.warmup.map(r=>`<tr><td class="muted">${r.label}</td><td class="num">${r.weight} lb × ${r.reps}</td></tr>`).join('')}</tbody></table>`:''}
    </div>`:'';
  const eq=step.equipOpts&&step.equipOpts.length>1?(()=>{
    const locked=step.exs.some(e=>e.sets.some(x=>x.done));
    return `<div class="equip-row" role="group" aria-label="Equipment">${step.equipOpts.map(o=>`<button class="${o===step.equipCur?'on':''}" ${locked&&o!==step.equipCur?'disabled':''} aria-pressed="${o===step.equipCur}" onclick="swapEquip(${si},'${o}')">${EQUIP_LABEL[o]}</button>`).join('')}</div>
      ${step.estimate?`<p class="est-note">Weight is an estimate from your ${EQUIP_LABEL[step.equipBase].toLowerCase()} weight. Change it if it's off; next time it uses what you log.</p>`:''}`;
  })():'';
  return `<div class="run">
    <div class="dots" role="list">${dots}</div>
    <div class="run-stats"><span><b class="num" id="run-elapsed">${fmtUp(Date.now()-new Date(s.startTime))}</b><small>time</small></span><span><b class="num">${sessionVolumeLb(s).toLocaleString()}</b><small>lb moved</small></span></div>
    ${sug}
    <section class="run-step" style="--c:${c}">
      <div class="eyebrow">Step ${si+1} of ${s.steps.length}${step.main?' · main lift':step.status==='skipped'?' · skipped':''}</div>
      <h2 class="run-title">${esc(step.title)}</h2>
      <div class="run-rx num">${esc(step.rx)}${step.rest?` · rest ${step.rest} s`:''}</div>
      ${cue?`<button class="cue-btn" onclick="toggleCue()" aria-expanded="${!!state._showCue}">${state._showCue?'Hide cue':'Cue'}</button>${state._showCue?`<p class="cue">${esc(cue)}</p>`:''}`:''}
      ${renderLastTime(step)}
      ${eq}
      ${renderStopwatch(step,si)}
      ${ramp}
      ${body}
      ${step.status==='todo'&&!(t&&t.ctx&&t.ctx.step===si)?`<button class="skip-link" onclick="skipStep()">Skip this exercise</button>`:''}
    </section>
    <section class="run-notes">
      <label class="eyebrow" for="run-note-${si}">Note · ${esc(step.title)}</label>
      <textarea id="run-note-${si}" data-sid="run-note-${si}" rows="2" placeholder="e.g. box height, how it felt" oninput="editStepNote(${si},this.value)">${esc(step.userNote)}</textarea>
    </section>
    ${state._sheet==='finish'?renderFinishSheet():state._sheet==='discard'?renderDiscardSheet():''}
  </div>`;
}

function renderWeightRows(step,si){
  const n=step.exs[0].sets.length,rows=[];
  for(let i=0;i<n;i++)step.exs.forEach((e,ei)=>{
    const x=e.sets[i],unit=(e.unit==='kg'?'kg':'lb')+(e.perHand?' ea':'');
    rows.push(`<tr class="${x.done?'done':''}">
      <td class="sn num">${i+1}${step.exs.length>1?`<small>${esc(e.name.split(' ')[0])}</small>`:''}</td>
      <td>${e.equip==='Bodyweight'&&!step.acc&&!step.addWeight?'<span class="muted">bodyweight</span>':`<input class="set-input" type="number" inputmode="decimal" aria-label="${esc(e.name)} set ${i+1} ${unit}" data-sid="rw-${si}-${ei}-${i}" value="${x.weight||''}" placeholder="${step.addWeight?'+0':'0'}" onfocus="this.select()" onchange="editSet(${si},${ei},${i},'weight',this.value)"><span class="unit">${step.addWeight&&e.equip==='Bodyweight'?'+lb':unit}</span>`}</td>
      <td><input class="set-input" type="number" inputmode="numeric" aria-label="${esc(e.name)} set ${i+1} reps" data-sid="rr-${si}-${ei}-${i}" value="${x.reps||''}" placeholder="0" onfocus="this.select()" onchange="editSet(${si},${ei},${i},'reps',this.value)"><span class="unit">${e.perSide?'/side':'reps'}</span></td>
      <td class="ck"><button class="set-check ${x.done?'done':''}" aria-label="${x.done?'Undo':'Log'} set ${i+1}" onclick="toggleSetDone(${si},${ei},${i})">${x.done?icons.check:''}</button>${x.pr?'<span class="badge">new best</span>':''}</td>
    </tr>`);
  });
  return `${step.kb?bellField(step):''}<table class="sets run-sets"><thead><tr><th>Set</th><th>Weight</th><th>Reps</th><th class="r">Log</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
}

function renderHold(step,si,t){
  const e=step.exs[0],running=t&&(t.type==='hold'||t.type==='stopwatch')&&t.ctx.step===si;
  const next=e.sets.findIndex(x=>!x.done);
  const big=running?`<div class="big-wrap"><div class="big-time num" id="big-time">${t.type==='hold'?fmtClock(timerRemainingMs(t)):fmtUp(timerElapsedMs(t))}</div>
      <div class="muted center">${t.type==='hold'?'Hold':'Carry '+(e.distanceM||40)+' m each side'}${t.pausedAt?' · paused':''}</div>
      <div class="row2"><button class="btn btn-outline" onclick="toggleTimerPause()">${t.pausedAt?'Resume':'Pause'}</button>
      ${t.type==='stopwatch'?`<button class="btn" onclick="stopHold()">Stop + log</button>`:`<button class="btn" onclick="stopHold()">Done early</button>`}</div></div>`:'';
  const rows=e.sets.map((x,i)=>`<tr class="${x.done?'done':''}">
      <td class="sn num">${i+1}</td>
      <td>${e.equip==='Bodyweight'?'<span class="muted">bodyweight</span>':`<input class="set-input" type="number" inputmode="decimal" aria-label="Set ${i+1} lb" data-sid="hw-${si}-${i}" value="${x.weight||''}" placeholder="0" onfocus="this.select()" onchange="editSet(${si},0,${i},'weight',this.value)"><span class="unit">${e.wUnit||'lb'}</span>`}</td>
      <td class="num">${x.done?x.secs+' s':step.mode==='stopwatch'?(e.distanceM||40)+' m/side':x.secs+' s'}</td>
      <td class="ck">${x.done?`<button class="set-check done" aria-label="Undo set ${i+1}" onclick="toggleSetDone(${si},0,${i})">${icons.check}</button>`:`<button class="set-check go" aria-label="Start set ${i+1}" ${running?'disabled':''} onclick="startHold(${si},${i})">${icons.play}</button>`}</td>
    </tr>`).join('');
  return big+`<table class="sets run-sets"><thead><tr><th>Set</th><th>Weight</th><th>${step.mode==='stopwatch'?'Distance':'Hold'}</th><th class="r">Go</th></tr></thead><tbody>${rows}</tbody></table>
    ${!running&&next>=0?`<button class="btn btn-big" onclick="startHold(${si},${next})">Start set ${next+1}</button>`:''}`;
}

function renderInterval(step,si,t){
  const e=step.exs[0],running=t&&t.type==='interval'&&t.ctx.step===si,doneCount=e.sets.filter(x=>x.done).length;
  if(running){
    const st=intervalState(t),odd=st.round%2===1,side=!step.sideLabel?'':step.sideLabel==='hand'?(odd?'Right hand':'Left hand'):(odd?'Right side':'Left side');
    return `<div class="big-wrap iv">
      <div class="iv-meta"><span class="eyebrow">Round</span><span class="num iv-round" id="iv-round">${st.round} / ${t.rounds}</span></div>
      ${side?`<div class="iv-side">${side}</div>`:''}
      <div class="big-time num" id="big-time">${fmtClock(st.nextInMs)}</div>
      <div class="muted center">until next round · every ${t.every} s${t.pausedAt?' · paused':''}</div>
      <div class="ticks">${Array.from({length:t.rounds},(_,i)=>`<span class="${i+1<st.round?'past':i+1===st.round?'now':''}">${step.sideLabel?(i%2?'L':'R'):i+1}</span>`).join('')}</div>
      <div class="row2"><button class="btn btn-outline" onclick="toggleTimerPause()">${t.pausedAt?'Resume':'Pause'}</button><button class="btn" onclick="logIntervalAll(${si})">Finished: log all ${t.rounds}</button></div>
      <button class="skip-link" onclick="stopIntervalEarly()">Stop early: log the rounds done so far</button>
    </div>`;
  }
  if(step.status==='done')return `<div class="done-note">${doneCount} of ${e.sets.length} rounds logged at ${e.sets[0].weight} kg.</div>
    <button class="btn btn-outline" onclick="startInterval(${si})">Run it again</button>`;
  return `${bellField(step)}<div class="ticks">${Array.from({length:step.rounds},(_,i)=>`<span>${step.sideLabel?(i%2?'L':'R'):i+1}</span>`).join('')}</div>
    <p class="muted">A beep starts each round, with 3-2-1 beeps before the next.</p>
    <button class="btn btn-big" onclick="startInterval(${si})">Start ${step.rounds} rounds</button>
    <button class="btn btn-ghost" onclick="logIntervalAll(${si})">Did all ${step.rounds} without the timer</button>`;
}

function renderBlock(step,si,t){
  const running=t&&t.type==='block'&&t.ctx.step===si,set=step.exs[0].sets[0];
  if(running){
    const reached=timerElapsedMs(t)>=step.targetMin*60000;
    return `${step.vest&&set.weight?`<p class="muted">Vest ${set.weight} lb</p>`:''}<div class="big-wrap">
      <div class="big-time num ${reached?'reached':''}" id="big-time">${fmtUp(timerElapsedMs(t))}</div>
      <div class="muted center">target ${step.targetMin}:00${reached?' · reached':''}${t.pausedAt?' · paused':''}</div>
      <div class="bar"><i id="block-bar" style="width:${Math.min(100,timerElapsedMs(t)/10/(step.targetMin*60))}%"></i></div>
      <div class="row2"><button class="btn btn-outline" onclick="toggleTimerPause()">${t.pausedAt?'Resume':'Pause'}</button><button class="btn" onclick="finishBlock(${si})">Done</button></div>
    </div>`;
  }
  const vest=step.vest?`<label class="field vest-field"><span>Weighted vest <small class="muted">0 = none</small></span><span class="field-in"><input type="number" inputmode="decimal" min="0" data-sid="vest-${si}" value="${set.weight||''}" placeholder="0" onfocus="this.select()" onchange="setVest(${si},this.value)"><span class="unit">lb</span></span></label>`:'';
  if(set.done)return `<div class="done-note">Logged ${set.reps} min${set.weight?' with a '+set.weight+' lb vest':''}.</div>`;
  return `${vest}${step.note&&!step.vest?`<p class="muted">${esc(step.note)}</p>`:''}
    <button class="btn btn-big" onclick="startBlock(${si})">Start ${step.targetMin} min</button>
    <button class="btn btn-ghost" onclick="finishBlock(${si})">Already done: log ${step.targetMin} min</button>`;
}

// Bottom dock: rest timer (when running) above prev / skip / next.
function renderRunDock(){
  const s=state.session,t=s.timer,si=s.stepIdx,step=curStep(),last=si===s.steps.length-1;
  const rest=t&&t.type==='rest'?`<div class="rest-panel" role="timer" aria-live="off">
      <div><div class="eyebrow">${esc(t.label||'Rest')}${t.pausedAt?' · paused':''}</div><div class="rest-time num" id="rest-time">${fmtClock(timerRemainingMs(t))}</div></div>
      <div class="rest-btns"><button class="btn btn-outline" onclick="restPlus(15)">+15 s</button><button class="btn" onclick="restSkip()">Skip</button></div>
    </div>`:'';
  return `<div class="dock">${rest}<div class="dock-nav">
      <button class="btn btn-outline" ${si===0?'disabled':''} onclick="goStep(${si-1})" aria-label="Previous exercise">${icons.back}</button>
      ${last?`<button class="btn" onclick="askFinish()">Finish</button>`:`<button class="btn" onclick="goStep(${si+1})">Next</button>`}
    </div></div>`;
}

function renderFinishSheet(){
  const s=state.session,sets=s.steps.reduce((n,st)=>n+st.exs.reduce((m,e)=>m+e.sets.filter(x=>x.done).length,0),0);
  const left=s.steps.filter(x=>x.status==='todo').length,len=state._finishMin||0;
  return `<div class="modal-overlay" onclick="if(event.target===this)closeSheet()"><div class="modal" role="dialog" aria-label="Finish session">
    <div class="modal-title">Finish ${esc(s.name)}?</div>
    <p class="muted mb-12">${sets} sets logged${left?` · ${left} step${left>1?'s':''} not done (they'll be saved as not done)`:''}.</p>
    <label class="field mb-12"><span>Session length${len>=240?'<br><small class="muted">Left it running? Fix it here.</small>':''}</span><span class="field-in">
      <input type="number" inputmode="numeric" min="0" data-sid="fin-h" value="${Math.floor(len/60)}" style="width:56px" aria-label="Hours" onchange="setFinishLen(this.value,null)"><span class="unit">h</span>
      <input type="number" inputmode="numeric" min="0" max="59" data-sid="fin-m" value="${len%60}" style="width:56px" aria-label="Minutes" onchange="setFinishLen(null,this.value)"><span class="unit">m</span>
    </span></label>
    <label class="eyebrow" for="fin-note">Session note</label>
    <textarea id="fin-note" data-sid="fin-note" rows="2" class="mb-12" placeholder="How did the whole session feel?" oninput="editNote(this.value)">${esc(s.notes)}</textarea>
    <button class="btn btn-big mb-8" onclick="finishProgramSession()">Save session</button>
    <button class="btn btn-outline mb-8" onclick="closeSheet()">Keep going</button>
    <button class="btn btn-danger-ghost" onclick="state._sheet='discard';render()">Discard session</button>
  </div></div>`;
}
function renderDiscardSheet(){
  return `<div class="modal-overlay" onclick="if(event.target===this)closeSheet()"><div class="modal" role="dialog" aria-label="Discard session">
    <div class="modal-title">Discard this session?</div>
    <p class="muted mb-12">Nothing from it will be saved.</p>
    <button class="btn btn-danger mb-8" onclick="discardProgramSession()">Discard</button>
    <button class="btn btn-outline" onclick="closeSheet()">Cancel</button>
  </div></div>`;
}

// Small transient message at the top of the screen.
function toast(msg){
  let el=document.getElementById('toast');
  if(!el){el=document.createElement('div');el.id='toast';el.className='toast';el.setAttribute('role','status');document.body.appendChild(el)}
  el.textContent=msg;el.classList.add('on');
  clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('on'),3200);
}
