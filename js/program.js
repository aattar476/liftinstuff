// ============================================================
// SKI SEASON BUILD: program engine
// ============================================================
// Pure functions: given a date and the program settings, work out which week
// it is and what every session prescribes. No DOM, no storage, so it can be
// tested on its own (see tests/program.test.js).
//
// Shape of the calendar (week index counted from the start date):
//   C1 W1-W4 (W4 = density) · Deload · C2 W1-W3 (W3 = density) · Trip
//   then it loops: C3 W1-W4 · Deload · C4 W1-W4 · Deload · ...
// Weight is fixed inside a cycle; sets/reps or density climb week to week.

const PROGRAM_START_DEFAULT='2026-10-26';

const DEFAULT_PROGRAM={
  key:'program',
  startDate:PROGRAM_START_DEFAULT,
  offsetWeeks:0,          // "Repeat this week" adds 1: the calendar slides back a week
  tripWeeks:1,
  cycleStarted:1,         // which cycle's weights are currently loaded
  W:{squat:0,bench:0,deadlift:0,ohp:0},
  acc:{latl:0,pud:0,carry:0,stepd:0,incl:0,row:0,pallof:0},
  accReady:{},            // accessories that hit the top of their rep range: suggest +weight
  kbKg:16,
  vestLb:10,
  cycleHistory:[],
};

const CYCLE_INCREMENTS={squat:10,deadlift:10,bench:5,ohp:5,kbKg:4,vestLb:5,acc:5};

// ---- dates (local calendar days, no time-of-day or DST surprises) ----
function parseDay(s){const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d,12)}
function fmtDay(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x}
function daysBetween(a,b){return Math.round((Date.UTC(b.getFullYear(),b.getMonth(),b.getDate())-Date.UTC(a.getFullYear(),a.getMonth(),a.getDate()))/864e5)}
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtRange(start,end){
  const a=MON[start.getMonth()]+' '+start.getDate();
  const b=(end.getMonth()===start.getMonth()?'':MON[end.getMonth()]+' ')+end.getDate();
  return a+' – '+b;
}

// ---- the week sequence ----
const FOCUS={
  'A0':'Learn the bell timing; 3 working sets on main lifts.',
  'A1':'Add a set to everything; same weights.',
  'A2':'Peak volume: full 5×5. Should feel about RPE 7.',
  'A3':'Density week: same work, 60 s rest. Swings hit the S&S 30 s standard.',
  'B0':'Heavier weights and bell. More jumps and longer wall sits.',
  'B1':'Add a set; keep landings crisp.',
  'B2':'Last hard week. 60 s rest on gym work.',
  deload:'Easy week. 2 sets of everything, light kettlebell daily.',
  trip:'Taper. Mobility and walks only; arrive fresh to ride.',
};

// Returns the week descriptor for a 0-based week index (null before the start).
function weekAt(idx,cfg){
  if(idx<0)return null;
  const tripWeeks=Math.max(1,cfg.tripWeeks||1);
  const seq=[];
  for(let i=0;i<4;i++)seq.push({cyc:1,i,kind:'build',pattern:'A'});
  seq.push({cyc:1,i:0,kind:'deload',pattern:'A'});
  for(let i=0;i<3;i++)seq.push({cyc:2,i,kind:'build',pattern:'B'});
  for(let i=0;i<tripWeeks;i++)seq.push({cyc:2,i,kind:'trip',pattern:'B'});
  let w;
  if(idx<seq.length)w={...seq[idx]};
  else{
    // After the trip: cycle-1 pattern (4 build weeks) + deload, repeating.
    const k=idx-seq.length,loop=Math.floor(k/5),pos=k%5;
    w=pos<4?{cyc:3+loop,i:pos,kind:'build',pattern:'A'}:{cyc:3+loop,i:0,kind:'deload',pattern:'A'};
  }
  w.idx=idx;
  w.dense=w.kind==='build'&&((w.pattern==='A'&&w.i===3)||(w.pattern==='B'&&w.i===2));
  w.id=w.kind==='build'?'c'+w.cyc+'w'+(w.i+1):w.kind==='deload'?'c'+w.cyc+'dl':'trip'+(w.i+1);
  w.label=w.kind==='build'?'C'+w.cyc+' · Wk '+(w.i+1):w.kind==='deload'?'Deload':(tripWeeks>1?'Trip '+(w.i+1):'Trip');
  w.short=w.kind==='build'?'C'+w.cyc+'W'+(w.i+1):w.kind==='deload'?'DL':'Trip';
  w.focus=w.kind==='build'?FOCUS[w.pattern+w.i]:FOCUS[w.kind];
  const start=addDays(programStart(cfg),idx*7);
  w.start=fmtDay(start);w.end=fmtDay(addDays(start,6));w.dates=fmtRange(start,addDays(start,6));
  return w;
}

function programStart(cfg){return addDays(parseDay(cfg.startDate||PROGRAM_START_DEFAULT),7*(cfg.offsetWeeks||0))}

// Week index and day-of-week (0 = Mon) for a date.
function locate(date,cfg){
  const days=daysBetween(programStart(cfg),date);
  return {weekIdx:Math.floor(days/7),dow:((days%7)+7)%7,before:days<0,daysUntil:-days};
}
function weekForDate(date,cfg){return weekAt(locate(date,cfg).weekIdx,cfg)}

// The weeks to show on the timeline: the current block (from the last cycle-1
// style start before today) through the next deload or trip, plus a little context.
function timelineWeeks(cfg,today){
  const cur=Math.max(0,locate(today,cfg).weekIdx);
  const first=cur<9?0:cur-((cur-9)%5);   // weeks 0-8 are the first block; then 5-week loops
  const count=first===0?9+Math.max(0,(cfg.tripWeeks||1)-1):5;
  const out=[];for(let i=0;i<count;i++)out.push(weekAt(first+i,cfg));
  return out;
}

// ---- prescriptions ----
function mainSets(w,isDeadlift){
  if(w.kind==='deload')return 2;
  if(w.pattern==='A')return isDeadlift?[2,3,4,4][w.i]:[3,4,5,5][w.i];
  return isDeadlift?[2,3,3][w.i]:[3,4,4][w.i];
}
function accReps(w){if(w.kind==='deload')return 8;return w.pattern==='A'?[8,10,12,12][w.i]:[8,10,10][w.i]}
function accSets(w){return w.kind==='deload'?2:3}
function accTopReps(w){return w.pattern==='A'?12:10}
function restSec(w){return w.dense?60:90}
const isB=w=>w.pattern==='B'&&w.kind==='build';   // "C2" specifics

function kbIntervals(w){
  if(w.kind!=='build')return null;
  const sw=w.pattern==='A'?[45,40,35,30][w.i]:[45,40,35][w.i];
  const tg=w.pattern==='A'?[75,70,65,60][w.i]:[75,70,65][w.i];
  return {swing:sw,tgu:tg};
}

const round5=x=>Math.round(x/5)*5;
function warmupRamp(work,isDeadlift){
  if(!work)return [];
  const ramp=[];
  if(!isDeadlift)ramp.push({weight:45,reps:10,label:'Empty bar'});
  for(const [pct,reps] of [[.4,5],[.6,3],[.8,2]]){
    const wt=Math.max(45,round5(work*pct));
    if(wt<work&&!ramp.some(r=>r.weight===wt))ramp.push({weight:wt,reps,label:Math.round(pct*100)+'%'});
  }
  return ramp;
}

// Exercise catalogue. libId links to the exercise library so history and
// personal bests line up with older logs of the same lift.
const PX={
  squat:{name:'Back squat',libId:'q1',body:'Quads',equip:'Barbell',cue:'Brace, sit between your heels, drive up through mid-foot.'},
  bench:{name:'Bench press',libId:'c1',body:'Chest',equip:'Barbell',cue:'Shoulder blades pinned, bar to lower chest, press back over the shoulders.'},
  deadlift:{name:'Deadlift',libId:'b4',body:'Back',equip:'Barbell',cue:'Bar over mid-foot, push the floor away, lock out with glutes.'},
  ohp:{name:'Overhead press',libId:'s1',body:'Shoulders',equip:'Barbell',cue:'Squeeze glutes, press straight up, head through at the top.'},
  box:{name:'Box jump',libId:'ssb_box',body:'Quads',equip:'Bodyweight',cue:'Land soft and quiet; step down, never jump down.'},
  latl:{name:'Lateral lunge',libId:'ssb_latlunge',body:'Quads',equip:'Dumbbell',cue:'Step wide, sit back into one hip, keep the other leg straight.'},
  wall:{name:'Wall sit',libId:'ssb_wallsit',body:'Quads',equip:'Bodyweight',cue:'Thighs parallel, back flat on the wall, breathe like you are riding.'},
  pullup:{name:'Pull-up',libId:'b18',body:'Back',equip:'Bodyweight',cue:'Dead hang to chin over bar; no kipping.'},
  dip:{name:'Dip',libId:'c18',body:'Chest',equip:'Bodyweight',cue:'Shoulders down, lower until upper arms are parallel.'},
  carry:{name:'Suitcase carry',libId:'ssb_carry',body:'Core',equip:'Dumbbell',cue:'Heavy dumbbell in one hand; walk tall without leaning.'},
  stepd:{name:'Step-down',libId:'ssb_stepdown',body:'Quads',equip:'Dumbbell',cue:'Lower the free heel to the floor slowly, knee tracking over toes.'},
  nordic:{name:'Nordic curl',libId:'h9',body:'Hamstrings',equip:'Bodyweight',cue:'Kneel with heels anchored, lower your torso slowly with your hamstrings. Use a band at first.'},
  incl:{name:'Incline bench',libId:'c2',body:'Chest',equip:'Barbell',cue:'Low incline, elbows slightly tucked, touch upper chest.'},
  row:{name:'Seated row',libId:'b13',body:'Back',equip:'Cable',cue:'Chest up, pull to the belly button, pause, control back.'},
  pallof:{name:'Pallof press',libId:'co7',body:'Core',equip:'Cable',cue:'Press the handle straight out and resist the twist.'},
  mobility:{name:'Mobility',libId:'ssb_mobility',body:'Core',equip:'Bodyweight',cue:'Hips, ankles, T-spine. Easy movement, no stretching to pain.'},
  inclwalk:{name:'Incline walk',libId:'cd2',body:'Cardio',equip:'Cardio Machine',isCardio:true,cue:'Steep incline, steady pace, no holding the rails.'},
  kbwarm:{name:'KB warm-up',libId:'ssb_mobility',body:'Core',equip:'Kettlebell',cue:'Halos, goblet squat pry, hip bridges.'},
  swing1:{name:'One-arm swing',libId:'h11',body:'Hamstrings',equip:'Kettlebell',cue:'Hike the bell back, snap the hips, float it to chest height.'},
  tgu:{name:'Turkish get-up',libId:'co20',body:'Core',equip:'Kettlebell',cue:'Eyes on the bell, arm locked, slow and deliberate both ways.'},
  swing2:{name:'Two-hand swing',libId:'h11',body:'Hamstrings',equip:'Kettlebell',cue:'Easy and crisp; hips do the work, arms are ropes.'},
  walk:{name:'Walk',libId:'ssb_walk',body:'Cardio',equip:'Bodyweight',isCardio:true,cue:'Easy pace, nose breathing.'},
  hike:{name:'Hike / ruck',libId:'ssb_hike',body:'Cardio',equip:'Bodyweight',isCardio:true,cue:'Pack on, hills if you can; slow on the downhills.'},
};

// Library entries for the new exercises (merged into the app's exercise list).
const PROGRAM_EXERCISES=[
  {id:'ssb_box',name:'Box Jump',body:'Quads',equip:'Bodyweight'},
  {id:'ssb_latlunge',name:'Lateral Lunge',body:'Quads',equip:'Dumbbell'},
  {id:'ssb_wallsit',name:'Wall Sit',body:'Quads',equip:'Bodyweight'},
  {id:'ssb_carry',name:'Suitcase Carry',body:'Core',equip:'Dumbbell'},
  {id:'ssb_stepdown',name:'Tempo Step-Down',body:'Quads',equip:'Dumbbell'},
  {id:'ssb_mobility',name:'Mobility',body:'Core',equip:'Bodyweight'},
  {id:'ssb_walk',name:'Walk',body:'Cardio',equip:'Bodyweight',isCardio:true},
  {id:'ssb_hike',name:'Hike / Ruck',body:'Cardio',equip:'Bodyweight',isCardio:true},
];

const MAIN_LIFTS=['squat','bench','deadlift','ohp'];
const ACCESSORIES={latl:'Lateral lunge (DB each hand)',pud:'Pull-up / dip added weight',carry:'Suitcase carry DB',stepd:'Step-down DB',incl:'Incline bench',row:'Seated row',pallof:'Pallof press'};
const KG_TO_LB=2.20462;

function ex(key,extra){
  const d=PX[key];
  return {key,exerciseId:d.libId,name:d.name,body:d.body,equip:d.equip,isCardio:!!d.isCardio,cue:d.cue,...extra};
}
function weightSets(n,weight,reps,extra){return Array.from({length:n},()=>({weight,reps,...extra}))}

// Each step is one screen in the runner. kinds:
//   weights  - set rows (weight × reps), rest countdown after each set
//   hold     - countdown (wall sit) or stopwatch (carry) per set, then rest
//   interval - fires every N s for 10 rounds (S&S), alternating sides
//   block    - count-up toward a target (mobility, walks, hikes)
function mainStep(key,w,cfg,{deadlift=false}={}){
  const W=cfg.W[key]||0,n=mainSets(w,deadlift);
  return {kind:'weights',title:PX[key].name,main:key,rest:restSec(w),
    rx:n+'×5'+(W?' @ '+W+' lb':' @ W'),warmup:warmupRamp(W,deadlift),
    exs:[ex(key,{unit:'lb',sets:weightSets(n,W,5)})]};
}
function accStep(key,accKey,w,cfg,{reps,sets,perSide,suffix,rest}={}){
  reps=reps??accReps(w);sets=sets??accSets(w);
  const wt=accKey?(cfg.acc[accKey]||0):0;
  return {kind:'weights',title:PX[key].name,acc:accKey,topReps:accKey?accTopReps(w):null,rest:rest??restSec(w),
    rx:sets+'×'+reps+(perSide?'/side':'')+(suffix||'')+(wt?' @ '+wt+' lb':''),
    exs:[ex(key,{unit:'lb',perSide:!!perSide,sets:weightSets(sets,wt,reps)})]};
}
function blockStep(key,mins,note){
  return {kind:'block',title:PX[key].name,targetMin:mins,rx:mins+' min'+(note?' · '+note:''),note,
    exs:[ex(key,{unit:'min',sets:[{reps:0}]})]};
}

const SESSION_META={
  lowerA:{name:'Lower A',sub:'Squat day',cat:'lower',slot:'pm',gym:true},
  upperA:{name:'Upper A',sub:'Bench day',cat:'upper',slot:'pm',gym:true},
  lowerB:{name:'Lower B',sub:'Deadlift day',cat:'lower',slot:'pm',gym:true},
  upperB:{name:'Upper B',sub:'Press day',cat:'upper',slot:'pm',gym:true},
  fullSS:{name:'Full S&S',sub:'Swings + get-ups on the clock',cat:'kb',slot:'am'},
  lightKB:{name:'Light KB',sub:'Get-ups + easy swings',cat:'kb',slot:'am'},
  hike:{name:'Long hike / ruck',sub:'60–120 min with pack',cat:'hike',slot:'am'},
  easyHike:{name:'Easy hike',sub:'60 min, light pack',cat:'hike',slot:'am'},
  walk:{name:'Easy walk',sub:'30 min',cat:'walk',slot:'am'},
  tripDay:{name:'Walk + mobility',sub:'Keep it easy',cat:'walk',slot:'am'},
};

function buildSession(id,w,cfg){
  const meta=SESSION_META[id];if(!meta||!w)return null;
  const dl=w.kind==='deload',b=isB(w),steps=[];
  const gymTail=()=>steps.push(blockStep('inclwalk',dl?20:25,dl?'easy, no vest':'vest '+(cfg.vestLb||0)+' lb'));
  if(meta.gym){
    if(w.kind==='trip')return {...meta,id,week:w,steps:[],taper:true};
    steps.push(blockStep('mobility',10));
    if(id==='lowerA'){
      const s=dl?2:b?4:3;
      steps.push(accStep('box',null,w,cfg,{sets:s,reps:5,rest:60}));
      steps.push(mainStep('squat',w,cfg));
      steps.push(accStep('latl','latl',w,cfg,{perSide:true}));
      const hold=dl?45:b?90:60;
      steps.push({kind:'hold',mode:'countdown',title:PX.wall.name,rest:60,rx:'2×'+hold+' s',
        exs:[ex('wall',{unit:'s',sets:Array.from({length:2},()=>({weight:0,secs:hold}))})]});
    }else if(id==='upperA'){
      steps.push(mainStep('bench',w,cfg));
      const s=dl?2:3,add=cfg.acc.pud||0;
      steps.push({kind:'weights',title:'Pull-up + dip superset',acc:'pud',topReps:null,rest:restSec(w),superset:true,
        rx:s+'×6 each'+(add?' +'+add+' lb':''),
        exs:[ex('pullup',{unit:'lb',sets:weightSets(s,add,6)}),ex('dip',{unit:'lb',sets:weightSets(s,add,6)})]});
      const cs=dl?2:3,cw=cfg.acc.carry||0;
      steps.push({kind:'hold',mode:'stopwatch',title:PX.carry.name,acc:'carry',rest:60,rx:cs+'×40 m/side'+(cw?' @ '+cw+' lb':''),
        exs:[ex('carry',{unit:'s',perSide:true,distanceM:40,sets:Array.from({length:cs},()=>({weight:cw,secs:0}))})]});
    }else if(id==='lowerB'){
      steps.push(mainStep('deadlift',w,cfg,{deadlift:true}));
      const lower=b?5:4;
      steps.push(accStep('stepd','stepd',w,cfg,{reps:Math.min(10,accReps(w)),perSide:true,suffix:' · '+lower+' s lower'}));
      steps[steps.length-1].topReps=10;
      let s,r;
      if(dl){s=2;r=3}else if(w.pattern==='A'){[s,r]=[[2,3],[3,3],[3,4],[3,5]][w.i]}else{s=3;r=5}
      steps.push(accStep('nordic',null,w,cfg,{sets:s,reps:r,rest:90}));
    }else if(id==='upperB'){
      steps.push(mainStep('ohp',w,cfg));
      steps.push(accStep('incl','incl',w,cfg));
      steps.push(accStep('row','row',w,cfg));
      steps.push(accStep('pallof','pallof',w,cfg,{sets:2,reps:10,perSide:true,rest:45}));
      steps[steps.length-1].topReps=null;
    }
    gymTail();
  }else if(id==='fullSS'){
    const iv=kbIntervals(w)||{swing:45,tgu:75},kg=cfg.kbKg||0;
    steps.push(blockStep('kbwarm',5));
    steps.push({kind:'interval',title:'Swings: 10 × 10',every:iv.swing,rounds:10,sideLabel:'hand',restAfter:60,
      rx:'10 sets of 10, every '+iv.swing+' s · '+kg+' kg',exs:[ex('swing1',{unit:'kg',sets:weightSets(10,kg,10)})]});
    steps.push({kind:'interval',title:'Get-ups: 10 singles',every:iv.tgu,rounds:10,sideLabel:'side',
      rx:'1 every '+iv.tgu+' s · '+kg+' kg',exs:[ex('tgu',{unit:'kg',sets:weightSets(10,kg,1)})]});
    steps.push(blockStep('walk',30));
  }else if(id==='lightKB'){
    const kg=cfg.kbKg||0;
    steps.push({kind:'weights',title:'Turkish get-up',rest:0,rx:'10 singles, no clock · '+kg+' kg',
      exs:[ex('tgu',{unit:'kg',sets:weightSets(1,kg,10)})]});
    steps.push({kind:'weights',title:'Two-hand swing',rest:0,rx:'5×10 easy · '+kg+' kg',
      exs:[ex('swing2',{unit:'kg',sets:weightSets(5,kg,10)})]});
    steps.push(blockStep('walk',30));
  }else if(id==='hike')steps.push(blockStep('hike',90,'60–120 min with pack'));
  else if(id==='easyHike')steps.push(blockStep('hike',60,'light pack'));
  else if(id==='walk')steps.push(blockStep('walk',30));
  else if(id==='tripDay'){steps.push(blockStep('mobility',20));steps.push(blockStep('walk',30))}
  return {...meta,id,week:w,steps,estMin:estimateMinutes(steps,w)};
}

// Rough session length, same assumptions as the design reference:
// 90 s between exercises, ~25 s per main-lift set, warm-up ramp 5 min.
function estimateMinutes(steps,w){
  let sec=0,lift=0,liftCount=0,mob=0,cardio=0;
  for(const s of steps){
    if(s.kind==='block'){const m=s.targetMin*60;if(s.exs[0].key==='inclwalk'||s.exs[0].key==='walk'||s.exs[0].key==='hike')cardio+=m;else mob+=m;continue}
    const n=s.exs[0].sets.length,r=s.rest||0;let t=0;
    if(s.kind==='interval')t=s.every*s.rounds+(s.restAfter||0);
    else if(s.kind==='hold')t=n*(s.exs[0].sets[0].secs||60)*(s.exs[0].perSide?2:1)+(n-1)*r;
    else{
      const reps=s.exs[0].sets[0].reps||5,perRep=s.main?5:s.superset?4.5:4;
      t=n*reps*perRep*(s.exs[0].perSide?2:1)*s.exs.length+(n-1)*r+(s.main?300:0);
    }
    lift+=t;liftCount++;
  }
  if(liftCount>1)lift+=(liftCount-1)*90;
  sec=mob+lift+cardio;
  return {total:Math.round(sec/60),mob:Math.round(mob/60),lift:Math.round(lift/60),cardio:Math.round(cardio/60)};
}

// AM/PM plan for each day of a week (index 0 = Monday). null = nothing.
function weekLayout(w){
  if(!w)return [];
  if(w.kind==='trip')return Array.from({length:7},()=>({am:'tripDay',pm:null}));
  if(w.kind==='deload')return [
    {am:'lightKB',pm:'lowerA'},{am:'lightKB',pm:'upperA'},{am:'lightKB',pm:null},
    {am:'lightKB',pm:'lowerB'},{am:'lightKB',pm:'upperB'},{am:'easyHike',pm:null},{am:'walk',pm:'rest'}];
  return [
    {am:'lightKB',pm:'lowerA'},{am:'fullSS',pm:'upperA'},{am:'fullSS',pm:null},
    {am:'lightKB',pm:'lowerB'},{am:'fullSS',pm:'upperB'},{am:'hike',pm:null},{am:'walk',pm:'rest'}];
}

function todayPlan(date,cfg){
  const loc=locate(date,cfg);
  const w=weekAt(loc.weekIdx,cfg);
  if(!w)return {before:true,daysUntil:loc.daysUntil,week:null};
  const day=weekLayout(w)[loc.dow];
  return {week:w,dow:loc.dow,am:day.am,pm:day.pm};
}

// The cycle whose weights this week uses (deloads keep the previous cycle's).
function needsNextCycle(w,cfg){return !!w&&w.kind==='build'&&w.cyc>(cfg.cycleStarted||1)}

function nextCycleProposal(cfg){
  const acc={};
  for(const k of Object.keys(ACCESSORIES))acc[k]=(cfg.acc[k]||0)+(cfg.accReady&&cfg.accReady[k]?CYCLE_INCREMENTS.acc:0);
  return {
    cycle:(cfg.cycleStarted||1)+1,
    W:{squat:(cfg.W.squat||0)+CYCLE_INCREMENTS.squat,deadlift:(cfg.W.deadlift||0)+CYCLE_INCREMENTS.deadlift,
       bench:(cfg.W.bench||0)+CYCLE_INCREMENTS.bench,ohp:(cfg.W.ohp||0)+CYCLE_INCREMENTS.ohp},
    acc,kbKg:(cfg.kbKg||0)+CYCLE_INCREMENTS.kbKg,vestLb:(cfg.vestLb||0)+CYCLE_INCREMENTS.vestLb,
  };
}

// Double progression: every set of an accessory reached the top of its range.
function hitTopOfRange(step,loggedSets){
  if(!step.acc||!step.topReps)return false;
  const sets=loggedSets.filter(s=>s.done);
  return sets.length>=step.exs[0].sets.length&&sets.every(s=>(s.reps||0)>=step.topReps);
}

if(typeof module!=='undefined')module.exports={DEFAULT_PROGRAM,CYCLE_INCREMENTS,PX,PROGRAM_EXERCISES,MAIN_LIFTS,ACCESSORIES,KG_TO_LB,
  parseDay,fmtDay,addDays,weekAt,locate,weekForDate,timelineWeeks,mainSets,accReps,accSets,restSec,kbIntervals,warmupRamp,
  buildSession,weekLayout,todayPlan,needsNextCycle,nextCycleProposal,hitTopOfRange,SESSION_META,estimateMinutes};
