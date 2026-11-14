"""
World Finals bracket for cb7.stathut.in

Reads the public bracket feed that the official Clash of Clans event site
(event.supercell.com/clashofclans) uses, at most once a minute, and serves a
small cleaned-up JSON at GET /worlds/bracket.

Add to main.py:
    from worlds import router as worlds_router
    app.include_router(worlds_router)
"""
import json
import time
import urllib.request
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

router = APIRouter()

EVENT_ID = "3PDE5eAQuoUzjKCv539j99"  # CoC World Championship 2026 - World Finals
BASE = "https://event.supercell.com/clashofclans"
CACHE_SECONDS = 60

_cache = {"at": 0.0, "data": None}


def _get(path):
    req = urllib.request.Request(
        BASE + path,
        headers={"User-Agent": "StatHut/1.0 (+https://cb7.stathut.in)", "Accept": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.load(r)


def _build():
    bracket = next(b for b in _get("/v1/bracket") if b.get("eventId") == EVENT_ID)
    event = next(e for e in _get("/v1/event") if e.get("eventId") == EVENT_ID)
    teams = {t["teamId"]: t for t in _get("/assets/teams_clashofclans.json")}

    streams = {}
    for s in event.get("streams") or []:
        if s.get("platform") == "Youtube" and s.get("title") == "English Official Broadcast":
            streams[str(s.get("range"))] = s.get("videoId")

    matches = []
    for rng in bracket.get("ranges") or []:
        for m in rng.get("matches") or []:
            slots = []
            for c in m.get("contestant") or []:
                t = teams.get(c.get("id"))
                slots.append({"name": t["name"], "short": t.get("shortName"), "score": c.get("score", 0)} if t else None)
            done = bool(m.get("completed"))
            winner = m.get("winner") if done and isinstance(m.get("winner"), int) else None
            matches.append({
                "id": m.get("id"),
                "day": rng.get("rangeId"),
                "stage": (m.get("bracketPosition") or {}).get("stage"),
                "teams": slots,
                "completed": done,
                "skipped": bool(m.get("isSkipped")),
                "winner": winner,
                "from": [{"match": p.get("matchId"), "result": p.get("result")} for p in m.get("populateFromMatches") or []],
            })

    starts = event.get("rangeStartTimes") or {}
    return {
        "source": "official",
        "status": event.get("status"),
        "day_starts": [starts.get("1"), starts.get("2")],
        "streams": streams,
        "matches": matches,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/worlds/bracket")
def worlds_bracket():
    now = time.time()
    if _cache["data"] is None or now - _cache["at"] > CACHE_SECONDS:
        try:
            _cache["data"] = _build()
            _cache["at"] = now
        except Exception as e:
            if _cache["data"] is None:
                raise HTTPException(status_code=502, detail=f"Event feed unavailable: {e}")
            # keep serving the last good copy
    return _cache["data"]
