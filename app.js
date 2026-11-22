const TZ='America/Monterrey';
const DATA_URL='data/events.normalized.json';
let EVENTS=[],weekOffset=0,filter='all',upcomingClass='all',deferredInstall=null;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const DEFAULT_PREFS={lead:60,categories:['community-day','raid','max','spotlight','research','event']};
let prefs=loadJSON('pokeweek:prefs',DEFAULT_PREFS);
const fav=Object.assign(Object.create(null),loadJSON('pokeweek:fav',{}));

function loadJSON(k,f){try{return JSON.parse(localStorage.getItem(k))||structuredClone(f)}catch{return structuredClone(f)}}
function saveJSON(k,v){localStorage.setItem(k,JSON.stringify(v))}
const monterreyClock = new Intl.DateTimeFormat('en-CA', {
 timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
 hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
});
const DAY = 86400000;
const parsedDates = new Map();

function localParts(date) {
 return Object.fromEntries(monterreyClock.formatToParts(date).map(({type, value}) => [type, Number(value)]));
}

function civilTime({year, month, day, hour = 0, minute = 0, second = 0}) {
 return Date.UTC(year, month - 1, day, hour, minute, second);
}

function inMonterrey(wallTime) {
 let instant = wallTime;
 for (let pass = 0; pass < 3; pass++) {
  const correction = wallTime - civilTime(localParts(new Date(instant)));
  if (!correction) break;
  instant += correction;
 }
 return new Date(instant);
}

function parseDate(value) {
 if (typeof value !== 'string' || !value) return null;
 if (parsedDates.has(value)) return parsedDates.get(value);
 const local = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?)?$/.test(value);
 const date = new Date(local ? value + (value.includes('T') ? 'Z' : 'T00:00:00Z') : value);
 if (!Number.isFinite(+date)) return null;
 const milliseconds = date.getUTCMilliseconds();
 const instant = local ? new Date(+inMonterrey(+date - milliseconds) + milliseconds) : date;
 parsedDates.set(value, instant);
 return instant;
}

function start(e){return parseDate(e.start)} function end(e){return parseDate(e.end)||start(e)}
function fmt(d,o){return new Intl.DateTimeFormat('es-MX',{timeZone:TZ,...o}).format(d)}
function dayNumber(date) {
 const {year, month, day} = localParts(date);
 return civilTime({year, month, day}) / DAY;
}
function same(a,b){return a&&b&&dayNumber(a)===dayNumber(b)}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function emoji(c){return c==='community-day'?'🌸':c==='max'?'💜':c==='raid'?'⚡':c==='spotlight'?'✨':c==='research'?'📚':'🎀'}
function img(e){return e.imageLocal||e.image||'assets/pokeball.svg'}
function timeText(e){const s=start(e),z=end(e);if(!s)return'Horario por confirmar';if(+s===+z)return fmt(s,{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'});if(same(s,z))return `De ${fmt(s,{hour:'numeric',minute:'2-digit'})} a ${fmt(z,{hour:'numeric',minute:'2-digit'})}`;return `Del ${fmt(s,{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'})} al ${fmt(z,{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'})}`}
function relativeLabel(e, now = new Date()) {
 const begins = start(e), ends = end(e);
 if (!begins || (now >= begins && now >= ends)) return '';
 const active = now >= begins;
 const minutes = Math.ceil(((active ? ends : begins) - now) / 60000);
 const days = dayNumber(begins) - dayNumber(now);
 if (!active && days > 0 && minutes >= 60) return days === 1 ? 'MAÑANA' : 'EN ' + days + ' DÍAS';
 const amount = minutes < 60 ? minutes + ' MIN' : Math.floor(minutes / 60) + ' H';
 return (active ? 'TERMINA EN ' : 'EN ') + amount;
}
function worth(e){if(e.category==='community-day')return'Prioriza capturas, shiny, caramelos y el ataque exclusivo si aplica.';if(e.category==='raid')return'Útil para gastar pases, buscar buenos IV y farmear caramelos XL.';if(e.category==='max')return'Conviene reunir Partículas Max y preparar counters antes de entrar.';if(e.category==='spotlight')return'Ideal para aprovechar el bonus de la hora y farmear rápidamente.';if(e.category==='research')return'Completa los objetivos antes del cierre para no perder recompensas.';return'Consulta los bonus y decide si vale la pena dedicar tiempo al evento.'}

async function load() {
 try {
  const response = await fetch(DATA_URL, {cache: 'no-cache'});
  if (!response.ok) throw new Error(response.status);
  const data = await response.json();
  if (!Array.isArray(data)) throw new Error('Formato de agenda inesperado');
  EVENTS = data;
  try { saveJSON('pokeweek:cache', EVENTS); } catch {}
  $('#syncText').textContent = response.headers.has('X-PokeWeek-Offline') ? 'Modo offline' :
   'Consultado · ' + fmt(new Date(), {hour: 'numeric', minute: '2-digit'});
 } catch {
  EVENTS = loadJSON('pokeweek:cache', []);
  $('#syncText').textContent = EVENTS.length ? 'Modo offline' : 'Sin datos disponibles';
 }
 parsedDates.clear();
 EVENTS = EVENTS.filter(e => start(e)).sort((a, b) => start(a) - start(b));
 render();
 checkReminders();
}

function bell(e){return `<button class="bell ${Object.hasOwn(fav,e.id)?'on':''}" data-bell="${esc(e.id)}" aria-label="${Object.hasOwn(fav,e.id)?'Quitar campana':'Guardar campana'}" aria-pressed="${Object.hasOwn(fav,e.id)}">🔔</button>`}
function featureCard(e,now){const active=now>=start(e)&&now<end(e);return `<article class="feature-card">${bell(e)}<span class="${active?'live-tag':'date-tag'}">${active?'● EN VIVO':emoji(e.category)+' '+esc(e.heading)}</span><h3 data-event="${esc(e.id)}" class="clickable">${esc(e.name)}</h3><div class="feature-time">🕒 ${esc(timeText(e))}</div><div class="relative-badge">${esc(relativeLabel(e))}</div><p>${esc(e.summary)}</p><img data-event="${esc(e.id)}" class="event-img clickable" loading="lazy" decoding="async" src="${esc(img(e))}" alt=""></article>`}
function renderToday() {
 const now = new Date();
 const active = EVENTS.filter(e => start(e) <= now && now < end(e));
 const upcoming = EVENTS.filter(e => start(e) > now && same(start(e), now));
 const next = EVENTS.find(e => start(e) > now);
 const counts = [];
 if (active.length) counts.push(active.length === 1 ? '1 evento activo' : active.length + ' eventos activos');
 if (upcoming.length) counts.push(upcoming.length === 1 ? '1 evento que empieza hoy' : upcoming.length + ' eventos que empiezan hoy');
 const summary = counts.length ? 'Tienes ' + counts.join(' y ') + '.' :
  next ? 'Hoy está tranquilo. El próximo evento es ' + next.name + '. ' + timeText(next) + '.' :
   'Hoy está tranquilo y no hay próximos eventos cargados.';
 const list = [...upcoming, ...active.sort((a,b) => end(a) - end(b))].slice(0, 3);
 $('#todayCards').innerHTML = '<article class="feature-card"><span class="date-tag">☀️ HOY</span><h3>Resumen de hoy</h3><p>' +
  esc(summary) + '</p><img class="event-img" loading="lazy" src="assets/eevee.png" alt="Eevee"></article>' +
  list.map(e => featureCard(e, now)).join('');
}
function renderUpcoming(){const now=new Date();const list=EVENTS.filter(e=>start(e)>now&&(upcomingClass==='all'||e.category===upcomingClass)&&prefs.categories.includes(e.category)).slice(0,3);$('#upcomingList').innerHTML=list.length?list.map(e=>`<article class="upcoming-item"><img data-event="${esc(e.id)}" class="upcoming-thumb clickable" loading="lazy" decoding="async" src="${esc(img(e))}" alt=""><div><button class="upcoming-name" data-event="${esc(e.id)}">${esc(e.name)}</button><div class="upcoming-time">🕒 ${esc(timeText(e))}</div><div class="upcoming-type">${emoji(e.category)} ${esc(e.heading)} · ${esc(relativeLabel(e))}</div></div>${bell(e)}</article>`).join(''):'<p class="hint">No hay próximos eventos en esta clasificación.</p>'}
function renderWeek(){const today=dayNumber(new Date()), monday=today-((new Date(today*DAY).getUTCDay()+6)%7)+weekOffset*7, ws=inMonterrey(monday*DAY), last=inMonterrey((monday+6)*DAY);$('#weekTitle').textContent=weekOffset===0?'Esta semana':`${fmt(ws,{day:'numeric',month:'short'})} – ${fmt(last,{day:'numeric',month:'short'})}`;let html='';for(let i=0;i<7;i++){const d=inMonterrey((monday+i)*DAY), nextDay=inMonterrey((monday+i+1)*DAY), list=EVENTS.filter(e=>(filter==='all'||e.category===filter)&&start(e)<nextDay&&(end(e)>d||start(e)>=d));html+=`<div class="day-col ${same(d,new Date())?'today':''}"><div class="day-head"><div class="day-name">${fmt(d,{weekday:'short'})}</div><div class="day-num">${fmt(d,{day:'numeric'})}</div></div>${list.length?list.map(e=>`<article class="event-card">${bell(e)}<div><h4 data-event="${esc(e.id)}" class="clickable">${emoji(e.category)} ${esc(e.name)}</h4><div class="event-time">🕒 ${esc(timeText(e))}</div><div class="relative-badge">${esc(relativeLabel(e))}</div><p class="event-summary">${esc(e.summary)}</p></div><img data-event="${esc(e.id)}" class="card-img clickable" loading="lazy" decoding="async" src="${esc(img(e))}" alt=""></article>`).join(''):'<div class="hint">♡ libre</div>'}</div>`}$('#weekGrid').innerHTML=html}
function resolveEvent(id) {
 return EVENTS.find(event => event.id === id) || (Object.hasOwn(fav, id) ? fav[id] : null);
}

function renderSaved() {
 const saved = Object.keys(fav).map(resolveEvent).filter(e => start(e)).sort((a,b) => start(a) - start(b));
 const now = new Date();
 $('#savedEmpty').hidden = !!saved.length;
 $('#savedList').innerHTML = saved.map(e => {
  const date = fmt(start(e), {weekday:'short', day:'numeric', month:'short', hour:'numeric', minute:'2-digit'});
  const id = esc(e.id);
  const calendar = start(e) > now ? '<a class="tiny calendar-link" href="#" download="pokeweek.ics" data-calendar="' + id + '">Calendario</a>' : '';
  return '<div class="saved"><div><strong>🔔 ' + esc(e.name) + '</strong><small>' + esc(date) +
   '</small></div><div class="saved-actions"><button class="tiny" data-event="' + id + '">Ver</button>' +
   calendar + '<button class="tiny" data-remove="' + id + '">Quitar</button></div></div>';
 }).join('');
 $('#lead').value = String(prefs.lead);
}

function eventLink(id) {
 const url = new URL('./', location.href);
 url.searchParams.set('evento', id);
 return url;
}

function calendarText(value) {
 return String(value ?? '').replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/[;,]/g, '\\$&');
}

function foldCalendarLine(line) {
 const encoder = new TextEncoder();
 let result = '', column = 0;
 for (const character of line) {
  const bytes = encoder.encode(character).length;
  if (column + bytes > 75) {
   result += '\r\n ';
   column = 1;
  }
  result += character;
  column += bytes;
 }
 return result;
}

function calendarFile(event, now = new Date()) {
 const begins = start(event), ends = end(event);
 if (!begins) return '';
 const stamp = date => date.toISOString().replace(/[-:]|\.\d{3}/g, '');
 const url = eventLink(event.id);
 const lines = [
  'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//PokeWeek//Agenda Pokemon GO//ES',
  'BEGIN:VEVENT', 'UID:' + encodeURIComponent(event.id) + '@pokeweek.' + url.hostname,
  'DTSTAMP:' + stamp(now), 'DTSTART:' + stamp(begins)
 ];
 if (ends > begins) lines.push('DTEND:' + stamp(ends));
 lines.push('SUMMARY:' + calendarText(event.name), 'URL:' + url.href);
 if (event.summary) lines.push('DESCRIPTION:' + calendarText(event.summary));
 if (begins > now) {
  const minutes = Math.min(prefs.lead, Math.floor((begins - now) / 60000));
  lines.push('BEGIN:VALARM', 'TRIGGER:-PT' + minutes + 'M', 'ACTION:DISPLAY',
   'DESCRIPTION:' + calendarText(event.name), 'END:VALARM');
 }
 lines.push('END:VEVENT', 'END:VCALENDAR');
 return lines.map(foldCalendarLine).join('\r\n') + '\r\n';
}

function prepareCalendarDownload(link) {
 const event = resolveEvent(link.dataset.calendar);
 if (!event || !start(event)) return false;
 const url = URL.createObjectURL(new Blob([calendarFile(event)], {type: 'text/calendar;charset=utf-8'}));
 link.href = url;
 setTimeout(() => URL.revokeObjectURL(url), 30000);
 return true;
}
function renderNext(){const now=new Date(),e=EVENTS.find(x=>start(x)>now);if(!e){$('#nextBig').innerHTML='<p class="hint">No hay próximos eventos.</p>';return}$('#nextBig').innerHTML=`<div class="next-card"><span class="date-tag">${emoji(e.category)} ${esc(e.heading)}</span><h3 data-event="${esc(e.id)}" class="clickable">${esc(e.name)}</h3><div class="feature-time">🕒 ${esc(timeText(e))}</div><div class="relative-badge">${esc(relativeLabel(e))}</div><p>${esc(e.summary)}</p><img data-event="${esc(e.id)}" class="clickable" loading="lazy" decoding="async" src="${esc(img(e))}" alt=""></div>`}
function render(){renderToday();renderUpcoming();renderWeek();renderSaved();renderNext();renderPrefs()}

function openEvent(id){const e=resolveEvent(id);if(!e||!start(e))return;const bonuses=e.bonuses||[],pokemon=e.pokemon||[];let html=`<div class="modal-hero"><div><span class="date-tag">${emoji(e.category)} ${esc(e.heading||'Evento')}</span><h2>${esc(e.name)}</h2><div class="modal-meta"><span class="modal-pill">🗓️ ${fmt(start(e),{weekday:'long',day:'numeric',month:'long'})}</span><span class="modal-pill">🕒 ${esc(timeText(e))}</span><span class="modal-pill">${esc(relativeLabel(e))}</span></div><p class="modal-summary">${esc(e.summary)}</p></div><img loading="lazy" src="${esc(img(e))}" alt=""></div><section class="modal-section"><h3>💡 Qué vale la pena hacer</h3><div class="detail-item">${esc(worth(e))}</div></section>`;if(bonuses.length)html+=`<section class="modal-section"><h3>✨ Bonos</h3><div class="detail-list">${bonuses.map(x=>`<div class="detail-item">✦ ${esc(x)}</div>`).join('')}</div></section>`;if(pokemon.length)html+=`<section class="modal-section"><h3>🌸 Pokémon destacados</h3><div class="pokemon-list">${pokemon.slice(0,12).map(p=>`<div class="poke-chip">${p.image?`<img loading="lazy" src="${esc(p.image)}" alt="">`:''}<span>${esc(p.name)}${p.shiny===true?' ✨':''}</span></div>`).join('')}</div></section>`;if(e.hasSpawns||e.hasFieldResearch)html+=`<section class="modal-section"><h3>📌 Incluye</h3><div class="detail-list">${e.hasSpawns?'<div class="detail-item">Apariciones salvajes</div>':''}${e.hasFieldResearch?'<div class="detail-item">Investigación de campo</div>':''}</div></section>`;if(e.sourceUrl)html+=`<a class="modal-link" href="${esc(e.sourceUrl)}" target="_blank" rel="noopener">Ver fuente completa ↗</a>`;if(start(e)>new Date())html+='<div class="modal-section"><a class="soft-btn calendar-link" href="#" download="pokeweek.ics" data-calendar="'+esc(e.id)+'">Añadir al calendario</a></div>';$('#eventModalContent').innerHTML=html;openModal('eventModal')}
function openModal(id){const m=$('#'+id);m.classList.add('open');m.setAttribute('aria-hidden','false');document.body.style.overflow='hidden'}
function closeModal(id){const m=$('#'+id);m.classList.remove('open');m.setAttribute('aria-hidden','true');document.body.style.overflow=''}

function renderPrefs(){const cats=[['community-day','🌸 Community Day'],['raid','⚡ Incursiones'],['max','💜 Max'],['spotlight','✨ Spotlight'],['research','📚 Investigación'],['event','🎀 Otros']];$('#categoryPrefs').innerHTML=cats.map(([v,l])=>`<label class="pref-item"><span>${l}</span><input type="checkbox" value="${v}" ${prefs.categories.includes(v)?'checked':''}></label>`).join('');$('#settingsLead').value=String(prefs.lead)}
function savePrefs(){prefs.categories=$$('#categoryPrefs input:checked').map(x=>x.value);prefs.lead=Number($('#settingsLead').value);saveJSON('pokeweek:prefs',prefs);$('#lead').value=String(prefs.lead);checkReminders();closeModal('settingsModal');renderUpcoming()}
function toggleFav(e) {
 if (Object.hasOwn(fav, e.id)) delete fav[e.id];
 else fav[e.id] = e;
 saveJSON('pokeweek:fav', fav);
 renderSaved(); renderToday(); renderUpcoming(); renderWeek(); renderNext();
 checkReminders();
}

let registration;
async function initPWA() {
 window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstall = e;
  $('#installBtn').hidden = false;
 });
 if ('serviceWorker' in navigator) {
  try {
   await navigator.serviceWorker.register('./sw.js');
   registration = await navigator.serviceWorker.ready;
   checkReminders();
  } catch (error) { console.warn(error); }
 }
}
async function installApp(){if(deferredInstall){deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;$('#installBtn').hidden=true}else alert('En iPhone/iPad: Compartir → Agregar a pantalla de inicio. En Android, usa “Instalar app” del navegador.')}
function urlB64ToUint8Array(base64String){const padding='='.repeat((4-base64String.length%4)%4),base64=(base64String+padding).replace(/-/g,'+').replace(/_/g,'/'),raw=atob(base64);return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)))}
function showNotice(text) {
 $('#pushNote').textContent = text;
 $('#savedSection').scrollIntoView({behavior: 'smooth'});
}

async function enableNotifications() {
 if (!window.Notification || !('serviceWorker' in navigator)) {
  showNotice('Puedes añadir eventos a tu calendario para recibir sus avisos.');
  return;
 }
 try {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
   showNotice('Para recibir avisos del navegador, permite las notificaciones en los ajustes del sitio.');
   return;
  }
  const cfg = window.POKE_PUSH_CONFIG;
  if (cfg?.publicKey && cfg.subscribeUrl && registration?.pushManager) {
   const manager = registration.pushManager;
   const subscription = await manager.getSubscription() || await manager.subscribe({
    userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(cfg.publicKey)
   });
   const response = await fetch(cfg.subscribeUrl, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({subscription, preferences: prefs, favorites: Object.keys(fav).map(id => {
     const {name, start, end} = resolveEvent(id);
     return {id, name, start, end};
    })})
   });
   if (!response.ok) throw new Error('Web Push: ' + response.status);
   showNotice('Avisos Web Push conectados.');
   return;
  }
  showNotice('Avisos activos mientras PokéWeek está abierta. Para recibir un aviso con la app cerrada, añade el evento a tu calendario.');
  checkReminders();
 } catch (error) {
  console.warn(error);
  showNotice('No se pudo activar el servicio de avisos. Puedes añadir eventos a tu calendario.');
 }
}

let checkingReminders = false;
async function checkReminders() {
 if (checkingReminders || !registration || window.Notification?.permission !== 'granted') return;
 checkingReminders = true;
 try {
  const now = Date.now();
  for (const id of Object.keys(fav)) {
   const event = resolveEvent(id);
   const begins = start(event);
   if (!begins || now >= +begins || now < +begins - prefs.lead * 60000) continue;
   const tag = 'pokeweek:' + event.id + ':' + begins.toISOString();
   if (localStorage.getItem(tag)) continue;
   await registration.showNotification('🔔 Pokémon GO', {
    body: event.name + ' · ' + relativeLabel(event),
    icon: 'assets/pokeball.png', tag, data: eventLink(id).href
   });
   localStorage.setItem(tag, '1');
  }
 } catch (error) { console.warn(error); }
 finally { checkingReminders = false; }
}

document.addEventListener('click',e=>{const evt=e.target.closest('[data-event]');if(evt){openEvent(evt.dataset.event);return}const bell=e.target.closest('[data-bell]');if(bell){const ev=EVENTS.find(x=>x.id===bell.dataset.bell);if(ev)toggleFav(ev);return}const calendar=e.target.closest('[data-calendar]');if(calendar){if(!prepareCalendarDownload(calendar))e.preventDefault();return}const rm=e.target.closest('[data-remove]');if(rm){const event=resolveEvent(rm.dataset.remove);if(event)toggleFav(event);return}const close=e.target.closest('[data-close]');if(close){closeModal(close.dataset.close);return}const jump=e.target.closest('[data-jump]');if(jump){document.getElementById(jump.dataset.jump)?.scrollIntoView({behavior:'smooth'});return}})
$$('.chip').forEach(b=>b.onclick=()=>{$$('.chip').forEach(x=>x.classList.remove('active'));b.classList.add('active');filter=b.dataset.filter;renderWeek()});
$('#upcomingFilter').onchange=e=>{upcomingClass=e.target.value;renderUpcoming()};$('#prevWeek').onclick=()=>{weekOffset--;renderWeek()};$('#nextWeek').onclick=()=>{weekOffset++;renderWeek()};$('#goToday').onclick=()=>{weekOffset=0;renderWeek();$('#weekSection').scrollIntoView({behavior:'smooth'})};$('#lead').onchange=e=>{prefs.lead=Number(e.target.value);saveJSON('pokeweek:prefs',prefs);checkReminders()};$('#settingsBtn').onclick=()=>openModal('settingsModal');$('#mobileSettings').onclick=()=>openModal('settingsModal');$('#saveSettings').onclick=savePrefs;$('#notifyBtn').onclick=enableNotifications;$('#installBtn').onclick=installApp;$('#versionBtn').onclick=()=>openModal('changelogModal');$('#changelogBtn').onclick=()=>openModal('changelogModal');document.addEventListener('keydown',e=>{if(e.key==='Escape')$$('.modal.open').forEach(m=>closeModal(m.id))});
function refreshTime() {
 if (document.hidden) return;
 if (!document.activeElement?.closest('#todayCards,#weekGrid,#upcomingList,#nextBig')) {
  renderToday(); renderUpcoming(); renderWeek(); renderNext();
 }
 checkReminders();
}

window.addEventListener('online', load);
document.addEventListener('visibilitychange', refreshTime);
setInterval(refreshTime, 30000);
initPWA();
load().then(() => {
 const id = new URL(location.href).searchParams.get('evento');
 if (id) openEvent(id);
});