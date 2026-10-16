#!/usr/bin/env python3

"""Calendari Volley '96 da FIPAV Sicilia.



Legge i CId da data/stagioni.json. Aggiorna le stagioni attive e

scrive le archiviate soltanto se il file non esiste ancora.

Non sovrascrive mai un file valido quando la pagina FIPAV non risponde.

"""

from __future__ import annotations



import json

import re

import sys

import time

import unicodedata

from datetime import datetime

from pathlib import Path

from urllib.parse import urljoin



import requests

from bs4 import BeautifulSoup



ROOT = Path(__file__).resolve().parents[1]

BASE = 'https://sicilia.portalefipav.net/'

CONFIG_PATH = ROOT / 'data' / 'stagioni.json'

OUTPUT = ROOT / 'data' / 'calendari'

CATEGORIES = ('femminile', 'maschile')



# Identificativi ricavati dal link FIPAV del girone maschile 2026/27

# comunicato per questo sito. SId identifica il filtro società.

DEFAULT_CLUB_SID = 2225

STID_KNOWN = {'2026-27': 2417}



# Da ampliare se la società cambia denominazione/sponsor nel portale FIPAV.

TEAM_NAMES = {

    'femminile': ('FIMA', 'VOLLEY 96', 'VOLLEY96', 'VOLLEY ’96', 'MILAZZO'),

    'maschile': ('ADG NDT', 'VOLLEY 96', 'VOLLEY96', 'VOLLEY ’96', 'MILAZZO'),

}





def norm(s: str) -> str:

    s = unicodedata.normalize('NFKD', str(s).upper())

    s = ''.join(c for c in s if not unicodedata.combining(c))

    return re.sub(r'[^A-Z0-9]', '', s)





def clean(s: str) -> str:

    return ' '.join(str(s).split())





def team_strength(name: str, category: str) -> int:

    x = norm(name)

    if not x:

        return 0

    # Le denominazioni con sponsor o VOLLEY96 prevalgono su un generico MILAZZO.

    premium = TEAM_NAMES[category][:-1]

    if any(norm(alias) in x for alias in premium):

        return 3

    return 1 if norm('MILAZZO') in x else 0





def direct_cells(row):

    return row.find_all(['th', 'td'], recursive=False)





def headings(cells) -> dict[str, int]:

    found = {}

    for i, cell in enumerate(cells):

        label = norm(cell.get_text(' ', strip=True))

        for key, match in (

            ('gara', ('GARA',)), ('giornata', ('G', 'GIORNATA')),

            ('data', ('DATAORA', 'DATAORARIO', 'DATA')),

            ('casa', ('SQUADRACASA',)), ('ospite', ('SQUADRAOSPITE',)),

            ('risultato', ('RISUL', 'RISULTATO', 'RIS')),
            ('dettagli', ('DETTAGLI', 'PARZIALI', 'SET')),

        ):

            if label in match:

                found[key] = i

    return found







def extract_set_scores(cell) -> list[str]:
    """Parziali casa-ospite dalla colonna Dettagli della tabella FIPAV.

    Legge solo sequenze isolate come 25-19, senza dedurre punteggi.
    """
    if cell is None:
        return []
    text = cell.get_text(' ', strip=True).replace('–', '-').replace('—', '-')
    candidates = re.findall(r'(?<!\d)(\d{1,2})\s*[-:]\s*(\d{1,2})(?!\d)', text)
    pairs = []
    for left, right in candidates:
        a, b = int(left), int(right)
        # Il set nella pallavolo può finire oltre i 25 ai vantaggi.
        # Scarta marcatori di match, date e intervalli non plausibili.
        if max(a, b) >= 15 and max(a, b) <= 45 and min(a, b) >= 0:
            pairs.append(f'{a}-{b}')
    return pairs[:5]


def parse_fipav_matches(content: bytes, category: str) -> list[dict]:

    soup = BeautifulSoup(content, 'html.parser')

    unique = {}

    located_header = False

    all_rows = 0

    for table in soup.find_all('table'):

        rows = table.find_all('tr')

        col = None

        for tr in rows:

            cells = direct_cells(tr)

            labels = headings(cells)

            if {'gara', 'giornata', 'data', 'casa', 'ospite', 'risultato'} <= labels.keys():

                col = labels

                located_header = True

                continue

            if col is None or len(cells) <= max(col.values()):

                continue



            def value(key):

                return clean(cells[col[key]].get_text(' ', strip=True))



            gara = value('gara')

            giorno = value('giornata')

            home = value('casa')

            away = value('ospite')

            if not (gara.isdecimal() and giorno.isdecimal() and home and away):

                continue

            all_rows += 1

            strength_home = team_strength(home, category)

            strength_away = team_strength(away, category)

            if strength_home == strength_away:  # derby ambiguo o partita estranea

                continue

            is_home = strength_home > strength_away



            opponent_cell = cells[col['ospite'] if is_home else col['casa']]

            opponent = away if is_home else home

            logo_tag = opponent_cell.find('img')

            src = ((logo_tag.get('src') or logo_tag.get('data-src') or '') if logo_tag else '').strip()

            logo = urljoin(BASE, src) if src else ''

            if not logo.startswith(BASE):

                logo = ''

            when = value('data')

            dt = re.search(r'(\d{1,2}/\d{1,2}/\d{2,4})\s*(?:ore\s*)?(\d{1,2}:\d{2})?', when, re.I)

            date = dt.group(1) if dt else when

            hour = dt.group(2) if dt and dt.group(2) else ''

            original_result = value('risultato')

            score = re.search(r'\b([0-3])\s*[-:]\s*([0-3])\b', original_result)

            if score:

                a, b = score.groups()

                result = f'{a}-{b}' if is_home else f'{b}-{a}'

            else:

                result = '-'

            unique[gara] = {

                'gara': int(gara), 'giornata': int(giorno),

                'data': date, 'orario': hour, 'avversario': opponent,

                'logo': logo, 'luogo': 'C' if is_home else 'T',

                'risultato': result,
                'parziali': extract_set_scores(cells[col['dettagli']]) if 'dettagli' in col and score else [],

            }

    if not located_header:

        raise ValueError('Tabella delle gare FIPAV non riconosciuta; controlla il formato HTML del portale')

    if not unique:

        raise ValueError(f'Nessuna gara Volley 96 individuata tra {all_rows} righe: verificare SId, CId e nomi squadra')

    # Non pubblicare una stagione sbagliata o un filtro che restituisce un campionato intero

    if len(unique) > 45:

        raise ValueError(f'Troppe gare trovate ({len(unique)}): controllo identità squadra fallito')

    return sorted(unique.values(), key=lambda r: (r['giornata'], date_key(r['data']), r['gara']))





def date_key(value):

    for fmt in ('%d/%m/%Y', '%d/%m/%y'):

        try:

            return datetime.strptime(value, fmt)

        except ValueError:

            continue

    return datetime.max





def ranking_logos(season_id: str, category: str):

    path = ROOT / 'data' / 'classifiche' / season_id / f'{category}.json'

    if not path.is_file():

        return {}

    data = json.loads(path.read_text(encoding='utf-8'))

    return {norm(t['nome']): t.get('logo', '') for t in data.get('dati', []) if t.get('nome')}





def enrich_logos(matches: list[dict], season_id: str, category: str):

    logos = ranking_logos(season_id, category)

    for row in matches:

        opponent = norm(row['avversario'])

        logo = logos.get(opponent)

        if not logo:

            candidates = [v for k, v in logos.items() if len(k) > 8 and len(opponent) > 8 and (k in opponent or opponent in k)]

            if len(candidates) == 1:

                logo = candidates[0]

        if logo:

            row['logo'] = logo

        # Salvare anche i loghi futuri con lo stesso metodo usato per le classifiche:

        # lo script delle classifiche gira prima ed archivia img/loghi-fipav/.





def download_matches(session, cid: int, season: dict, category: str):

    # URL ufficiale filtrato per società, senza settimana: tutte le gare.

    # Se una società usa identificativi differenti, inserirli in

    # data/stagioni.json nella sezione campionati, come "sid".

    champ = season['campionati'][category]

    sid = champ.get('sid', DEFAULT_CLUB_SID)

    stid = champ.get('st_id', STID_KNOWN.get(season['id'], ''))

    params = {

        'ComitatoId': '37', 'StId': str(stid), 'DataDa': '',

        'StatoGara': '', 'CId': str(cid), 'SId': str(sid),

        'PId': '7306', 'btFiltro': 'CERCA',

    }

    url = urljoin(BASE, 'risultati-classifiche.aspx')

    response = session.get(url, params=params, timeout=35)

    response.raise_for_status()

    return parse_fipav_matches(response.content, category), response.url





def write_json(path: Path, payload):

    path.parent.mkdir(parents=True, exist_ok=True)

    tmp = path.with_suffix('.json.tmp')

    tmp.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    tmp.replace(path)





def main() -> int:

    config = json.loads(CONFIG_PATH.read_text(encoding='utf-8'))

    session = requests.Session()

    session.headers.update({

        'User-Agent': 'Mozilla/5.0 (compatible; ASDVolley96/2.0; GitHubActions)',

        'Accept': 'text/html,application/xhtml+xml',

    })

    errors = []

    for season in config['stagioni']:

        state = season['stato']

        if state == 'in_attesa':

            continue

        for category in CATEGORIES:

            target = OUTPUT / season['id'] / f'{category}.json'

            if state == 'archiviata' and target.exists():

                print(f'Archivio protetto: {target.relative_to(ROOT)}')

                continue

            cid = season['campionati'][category].get('cid')

            if not isinstance(cid, int) or cid <= 0:

                print(f'ATTENZIONE: CId mancante per {season["id"]}/{category}', file=sys.stderr)

                continue

            try:

                rows, source = download_matches(session, cid, season, category)

                if target.exists() and state == 'attiva':

                    # Alcuni filtri del portale possono restituire solo una parte delle

                    # partite. Aggiorniamo quelle viste senza eliminare le altre.

                    previous = json.loads(target.read_text(encoding='utf-8'))

                    old_rows = previous.get('dati', [])

                    if isinstance(old_rows, list):

                        merged = {int(r['gara']): r for r in old_rows if isinstance(r, dict) and str(r.get('gara', '')).isdigit()}

                        for row in rows:
                            key = int(row['gara'])
                            if not row.get('parziali') and key in merged and merged[key].get('parziali'):
                                row['parziali'] = merged[key]['parziali']
                            merged[key] = row

                        if len(merged) > len(rows):

                            print(f'Risposta FIPAV parziale ({len(rows)} gare): conservo {len(merged)} gare nel JSON')

                        rows = sorted(merged.values(), key=lambda r: (int(r['giornata']), date_key(r['data']), int(r['gara'])))

                elif len(rows) < 3:

                    raise ValueError(f'Solo {len(rows)} gare recuperate: filtro probabilmente parziale, file non sovrascritto')

                enrich_logos(rows, season['id'], category)

                payload = {

                    'stagione': season['etichetta'], 'girone': season['campionati'][category].get('girone', ''),

                    'categoria': category, 'cid': cid, 'fonte': source,

                    'verificataIl': int(time.time()), 'dati': rows,

                }

                write_json(target, payload)

                print(f'{season["etichetta"]}/{category}: salvate {len(rows)} gare in {target.relative_to(ROOT)}')

            except (ValueError, KeyError, OSError, requests.RequestException) as exc:

                print(f'ATTENZIONE FIPAV {season["id"]}/{category}: {exc}', file=sys.stderr)

                if state == 'attiva':

                    errors.append(f'{season["id"]}/{category}')

                # Un calendario storico non ancora recuperato non fa fallire l'aggiornamento attivo.

    if errors:

        print(f'ERRORE: calendario attivo non aggiornato per {", ".join(errors)}', file=sys.stderr)

        return 1

    return 0





if __name__ == '__main__':

    raise SystemExit(main())
