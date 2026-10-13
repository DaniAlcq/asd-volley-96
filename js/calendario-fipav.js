/* ASD Volley '96 — calendario e risultati FIPAV da JSON GitHub Pages. */
(() => {
  'use strict';
  const tbody = document.getElementById('calendar-body');
  const btnFem = document.getElementById('btn-femminile');
  const btnMas = document.getElementById('btn-maschile');
  const filter = document.querySelector('.filter-buttons');
  if (!tbody || !btnFem || !btnMas || !filter) return;

  const params = new URLSearchParams(location.search);
  let categoria = params.get('cat')?.toLowerCase() === 'maschile' ? 'maschile' : 'femminile';
  let stagione = null;
  let config = null;
  let latestRequest = 0;

  const css = document.createElement('style');
  css.textContent = `
    .calendar-season-picker {display:flex; flex-wrap:wrap; align-items:center; justify-content:center;
      gap:12px; margin:16px auto 22px; }
    .calendar-season-picker label {color:white; font-weight:600;}
    .calendar-season-picker select {font:inherit; background:#1a1a1a; color:#fff;
      border:1px solid #ff00a7; border-radius:10px; min-width:170px; padding:10px 14px;}
    #calendar-source {text-align:center; font-size:13px; line-height:1.5;
      padding:0 15px; margin:12px auto 25px; opacity:.85;}
    #calendar-table .location-badge {display:inline-flex; align-items:center;
      justify-content:center; min-width:26px; height:26px; padding:0 5px;
      border-radius:6px; background:#1a1a1a; color:#fff; font-weight:700;}
    #calendar-table .avv-wrap {display:flex; align-items:center; gap:8px; min-width:0;}
    #calendar-table .avv-wrap img {object-fit:contain; flex-shrink:0; width:32px; height:32px;}
    #calendar-table .avv-wrap span {min-width:0; overflow-wrap:anywhere;}
    @media (max-width:600px) {
      #calendar-table .avv-wrap {gap:4px;}
      #calendar-table .avv-wrap img {width:22px; height:22px;}
      #calendar-table .avv-wrap span {font-size:11px;}
      #calendar-table .location-badge {min-width:21px; height:22px; font-size:11px;}
    }
  `;
  document.head.appendChild(css);

  const picker = document.createElement('div');
  picker.className = 'calendar-season-picker';
  const label = document.createElement('label');
  label.htmlFor = 'calendario-stagione';
  label.textContent = 'Stagione sportiva';
  const select = document.createElement('select');
  select.id = 'calendario-stagione';
  picker.append(label, select);
  filter.parentNode.insertBefore(picker, filter);

  const source = document.createElement('p');
  source.id = 'calendar-source';
  document.querySelector('.calendar-wrapper')?.insertAdjacentElement('afterend', source);

  function td(tr, value, className) {
    const el = document.createElement('td');
    if (className) el.className = className;
    el.textContent = String(value ?? '-');
    tr.appendChild(el);
    return el;
  }
  function message(value) {
    const tr = document.createElement('tr');
    const cell = td(tr, value);
    cell.colSpan = 5;
    tbody.replaceChildren(tr);
  }
  function draw(rows) {
    const fragment = document.createDocumentFragment();
    for (const r of rows) {
      const tr = document.createElement('tr');
      td(tr, r.giornata);
      const date = td(tr, `${r.data || '-'}${r.orario ? `\nore ${r.orario}` : ''}`, 'data-cell');
      date.style.whiteSpace = 'pre-line';
      const opp = document.createElement('td');
      opp.className = 'avversario-cell';
      const wrap = document.createElement('div');
      wrap.className = 'avv-wrap';
      const logo = typeof r.logo === 'string' ? r.logo : '';
      if (/^img\/loghi-fipav\/[a-zA-Z0-9_.-]+$/.test(logo) ||
          /^https:\/\/sicilia\.portalefipav\.net\/mngArea\/Societa\/img\//i.test(logo)) {
        const img = document.createElement('img');
        img.className = 'logo-squadra';
        img.alt = '';
        img.loading = 'lazy';
        img.src = logo;
        img.addEventListener('error', () => img.remove());
        wrap.appendChild(img);
      }
      const name = document.createElement('span');
      name.textContent = r.avversario || '-';
      wrap.appendChild(name);
      opp.appendChild(wrap);
      tr.appendChild(opp);
      const place = document.createElement('td');
      place.className = 'luogo-cell';
const iconeLuogo = {
  C: '/img/house.png',
  T: '/img/bus.png'
};

const percorso = iconeLuogo[r.luogo];

if (percorso) {
  const img = document.createElement('img');
  img.src = percorso;
  img.alt = r.luogo === 'C' ? 'Casa' : 'Trasferta';
  img.className = 'icon-luogo';
  place.appendChild(img);
} else {
  place.textContent = '-';
}
      tr.appendChild(place);
      td(tr, r.risultato || '-');
      fragment.appendChild(tr);
    }
    tbody.replaceChildren(fragment);
  }
  async function loadJson(path) {
    const r = await fetch(`${path}?v=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }
  function changeUrl() {
    const url = new URL(location.href);
    url.searchParams.set('stagione', stagione);
    url.searchParams.set('cat', categoria === 'maschile' ? 'Maschile' : 'Femminile');
    history.replaceState(history.state, '', url.pathname + url.search + url.hash);
  }
  async function refresh() {
    if (!config || !stagione) return;
    const req = ++latestRequest;
    const season = config.stagioni.find(s => s.id === stagione);
    if (!season) return;
    select.value = stagione;
    btnFem.classList.toggle('active', categoria === 'femminile');
    btnMas.classList.toggle('active', categoria === 'maschile');
    changeUrl();
    source.textContent = 'Caricamento calendario…';
    try {
      if (season.stato === 'in_attesa') {
        message('Calendario non ancora disponibile: stagione in attesa.');
        source.textContent = 'In attesa di pubblicazione FIPAV.';
        return;
      }
      const payload = await loadJson(`data/calendari/${stagione}/${categoria}.json`);
      if (req !== latestRequest) return;
      if (!Array.isArray(payload.dati) || !payload.dati.length) throw new Error('Nessuna gara disponibile');
      draw(payload.dati);
      const last = payload.verificataIl
        ? new Date(payload.verificataIl * 1000).toLocaleString('it-IT', {dateStyle:'short', timeStyle:'short'}) : '';
      source.textContent = `Fonte: FIPAV Sicilia — ${season.etichetta}` +
        (season.stato === 'archiviata' ? ' — archivio storico' : ' — aggiornamento automatico') +
        (last ? ` — verifica: ${last}` : '') + ' — Risultati dalla prospettiva Volley ’96';
    } catch (e) {
      if (req !== latestRequest) return;
      console.error('Calendario FIPAV:', e);
      message('Calendario non ancora disponibile per questa stagione.');
      source.textContent = 'Il calendario FIPAV non è stato ancora archiviato o aggiornato. ' + e.message;
    }
  }

  select.addEventListener('change', () => { stagione = select.value; refresh(); });
  btnFem.addEventListener('click', () => { categoria = 'femminile'; refresh(); });
  btnMas.addEventListener('click', () => { categoria = 'maschile'; refresh(); });
  async function init() {
    try {
      config = await loadJson('data/stagioni.json');
      if (!Array.isArray(config.stagioni) || !config.stagioni.length) throw new Error('Nessuna stagione configurata');
      for (const s of config.stagioni) {
        const option = document.createElement('option');
        option.value = s.id;
        option.textContent = s.etichetta + (s.stato === 'in_attesa' ? ' (in attesa)' : '');
        select.appendChild(option);
      }
      const wanted = params.get('stagione');
      stagione = config.stagioni.some(s => s.id === wanted) ? wanted : config.predefinita;
      if (!config.stagioni.some(s => s.id === stagione)) stagione = config.stagioni[0].id;
      refresh();
    } catch (e) {
      console.error('Configurazione calendario:', e);
      message('Impossibile caricare le stagioni.');
      source.textContent = e.message;
    }
  }
  init();
  setInterval(() => {
    if (config?.stagioni.find(s => s.id === stagione)?.stato === 'attiva' && !document.hidden) refresh();
  }, 15 * 60 * 1000);

  const current = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('#navbar a').forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === current);
  });
})();
