// Run with: node tests/program.test.js
// Checks the program engine against the calendar table in the update spec.
const assert=require('node:assert/strict');
const P=require('../js/program.js');

const cfg={...P.DEFAULT_PROGRAM,W:{squat:200,bench:150,deadlift:250,ohp:100},acc:{latl:30,pud:0,carry:50,stepd:0,incl:95,row:100,pallof:30},kbKg:20,vestLb:15};
const at=s=>P.parseDay(s);
const rxOf=(sess,key)=>{const st=sess.steps.find(s=>s.exs.some(e=>e.key===key));return st};
const setsReps=(st,i=0)=>st.exs[i].sets.length+'×'+(st.exs[i].sets[0].reps??st.exs[i].sets[0].secs);

// Spec table: week | a date in it | type | main | deadlift | accessories | rest
const TABLE=[
  ['C1 · Wk 1','2026-10-26','build','3×5','2×5','3×8',90],
  ['C1 · Wk 2','2026-11-04','build','4×5','3×5','3×10',90],
  ['C1 · Wk 3','2026-11-15','build','5×5','4×5','3×12',90],
  ['C1 · Wk 4','2026-11-16','build','5×5','4×5','3×12',60],
  ['Deload','2026-11-26','deload','2×5','2×5','2×8',90],
  ['C2 · Wk 1','2026-11-30','build','3×5','2×5','3×8',90],
  ['C2 · Wk 2','2026-12-13','build','4×5','3×5','3×10',90],
  ['C2 · Wk 3','2026-12-14','build','4×5','3×5','3×10',60],
];
let n=0;
for(const [label,date,kind,main,dl,acc,rest] of TABLE){
  const w=P.weekForDate(at(date),cfg);
  assert.equal(w.label,label,date);assert.equal(w.kind,kind,label);
  const lowerA=P.buildSession('lowerA',w,cfg),upperA=P.buildSession('upperA',w,cfg),lowerB=P.buildSession('lowerB',w,cfg),upperB=P.buildSession('upperB',w,cfg);
  for(const [s,k] of [[lowerA,'squat'],[upperA,'bench'],[upperB,'ohp']]){
    const st=rxOf(s,k);assert.equal(setsReps(st),main,label+' '+k);assert.equal(st.rest,rest,label+' rest');
    assert.equal(st.exs[0].sets[0].weight,cfg.W[k],label+' weight fixed at W');
  }
  assert.equal(setsReps(rxOf(lowerB,'deadlift')),dl,label+' deadlift');
  assert.equal(setsReps(rxOf(lowerA,'latl')),acc,label+' lateral lunge');
  assert.equal(setsReps(rxOf(upperB,'incl')),acc,label+' incline');
  assert.equal(setsReps(rxOf(upperB,'row')),acc,label+' row');
  assert.equal(rxOf(upperB,'incl').rest,rest,label+' acc rest');
  // Session order: mobility 10 → lifting → incline walk 25 (20, no vest, in deload)
  for(const s of [lowerA,upperA,lowerB,upperB]){
    assert.equal(s.steps[0].exs[0].key,'mobility');assert.equal(s.steps[0].targetMin,10);
    const last=s.steps[s.steps.length-1];assert.equal(last.exs[0].key,'inclwalk');
    assert.equal(last.targetMin,kind==='deload'?20:25,label+' walk');
    assert.equal(/no vest/.test(last.note),kind==='deload');
  }
  n++;
}

// Trip week: no lifting, every day walks + mobility.
const trip=P.weekForDate(at('2026-12-21'),cfg);
assert.equal(trip.kind,'trip');assert.equal(P.buildSession('lowerA',trip,cfg).steps.length,0);
assert.ok(P.weekLayout(trip).every(d=>d.am==='tripDay'&&d.pm===null));
// After the trip the program loops into a new cycle with the cycle-1 pattern.
const after=P.weekForDate(at('2026-12-28'),cfg);
assert.equal(after.label,'C3 · Wk 1');assert.equal(setsReps(rxOf(P.buildSession('lowerA',after,cfg),'squat')),'3×5');
assert.equal(P.weekForDate(at('2027-01-18'),cfg).dense,true);  // C3 W4 is density
assert.equal(P.weekForDate(at('2027-01-25'),cfg).kind,'deload');
assert.equal(P.weekForDate(at('2027-02-01'),cfg).label,'C4 · Wk 1');

// Session-specific progressions.
const W=d=>P.weekForDate(at(d),cfg);
const box=d=>setsReps(rxOf(P.buildSession('lowerA',W(d),cfg),'box'));
assert.equal(box('2026-10-26'),'3×5');assert.equal(box('2026-11-23'),'2×5');assert.equal(box('2026-11-30'),'4×5');
assert.equal(rxOf(P.buildSession('lowerA',W('2026-10-26'),cfg),'box').rest,60);
const wall=d=>setsReps(rxOf(P.buildSession('lowerA',W(d),cfg),'wall'));
assert.equal(wall('2026-10-26'),'2×60');assert.equal(wall('2026-11-23'),'2×45');assert.equal(wall('2026-12-07'),'2×90');
const nordic=d=>setsReps(rxOf(P.buildSession('lowerB',W(d),cfg),'nordic'));
assert.deepEqual(['2026-10-26','2026-11-02','2026-11-09','2026-11-16'].map(nordic),['2×3','3×3','3×4','3×5']);
assert.equal(nordic('2026-11-30'),'3×5');assert.equal(nordic('2026-11-23'),'2×3');
assert.equal(rxOf(P.buildSession('lowerB',W('2026-10-26'),cfg),'nordic').rest,90);
const stepd=d=>rxOf(P.buildSession('lowerB',W(d),cfg),'stepd');
assert.equal(setsReps(stepd('2026-11-09')),'3×10');                    // capped at 10 reps
assert.match(stepd('2026-10-26').rx,/4 s lower/);assert.match(stepd('2026-11-30').rx,/5 s lower/);
const sup=rxOf(P.buildSession('upperA',W('2026-10-26'),cfg),'pullup');
assert.equal(sup.exs.length,2);assert.equal(setsReps(sup,0),'3×6');assert.equal(setsReps(sup,1),'3×6');
const carry=rxOf(P.buildSession('upperA',W('2026-10-26'),cfg),'carry');
assert.equal(carry.exs[0].sets.length,3);assert.equal(carry.rest,60);assert.match(carry.rx,/40 m\/side/);
const pallof=rxOf(P.buildSession('upperB',W('2026-10-26'),cfg),'pallof');
assert.equal(setsReps(pallof),'2×10');assert.equal(pallof.rest,45);

// Kettlebell intervals (swing / get-up seconds).
const iv=d=>{const s=P.buildSession('fullSS',W(d),cfg);return s.steps.filter(x=>x.kind==='interval').map(x=>x.every).join('/')};
assert.deepEqual(['2026-10-26','2026-11-02','2026-11-09','2026-11-16'].map(iv),['45/75','40/70','35/65','30/60']);
assert.deepEqual(['2026-11-30','2026-12-07','2026-12-14'].map(iv),['45/75','40/70','35/65']);
const ss=P.buildSession('fullSS',W('2026-10-26'),cfg);
assert.deepEqual(ss.steps.map(s=>s.kind+':'+(s.targetMin||s.rounds)),['block:3','interval:10','interval:10','block:4']);
assert.ok(ss.estMin.total<=30,'S&S morning under 30 min: '+ss.estMin.total);
assert.equal(ss.steps[1].restAfter,60);
const light=P.buildSession('lightKB',W('2026-10-26'),cfg);
assert.equal(setsReps(light.steps[1]),'1×10');assert.equal(setsReps(light.steps[2]),'5×10');
assert.deepEqual(light.steps.map(s=>s.exs[0].key),['kbwarm','tgu','swing2','deadbug','sideplank','hollow','stretch']);
assert.ok(light.estMin.total<=30,'light KB morning under 30 min: '+light.estMin.total);
assert.ok(!light.steps.some(s=>s.exs[0].key==='walk'),'no walk on KB mornings');
// Abs: holds +5 s per build week; Sunday has 3 rounds.
const sideHold=d=>P.buildSession('lightKB',W(d),cfg).steps.find(s=>s.exs[0].key==='sideplank').exs[0].sets[0].secs;
assert.deepEqual(['2026-10-26','2026-11-02','2026-11-16','2026-11-23'].map(sideHold),[30,35,45,30]);
const sun=P.buildSession('absStretch',W('2026-10-26'),cfg);
assert.equal(sun.steps.find(s=>s.exs[0].key==='deadbug').exs[0].sets.length,3);
assert.ok(sun.estMin.total<=25,'Sunday abs + stretch ~20 min: '+sun.estMin.total);

// Weekly layout.
const L=P.weekLayout(W('2026-10-26')).map(d=>d.am+'/'+d.pm);
assert.deepEqual(L,['lightKB/lowerA','fullSS/upperA','fullSS/null','lightKB/lowerB','fullSS/upperB','hike/null','absStretch/rest']);
assert.equal(P.weekLayout(W('2026-11-23'))[6].am,'absStretch');
assert.ok(P.weekLayout(W('2026-11-23')).slice(0,5).every(d=>d.am==='lightKB'));  // deload: light KB every weekday morning

// Today lookup, before the start date, and "repeat this week".
assert.equal(P.todayPlan(at('2026-10-29'),cfg).pm,'lowerB');
assert.equal(P.todayPlan(at('2026-10-20'),cfg).before,true);
const rep={...cfg,offsetWeeks:1};
assert.equal(P.weekForDate(at('2026-11-02'),rep).label,'C1 · Wk 1');   // week 2 date now shows week 1 again

// Next cycle increments and the cycle prompt.
const prop=P.nextCycleProposal({...cfg,accReady:{incl:true}});
assert.deepEqual(prop.W,{squat:210,deadlift:260,bench:155,ohp:105});
assert.equal(prop.kbKg,24);assert.equal(prop.vestLb,20);assert.equal(prop.acc.incl,100);assert.equal(prop.acc.row,100);
assert.equal(P.needsNextCycle(W('2026-11-30'),cfg),true);assert.equal(P.needsNextCycle(W('2026-11-30'),{...cfg,cycleStarted:2}),false);
assert.equal(P.needsNextCycle(W('2026-11-23'),cfg),false);

// Double progression.
const incl=rxOf(P.buildSession('upperB',W('2026-11-09'),cfg),'incl');
assert.equal(P.hitTopOfRange(incl,[{done:true,reps:12},{done:true,reps:12},{done:true,reps:12}]),true);
assert.equal(P.hitTopOfRange(incl,[{done:true,reps:12},{done:true,reps:11},{done:true,reps:12}]),false);

// Warm-up ramp stays below the working weight.
assert.ok(P.warmupRamp(200).every(r=>r.weight<200));assert.equal(P.warmupRamp(0).length,0);

console.log('program engine: '+n+' calendar weeks + trip/loop/session checks passed');

// Incline walk vest: off by default, adjustable, never in a deload.
assert.equal(P.DEFAULT_PROGRAM.vestLb,0);
const walkOf=(c,d)=>{const st=P.buildSession('lowerA',W(d),c).steps;return st[st.length-1]};
assert.equal(walkOf({...cfg,vestLb:0},'2026-10-26').rx,'25 min');
assert.equal(walkOf({...cfg,vestLb:0},'2026-10-26').vest,true);
assert.equal(walkOf({...cfg,vestLb:15},'2026-10-26').exs[0].sets[0].weight,15);
assert.equal(walkOf({...cfg,vestLb:15},'2026-11-23').exs[0].sets[0].weight,0);
assert.equal(P.nextCycleProposal({...cfg,vestLb:0}).vestLb,0);

// Equipment swaps: own exercise id, last-used weight, else a flagged estimate.
const w0=W('2026-10-26');
const benchStep=(eq,last)=>P.buildSession('upperA',w0,{...cfg,equip:{bench:eq}},{lastWeight:()=>last}).steps[1];
let bs=benchStep('bb',null);assert.equal(bs.equipCur,'bb');assert.deepEqual(bs.equipOpts,['bb','db','kb']);assert.equal(bs.exs[0].exerciseId,'c1');
bs=benchStep('db',55);assert.equal(bs.exs[0].exerciseId,'c5');assert.equal(bs.exs[0].sets[0].weight,55);assert.equal(bs.estimate,false);
assert.equal(bs.rx,'3×5 @ 55 lb each');assert.equal(bs.warmup.length,0);assert.equal(bs.exs[0].perHand,true);
bs=benchStep('db',null);assert.equal(bs.exs[0].sets[0].weight,60);assert.equal(bs.estimate,true);      // 150 × .4
bs=benchStep('kb',null);assert.equal(bs.exs[0].unit,'kg');assert.equal(bs.exs[0].sets[0].weight,24);   // 52.5 lb ≈ 23.8 kg → 24
const rowStep=P.buildSession('upperB',w0,{...cfg,equip:{row:'db'}},{}).steps[3];
assert.equal(rowStep.rx,'3×8/side @ 50 lb');assert.equal(rowStep.acc,null);
const carryKB=P.buildSession('upperA',w0,{...cfg,equip:{carry:'kb'}},{}).steps[3];
assert.equal(carryKB.exs[0].unit,'s');assert.equal(carryKB.exs[0].wUnit,'kg');assert.equal(carryKB.exs[0].sets[0].weight,22);
assert.equal(P.buildSession('upperA',w0,{...cfg,equip:{bench:'bogus'}},{}).steps[1].equipCur,'bb');

console.log('program engine: swaps, vest, abs mornings passed');
