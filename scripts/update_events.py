import json, re, shutil, hashlib
from pathlib import Path
import requests
from PIL import Image
from io import BytesIO

SOURCE="https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/events.json"
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"data/events.normalized.json"
IMGDIR=ROOT/"assets/event-images"
IMGDIR.mkdir(parents=True,exist_ok=True)

def cat(t=""):
    t=t.lower()
    if "community" in t:return "community-day"
    if "max" in t:return "max"
    if "raid" in t:return "raid"
    if "spotlight" in t:return "spotlight"
    if "research" in t:return "research"
    return "event"

def slug(s):
    s=re.sub(r"[^a-z0-9]+","-",s.lower()).strip("-")
    return s[:70] or hashlib.sha1(s.encode()).hexdigest()[:12]

def summary(c,h):
    return {"community-day":"Community Day con apariciones aumentadas, bonus especiales y contenido temporal.","max":"Combates Max disponibles durante esta ventana.","raid":"Incursiones especiales disponibles durante el horario indicado.","spotlight":"Hora destacada con apariciones aumentadas y bonus temporal.","research":"Investigación temporal o especial disponible durante este periodo."}.get(c,f"{h or 'Evento'} activo durante este periodo.")

def cache_image(url,event_id):
    if not url:return None
    try:
        r=requests.get(url,timeout=20,headers={"User-Agent":"PokeWeek/3.0"});r.raise_for_status()
        im=Image.open(BytesIO(r.content)).convert("RGB");im.thumbnail((700,500))
        path=IMGDIR/f"{slug(event_id)}.webp";im.save(path,"WEBP",quality=80,method=6)
        return str(path.relative_to(ROOT)).replace("\\","/")
    except Exception as ex:
        print("image warning",event_id,ex);return None

raw=requests.get(SOURCE,timeout=30).json()
shutil.rmtree(IMGDIR,ignore_errors=True);IMGDIR.mkdir(parents=True,exist_ok=True)
events=[]
for e in raw:
    if not e.get("start"):continue
    x=e.get("extraData") or {};bonuses=[];pokemon=[]
    cd=x.get("communityday") or {}
    for b in cd.get("bonuses") or []:
        if b.get("text"):bonuses.append(b["text"])
    for p in cd.get("spawns") or []:
        if p.get("name"):pokemon.append({"name":p["name"],"image":p.get("image"),"shiny":p.get("canBeShiny")})
    sp=x.get("spotlight") or {}
    if sp.get("bonus"):bonuses.append(sp["bonus"])
    for p in sp.get("list") or []:
        if p.get("name"):pokemon.append({"name":p["name"],"image":p.get("image"),"shiny":p.get("canBeShiny")})
    event_id=str(e.get("eventID") or e.get("id") or e.get("name"))
    c=cat(e.get("eventType",""))
    events.append({"id":event_id,"name":e.get("name","Evento Pokémon GO"),"category":c,"type":e.get("eventType","event"),"heading":e.get("heading","Evento"),"start":e["start"],"end":e.get("end") or e["start"],"image":e.get("image"),"imageLocal":cache_image(e.get("image"),event_id),"sourceUrl":e.get("link"),"summary":summary(c,e.get("heading")),"bonuses":list(dict.fromkeys(bonuses)),"pokemon":pokemon,"hasSpawns":bool((x.get("generic") or {}).get("hasSpawns")),"hasFieldResearch":bool((x.get("generic") or {}).get("hasFieldResearchTasks"))})
events.sort(key=lambda e:e["start"])
OUT.parent.mkdir(exist_ok=True)
OUT.write_text(json.dumps(events,ensure_ascii=False,indent=2),encoding="utf-8")
print("normalized",len(events))
