/* ASD Volley '96 - storico classifiche FIPAV per GitHub Pages. */
(() => {
  'use strict';
  const tbody = document.getElementById('tabella-classifica');
  const btnFem = document.getElementById('btn-femminile');
  const btnMas = document.getElementById('btn-maschile');
  const filter = document.querySelector('.filter-buttons');
  if (!tbody || !btnFem || !btnMas || !filter) return;

  const query = new URLSearchParams(location.search);
  let categoria = query.get('cat')?.toLowerCase() === 'maschile' ? 'maschile' : 'femminile';
  let stagione = null;
  let config = null;
  let richiestaCorrente = 0;

  const style = document.createElement('style');
  style.textContent = `
    .season-picker { display:flex; flex-wrap:wrap; justify-content:center; align-items:center;
      gap:12px; margin: 16px auto 22px; }
    .season-picker label { font-size:1.05rem; color:#fff; font-weight:600; }
    .season-picker select { appearance:auto; border:1px solid #ff00a7; border-radius:10px;
      background:#1a1a1a; color:#fff; min-width:185px; padding:10px 14px;
      font:inherit; font-size:1rem; cursor:pointer; }
    .season-picker select:focus-visible { outline:2px solid #ff00a7; outline-offset:3px; }
    #fonte-classifica { text-align:center; font-size:13px; opacity:.85;
      margin:12px 16px 28px; line-height:1.5; }
    @media(max-width:600px) { .season-picker { margin:12px auto 18px; } }
  `;
  document.head.appendChild(style);

  const picker = document.createElement('div');
  picker.className = 'season-picker';
  const label = document.createElement('label');
  label.htmlFor = 'selettore-stagione';
  label.textContent = 'Stagione sportiva';
  const select = document.createElement('select');
  select.id = 'selettore-stagione';
  select.setAttribute('aria-label', 'Seleziona la stagione sportiva');
  picker.append(label, select);
  filter.parentNode.insertBefore(picker, filter);

  const stato = document.createElement('p');
  stato.id = 'fonte-classifica';
  document.querySelector('.table-wrapper')?.insertAdjacentElement('afterend', stato);

  function cella(tr, value) {
    const td = document.createElement('td');
    td.textContent = String(value ?? '-');
    tr.appendChild(td);
    return td;
  }

  function messaggio(message) {
    tbody.replaceChildren();
    const tr = document.createElement('tr');
    cella(tr, message).colSpan = 6;
    tbody.appendChild(tr);
  }

  function mostraDati(records) {
    const fragment = document.createDocumentFragment();
    for (const item of records) {
      const tr = document.createElement('tr');
      cella(tr, item.posizione);
      const team = document.createElement('td');
      team.className = 'squadra-cell team-cell';
      // Solo immagini locali salvate nel repository o URL HTTPS di FIPAV.
      const src = typeof item.logo === 'string' ? item.logo : '';
      const valid = /^img\/loghi-fipav\/[a-zA-Z0-9_.-]+$/.test(src)
        || /^https:\/\/sicilia\.portalefipav\.net\/mngArea\/Societa\/img\//i.test(src);
      if (valid) {
        const img = document.createElement('img');
        img.src = src;
        img.alt = `Logo ${item.nome || ''}`;
        img.className = 'logo-squadra';
        img.loading = 'lazy';
        img.addEventListener('error', () => img.remove());
        team.appendChild(img);
      }
      const name = document.createElement('span');
      name.className = 'team-name';
      name.textContent = item.nome || '';
      team.appendChild(name);
      tr.appendChild(team);
      cella(tr, item.punti);
      cella(tr, item.partite_giocate);
      cella(tr, item.vittorie);
      cella(tr, item.sconfitte);
      fragment.appendChild(tr);
    }
    tbody.replaceChildren(fragment);
  }

  function setUrl() {
    // Mantiene gli altri parametri della pagina; torna alla scelta dopo un refresh.
    const url = new URL(location.href);
    url.searchParams.set('stagione', stagione);
    url.searchParams.set('cat', categoria === 'maschile' ? 'Maschile' : 'Femminile');
    history.replaceState(history.state, '', url.pathname + url.search + url.hash);
  }

  async function loadJson(path) {
    const response = await fetch(`${path}?v=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async function caricaClassifica() {
    if (!config || !stagione) return;
    const req = ++richiestaCorrente;
    const season = config.stagioni.find(s => s.id === stagione);
    if (!season) return;
    select.value = stagione;
    btnFem.classList.toggle('active', categoria === 'femminile');
    btnMas.classList.toggle('active', categoria === 'maschile');
    setUrl();
    tbody.classList.add('table-loading');
    stato.textContent = 'Caricamento classifica…';

    try {
      if (season.stato === 'in_attesa') {
        messaggio(`Classifica ${season.etichetta} non ancora disponibile: in attesa dei CId FIPAV.`);
        stato.textContent = 'La stagione verrà attivata quando saranno noti i codici ufficiali FIPAV.';
        return;
      }
      let payload;
      try {
        payload = await loadJson(`data/classifiche/${stagione}/${categoria}.json`);
      } catch (error) {
        // Prima esecuzione: supporta i vecchi file JSON del sito mentre GitHub Actions crea l'archivio.
        if (stagione !== '2025-26') throw error;
        payload = await loadJson(`data/classifica-${categoria}.json`);
      }
      if (req !== richiestaCorrente) return;
      if (!Array.isArray(payload.dati) || payload.dati.length === 0) {
        throw new Error('La classifica non contiene squadre.');
      }
      mostraDati(payload.dati);
      const when = payload.verificataIl
        ? new Date(payload.verificataIl * 1000).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })
        : '';
      stato.textContent = `Fonte: FIPAV Sicilia — ${season.etichetta} — `
        + (season.stato === 'archiviata' ? 'archivio storico' : 'stagione attiva')
        + (when ? ` — dati acquisiti: ${when}` : '');
    } catch (error) {
      if (req !== richiestaCorrente) return;
      console.error('Classifiche FIPAV:', error);
      messaggio('Classifica non disponibile. Controlla i file JSON e il workflow GitHub.');
      stato.textContent = `Errore di lettura: ${error.message}`;
    } finally {
      if (req === richiestaCorrente) tbody.classList.remove('table-loading');
    }
  }

  select.addEventListener('change', () => {
    stagione = select.value;
    caricaClassifica();
  });
  btnFem.addEventListener('click', () => { categoria = 'femminile'; caricaClassifica(); });
  btnMas.addEventListener('click', () => { categoria = 'maschile'; caricaClassifica(); });

  async function initialize() {
    try {
      config = await loadJson('data/stagioni.json');
      if (!Array.isArray(config.stagioni) || !config.stagioni.length) {
        throw new Error('Configurazione delle stagioni vuota.');
      }
      for (const season of config.stagioni) {
        const option = document.createElement('option');
        option.value = season.id;
        option.textContent = season.etichetta + (season.stato === 'in_attesa' ? ' (in attesa)' : '');
        select.appendChild(option);
      }
      const selected = query.get('stagione');
      stagione = config.stagioni.some(s => s.id === selected) ? selected : config.predefinita;
      if (!config.stagioni.some(s => s.id === stagione)) stagione = config.stagioni[0].id;
      caricaClassifica();
    } catch (error) {
      console.error('Configurazione classifiche:', error);
      messaggio('Impossibile caricare le stagioni.');
      stato.textContent = `Controlla data/stagioni.json: ${error.message}`;
    }
  }
  initialize();

  // Ricarica soltanto la stagione attiva quando il sito è aperto.
  const updateIfNeeded = () => {
    const selected = config?.stagioni.find(s => s.id === stagione);
    if (!document.hidden && selected?.stato === 'attiva') caricaClassifica();
  };
  setInterval(updateIfNeeded, 15 * 60 * 1000);
  document.addEventListener('visibilitychange', updateIfNeeded);

  const current = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('#navbar a').forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === current);
  });
})();
