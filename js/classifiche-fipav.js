/* ASD Volley '96: classifiche FIPAV su GitHub Pages (solo JSON statici). */
(() => {
  'use strict';
  const tbody = document.getElementById('tabella-classifica');
  const btnFem = document.getElementById('btn-femminile');
  const btnMas = document.getElementById('btn-maschile');
  if (!tbody || !btnFem || !btnMas) return;

  let categoriaAttiva = 'femminile';
  let richiestaCorrente = 0;
  const stato = document.createElement('p');
  stato.id = 'fonte-classifica';
  stato.style.cssText = 'text-align:center;font-size:13px;opacity:.85;margin:12px 16px 28px';
  document.querySelector('.table-wrapper')?.insertAdjacentElement('afterend', stato);

  function cella(tr, value) {
    const td = document.createElement('td');
    td.textContent = String(value ?? '-');
    tr.appendChild(td);
    return td;
  }

  function mostraDati(records) {
    const frag = document.createDocumentFragment();
    for (const r of records) {
      const tr = document.createElement('tr');
      cella(tr, r.posizione);
      const squadra = document.createElement('td');
      squadra.className = 'squadra-cell team-cell';
      if (r.logo && /^https:\/\//i.test(r.logo)) {
        const img = document.createElement('img');
        img.src = r.logo;
        img.alt = `Logo ${r.nome || ''}`;
        img.className = 'logo-squadra';
        img.loading = 'lazy';
        img.addEventListener('error', () => img.remove());
        squadra.appendChild(img);
      }
      const nome = document.createElement('span');
      nome.className = 'team-name';
      nome.textContent = r.nome || '';
      squadra.appendChild(nome);
      tr.appendChild(squadra);
      cella(tr, r.punti);
      cella(tr, r.partite_giocate);
      cella(tr, r.vittorie);
      cella(tr, r.sconfitte);
      frag.appendChild(tr);
    }
    tbody.replaceChildren(frag);
  }

  async function caricaClassifica(cat) {
    categoriaAttiva = cat;
    const richiesta = ++richiestaCorrente;
    btnFem.classList.toggle('active', cat === 'femminile');
    btnMas.classList.toggle('active', cat === 'maschile');
    tbody.classList.add('table-loading');
    stato.textContent = 'Caricamento classifica…';
    try {
      const url = `data/classifica-${cat}.json?t=${Date.now()}`;
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}: file classifica non disponibile`);
      const payload = await response.json();
      if (richiesta !== richiestaCorrente) return;
      if (!Array.isArray(payload.dati) || payload.dati.length === 0) {
        throw new Error('Il file JSON non contiene squadre.');
      }
      mostraDati(payload.dati);
      const quando = payload.verificataIl
        ? new Date(payload.verificataIl * 1000).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })
        : '';
      stato.textContent = `Fonte: FIPAV Sicilia — stagione ${payload.stagione || ''}`
        + (quando ? ` — aggiornamento: ${quando}` : ' — copia iniziale, in attesa della prima sincronizzazione');
    } catch (error) {
      if (richiesta !== richiestaCorrente) return;
      console.error('Classifica FIPAV:', error);
      tbody.replaceChildren();
      const tr = document.createElement('tr');
      cella(tr, 'Classifica non disponibile. Verifica i file JSON su GitHub Pages.').colSpan = 6;
      tbody.appendChild(tr);
      stato.textContent = error.message;
    } finally {
      if (richiesta === richiestaCorrente) tbody.classList.remove('table-loading');
    }
  }

  btnFem.addEventListener('click', () => caricaClassifica('femminile'));
  btnMas.addEventListener('click', () => caricaClassifica('maschile'));
  const catParam = new URLSearchParams(location.search).get('cat');
  caricaClassifica((catParam || '').toLowerCase() === 'maschile' ? 'maschile' : 'femminile');

  // Aggiorna la visualizzazione ogni 15 minuti; GitHub Action rinfresca i JSON ogni 3 ore.
  setInterval(() => {
    if (!document.hidden) caricaClassifica(categoriaAttiva);
  }, 15 * 60 * 1000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) caricaClassifica(categoriaAttiva);
  });

  const currentPage = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('#navbar a').forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === currentPage);
  });
})();
