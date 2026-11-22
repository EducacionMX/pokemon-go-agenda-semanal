import argparse
import hashlib
import json
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from urllib.parse import urlparse

import requests
from PIL import Image, ImageOps

SOURCE = "https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/events.json"
ROOT = Path(__file__).resolve().parents[1]
CATEGORIES = {
    "community": "community-day",
    "max": "max",
    "raid": "raid",
    "spotlight": "spotlight",
    "research": "research",
}
SUMMARIES = {
    "community-day": "Community Day con apariciones aumentadas y contenido temporal.",
    "max": "Combates Max disponibles durante esta ventana.",
    "raid": "Incursiones disponibles durante el horario indicado.",
    "spotlight": "Hora destacada con apariciones aumentadas y un bono temporal.",
    "research": "Investigación temporal o especial disponible durante este periodo.",
}


def is_https(url):
    return isinstance(url, str) and urlparse(url).scheme == "https" and bool(urlparse(url).hostname)


def cache_image(event, output):
    url = event["image"]
    if not is_https(url):
        return None
    try:
        response = requests.get(url, timeout=(8, 18))
        response.raise_for_status()
        with Image.open(BytesIO(response.content)) as source:
            image = ImageOps.exif_transpose(source).convert("RGBA")
        image.thumbnail((640, 420))
        encoded = BytesIO()
        image.save(encoded, "WEBP", quality=78, method=5)
        payload = encoded.getvalue()
        key = hashlib.sha256(url.encode() + payload).hexdigest()[:20]
        relative = Path("assets/event-images") / f"{key}.webp"
        (output / relative).write_bytes(payload)
        return relative.as_posix()
    except (OSError, ValueError, requests.RequestException) as error:
        print(f"Miniatura no disponible para {event['id']}: {error}")
        return None


def event_details(extra):
    community = extra.get("communityday") or {}
    spotlight = extra.get("spotlight") or {}
    raid = extra.get("raidbattles") or {}
    bonuses = [bonus["text"] for bonus in community.get("bonuses") or [] if bonus.get("text")]
    if spotlight.get("bonus"):
        bonuses.append(spotlight["bonus"])
    featured = {}
    shiny_names = {p.get("name") for p in (community.get("shinies") or []) + (raid.get("shinies") or [])}
    raid_pokemon = raid.get("bosses") or raid.get("shinies") or []
    spotlight_pokemon = spotlight.get("list") or ([spotlight] if spotlight.get("name") else [])
    for item in (community.get("spawns") or []) + spotlight_pokemon + raid_pokemon:
        name = item.get("name")
        if not name:
            continue
        featured[name] = {
            "name": name,
            "image": item.get("image") if is_https(item.get("image")) else None,
            "shiny": item.get("canBeShiny") is True or name in shiny_names,
        }
    return {
        "bonuses": list(dict.fromkeys(bonuses)),
        "bonusNotes": community.get("bonusDisclaimers") or [],
        "pokemon": list(featured.values()),
    }


def normalize(raw):
    if not isinstance(raw, list):
        raise ValueError("Se esperaba una lista de eventos")
    events = []
    seen = set()
    for entry in raw:
        if not entry.get("start"):
            continue
        event_id = str(entry.get("eventID") or entry.get("id") or entry.get("name") or "")
        if not event_id or not entry.get("name") or event_id in seen:
            raise ValueError(f"Identificador repetido o evento incompleto: {event_id}")
        seen.add(event_id)
        event_type = entry.get("eventType") or "event"
        category = next((value for token, value in CATEGORIES.items() if token in event_type.lower()), "event")
        extra = entry.get("extraData") or {}
        generic = extra.get("generic") or {}
        start = entry["start"]
        end = entry.get("end") or start
        for stamp in (start, end):
            datetime.fromisoformat(stamp)
        events.append({
            "id": event_id,
            "name": entry["name"],
            "category": category,
            "type": event_type,
            "heading": entry.get("heading") or "Evento",
            "start": start,
            "end": end,
            "image": entry.get("image") if is_https(entry.get("image")) else None,
            "sourceUrl": entry.get("link") if is_https(entry.get("link")) else None,
            "summary": SUMMARIES.get(category, "Evento disponible durante este periodo."),
            "hasSpawns": bool(generic.get("hasSpawns")),
            "hasFieldResearch": bool(generic.get("hasFieldResearchTasks")),
            **event_details(extra),
        })
    if not events:
        raise ValueError("La fuente no entregó eventos con horario")
    return sorted(events, key=lambda event: event["start"])


def update(output):
    response = requests.get(SOURCE, timeout=30, headers={"Cache-Control": "no-cache"})
    response.raise_for_status()
    events = normalize(response.json())
    updated_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    (output / "assets/event-images").mkdir(parents=True, exist_ok=True)
    unique_images = {event["image"]: event for event in events if event["image"]}
    with ThreadPoolExecutor(max_workers=6) as pool:
        images = dict(zip(unique_images, pool.map(lambda event: cache_image(event, output), unique_images.values())))
    for event in events:
        event["imageLocal"] = images.get(event["image"])
    payload = {"updatedAt": updated_at, "events": events}
    agenda = output / "data/events.normalized.json"
    agenda.parent.mkdir(parents=True, exist_ok=True)
    pending = agenda.with_suffix(".tmp")
    pending.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    pending.replace(agenda)
    print(f"Eventos: {len(events)} · miniaturas locales: {sum(bool(e['imageLocal']) for e in events)}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generar la agenda y las miniaturas de PokéWeek.")
    parser.add_argument("--output", type=Path, default=ROOT)
    update(parser.parse_args().output.resolve())
