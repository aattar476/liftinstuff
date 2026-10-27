// Start-up. Loaded last so every other script's functions exist before the first render.
initApp().catch(e=>{
  console.error(e);
  document.getElementById('app').innerHTML='<div class="fatal"><h1>Couldn\'t open your data</h1><p>'+String(e&&e.message||e)+'</p><p>Close other LiftinStuff tabs and reload. Your data has not been changed.</p></div>';
});
if('serviceWorker' in navigator){navigator.serviceWorker.register('./sw.js').catch(()=>{})}
