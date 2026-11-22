const TZ='America/Monterrey';
let EVENTS=[], weekOffset=0, filter='all', upcomingClass='all';
const fav=JSON.parse(localStorage.getItem('pokeweek:fav')||'{}');
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];

function parseDate(v){ if(!v) return null; const d=new Date(v); return Number.isNaN(d.getTime())?null:d; }
function start(e){ return parseDate(e.start||e.startDate||e.startTime); }
function end(e){ return parseDate(e.end||e.endDate||e.endTime)||start(e); }
function id(e){ return String(e.eventID||e.id||e.slug||\`\${e.name}|\${e.start||''}\`); }
function fmt(d,o){ return new Intl.DateTimeFormat('es-MX',{timeZone:TZ,...o}).format(d); }
function key(d){ return fmt(d,{year:'numeric',month:'2-digit',day:'2-digit'}); }
function same(a,b){ return !!a && !!b && key(a)===key(b); }
function monday(d){ const x=new Date(d); x.setHours(12,0,0,0); x.setDate(x.getDate()-((x.getDay()+6)%7)); return x; }
function add(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function cat(e){
  const t=String(e.eventType||'event').toLowerCase();
  if(t.includes('community')) return 'community-day';
  if(t.includes('max')) return 'max';
  if(t.includes('raid')) return 'raid';
  if(t.includes('spotlight')) return 'spotlight';
  return 'event';
}
function visible(e){ return filter==='all'||cat(e)===filter; }
function escapeHtml(s){ return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function emoji(e){ return cat(e)==='community-day'?'🌸':cat(e)==='max'?'💜':cat(e)==='raid'?'⚡':cat(e)==='spotlight'?'✨':'🎀'; }
function defaultImage(e){
  const c=cat(e);
  if(c==='community-day') return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/624.png';
  if(c==='max') return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/890.png';
  return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png';
}
function timeText(e){
  const s=start(e), z=end(e);
  if(!s) return 'Horario por confirmar';
  if(same(s,z)) return \`De \${fmt(s,{hour:'numeric',minute:'2-digit'})} a \${fmt(z,{hour:'numeric',minute:'2-digit'})}\`;
  return \`Del \${fmt(s,{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'})} al \${fmt(z,{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'})}\`;
}
function summary(e){
  if(e.highlight) return e.highlight;
  const x=e.extraData||{};
  if(x.communityday){
    const p=(x.communityday.spawns||[]).map(v=>v.name).filter(Boolean).slice(0,2);
    const b=(x.communityday.bonuses||[]).map(v=>v.text).filter(Boolean).slice(0,2);
    return [p.length?\`Aparece más \${p.join(' y ')}\`:'',b.length?\`Bonos: \${b.join(' · ')}\`:''].filter(Boolean).join('. ')+'.';
  }
  if(x.spotlight){
    const names=(x.spotlight.list||[]).map(v=>v.name).filter(Boolean).slice(0,3);
    return \`\${names.length?\`Pokémon destacados: \${names.join(', ')}. \`:''}\${x.spotlight.bonus?\`Bono: \${x.spotlight.bonus}.\`:''}\`;
  }
  if(cat(e)==='max') return 'Combates Max disponibles durante esta ventana. Ideal para reunir recursos y capturas del evento.';
  if(cat(e)==='raid') return 'Incursiones especiales disponibles durante el horario indicado.';
  if(cat(e)==='spotlight') return 'Hora destacada con apariciones aumentadas y bonus temporal.';
  return e.heading?\`\${e.heading} activo durante este periodo.\`:'Evento especial de Pokémon GO activo durante este periodo.';
}

async function load(){
  let live=[];
  try{
    const r=await fetch(\`data/live-events.json?v=\${Date.now()}\`,{cache:'no-store'});
    if(r.ok) live=await r.json();
  }catch(e){ console.warn('live-events no disponible',e); }
  const arr=Array.isArray(live)?live:(live?.events||[]);
  const timed=arr.filter(e=>start(e));
  if(timed.length){
    EVENTS=timed;
    const sync=$('#syncText'); if(sync) sync.textContent=\`Sincronizado · \${fmt(new Date(),{hour:'numeric',minute:'2-digit'})}\`;
    localStorage.setItem('pokeweek:cache',JSON.stringify(EVENTS));
  }else{
    try{
      const r=await fetch('data/events.json',{cache:'no-store'});
      if(!r.ok) throw new Error(\`HTTP \${r.status}\`);
      EVENTS=await r.json();
      const sync=$('#syncText'); if(sync) sync.textContent='Respaldo local activo';
    }catch(e){
      EVENTS=JSON.parse(localStorage.getItem('pokeweek:cache')||'[]');
      const sync=$('#syncText'); if(sync) sync.textContent='Modo sin conexión';
    }
  }
  EVENTS=(Array.isArray(EVENTS)?EVENTS:[]).filter(e=>start(e)).sort((a,b)=>start(a)-start(b));
  render();
}

function bell(e,cls=''){
  return \`<button class="bell \${cls} \${fav[id(e)]?'on':''}" data-bell="\${escapeHtml(id(e))}" title="Recordarme">🔔</button>\`;
}
function detailAttrs(e){ return \`data-event-detail="\${escapeHtml(id(e))}" class="clickable"\`; }
function featureCard(e,now){
  const active=now>=start(e)&&now<=end(e);
  return \`<article class="feature-card \${cat(e)}">\${bell(e)}<span class="\${active?'live-tag':'date-tag'}">\${active?'● EN VIVO':\`\${emoji(e)} \${escapeHtml(e.heading||'Evento')}\`}</span><h3 \${detailAttrs(e)}>\${escapeHtml(e.name)}</h3><div class="feature-time">🕒 \${escapeHtml(timeText(e))}</div><p>\${escapeHtml(summary(e))}</p><img \${detailAttrs(e)} class="event-img clickable" src="\${escapeHtml(e.image||defaultImage(e))}" alt=""></article>\`;
}

function renderToday(){
  const now=new Date();
  const list=EVENTS.filter(e=>same(start(e),now)&&end(e)>=now).slice(0,3);
  const eevee=\`<article class="feature-card eevee-home"><span class="date-tag">♡ TU COMPAÑERO</span><h3>Hola, Yuli ♡</h3><p>\${list.length?'Estos son los eventos activos de hoy.':'Hoy está tranquilo. Revisa “Próximos” para preparar lo que viene.'}</p><img class="event-img eevee-img" src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/133.png" alt="Eevee"></article>\`;
  const box=$('#todayCards'); if(box) box.innerHTML=eevee+list.map(e=>featureCard(e,now)).join('');
}
function renderUpcoming(){
  const now=new Date();
  const list=EVENTS.filter(e=>start(e)>now&&(upcomingClass==='all'||cat(e)===upcomingClass)).slice(0,3);
  const box=$('#upcomingList'); if(!box) return;
  box.innerHTML=list.length?list.map(e=>\`<article class="upcoming-item"><img \${detailAttrs(e)} class="upcoming-thumb clickable" src="\${escapeHtml(e.image||defaultImage(e))}" alt=""><div class="upcoming-copy"><button class="upcoming-name clickable" data-event-detail="\${escapeHtml(id(e))}">\${escapeHtml(e.name)}</button><div class="upcoming-time">🕒 \${escapeHtml(timeText(e))}</div><div class="upcoming-type">\${emoji(e)} \${escapeHtml(e.heading||'Evento')}</div></div>\${bell(e)}</article>\`).join(''):'<div class="hint">No hay próximos eventos en esta clasificación.</div>';
}
function renderWeek(){
  const ws=add(monday(new Date()),weekOffset*7), we=add(ws,7);
  const title=$('#weekTitle'); if(title) title.textContent=weekOffset===0?'Esta semana':\`\${fmt(ws,{day:'numeric',month:'short'})} – \${fmt(add(we,-1),{day:'numeric',month:'short'})}\`;
  let html='';
  for(let i=0;i<7;i++){
    const d=add(ws,i);
    const list=EVENTS.filter(e=>visible(e)&&start(e)<add(d,1)&&end(e)>=d);
    html+=\`<div class="day-col \${same(d,new Date())?'today':''}"><div class="day-head"><div class="day-name">\${fmt(d,{weekday:'short'})}</div><div class="day-num">\${fmt(d,{day:'numeric'})}</div></div>\${list.length?list.map(e=>\`<article class="event-card \${cat(e)}">\${bell(e)}<div class="event-content"><h4 \${detailAttrs(e)}>\${emoji(e)} \${escapeHtml(e.name)}</h4><div class="event-time">🕒 \${escapeHtml(timeText(e))}</div><p class="event-summary">\${escapeHtml(summary(e))}</p></div><img \${detailAttrs(e)} class="card-img clickable" src="\${escapeHtml(e.image||defaultImage(e))}" alt=""></article>\`).join(''):'<div class="none">♡<br>libre</div>'}</div>\`;
  }
  const grid=$('#weekGrid'); if(grid) grid.innerHTML=html;
}
function renderSaved(){
  const a=Object.values(fav).sort((x,y)=>new Date(x.start)-new Date(y.start));
  const empty=$('#savedEmpty'); if(empty) empty.style.display=a.length?'none':'block';
  const list=$('#savedList'); if(!list) return;
  list.innerHTML=a.map(f=>\`<div class="saved"><div><strong>🔔 \${escapeHtml(f.name)}</strong><small>\${fmt(new Date(f.start),{weekday:'short',day:'numeric',month:'short',hour:'numeric',minute:'2-digit'})}</small></div><div class="saved-actions"><button class="tiny" data-chat="\${escapeHtml(f.id)}">ChatGPT</button><button class="tiny" data-cal="\${escapeHtml(f.id)}">Calendario</button><button class="tiny" data-remove="\${escapeHtml(f.id)}">✕</button></div></div>\`).join('');
}
function renderNext(){
  const now=new Date(), next=EVENTS.find(e=>start(e)>now), box=$('#nextBig');
  if(!box) return;
  if(!next){ box.innerHTML='<p class="hint">No hay próximos eventos cargados.</p>'; return; }
  const diff=start(next)-now, days=Math.floor(diff/86400000), hrs=Math.floor((diff%86400000)/3600000);
  box.innerHTML=\`<div class="next-card"><span class="date-tag">\${emoji(next)} \${escapeHtml(next.heading||'Evento')}</span><h3 \${detailAttrs(next)}>\${escapeHtml(next.name)}</h3><div class="feature-time">🕒 \${escapeHtml(timeText(next))}</div><p>\${escapeHtml(summary(next))}</p><div class="countdown">En \${days?\`\${days} d \`:''}\${hrs} h</div><img \${detailAttrs(next)} class="clickable" src="\${escapeHtml(next.image||defaultImage(next))}" alt=""></div>\`;
}
function render(){ renderToday(); renderUpcoming(); renderWeek(); renderSaved(); renderNext(); }

function collectDetails(e){
  const x=e.extraData||{}, out={bonuses:[],pokemon:[],notes:[]};
  if(x.communityday){
    out.bonuses=(x.communityday.bonuses||[]).map(v=>v.text).filter(Boolean);
    out.pokemon=(x.communityday.spawns||[]).map(v=>({name:v.name,image:v.image})).filter(v=>v.name);
  }
  if(x.spotlight){
    if(x.spotlight.bonus) out.bonuses.push(x.spotlight.bonus);
    out.pokemon=(x.spotlight.list||[]).map(v=>({name:v.name,image:v.image})).filter(v=>v.name);
  }
  if(x.generic){
    if(x.generic.hasSpawns) out.notes.push('Incluye apariciones salvajes.');
    if(x.generic.hasFieldResearchTasks) out.notes.push('Incluye tareas de investigación de campo.');
  }
  if(Array.isArray(e.bonuses)) out.bonuses.push(...e.bonuses.map(v=>typeof v==='string'?v:v.text).filter(Boolean));
  return out;
}
function openEventDetail(eventId){
  const e=EVENTS.find(x=>id(x)===String(eventId)); if(!e) return;
  const d=collectDetails(e), s=start(e);
  let html=\`<div class="modal-hero"><div><span class="date-tag">\${emoji(e)} \${escapeHtml(e.heading||'Evento')}</span><h2 id="eventModalTitle">\${escapeHtml(e.name)}</h2><div class="modal-meta"><span class="modal-pill">🗓️ \${escapeHtml(fmt(s,{weekday:'long',day:'numeric',month:'long'}))}</span><span class="modal-pill">🕒 \${escapeHtml(timeText(e))}</span></div><p class="modal-summary">\${escapeHtml(summary(e))}</p></div><img src="\${escapeHtml(e.image||defaultImage(e))}" alt=""></div>\`;
  if(d.bonuses.length) html+=\`<section class="modal-section"><h3>✨ Bonos y ventajas</h3><div class="detail-list">\${d.bonuses.map(v=>\`<div class="detail-item">✦ \${escapeHtml(v)}</div>\`).join('')}</div></section>\`;
  if(d.pokemon.length) html+=\`<section class="modal-section"><h3>🌸 Pokémon destacados</h3><div class="pokemon-list">\${d.pokemon.map(v=>\`<div class="poke-chip">\${v.image?\`<img src="\${escapeHtml(v.image)}" alt="">\`:''}<span>\${escapeHtml(v.name)}</span></div>\`).join('')}</div></section>\`;
  if(d.notes.length) html+=\`<section class="modal-section"><h3>📌 Qué incluye</h3><div class="detail-list">\${d.notes.map(v=>\`<div class="detail-item">\${escapeHtml(v)}</div>\`).join('')}</div></section>\`;
  if(e.link) html+=\`<a class="modal-link" href="\${escapeHtml(e.link)}" target="_blank" rel="noopener">Ver fuente completa ↗</a>\`;
  html+='<div class="modal-note">Los detalles mostrados dependen de la información disponible en el feed del evento.</div>';
  const content=$('#eventModalContent'), modal=$('#eventModal');
  if(content) content.innerHTML=html;
  if(modal){ modal.classList.add('open'); modal.setAttribute('aria-hidden','false'); }
  document.body.style.overflow='hidden';
}
function closeEventDetail(){ const m=$('#eventModal'); if(m){m.classList.remove('open');m.setAttribute('aria-hidden','true');} document.body.style.overflow=''; }

async function copyReminder(f){
  const lead=+($('#lead')?.value||60);
  const text=\`Recuérdame el evento de Pokémon GO “\${f.name}” \${lead} minutos antes. Empieza el \${fmt(new Date(f.start),{weekday:'long',day:'numeric',month:'long',year:'numeric',hour:'numeric',minute:'2-digit'})} hora de Monterrey.\`;
  try{ await navigator.clipboard.writeText(text); alert('♡ Copiado. Pégalo en ChatGPT para crear el recordatorio.'); }
  catch{ prompt('Copia esto:',text); }
}
function icsDate(d){ return d.toISOString().replace(/[-:]/g,'').replace(/\\.\\d{3}Z$/,'Z'); }
function downloadICS(f){
  const lead=+($('#lead')?.value||60), s=new Date(f.start), e=new Date(f.end||f.start);
  const txt=['BEGIN:VCALENDAR','VERSION:2.0','BEGIN:VEVENT',\`DTSTART:\${icsDate(s)}\`,\`DTEND:\${icsDate(e)}\`,\`SUMMARY:\${f.name.replace(/,/g,'\\\\,')}\`,'BEGIN:VALARM',\`TRIGGER:-PT\${lead}M\`,'ACTION:DISPLAY',\`DESCRIPTION:\${f.name.replace(/,/g,'\\\\,')}\`,'END:VALARM','END:VEVENT','END:VCALENDAR'].join('\\r\\n');
  const blob=new Blob([txt],{type:'text/calendar'}), a=document.createElement('a');
  a.href=URL.createObjectURL(blob); a.download=\`pokemon-go-\${f.name.replace(/[^a-z0-9]+/gi,'-')}.ics\`; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),500);
}

document.addEventListener('click',e=>{
  const detail=e.target.closest('[data-event-detail]');
  if(detail){ e.preventDefault(); e.stopPropagation(); openEventDetail(detail.dataset.eventDetail); return; }
  const bellBtn=e.target.closest('[data-bell]');
  if(bellBtn){
    e.preventDefault(); e.stopPropagation();
    const ev=EVENTS.find(x=>id(x)===bellBtn.dataset.bell); if(!ev) return;
    if(fav[id(ev)]) delete fav[id(ev)]; else fav[id(ev)]={id:id(ev),name:ev.name,start:ev.start,end:ev.end,image:ev.image||defaultImage(ev)};
    localStorage.setItem('pokeweek:fav',JSON.stringify(fav)); render(); return;
  }
  const rem=e.target.closest('[data-remove]');
  if(rem){ delete fav[rem.dataset.remove]; localStorage.setItem('pokeweek:fav',JSON.stringify(fav)); render(); return; }
  const chat=e.target.closest('[data-chat]'); if(chat){ copyReminder(fav[chat.dataset.chat]); return; }
  const cal=e.target.closest('[data-cal]'); if(cal){ downloadICS(fav[cal.dataset.cal]); return; }
  if(e.target.closest('[data-close-modal]')) closeEventDetail();
});

document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeEventDetail(); });

$$('.chip').forEach(b=>b.addEventListener('click',()=>{ $$('.chip').forEach(x=>x.classList.remove('active')); b.classList.add('active'); filter=b.dataset.filter; renderWeek(); }));
$('#upcomingFilter')?.addEventListener('change',e=>{ upcomingClass=e.target.value; renderUpcoming(); });
$('#prevWeek')?.addEventListener('click',()=>{ weekOffset--; renderWeek(); });
$('#nextWeek')?.addEventListener('click',()=>{ weekOffset++; renderWeek(); });
$('#goToday')?.addEventListener('click',()=>{ weekOffset=0; renderWeek(); $('#weekGrid')?.scrollIntoView({behavior:'smooth'}); });
$$('[data-jump]').forEach(b=>b.addEventListener('click',()=>document.getElementById(b.dataset.jump)?.scrollIntoView({behavior:'smooth',block:'start'})));

load();
