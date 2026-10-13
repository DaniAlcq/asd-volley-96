#!/usr/bin/env python3
"""Aggiorna le classifiche FIPAV per un sito statico GitHub Pages.

Cambia SOLO i valori CID qui sotto quando inizia una nuova stagione.
Non è richiesta alcuna chiave API o hosting PHP.
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

# Stagione 2025/26. NON sostituire con codici di stagioni diverse senza verificarli.
CID = {
    "femminile": 85779,  # Serie C femminile, girone B
    "maschile": 85777,   # Serie C maschile, girone A
}

BASE_URL = "https://sicilia.portalefipav.net/"
ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data"


def clean(value: str) -> str:
    return " ".join(value.split()).strip()


def key(value: str) -> str:
    raw = unicodedata.normalize("NFKD", clean(value).upper())
    ascii_only = "".join(c for c in raw if not unicodedata.combining(c))
    return re.sub(r"[^A-Z0-9]", "", ascii_only)


def text(cell) -> str:
    return clean(cell.get_text(" ", strip=True))


def cells_of(row):
    # Le tabelle ufficiali usano celle TD/TH; seleziona soltanto i figli diretti.
    return row.find_all(["th", "td"], recursive=False)


def parse_ranking(html: bytes) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    # Evita di confondere la classifica con altre tabelle della pagina.
    for table in soup.find_all("table"):
        rows = table.find_all("tr")
        header_index = None
        indexes = None
        for row_no, row in enumerate(rows):
            labels = {key(text(cell)): i for i, cell in enumerate(cells_of(row))}
            if ("SQUADRA" in labels and "PUNTI" in labels
                and "PG" in labels and "PV" in labels and "PP" in labels
                and ("POS" in labels or "POSIZIONE" in labels)):
                header_index = row_no
                indexes = labels
                break
        if indexes is None:
            continue

        result = []
        pos_key = "POS" if "POS" in indexes else "POSIZIONE"
        for row in rows[header_index + 1:]:
            cells = cells_of(row)
            if len(cells) <= max(indexes[k] for k in (pos_key, "SQUADRA", "PUNTI", "PG", "PV", "PP")):
                continue
            def col(name):
                return text(cells[indexes[name]])

            position = col(pos_key).rstrip(".")
            name = col("SQUADRA")
            points = col("PUNTI")
            played = col("PG")
            won = col("PV")
            lost = col("PP")
            if not (position.isdecimal() and name and
                    re.fullmatch(r"-?\d+", points) and
                    played.isdecimal() and won.isdecimal() and lost.isdecimal()):
                continue

            image = cells[indexes["SQUADRA"]].find("img")
            logo = ""
            if image:
                src = image.get("src") or image.get("data-src") or ""
                absolute = urljoin(BASE_URL, src.strip()) if src else ""
                if absolute and urlparse(absolute).scheme == "https":
                    logo = absolute

            result.append({
                "posizione": int(position),
                "nome": name,
                "logo": logo,
                "punti": int(points),
                "partite_giocate": int(played),
                "vittorie": int(won),
                "sconfitte": int(lost),
            })
        if len(result) >= 2:
            result.sort(key=lambda row: row["posizione"])
            return result
    raise ValueError("Tabella della classifica non trovata nel documento FIPAV")


def update(category: str, cid: int, session: requests.Session) -> None:
    url = f"{BASE_URL}classifica.aspx?CId={cid}"
    response = session.get(url, timeout=25)
    response.raise_for_status()
    ranking = parse_ranking(response.content)
    payload = {
        "dati": ranking,
        "verificataIl": int(time.time()),
        "fonte": url,
        "stagione": "2025/26",  # Cambia anche questo quando aggiorni i CId.
        "girone": "B" if category == "femminile" else "A",
    }
    OUTPUT.mkdir(parents=True, exist_ok=True)
    destination = OUTPUT / f"classifica-{category}.json"
    tmp = destination.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tmp.replace(destination)
    print(f"OK {category}: {len(ranking)} squadre, CId={cid}")


def main() -> int:
    session = requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (compatible; ASDVolley96/1.0; GitHubActions data sync)",
        "Accept": "text/html,application/xhtml+xml",
    })
    errors = []
    for cat, cid in CID.items():
        try:
            update(cat, cid, session)
        except (requests.RequestException, ValueError, OSError) as exc:
            # Lascia invariato il JSON precedente se il portale non risponde.
            errors.append(f"{cat}: {exc}")
            print(f"ERRORE {cat}: {exc}", file=sys.stderr)
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
