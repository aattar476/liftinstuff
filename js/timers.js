// ============================================================
// TIMERS + ALERTS
// ============================================================
// Phones (iPhones especially) freeze pages when the screen locks or you switch
// apps, so a timer that counts down "one second per tick" drifts or stops.
// Every timer here stores wall-clock timestamps instead (when it started, when
// it ends) and works out what to show from Date.now() on every tick, on
// visibilitychange and on reload. Nothing is lost while the page is frozen;
// alerts that came due while hidden fire as soon as the page is visible again.
//
// Timer object (kept on the active session so it survives reloads):
//   {type:'rest'|'hold'|'stopwatch'|'interval'|'block',
//    startedAt, endAt (rest/hold), targetSec (block), every+rounds (interval),
//    pausedAt (null while running), fired:{...} (alerts already given), ctx}

const alertPrefs={sound:true,vibrate:true,flash:true};

// ---- sound (Web Audio) ----
// iOS keeps audio muted until a user gesture starts it, so every tap calls
// unlockAudio(); the first tap of a session is enough, later taps keep it alive.
let audioCtx=null;
function unlockAudio(){
  try{
    if(!audioCtx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;audioCtx=new AC()}
    if(audioCtx.state!=='running')audioCtx.resume();
    const b=audioCtx.createBuffer(1,1,22050),src=audioCtx.createBufferSource();
    src.buffer=b;src.connect(audioCtx.destination);src.start(0);
  }catch(e){}
}
document.addEventListener('pointerdown',unlockAudio,{capture:true,passive:true});

function beep(freq,ms,delay){
  if(!alertPrefs.sound||!audioCtx||audioCtx.state!=='running')return;
  try{
    const t=audioCtx.currentTime+(delay||0),o=audioCtx.createOscillator(),g=audioCtx.createGain();
    o.type='square';o.frequency.value=freq;
    g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.25,t+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001,t+ms/1000);
    o.connect(g);g.connect(audioCtx.destination);o.start(t);o.stop(t+ms/1000+0.05);
  }catch(e){}
}

function vibrate(pattern){if(alertPrefs.vibrate&&'vibrate' in navigator)try{navigator.vibrate(pattern)}catch(e){}}

function flashScreen(strong){
  if(!alertPrefs.flash)return;
  let el=document.getElementById('flash');
  if(!el){el=document.createElement('div');el.id='flash';el.className='flash';el.addEventListener('pointerdown',()=>el.classList.remove('on','soft'));document.body.appendChild(el)}
  el.classList.remove('on','soft');void el.offsetWidth;
  el.classList.add(strong?'on':'soft');
  clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('on','soft'),strong?1600:500);
}

// 3-2-1 before the end
function alertCountdown(n){beep(n===1?740:620,110)}
// start of an interval round
function alertRound(){beep(1046,260);vibrate([150]);flashScreen(false)}
// timer finished: everything the device supports
function alertEnd(){
  beep(880,180,0);beep(880,180,0.25);beep(1320,450,0.5);
  vibrate([200,100,200,100,400]);
  flashScreen(true);
}

// ---- timer maths (all from the clock) ----
function tNow(t){return t.pausedAt||Date.now()}
function timerRemainingMs(t){return Math.max(0,t.endAt-tNow(t))}
function timerElapsedMs(t){return Math.max(0,tNow(t)-t.startedAt)}
function intervalState(t){
  const e=timerElapsedMs(t),every=t.every*1000,total=every*t.rounds;
  const round=Math.min(t.rounds,Math.floor(e/every)+1);
  return {round,done:e>=total,nextInMs:e>=total?0:every-(e%every),elapsedMs:e};
}

function makeTimer(type,opts){
  const now=Date.now(),t={type,startedAt:now,pausedAt:null,fired:{},...opts};
  if(type==='rest'||type==='hold')t.endAt=now+opts.seconds*1000;
  return t;
}
function pauseTimer(t){if(t&&!t.pausedAt)t.pausedAt=Date.now()}
function resumeTimer(t){
  if(!t||!t.pausedAt)return;
  const gap=Date.now()-t.pausedAt;
  t.startedAt+=gap;if(t.endAt)t.endAt+=gap;t.pausedAt=null;
}
function addTime(t,sec){if(t&&t.endAt){t.endAt+=sec*1000;for(const k of Object.keys(t.fired))if(k[0]==='c')delete t.fired[k]}}

// Works out which alerts are due and returns events for the caller to act on.
// `fired` remembers what has already gone off, so a reload or a return from a
// locked screen never repeats an alert, and alerts missed while hidden are
// collapsed into the one that matters now.
function timerEvents(t){
  const ev=[];if(!t||t.pausedAt)return ev;
  if(t.type==='rest'||t.type==='hold'){
    const left=timerRemainingMs(t)/1000;
    if(left<=0){if(!t.fired.end){t.fired.end=1;ev.push('end')}}
    else for(const n of [3,2,1])if(left<=n&&left>n-1&&!t.fired['c'+n]){t.fired['c'+n]=1;ev.push('c'+n)}
  }else if(t.type==='interval'){
    const s=intervalState(t);
    if(s.done){if(!t.fired.end){t.fired.end=1;ev.push('end')}return ev}
    if(!t.fired['r'+s.round]){
      t.fired['r'+s.round]=1;
      // Only announce a round if we're near its start (not after a long lock).
      if(timerElapsedMs(t)-(s.round-1)*t.every*1000<2500)ev.push('round');
    }
    const left=s.nextInMs/1000;
    const key=n=>'c'+s.round+'_'+n;
    for(const n of [3,2,1])if(left<=n&&left>n-1&&!t.fired[key(n)]){t.fired[key(n)]=1;ev.push('c'+n)}
  }else if(t.type==='block'){
    if(t.targetSec&&timerElapsedMs(t)>=t.targetSec*1000&&!t.fired.target){t.fired.target=1;ev.push('target')}
  }
  return ev;
}

function playEvents(ev){
  for(const e of ev){
    if(e==='end'||e==='target')alertEnd();
    else if(e==='round')alertRound();
    else if(e[0]==='c')alertCountdown(+e.slice(-1));
  }
}

const fmtClock=ms=>{const s=Math.ceil(ms/1000),m=Math.floor(s/60);return m+':'+String(s%60).padStart(2,'0')};
const fmtUp=ms=>{const s=Math.floor(ms/1000),h=Math.floor(s/3600),m=Math.floor((s%3600)/60);return (h?h+':'+String(m).padStart(2,'0'):m)+':'+String(s%60).padStart(2,'0')};

// ---- wake lock: keep the screen on during a session ----
let wakeLock=null,wakeWanted=false,wakeDenied=false;
async function requestWakeLock(){
  wakeWanted=true;
  if(wakeLock||wakeDenied||!('wakeLock' in navigator)||document.visibilityState!=='visible')return;
  try{
    wakeLock=await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release',()=>{wakeLock=null});
  }catch(e){wakeDenied=true;console.info('[WakeLock] not granted:',e.message)}
}
function releaseWakeLock(){
  wakeWanted=false;
  if(wakeLock){try{wakeLock.release()}catch(e){}}
  wakeLock=null;
}
// The browser drops the lock whenever the page is hidden; take it back on return.
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible'){
    wakeDenied=false;
    if(wakeWanted)requestWakeLock();
    if(audioCtx&&audioCtx.state!=='running')audioCtx.resume().catch(()=>{});
  }
});
