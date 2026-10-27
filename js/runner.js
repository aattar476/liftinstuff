// ============================================================
// GUIDED SESSION RUNNER
// ============================================================
// One step (exercise) per screen. Sets come prefilled from the program; one
// tap logs a set and starts the rest timer. The whole session, including the
// running timer, is saved to IndexedDB after every change (saveSession), so a
// reload or crash picks up exactly where it left off.

const CAT_COLOR={lower:'var(--lower)',upper:'var(--upper)',kb:'var(--kb)',walk:'var(--walk)',hike:'var(--hike)'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function startProgramSession(id,weekIdx){
  if(state.session){state.subPage=state.session.kind==='program'?'run':'active-workout';render();return}
  const w=weekIdx!=null?weekAt(weekIdx,state.program):weekForDate(new Date(),state.program);
  const sess=buildSession(id,w,state.program);
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
  if(state.session&&state.session.kind==='program'&&state.session.timer)runTick=setInterval(runnerTick,200);
}
function runnerTick(){
  const s=state.session,t=s&&s.timer;
  if(!t||s.kind!=='program'){clearInterval(runTick);runTick=null;return}
  const ev=timerEvents(t);
  if(ev.length){playEvents(ev);saveSession()}
  if(ev.includes('end')){onTimerEnd(t);return}
  if(ev.includes('target'))render();
  else if(ev.includes('round'))render();
  else updateRunTimerDom(t);
}
// Recompute immediately when the screen comes back (setInterval is frozen while hidden).
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&state.session&&state.session.timer)runnerTick()});

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
  if(step.acc&&hitTopOfRange(step,step.exs[0].sets)&&!state.program.accReady[step.acc]){
    state.program.accReady[step.acc]=true;saveProgram();
    s.suggest.push({acc:step.acc,text:step.title+': every set hit '+step.topReps+' reps. Add 5 lb and drop back to the bottom of the range.'});
  }
  if(si===s.stepIdx&&si<s.steps.length-1)s.stepIdx=si+1;
}

async function applySuggestion(i){
  const sug=state.session.suggest[i];if(!sug)return;
  state.program.acc[sug.acc]=(state.program.acc[sug.acc]||0)+5;
  delete state.program.accReady[sug.acc];
  await saveProgram();
  state.session.suggest.splice(i,1);saveSession();render();
}
function dismissSuggestion(i){state.session.suggest.splice(i,1);saveSession();render()}

// ---- holds, intervals, blocks ----
function startHold(si,i){
  unlockAudio();
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
  unlockAudio();
  const step=state.session.steps[si];
  setTimer(makeTimer('interval',{every:step.every,rounds:step.rounds,ctx:{step:si}}));
  playEvents(timerEvents(state.session.timer));   // round 1 beep now
  saveSession();render();
}
function stopIntervalEarly(){
  const t=state.session.timer;if(!t)return;
  const st=intervalState(t),step=state.session.steps[t.ctx.step];
  step.exs[0].sets.forEach((x,i)=>{x.done=i<st.round});
  state.session.timer=null;completeStep(t.ctx.step);ensureRunTicker();saveSession();render();
}
function startBlock(si){
  unlockAudio();
  const step=state.session.steps[si];
  setTimer(makeTimer('block',{targetSec:step.targetMin*60,ctx:{step:si}}));render();
}
function finishBlock(si){
  const s=state.session,step=s.steps[si],t=s.timer;
  const ms=t&&t.type==='block'&&t.ctx.step===si?timerElapsedMs(t):0;
  const set=step.exs[0].sets[0];
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

// ---- finish / discard ----
function askFinish(){state._sheet='finish';render()}
function closeSheet(){state._sheet=null;render()}
function minimizeSession(){state.subPage=null;state.tab='today';render()}

function sessionToWorkout(s){
  const end=new Date();
  const exercises=[];
  for(const step of s.steps)for(const e of step.exs){
    exercises.push({exerciseId:e.exerciseId,name:e.name,body:e.body,equip:e.equip,isCardio:!!e.isCardio,
      unit:e.unit,perSide:!!e.perSide,key:e.key,kind:step.kind,skipped:step.status==='skipped',
      durationMin:e.unit==='min'?(e.sets[0].done?e.sets[0].reps:0):undefined,
      sets:e.sets.map(x=>({weight:x.weight||0,reps:x.reps||0,secs:x.secs,done:!!x.done,pr:!!x.pr}))});
  }
  return {id:s.id,name:s.name,startTime:s.startTime,endTime:end.toISOString(),
    durationSec:Math.round((end-new Date(s.startTime))/1000),program:s.program,notes:s.notes||'',exercises,currentExIdx:0};
}

async function finishProgramSession(){
  const s=state.session;if(!s)return;
  const workout=sessionToWorkout(s);
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
  return `<div class="run">
    <div class="dots" role="list">${dots}</div>
    ${sug}
    <section class="run-step" style="--c:${c}">
      <div class="eyebrow">Step ${si+1} of ${s.steps.length}${step.main?' · main lift':step.status==='skipped'?' · skipped':''}</div>
      <h2 class="run-title">${esc(step.title)}</h2>
      <div class="run-rx num">${esc(step.rx)}${step.rest?` · rest ${step.rest} s`:''}</div>
      ${cue?`<button class="cue-btn" onclick="toggleCue()" aria-expanded="${!!state._showCue}">${state._showCue?'Hide cue':'Cue'}</button>${state._showCue?`<p class="cue">${esc(cue)}</p>`:''}`:''}
      ${ramp}
      ${body}
    </section>
    <section class="run-notes">
      <label class="eyebrow" for="run-note">Session note</label>
      <textarea id="run-note" data-sid="run-note" rows="2" placeholder="How did it feel?" oninput="editNote(this.value)">${esc(s.notes)}</textarea>
    </section>
    ${state._sheet==='finish'?renderFinishSheet():state._sheet==='discard'?renderDiscardSheet():''}
  </div>`;
}

function renderWeightRows(step,si){
  const n=step.exs[0].sets.length,rows=[];
  for(let i=0;i<n;i++)step.exs.forEach((e,ei)=>{
    const x=e.sets[i],unit=e.unit==='kg'?'kg':'lb';
    rows.push(`<tr class="${x.done?'done':''}">
      <td class="sn num">${i+1}${step.exs.length>1?`<small>${esc(e.name.split(' ')[0])}</small>`:''}</td>
      <td>${e.equip==='Bodyweight'&&!step.acc?'<span class="muted">bodyweight</span>':`<input class="set-input" type="number" inputmode="decimal" aria-label="${esc(e.name)} set ${i+1} ${unit}" data-sid="rw-${si}-${ei}-${i}" value="${x.weight||0}" onchange="editSet(${si},${ei},${i},'weight',this.value)"><span class="unit">${unit}</span>`}</td>
      <td><input class="set-input" type="number" inputmode="numeric" aria-label="${esc(e.name)} set ${i+1} reps" data-sid="rr-${si}-${ei}-${i}" value="${x.reps||0}" onchange="editSet(${si},${ei},${i},'reps',this.value)"><span class="unit">${e.perSide?'/side':'reps'}</span></td>
      <td class="ck"><button class="set-check ${x.done?'done':''}" aria-label="${x.done?'Undo':'Log'} set ${i+1}" onclick="toggleSetDone(${si},${ei},${i})">${x.done?icons.check:''}</button>${x.pr?'<span class="badge">new best</span>':''}</td>
    </tr>`);
  });
  return `<table class="sets run-sets"><thead><tr><th>Set</th><th>Weight</th><th>Reps</th><th class="r">Log</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
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
      <td>${e.equip==='Bodyweight'?'<span class="muted">bodyweight</span>':`<input class="set-input" type="number" inputmode="decimal" aria-label="Set ${i+1} lb" data-sid="hw-${si}-${i}" value="${x.weight||0}" onchange="editSet(${si},0,${i},'weight',this.value)"><span class="unit">lb</span>`}</td>
      <td class="num">${x.done?x.secs+' s':step.mode==='stopwatch'?(e.distanceM||40)+' m/side':x.secs+' s'}</td>
      <td class="ck">${x.done?`<button class="set-check done" aria-label="Undo set ${i+1}" onclick="toggleSetDone(${si},0,${i})">${icons.check}</button>`:`<button class="set-check go" aria-label="Start set ${i+1}" ${running?'disabled':''} onclick="startHold(${si},${i})">${icons.play}</button>`}</td>
    </tr>`).join('');
  return big+`<table class="sets run-sets"><thead><tr><th>Set</th><th>Weight</th><th>${step.mode==='stopwatch'?'Distance':'Hold'}</th><th class="r">Go</th></tr></thead><tbody>${rows}</tbody></table>
    ${!running&&next>=0?`<button class="btn btn-big" onclick="startHold(${si},${next})">Start set ${next+1}</button>`:''}`;
}

function renderInterval(step,si,t){
  const e=step.exs[0],running=t&&t.type==='interval'&&t.ctx.step===si,doneCount=e.sets.filter(x=>x.done).length;
  if(running){
    const st=intervalState(t),side=st.round%2===1?(step.sideLabel==='hand'?'Right hand':'Right side'):(step.sideLabel==='hand'?'Left hand':'Left side');
    return `<div class="big-wrap iv">
      <div class="iv-meta"><span class="eyebrow">Round</span><span class="num iv-round" id="iv-round">${st.round} / ${t.rounds}</span></div>
      <div class="iv-side">${side}</div>
      <div class="big-time num" id="big-time">${fmtClock(st.nextInMs)}</div>
      <div class="muted center">until next round · every ${t.every} s${t.pausedAt?' · paused':''}</div>
      <div class="ticks">${Array.from({length:t.rounds},(_,i)=>`<span class="${i+1<st.round?'past':i+1===st.round?'now':''}">${i%2?'L':'R'}</span>`).join('')}</div>
      <div class="row2"><button class="btn btn-outline" onclick="toggleTimerPause()">${t.pausedAt?'Resume':'Pause'}</button><button class="btn btn-ghost" onclick="stopIntervalEarly()">Stop + log</button></div>
    </div>`;
  }
  if(step.status==='done')return `<div class="done-note">${doneCount} of ${e.sets.length} rounds logged at ${e.sets[0].weight} kg.</div>
    <button class="btn btn-outline" onclick="startInterval(${si})">Run it again</button>`;
  return `<div class="ticks">${Array.from({length:step.rounds},(_,i)=>`<span>${i%2?'L':'R'}</span>`).join('')}</div>
    <p class="muted">A beep starts each round, with 3-2-1 beeps before the next. Bell: <b class="num">${e.sets[0].weight} kg</b>.</p>
    <button class="btn btn-big" onclick="startInterval(${si})">Start ${step.rounds} rounds</button>`;
}

function renderBlock(step,si,t){
  const running=t&&t.type==='block'&&t.ctx.step===si,set=step.exs[0].sets[0];
  if(running){
    const reached=timerElapsedMs(t)>=step.targetMin*60000;
    return `<div class="big-wrap">
      <div class="big-time num ${reached?'reached':''}" id="big-time">${fmtUp(timerElapsedMs(t))}</div>
      <div class="muted center">target ${step.targetMin}:00${reached?' · reached':''}${t.pausedAt?' · paused':''}</div>
      <div class="bar"><i id="block-bar" style="width:${Math.min(100,timerElapsedMs(t)/10/(step.targetMin*60))}%"></i></div>
      <div class="row2"><button class="btn btn-outline" onclick="toggleTimerPause()">${t.pausedAt?'Resume':'Pause'}</button><button class="btn" onclick="finishBlock(${si})">Done</button></div>
    </div>`;
  }
  if(set.done)return `<div class="done-note">Logged ${set.reps} min.</div>`;
  return `${step.note?`<p class="muted">${esc(step.note)}</p>`:''}
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
      ${step.status==='done'||step.status==='skipped'?'':`<button class="btn btn-ghost" onclick="skipStep()">Skip</button>`}
      ${last?`<button class="btn" onclick="askFinish()">Finish</button>`:`<button class="btn" onclick="goStep(${si+1})">Next</button>`}
    </div></div>`;
}

function renderFinishSheet(){
  const s=state.session,sets=s.steps.reduce((n,st)=>n+st.exs.reduce((m,e)=>m+e.sets.filter(x=>x.done).length,0),0);
  const left=s.steps.filter(x=>x.status==='todo').length;
  return `<div class="modal-overlay" onclick="if(event.target===this)closeSheet()"><div class="modal" role="dialog" aria-label="Finish session">
    <div class="modal-title">Finish ${esc(s.name)}?</div>
    <p class="muted mb-12">${sets} sets logged${left?` · ${left} step${left>1?'s':''} not done (they'll be saved as not done)`:''}.</p>
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
