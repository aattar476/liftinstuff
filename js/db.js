// ============================================================
// DATABASE (IndexedDB)
// ============================================================
// Version history:
//   2: exercises, templates, workouts, bodyweight, settings, goals
//   3: Ski Season Build. Old templates move to a read-only archive, the
//      in-progress session moves from localStorage into the database, and a
//      full snapshot of the v2 data is saved in `backups` before upgrading.
// Logged workouts store their own exercise names and sets, so history never
// depended on templates and is left untouched by the upgrade.
const DB_NAME='LiftinStuff_Drew';
const DB_VER=3;
const STORES=[
  ['exercises','id'],['templates','id'],['workouts','id'],['bodyweight','date'],
  ['settings','key'],['goals','id'],
  ['templatesArchive','id'],['activeSession','key'],['backups','id'],
];
let db;
// Set when this launch upgraded an older database; the app shows a download banner.
let migrationBackup=null;

function openRaw(version,onUpgrade){
  return new Promise((res,rej)=>{
    const r=version?indexedDB.open(DB_NAME,version):indexedDB.open(DB_NAME);
    if(onUpgrade)r.onupgradeneeded=onUpgrade;
    r.onsuccess=e=>res(e.target.result);
    r.onerror=e=>rej(e.target.error);
    r.onblocked=()=>rej(new Error('Database upgrade is blocked. Close other LiftinStuff tabs and reload.'));
  });
}

function readAllStores(d,names){
  names=names||[...d.objectStoreNames];
  return new Promise((res,rej)=>{
    if(names.length===0)return res({});
    const tx=d.transaction(names,'readonly');const out={};
    for(const n of names){const r=tx.objectStore(n).getAll();r.onsuccess=()=>{out[n]=r.result}}
    tx.oncomplete=()=>res(out);tx.onerror=e=>rej(e.target.error);
  });
}

async function openDB(){
  // 1. Peek at the current database without upgrading it. If it's older than
  //    v3 and has data, snapshot everything before the upgrade touches it.
  const cur=await openRaw();
  let snapshot=null;
  if(cur.version<DB_VER&&cur.objectStoreNames.length>0){
    const data=await readAllStores(cur);
    snapshot={
      id:'pre-v'+DB_VER+'-'+Date.now(),createdAt:new Date().toISOString(),
      fromVersion:cur.version,reason:'Automatic backup before the Ski Season Build update',
      app:'LiftinStuff',schema:cur.version,data,
    };
    // Second copy outside IndexedDB, in case the upgrade itself goes wrong.
    try{localStorage.setItem('liftinstuff_premigration_backup',JSON.stringify(snapshot))}catch(e){console.warn('[Migration] localStorage copy skipped:',e.message)}
  }
  cur.close();

  // 2. Upgrade. Everything inside onupgradeneeded runs in one transaction:
  //    if any step fails, the whole upgrade rolls back and v2 stays intact.
  db=await openRaw(DB_VER,e=>{
    const d=e.target.result,tx=e.target.transaction;
    const had=new Set([...d.objectStoreNames]);
    for(const [name,keyPath] of STORES)if(!had.has(name))d.createObjectStore(name,{keyPath});
    if(e.oldVersion<3&&had.has('templates')){
      const tStore=tx.objectStore('templates'),aStore=tx.objectStore('templatesArchive');
      const req=tStore.getAll();
      req.onsuccess=()=>{
        const at=new Date().toISOString();
        for(const t of req.result)aStore.put({...t,archivedAt:at});
        tStore.clear();
      };
    }
  });
  // Another tab opening a newer version: step aside so its upgrade isn't blocked.
  db.onversionchange=()=>{db.close();location.reload()};

  // 3. Post-upgrade bookkeeping.
  if(snapshot){
    await dbPut('backups',snapshot);
    migrationBackup=snapshot;
    try{localStorage.removeItem('liftinstuff_premigration_backup')}catch(e){}
  }
  // The old in-progress session lived in localStorage; move it over once.
  try{
    const legacy=localStorage.getItem('liftinstuff_active_session');
    if(legacy){
      const existing=await dbGet('activeSession','current');
      if(!existing)await dbPut('activeSession',{key:'current',...JSON.parse(legacy)});
      localStorage.removeItem('liftinstuff_active_session');
    }
  }catch(e){console.warn('[Migration] Could not move active session:',e)}
  return db;
}

function dbPut(store,data){return new Promise((res,rej)=>{const tx=db.transaction(store,'readwrite');tx.objectStore(store).put(data);tx.oncomplete=()=>res();tx.onerror=e=>rej(e)})}
function dbGet(store,key){return new Promise((res,rej)=>{const tx=db.transaction(store,'readonly');const r=tx.objectStore(store).get(key);r.onsuccess=()=>res(r.result);r.onerror=e=>rej(e)})}
function dbGetAll(store){return new Promise((res,rej)=>{const tx=db.transaction(store,'readonly');const r=tx.objectStore(store).getAll();r.onsuccess=()=>res(r.result);r.onerror=e=>rej(e)})}
function dbDelete(store,key){return new Promise((res,rej)=>{const tx=db.transaction(store,'readwrite');tx.objectStore(store).delete(key);tx.oncomplete=()=>res();tx.onerror=e=>rej(e)})}
function dbClear(store){return new Promise((res,rej)=>{const tx=db.transaction(store,'readwrite');tx.objectStore(store).clear();tx.oncomplete=()=>res();tx.onerror=e=>rej(e)})}

// Everything except the backups store (which holds whole copies of old data).
const EXPORT_STORES=['exercises','templates','workouts','bodyweight','settings','goals','templatesArchive','activeSession'];
async function exportAllData(){
  const data=await readAllStores(db,EXPORT_STORES);
  return {app:'LiftinStuff',schema:DB_VER,exportedAt:new Date().toISOString(),data};
}

// Accepts this app's v3 export, the old v2 export ({workouts,templates,bodyweights,settings}),
// or a pre-update backup. Returns {stores:{name:[records]}} or throws.
function normalizeImport(json){
  if(!json||typeof json!=='object')throw new Error('Not a LiftinStuff backup file');
  if(json.data&&typeof json.data==='object'){
    const stores={};
    for(const n of EXPORT_STORES)if(Array.isArray(json.data[n]))stores[n]=json.data[n];
    // Pre-v3 snapshots still have old templates in `templates`: archive them instead.
    if((json.schema||0)<3&&stores.templates){stores.templatesArchive=[...(stores.templatesArchive||[]),...stores.templates];delete stores.templates}
    return {stores};
  }
  if(Array.isArray(json.workouts)){
    const stores={workouts:json.workouts};
    if(Array.isArray(json.templates))stores.templatesArchive=json.templates;
    if(Array.isArray(json.bodyweights))stores.bodyweight=json.bodyweights;
    if(Array.isArray(json.goals))stores.goals=json.goals;
    if(json.settings&&json.settings.defaultRestTime)stores.settings=[{key:'defaultRestTime',value:json.settings.defaultRestTime}];
    return {stores};
  }
  throw new Error('Not a LiftinStuff backup file');
}

// Replaces the contents of every store present in the import. Stores the file
// doesn't mention are left alone. One transaction: all or nothing.
function replaceStores(stores){
  const names=Object.keys(stores);
  return new Promise((res,rej)=>{
    if(names.length===0)return res();
    const tx=db.transaction(names,'readwrite');
    for(const n of names){const s=tx.objectStore(n);s.clear();for(const rec of stores[n])s.put(rec)}
    tx.oncomplete=()=>res();tx.onerror=e=>rej(e.target.error);tx.onabort=e=>rej(tx.error||new Error('Import aborted'));
  });
}

function downloadJSON(obj,filename){
  const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=filename;
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
