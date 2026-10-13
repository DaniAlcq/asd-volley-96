#!/usr/bin/env python3
"""Classifiche Volley '96: conserva lo storico e aggiorna solo la stagione attiva.

Configurazione modificabile: data/stagioni.json
Non modificare le classifiche archiviate: sono snapshot pubblicati nel repository.
"""
from __future__ import annotations

import json
import re
import sys
import time
import unicodedata
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://sicilia.portalefipav.net/"
ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
ARCHIVE_DIR = DATA_DIR / "classifiche"
LOGOS_DIR = ROOT / "img" / "loghi-fipav"
SETTINGS = DATA_DIR / "stagioni.json"
CATEGORIES = ("femminile", "maschile")


def write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temp.replace(path)


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def load_config() -> dict:
    config = read_json(SETTINGS)
    ids = set()
    active = 0
    for season in config["stagioni"]:
        slug = season["id"]
        if not re.fullmatch(r"20\d{2}-\d{2}", slug) or slug in ids:
            raise ValueError(f"Identificativo stagione non valido o duplicato: {slug}")
        ids.add(slug)
        state = season["stato"]
        if state not in ("archiviata", "attiva", "in_attesa"):
            raise ValueError(f"Stato non valido: {state}")
        if state == "attiva":
            active += 1
            for category in CATEGORIES:
                if not isinstance(season["campionati"][category]["cid"], int):
                    raise ValueError(f"Manca il CId attivo: {slug}/{category}")
        for category in CATEGORIES:
            cid = season["campionati"][category]["cid"]
            if cid is not None and (not isinstance(cid, int) or cid <= 0):
                raise ValueError(f"CId non valido: {slug}/{category}")
    if active > 1 or config["predefinita"] not in ids:
        raise ValueError("Configurazione stagioni incoerente")
    return config


def clean(value: str) -> str:
    return " ".join(value.split()).strip()


def key(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", clean(value).upper())
    return re.sub(r"[^A-Z0-9]", "", "".join(c for c in normalized if not unicodedata.combining(c)))


def cells_of(row):
    return row.find_all(["th", "td"], recursive=False)


def parse_ranking(html: bytes) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    for table in soup.find_all("table"):
        rows = table.find_all("tr")
        indices = None
        start_at = None
        for row_num, row in enumerate(rows):
            labels = {key(c.get_text(" ", strip=True)): index for index, c in enumerate(cells_of(row))}
            if {"SQUADRA", "PUNTI", "PG", "PV", "PP"}.issubset(labels) and (
                "POS" in labels or "POSIZIONE" in labels
            ):
                indices = labels
                start_at = row_num + 1
                break
        if indices is None:
            continue
        position_key = "POS" if "POS" in indices else "POSIZIONE"
        rankings = []
        for row in rows[start_at:]:
            cells = cells_of(row)
            if len(cells) <= max(indices[k] for k in (position_key, "SQUADRA", "PUNTI", "PG", "PV", "PP")):
                continue
            def col(name):
                return clean(cells[indices[name]].get_text(" ", strip=True))
            position = col(position_key).rstrip(".")
            name = col("SQUADRA")
            points = col("PUNTI")
            played = col("PG")
            won = col("PV")
            lost = col("PP")
            if not (position.isdecimal() and name and re.fullmatch(r"-?\d+", points)
                    and played.isdecimal() and won.isdecimal() and lost.isdecimal()):
                continue
            image = cells[indices["SQUADRA"]].find("img")
            source = (image.get("src") or image.get("data-src") or "").strip() if image else ""
            logo = urljoin(BASE_URL, source) if source else ""
            if urlparse(logo).scheme != "https":
                logo = ""
            rankings.append({
                "posizione": int(position), "nome": name, "logo": logo, "punti": int(points),
                "partite_giocate": int(played), "vittorie": int(won), "sconfitte": int(lost),
            })
        if len(rankings) >= 2:
            return sorted(rankings, key=lambda item: item["posizione"])
    raise ValueError("Non è stata trovata una tabella di classifica FIPAV valida")


def save_logo(url: str, session: requests.Session) -> str | None:
    """Salva solo immagini provenienti dal percorso ufficiale FIPAV.

    None = impossibile salvarla (lascia intatta l'eventuale URL originale).
    """
    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.netloc.lower() != "sicilia.portalefipav.net":
        return None
    match = re.fullmatch(
        r"/mngArea/Societa/img/(\d+)/Loghi/(LogoS\d+\.(?:png|jpg|jpeg|gif|webp))",
        parsed.path, flags=re.IGNORECASE
    )
    if not match:
        return None
    filename = f"{match.group(1)}-{match.group(2)}"
    relative = f"img/loghi-fipav/{filename}"
    destination = LOGOS_DIR / filename
    if destination.is_file() and destination.stat().st_size > 200:
        return relative
    try:
        response = session.get(url, timeout=20, headers={"Referer": BASE_URL,
            "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8"})
        response.raise_for_status()
        content = response.content
        suffix = match.group(2).rsplit(".", 1)[-1].lower()
        valid = {
            "png": content.startswith(b"\x89PNG\r\n\x1a\n"),
            "jpg": content.startswith(b"\xff\xd8"),
            "jpeg": content.startswith(b"\xff\xd8"),
            "gif": content.startswith((b"GIF87a", b"GIF89a")),
            "webp": content.startswith(b"RIFF") and content[8:12] == b"WEBP",
        }
        if not valid[suffix] or not (200 < len(content) < 3 * 1024 * 1024):
            raise ValueError("contenuto non riconosciuto come immagine valida")
        LOGOS_DIR.mkdir(parents=True, exist_ok=True)
        temp = destination.with_suffix(destination.suffix + ".tmp")
        temp.write_bytes(content)
        temp.replace(destination)
        print(f"Logo archiviato: {relative}")
        return relative
    except (requests.RequestException, ValueError, OSError) as exc:
        print(f"Logo non scaricabile: {url} ({exc})", file=sys.stderr)
        return None


def localize_logos(payload: dict, session: requests.Session) -> bool:
    """Conserva i dati della classifica; converte soltanto i link dei loghi in file locali."""
    changed = False
    for team in payload.get("dati", []):
        logo = team.get("logo", "")
        if isinstance(logo, str) and logo.startswith("https://"):
            new_logo = save_logo(logo, session)
            if new_logo:
                team["logo"] = new_logo
                changed = True
    return changed


def archived_snapshot(season: dict, category: str, session: requests.Session) -> None:
    """Migra solo una volta lo storico 2025/26 dalle copie JSON già nel repository.

    Non riscarica mai da FIPAV risultati e punteggi di una stagione archiviata.
    """
    dest = ARCHIVE_DIR / season["id"] / f"{category}.json"
    if not dest.exists() and season["id"] == "2025-26":
        legacy = DATA_DIR / f"classifica-{category}.json"
        if not legacy.is_file():
            raise FileNotFoundError(f"Manca il JSON 2025/26 da archiviare: {legacy}")
        payload = read_json(legacy)
        if payload.get("stagione") != "2025/26" or not isinstance(payload.get("dati"), list) or not payload["dati"]:
            raise ValueError(f"Il JSON originale non è una classifica 2025/26 valida: {legacy}")
        write_json(dest, payload)
        print(f"Snapshot definitivo creato da {legacy.relative_to(ROOT)} -> {dest.relative_to(ROOT)}")
    if dest.is_file():
        payload = read_json(dest)
        if localize_logos(payload, session):
            write_json(dest, payload)
            print(f"Loghi salvati nella stagione archivio {season['id']} / {category}")
    else:
        print(f"ATTENZIONE: manca la classifica archiviata {season['id']}/{category}", file=sys.stderr)


def update_current(season: dict, category: str, session: requests.Session) -> None:
    cid = season["campionati"][category]["cid"]
    url = f"{BASE_URL}classifica.aspx?CId={cid}"
    response = session.get(url, timeout=25)
    response.raise_for_status()
    ranking = parse_ranking(response.content)
    payload = {
        "dati": ranking,
        "verificataIl": int(time.time()),
        "fonte": url,
        "stagione": season["etichetta"],
        "girone": season["campionati"][category]["girone"],
    }
    localize_logos(payload, session)
    dest = ARCHIVE_DIR / season["id"] / f"{category}.json"
    write_json(dest, payload)
    print(f"Aggiornata {season['etichetta']} / {category}: {len(ranking)} squadre (CId={cid})")


def main() -> int:
    try:
        config = load_config()
    except (OSError, ValueError, KeyError, json.JSONDecodeError) as exc:
        print(f"Configurazione non valida: {exc}", file=sys.stderr)
        return 1

    session = requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (compatible; ASDVolley96/2.0; GithubActions Ranking Archive)",
        "Accept": "text/html,application/xhtml+xml",
    })
    errors = []
    for season in config["stagioni"]:
        for category in CATEGORIES:
            try:
                if season["stato"] == "archiviata":
                    archived_snapshot(season, category, session)
                elif season["stato"] == "attiva":
                    update_current(season, category, session)
                else:
                    print(f"In attesa di CId: {season['etichetta']} / {category}")
            except (OSError, ValueError, KeyError, requests.RequestException, json.JSONDecodeError) as exc:
                errors.append(f"{season['id']}/{category}: {exc}")
                print(f"ERRORE {season['id']}/{category}: {exc}", file=sys.stderr)
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
