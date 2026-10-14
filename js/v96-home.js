/* ASD Volley ’96 — homepage pulita 2026
   Le gare leggono SOLO i JSON locali FIPAV già prodotti dal workflow.
   News e scarabei mantengono i tab esistenti di Google Sheets.
   Badge prossime partite: loghi FIMA e PERSEC.
*/
(() => {
  'use strict';
  const SHEET_ID = '1ucM1JY5MXHF7-9mpjp2mfB41TvoA1ziMUGGz86woQXA';
  const $ = s => document.querySelector(s);
  const create = (tag, className = '', text = '') => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text) el.textContent = text;
    return el;
  };

  function asImage(value) {
    const raw = String(value || '').trim().replace(/^"|"$/g, '');
    if (!raw) return '';
    const file = raw.match(/(?:\/file\/d\/|[?&]id=)([\w-]{10,})/);
    const id = file?.[1] || (/^[\w-]{20,}$/.test(raw) ? raw : '');
    if (id) return `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1400`;
    return /^https?:\/\//i.test(raw) || /^img\//.test(raw) ? raw : '';
  }

  async function fetchSheet(tab) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);
    try {
      const r = await fetch(`https://opensheet.elk.sh/${SHEET_ID}/${encodeURIComponent(tab)}`, { signal: controller.signal });
      if (!r.ok) throw new Error(`Errore ${r.status} (${tab})`);
      const data = await r.json();
      return Array.isArray(data) ? data : [];
    } finally {
      clearTimeout(timer);
    }
  }

  function parseDate(s) {
    if (!s) return null;
    const t = String(s).trim();
    const match = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})/);
    if (match) {
      let y = Number(match[3]);
      if (y < 100) y += 2000;
      const d = new Date(y, Number(match[2]) - 1, Number(match[1]));
      return Number.isNaN(d.getTime()) ? null : d;
    }
    const iso = /^\d{4}-\d{2}-\d{2}/.test(t) ? new Date(t.slice(0, 10) + 'T12:00:00') : null;
    return iso && !Number.isNaN(iso.getTime()) ? iso : null;
  }

  const hasResult = x => !!String(x?.risultato || '').trim().match(/\d\s*[-:]\s*\d/);
  const standardText = x => String(x ?? '').trim() || '—';

  // Sostituisce solo F / M con i loghi già presenti nel repository.
  // Non modifica gli ID e non interferisce con l'aggiornamento delle partite.
  function setupMatchSponsors() {
    const style = document.createElement('style');
    style.textContent = `
      .v96-match-card .v96-match-badge.v96-sponsor-badge {
        width: 96px;
        min-width: 96px;
        height: 78px;
        flex: 0 0 96px;
        padding: 5px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: inherit;
        background: transparent;
        border: 0;
        box-shadow: none;
      }
      .v96-match-card .v96-sponsor-badge img {
        display: block;
        max-width: 100%;
        max-height: 100%;
        width: auto;
        height: auto;
        object-fit: contain;
      }
      @media (max-width: 600px) {
        .v96-match-card .v96-match-badge.v96-sponsor-badge {
          width: 68px;
          min-width: 68px;
          height: 60px;
          flex-basis: 68px;
          padding: 2px;
        }
      }
    `;
    document.head.appendChild(style);

    const sponsors = {
      femminile: { path: 'img/fima.png', label: 'FIMA Formazione' },
      maschile: { path: 'img/persec-logo-white-215.png', label: 'PERSEC' }
    };

    for (const [cat, sponsor] of Object.entries(sponsors)) {
      const badge = document.querySelector(`#v96-next-${cat} .v96-match-badge`);
      if (!badge) continue;
      const originalLetter = badge.textContent;
      const img = document.createElement('img');
      img.src = sponsor.path;
      img.alt = sponsor.label;
      img.loading = 'eager';
      img.decoding = 'async';
      img.addEventListener('error', () => {
        badge.textContent = originalLetter;
        badge.classList.remove('v96-sponsor-badge');
      }, { once: true });
      badge.classList.add('v96-sponsor-badge');
      badge.replaceChildren(img);
    }
  }

  async function fillNextMatches() {
    try {
      const c = await fetch('data/stagioni.json', { cache: 'no-store' });
      if (!c.ok) throw new Error('Configurazione non disponibile');
      const cfg = await c.json();
      const live = cfg.stagioni.find(s => s.stato === 'attiva') || cfg.stagioni.find(s => s.id === cfg.predefinita);
      if (!live) throw new Error('Stagione non disponibile');

      for (const cat of ['femminile', 'maschile']) {
        const box = $(`#v96-next-${cat}`);
        if (!box) continue;
        try {
          const r = await fetch(`data/calendari/${live.id}/${cat}.json`, { cache: 'no-store' });
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const json = await r.json();
          const games = (json.dati || [])
            .map(game => ({ ...game, dateObject: parseDate(game.data) }))
            .filter(game => game.dateObject)
            .sort((a, b) => a.dateObject - b.dateObject);
          if (!games.length) throw new Error('Nessuna gara');
          const startToday = new Date();
          startToday.setHours(0, 0, 0, 0);
          const upcoming = games.find(x => x.dateObject >= startToday && !hasResult(x));
          const selected = upcoming || [...games].reverse().find(hasResult) || games[0];
          const day = selected.dateObject.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
          box.querySelector('.v96-match-sub').textContent = upcoming ? 'Prossima partita' : 'Ultima partita';
          box.querySelector('.v96-match-name').textContent = standardText(selected.avversario);
          box.querySelector('.v96-match-when').textContent = `${day}${selected.orario ? ' · ore ' + selected.orario : ''} · ${selected.luogo === 'C' ? 'IN CASA' : selected.luogo === 'T' ? 'IN TRASFERTA' : ''}${!upcoming && hasResult(selected) ? ' · RIS. ' + selected.risultato : ''}`;
          const tag = box.querySelector('.v96-pulse');
          if (tag) tag.textContent = `${selected.giornata ? 'G' + selected.giornata + ' · ' : ''}${live.etichetta}`;
        } catch (error) {
          console.info('Gare', cat, error.message);
          box.querySelector('.v96-match-name').textContent = 'Consulta il calendario';
          box.querySelector('.v96-match-when').textContent = 'Dati in aggiornamento — FIPAV Sicilia';
        }
      }
    } catch (error) {
      console.info('Calendario homepage:', error.message);
      for (const cat of ['femminile', 'maschile']) {
        const box = $(`#v96-next-${cat}`);
        if (!box) continue;
        box.querySelector('.v96-match-name').textContent = 'Consulta il calendario';
        box.querySelector('.v96-match-when').textContent = 'Verifica le prossime gare';
      }
    }
  }

  function showArticle(article) {
    const dialog = $('#v96-news-dialog');
    if (!dialog) return;
    $('#v96-modal-title').textContent = standardText(article.titolo);
    $('#v96-modal-text').textContent = standardText(article.contenuto).replace(/\\n/g, '\n');
    const image = $('#v96-modal-image');
    image.src = asImage(article.immagine);
    image.onerror = () => image.removeAttribute('src');
    if (typeof dialog.showModal === 'function') dialog.showModal();
  }

  async function fillNews() {
    const grid = $('#v96-news-grid');
    if (!grid) return;
    try {
      const rows = (await fetchSheet('News')).filter(n => n?.titolo);
      if (!rows.length) throw new Error('Nessuna news');
      grid.replaceChildren();
      rows.slice(0, 2).forEach(news => {
        const card = create('button', 'v96-news-card');
        card.type = 'button';
        card.setAttribute('aria-label', `Leggi: ${news.titolo}`);
        const imgPath = asImage(news.immagine);
        if (imgPath) {
          const img = create('img', 'v96-news-card-img');
          img.src = imgPath;
          img.alt = '';
          img.loading = 'lazy';
          img.onerror = () => img.remove();
          card.appendChild(img);
        }
        const layer = create('div', 'v96-news-card-content');
        layer.append(create('span', 'v96-news-tag', 'Notizia'), create('strong', '', news.titolo), create('b', '', '↗'));
        card.appendChild(layer);
        card.addEventListener('click', () => showArticle(news));
        grid.appendChild(card);
      });
    } catch (err) {
      console.info('News homepage:', err.message);
      const placeholder = grid.querySelector('.v96-news-placeholder');
      if (placeholder) placeholder.querySelector('p').textContent = 'Segui le ultime notizie della squadra sul nostro profilo Instagram.';
    }
  }

  async function fillScarabei() {
    const grid = $('#v96-scarabei-grid');
    if (!grid) return;
    try {
      const rows = (await fetchSheet('Scarabei')).filter(r => r && (r.nome || r.immagine));
      if (!rows.length) return;
      grid.replaceChildren();
      rows.slice(0, 2).forEach(r => {
        const card = create('article', 'v96-scarabei-card');
        const src = asImage(r.immagine);
        if (src) {
          const img = create('img');
          img.src = src;
          img.alt = standardText(r.nome);
          img.loading = 'lazy';
          img.onerror = () => img.remove();
          card.appendChild(img);
        }
        const inner = create('div');
        inner.append(create('span', 'v96-scarabei-sub', 'Scarabeo di giornata'), create('strong', '', standardText(r.nome)));
        const descriptor = r.categoria || r.ruolo || r.squadra || '';
        if (descriptor) inner.appendChild(create('p', '', descriptor));
        card.appendChild(inner);
        grid.appendChild(card);
      });
    } catch (err) {
      console.info('Scarabei homepage:', err.message);
    }
  }

  const dialog = $('#v96-news-dialog');
  if (dialog) {
    dialog.querySelector('.v96-modal-close')?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  }

  setupMatchSponsors();
  fillNextMatches();
  fillNews();
  fillScarabei();
})();
