// ============================================================
// HISTORY, PROGRESS, MORE (settings + data)
// ============================================================

const MAIN_LIB_IDS=['q1','c1','b4','s1'];
const workoutDurationSec=w=>w.durationSec||(w.totalDuration?w.totalDuration*60:(w.endTime?Math.floor((new Date(w.endTime)-new Date(w.startTime))/1000):0));
const doneSets=w=>w.exercises.reduce((n,e)=>n+(e.sets||[]).filter(s=>s.done).length,0);
const workoutColor=w=>w.program?CAT_COLOR[w.program.cat]||'var(--accent)':'var(--line)';

// ---- history ----
function renderHistory(){
  const all=[...state.workouts].sort((a,b)=>new Date(b.startTime)-new Date(a.startTime));
  if(all.length===0)return '<div class="empty-state"><p>No sessions logged yet.</p></div>';
  let html='',month='';
  for(const w of all){
    const d=new Date(w.startTime),m=d.toLocaleDateString('en-US',{month:'long',year:'numeric'});
    if(m!==month){html+=`<h2 class="month-h">${m}</h2>`;month=m}
    const dur=workoutDurationSec(w);
    html+=`<button class="hist-row" style="--c:${workoutColor(w)}" onclick="viewWorkout('${w.id}')">
      <span class="hist-date num">${d.toLocaleDateString('en-US',{weekday:'short',day:'numeric'})}</span>
      <span class="hist-main"><b>${esc(w.name)}</b>${w.program?`<i>${esc(w.program.weekLabel)}</i>`:''}</span>
      <span class="hist-meta num">${dur?fmtDuration(dur):'–'}<br>${doneSets(w)} set${doneSets(w)===1?'':'s'}</span></button>`;
  }
  return html;
}

// ---- progress ----
function setLbOf(e,s){return (s.weight||0)*(e.unit==='kg'?KG_TO_LB:1)}
function isWeightedLog(e){return !e.isCardio&&e.unit!=='s'&&e.unit!=='min'}

// Heaviest set per session for one exercise (more reps breaks a tie).
function topSets(exerciseId){
  const out=[];
  for(const w of state.workouts){
    let top=null;
    for(const e of w.exercises){
      if(e.exerciseId!==exerciseId||!isWeightedLog(e))continue;
      for(const s of e.sets||[]){
        if(!s.done||!(s.weight>0))continue;
        const lb=setLbOf(e,s);
        if(!top||lb>top.lb||(lb===top.lb&&(s.reps||0)>top.reps))top={lb,weight:s.weight,unit:e.unit==='kg'?'kg':'lb',reps:s.reps||0,date:w.startTime,workout:w.name,wid:w.id};
      }
    }
    if(top)out.push(top);
  }
  out.sort((a,b)=>new Date(a.date)-new Date(b.date));
  let best=null;
  for(const t of out){if(!best||t.lb>best.lb||(t.lb===best.lb&&t.reps>best.reps)){t.best=true;best=t}}
  return out;
}

function liftList(){
  const ids=new Map();
  for(const w of state.workouts)for(const e of w.exercises)
    if(isWeightedLog(e)&&(e.sets||[]).some(s=>s.done&&s.weight>0))ids.set(e.exerciseId,e.name);
  const rows=[...ids].map(([id,name])=>{const t=topSets(id);return {id,name,tops:t,best:t.filter(x=>x.best).pop(),last:t[t.length-1]}});
  rows.sort((a,b)=>(MAIN_LIB_IDS.indexOf(b.id)>=0)-(MAIN_LIB_IDS.indexOf(a.id)>=0)||new Date(b.last.date)-new Date(a.last.date));
  return rows;
}

function renderProgress(){
  const weekW=state.workouts.filter(w=>new Date(w.startTime)>=getMonday(new Date()));
  const vol=weekW.reduce((s,w)=>s+calcVolume(w),0);
  const lifts=liftList();
  const bw=[...state.bodyweights].sort((a,b)=>a.date.localeCompare(b.date)),latest=bw[bw.length-1];
  const monthW=state.workouts.filter(w=>{const d=new Date(w.startTime),n=new Date();return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear()});
  const bp=getSetsPerBodyPart(monthW),bpMax=Math.max(1,...Object.values(bp));
  return `<div class="stats3">
      <div class="stat"><span class="num">${weekW.length}</span><small>sessions this week</small></div>
      <div class="stat"><span class="num">${weekW.reduce((s,w)=>s+doneSets(w),0)}</span><small>sets</small></div>
      <div class="stat"><span class="num">${vol>=1000?(vol/1000).toFixed(1)+'k':Math.round(vol)}</span><small>lb volume</small></div>
    </div>
    <section><div class="sec-head"><h2>Lifts</h2><span class="eyebrow">top set · best</span></div>
      ${lifts.length?lifts.map(l=>`<button class="lift-row" onclick="openLift('${l.id}')">
        <span><b>${esc(l.name)}</b><i>${l.tops.length} session${l.tops.length>1?'s':''}</i></span>
        ${sparkline(l.tops.map(t=>t.lb))}
        <span class="num">${l.last.weight}×${l.last.reps}<br><small class="muted">best ${l.best.weight}×${l.best.reps}</small></span></button>`).join('')
        :'<p class="muted">Log some sets to see your lifts here.</p>'}
    </section>
    <section><div class="sec-head"><h2>Body weight</h2>${latest?`<span class="num">${latest.weight} lb</span>`:''}</div>
      <div class="inline-form"><input type="number" data-sid="bw-prog" placeholder="Weight (lb)" inputmode="decimal" aria-label="Body weight in pounds"><button class="btn btn-sm" onclick="logBW('bw-prog')">Log</button></div>
      ${bw.length>1?`<div class="chart">${svgLineChart(bw.map(b=>({x:new Date(b.date+'T12:00'),y:b.weight})),{unit:'lb'})}</div>`:''}
    </section>
    <section><div class="sec-head"><h2>Sets by body part</h2><span class="eyebrow">this month</span></div>
      <div class="bars">${BODY_PARTS.filter(b=>bp[b]>0).map(b=>`<div class="bar-row"><span>${b}</span><span class="bar"><i style="width:${bp[b]/bpMax*100}%"></i></span><span class="num">${bp[b]}</span></div>`).join('')||'<p class="muted">Nothing logged this month.</p>'}</div>
    </section>`;
}

const shortDate=d=>{const x=new Date(d);return x.toLocaleDateString('en-US',x.getFullYear()===new Date().getFullYear()?{month:'short',day:'numeric'}:{month:'short',day:'numeric',year:'2-digit'})};
function openLift(id){state._liftId=id;state.subPage='lift';render()}
function renderLiftDetail(){
  const id=state._liftId,tops=topSets(id),ex=getAllExercises().find(e=>e.id===id);
  if(!tops.length)return '<p class="muted">No logged sets yet.</p>';
  const best=tops.filter(t=>t.best).pop();
  return `<div class="sel-banner"><strong>${esc(ex?ex.name:tops[0].workout)}</strong><span class="num">best ${best.weight} ${best.unit} × ${best.reps}</span><span class="focus">${tops.length} sessions</span></div>
    <div class="chart">${svgLineChart(tops.map(t=>({x:new Date(t.date),y:t.lb,best:t.best})),{unit:'lb'})}</div>
    <table class="sets"><thead><tr><th>Date</th><th>Top set</th><th>Session</th></tr></thead><tbody>
    ${tops.slice().reverse().map(t=>`<tr><td class="num">${shortDate(t.date)}</td><td class="rx">${t.weight} ${t.unit} × ${t.reps}${t.best?'<span class="badge">new best</span>':''}</td><td class="muted"><button class="link" onclick="viewWorkout('${t.wid}')">${esc(t.workout)}</button></td></tr>`).join('')}
    </tbody></table>`;
}

// Hand-drawn SVG charts. Colours come from CSS variables, so they follow light/dark mode.
function svgLineChart(pts,{unit=''}={}){
  const W=340,H=170,pl=36,pr=10,pt=14,pb=24;
  if(pts.length===1)pts=[pts[0],{...pts[0],x:new Date(pts[0].x.getTime()+864e5)}];
  const xs=pts.map(p=>p.x.getTime()),ys=pts.map(p=>p.y);
  let lo=Math.min(...ys),hi=Math.max(...ys);if(hi-lo<10){const m=(hi+lo)/2;lo=m-5;hi=m+5}
  const pad=(hi-lo)*.1;lo-=pad;hi+=pad;
  const x0=Math.min(...xs),x1=Math.max(...xs)||x0+1;
  const X=x=>pl+(x-x0)/((x1-x0)||1)*(W-pl-pr),Y=y=>pt+(1-(y-lo)/(hi-lo))*(H-pt-pb);
  const ticks=[lo+pad,(lo+hi)/2,hi-pad].map(v=>Math.round(v));
  const path=pts.map((p,i)=>(i?'L':'M')+X(p.x.getTime()).toFixed(1)+' '+Y(p.y).toFixed(1)).join(' ');
  const fmt=d=>d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Progress chart, ${Math.round(ys[0])} to ${Math.round(ys[ys.length-1])} ${unit}">
    ${ticks.map(v=>`<line x1="${pl}" x2="${W-pr}" y1="${Y(v)}" y2="${Y(v)}" class="grid"/><text x="${pl-6}" y="${Y(v)+3}" text-anchor="end">${v}</text>`).join('')}
    <path d="${path}" class="line"/>
    ${pts.map(p=>`<circle cx="${X(p.x.getTime())}" cy="${Y(p.y)}" r="${p.best?4.5:3}" class="${p.best?'pt best':'pt'}"/>`).join('')}
    <text x="${pl}" y="${H-6}">${fmt(pts[0].x)}</text><text x="${W-pr}" y="${H-6}" text-anchor="end">${fmt(pts[pts.length-1].x)}</text>
  </svg>`;
}
function sparkline(vals){
  if(vals.length<2)return '<span class="spark"></span>';
  const W=72,H=22,lo=Math.min(...vals),hi=Math.max(...vals),r=(hi-lo)||1;
  const d=vals.map((v,i)=>(i?'L':'M')+(i/(vals.length-1)*W).toFixed(1)+' '+(H-2-(v-lo)/r*(H-4)).toFixed(1)).join(' ');
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" aria-hidden="true"><path d="${d}" class="line"/></svg>`;
}

// ---- more (settings, data) ----
function renderMore(){
  const a=alertPrefs,p=state.program;
  const tog=(k,label,note)=>`<label class="toggle-row"><span>${label}${note?`<small class="muted">${note}</small>`:''}</span><input type="checkbox" ${a[k]?'checked':''} onchange="setAlert('${k}',this.checked)"></label>`;
  const archive=state.templatesArchive;
  return `<section><h2>Program</h2>
      <button class="list-row" onclick="openProgramSettings()"><span><b>Weights &amp; calendar</b><i>Cycle ${p.cycleStarted} · squat ${p.W.squat} · bench ${p.W.bench} · dead ${p.W.deadlift} · OHP ${p.W.ohp}</i></span><span>›</span></button>
      <button class="list-row" onclick="openNextCycle()"><span><b>Start next cycle</b><i>Apply the jumps and edit before confirming</i></span><span>›</span></button>
    </section>
    <section><h2>Timer alerts</h2>
      <div class="card">
        ${tog('sound','Sound','Beeps at 3-2-1 and at the end')}
        ${tog('vibrate','Vibration',('vibrate' in navigator)?'':'Not supported on this device (iPhone)')}
        ${tog('flash','Screen flash','')}
        <button class="btn btn-outline mt-8" onclick="unlockAudio();alertEnd()">Test alert</button>
      </div>
    </section>
    <section><h2>Other training</h2>
      <button class="list-row" onclick="beginWorkoutSetup(null)"><span><b>Quick workout</b><i>Log anything outside the program</i></span><span>›</span></button>
      <button class="list-row" onclick="openNorwegian()"><span><b>Norwegian 4×4 timer</b><i>Warm-up, 4 × 4 min hard / 3 min easy, cool-down. Saves to history.</i></span><span>›</span></button>
      <button class="list-row" onclick="setState({subPage:'goals'})"><span><b>Goals</b><i>Week, month and quarter targets</i></span><span>›</span></button>
      <button class="list-row" onclick="setState({subPage:'library'})"><span><b>Exercise library</b><i>${getAllExercises().length} exercises</i></span><span>›</span></button>
      <label class="field"><span>Rest timer for quick workouts</span><span class="field-in"><input type="number" inputmode="numeric" data-sid="rest-default" value="${state.defaultRestTime}" onchange="saveRestDefault(this.value)"><span class="unit">s</span></span></label>
    </section>
    <section><h2>Your data</h2>
      <div class="card">
        <p class="muted mb-8">Everything lives on this phone${fbDb?' and is backed up to Firebase':''}. ${state.lastExport?'Last export: '+fmtDate(state.lastExport)+'.':'Not exported yet.'} ${state.storagePersisted?'Storage is marked persistent.':'The browser may clear storage if the phone runs low on space.'}</p>
        <button class="btn mb-8" onclick="exportData()">Export all data</button>
        <label class="btn btn-outline">Import from a file<input type="file" accept="application/json,.json" style="display:none" onchange="pickImport(event)"></label>
      </div>
      ${state.backups.length?`<div class="card"><h3>Saved backups on this phone</h3>${state.backups.map(b=>`<div class="kv"><span>${esc(b.reason||'Backup')}<small class="muted">${fmtDate(b.createdAt)}</small></span><button class="btn btn-sm btn-outline" onclick="downloadBackup('${b.id}')">Download</button></div>`).join('')}</div>`:''}
      ${archive.length?`<details class="card"><summary>Old templates (${archive.length}, read-only)</summary>${archive.map(t=>`<div class="kv"><span>${esc(t.name)}</span><span class="muted">${(t.exercises||[]).map(e=>esc(e.name)).join(', ')}</span></div>`).join('')}</details>`:''}
    </section>
    ${state._import?renderImportSheet():''}
    <p class="foot muted">LiftinStuff · Ski Season Build</p>`;
}

async function setAlert(k,v){alertPrefs[k]=v;await dbPut('settings',{key:'alerts',value:{...alertPrefs}})}
async function saveRestDefault(v){state.defaultRestTime=parseInt(v)||90;await dbPut('settings',{key:'defaultRestTime',value:state.defaultRestTime})}
function downloadBackup(id){const b=state.backups.find(x=>x.id===id);if(b)downloadJSON(b,'liftinstuff-'+b.id+'.json')}

// Import: read and check the file first, then confirm on the page before replacing anything.
async function pickImport(e){
  const file=e.target.files[0];e.target.value='';if(!file)return;
  try{
    const parsed=normalizeImport(JSON.parse(await file.text()));
    const counts=Object.fromEntries(Object.entries(parsed.stores).map(([k,v])=>[k,v.length]));
    state._import={name:file.name,parsed,counts};render();
  }catch(err){toast('Could not read that file: '+err.message)}
}
function renderImportSheet(){
  const c=state._import.counts,label={workouts:'workouts',bodyweight:'body-weight entries',goals:'goals',settings:'settings',exercises:'custom exercises',templatesArchive:'old templates',templates:'templates',activeSession:'in-progress session'};
  return `<div class="modal-overlay" onclick="if(event.target===this){state._import=null;render()}"><div class="modal" role="dialog" aria-label="Confirm import">
    <div class="modal-title">Replace data from ${esc(state._import.name)}?</div>
    <p class="muted mb-8">This file contains:</p>
    <ul class="rx-list mb-12">${Object.entries(c).map(([k,n])=>`<li><span>${label[k]||k}</span><span class="num">${n}</span></li>`).join('')}</ul>
    <p class="muted mb-12">Each of those is replaced by the file's copy (settings are merged, so your program weights stay unless the file has its own). Export first if you want to keep what's on the phone now.</p>
    <button class="btn btn-danger mb-8" onclick="confirmImport()">Replace and reload</button>
    <button class="btn btn-outline" onclick="state._import=null;render()">Cancel</button>
  </div></div>`;
}
async function confirmImport(){
  try{await replaceStores(state._import.parsed.stores);location.reload()}
  catch(err){state._import=null;toast('Import failed, nothing changed: '+err.message);render()}
}
