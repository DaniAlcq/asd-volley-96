/* ASD Volley '96 — MVP pubblico nativo, senza iframe.
 * Sola infrastruttura Google Apps Script + Google Sheets.
 * Lettura JSONP (soltanto dati pubblici), scrittura POST.
 */
(() => {
  'use strict';
  const ROOT_URL = new URL('/', location.href);
  const API_URL = 'https://script.google.com/macros/s/AKfycbxqVfQUvyXu5EbLjhVp5NtYbbPMe0an0TTa1wM1YedRYVQhMXTNjgaJ2WofIt9OciU44g/exec';
  const content = document.getElementById('v96-mvp-content');
  const feedback = document.getElementById('v96-mvp-feedback');
  const tabs = [...document.querySelectorAll('[data-mvp-team]')];
  const dialog = document.getElementById('v96-mvp-dialog');
  const dialogName = document.getElementById('v96-mvp-dialog-name');
  const confirmButton = document.getElementById('v96-mvp-confirm');
  const cancelButton = document.getElementById('v96-mvp-cancel');
  if (!content || !dialog) return;

  const state = {
    team: 'femminile', matches: [], loaded: false, busy: false,
    selected: null, lastScroll: 0
  };
  const escapeHTML = text => String(text ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const randomID = () => {
    if (crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    const bytes = new Uint8Array(16); crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
    const h = [...bytes].map(x => x.toString(16).padStart(2,'0')).join('');
    return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
  };
  let browserID;
  try {
    browserID = localStorage.getItem('v96_mvp_browser_id');
    if (!browserID || !/^[a-f0-9-]{32,60}$/.test(browserID)) {
      browserID = randomID();
      localStorage.setItem('v96_mvp_browser_id', browserID);
    }
  } catch (_) {
    browserID = randomID();
    feedback.textContent = 'Attenzione: il browser non conserva la preferenza fra le visite.';
  }

  // Google Apps Script ContentService supporta JSONP: la risposta viene
  // eseguita come <script> e richiama solo la nostra callback monouso.
  // Nessun iframe, nessun CORS proxy e nessuna dipendenza esterna.
  let jsonpSequence = 0;
  function publicStateJSONP(id) {
    return new Promise((resolve, reject) => {
      const name = 'v96_mvp_cb_' + (++jsonpSequence) + '_' + Date.now();
      const script = document.createElement('script');
      const params = new URLSearchParams({
        action: 'state', callback: name, browserId: id,
        _: String(Date.now())
      });
      let finished = false;
      function done(err, data) {
        if (finished) return;
        finished = true;
        clearTimeout(timeout);
        script.remove();
        try { delete window[name]; } catch (_) { window[name] = undefined; }
        if (err) reject(err); else resolve(data);
      }
      const timeout = setTimeout(() => done(new Error(
        'Google Apps Script non risponde. Verifica il deployment pubblico e riprova.'
      )), 20000);
      window[name] = payload => {
        if (!payload || payload.ok !== true || !Array.isArray(payload.data)) {
          return done(new Error(String(payload?.error || 'Risposta Google non valida.')));
        }
        done(null, payload.data);
      };
      script.onerror = () => done(new Error(
        'Impossibile caricare i dati da Google Apps Script. Controlla il deployment.'
      ));
      script.src = API_URL + '?' + params.toString();
      document.head.append(script);
    });
  }
  const delay = ms => new Promise(r => setTimeout(r, ms));
  async function rpc(action, payload) {
    if (action === 'state') return publicStateJSONP(payload.browserId);
    if (action !== 'vote') throw new Error('Operazione sconosciuta.');
    // Richiesta POST semplice: il browser la invia anche da GitHub Pages.
    // La risposta e' opaca (no-cors) quindi NON la consideriamo una conferma.
    const params = new URLSearchParams({
      action: 'vote',
      partitaId: String(payload.partitaId || ''),
      atletaId: String(payload.atletaId || ''),
      browserId: String(payload.browserId || ''),
      turnstileToken: String(payload.turnstileToken || '')
    });
    const aborter = new AbortController();
    const timer = setTimeout(() => aborter.abort(), 22000);
    try {
      await fetch(API_URL, {
        method: 'POST', mode: 'no-cors', credentials: 'omit',
        redirect: 'follow', cache: 'no-store',
        body: params, signal: aborter.signal
      });
    } catch (error) {
      throw new Error('Invio non confermato: verifica la connessione e controlla il foglio Voti prima di riprovare.');
    } finally { clearTimeout(timer); }
    // Verifica l'effettiva registrazione consultando la stessa API di lettura.
    // Previene falsi messaggi di successo se la richiesta e' stata rifiutata.
    for (let attempt = 0; attempt < 6; attempt++) {
      await delay(750 + attempt * 400);
      try {
        const matches = await publicStateJSONP(payload.browserId);
        const match = matches.find(m => m.id === payload.partitaId);
        if (match?.giaVotato) return {ok:true};
      } catch (error) {
        if (attempt === 5) throw error;
      }
    }
    throw new Error('Voto non confermato. Controlla il foglio Voti prima di riprovare.');
  }

  function message(text, isError = false) {
    feedback.textContent = text;
    feedback.classList.toggle('is-error', isError);
  }
  function loading() {
    content.innerHTML = `<div class="mvp-loading" role="status"><span class="mvp-spinner"></span> Caricamento votazioni…</div>
      <div class="mvp-skeleton-grid" aria-hidden="true"><div></div><div></div><div></div></div>`;
  }
  function showError(text) {
    state.loaded = false;
    content.innerHTML = '<div class="mvp-notice mvp-error" role="alert"><p>' + escapeHTML(text) + '</p><button id="v96-mvp-retry" type="button">Riprova</button></div>';
    const retry = document.getElementById('v96-mvp-retry');
    retry?.addEventListener('click', () => {
      loadState();
    });
  }
  async function loadState() {
    loading();
    try {
      const data = await rpc('state', {browserId:browserID});
      state.matches = Array.isArray(data) ? data : [];
      state.loaded = true;
      render();
    } catch (error) { showError(error.message || 'Impossibile recuperare le votazioni.'); }
  }
  function photoURL(raw) {
    const path = String(raw || '').trim();
    if (!path || path.startsWith('//') || /[\\]/.test(path)) return '';
    try {
      const url = new URL(path, ROOT_URL);
      return url.protocol === 'https:' &&
        (url.hostname === 'asdvolley96.it' || url.hostname === 'www.asdvolley96.it') ? url.href : '';
    } catch (_) { return ''; }
  }
  function photoHTML(a, eager = false) {
    const src = photoURL(a.foto);
    return src ? `<img src="${escapeHTML(src)}" alt="Foto di ${escapeHTML(a.nome)}" loading="${eager?'eager':'lazy'}" decoding="async">`
      : `<span class="mvp-photo-fallback" aria-hidden="true">96</span>`;
  }
  function selectTeam(team) {
    if (state.busy) return;
    state.team = team;
    tabs.forEach(t => t.setAttribute('aria-pressed', String(t.dataset.mvpTeam === team)));
    message('');
    render();
  }
  tabs.forEach(tab => tab.addEventListener('click', () => selectTeam(tab.dataset.mvpTeam)));

  function currentMatch() {
    const matches = state.matches.filter(m => m && m.squadra === state.team && m.id !== 'DEMO-01');
    const order = {APERTA:0, PROGRAMMATA:1, CHIUSA:2};
    // Nelle successive settimane mostra prima la gara attiva e, altrimenti, la più recente.
    matches.sort((a,b) => (order[a.stato] ?? 9) - (order[b.stato] ?? 9) || String(b.fine || '').localeCompare(String(a.fine || '')));
    return matches[0];
  }
  function render() {
    if (!state.loaded) return loading();
    const m = currentMatch();
    if (!m) {
      content.innerHTML = '<div class="mvp-notice">Nessuna votazione disponibile per questa squadra.</div>';
      return;
    }
    const status = m.stato === 'APERTA' ? 'VOTAZIONI APERTE' : m.stato === 'PROGRAMMATA' ? 'IN PROGRAMMA' : 'VOTAZIONE CHIUSA';
    content.innerHTML = `<section class="mvp-match" aria-label="Votazione ${escapeHTML(m.titolo)}">
      <div class="mvp-match-heading"><div><h2>${escapeHTML(m.titolo)}</h2>
      <p class="mvp-subtitle">Termine: ${escapeHTML(m.fine)} · Ora italiana</p></div><span class="mvp-status">${status}</span></div>
      <div id="v96-mvp-match-body"></div>
    </section>`;
    const body = document.getElementById('v96-mvp-match-body');
    const athletes = Array.isArray(m.atleti) ? m.atleti : [];
    if (!athletes.length) return body.innerHTML = '<p class="mvp-notice">Nessun atleta candidato per questa partita.</p>';
    if (m.stato === 'CHIUSA') return renderResults(body, m, athletes);
    if (m.stato === 'PROGRAMMATA') {
      body.innerHTML = `<p class="mvp-notice">Le votazioni apriranno il <strong>${escapeHTML(m.inizio)}</strong> (ora italiana).</p>`;
      return;
    }
    if (m.giaVotato) {
      body.innerHTML = '<p class="mvp-notice">Hai già votato per questa partita da questo browser. Grazie per aver partecipato.</p>';
      return;
    }
    const grid = document.createElement('div');
    grid.className = 'mvp-grid';
    athletes.forEach(a => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'mvp-athlete';
      button.setAttribute('aria-label', `Vota ${a.nome}, numero ${a.numero}`);
      button.innerHTML = `<div class="mvp-athlete-photo"><span class="mvp-watermark" aria-hidden="true">96</span>${photoHTML(a)}</div>
        <div class="mvp-athlete-body"><span class="mvp-athlete-number">#${escapeHTML(a.numero)}</span>
        <strong>${escapeHTML(a.nome)}</strong><small>${escapeHTML(a.ruolo)}</small>
        <span class="mvp-vote-label">VOTA ATLETA <span aria-hidden="true">→</span></span></div>`;
      button.addEventListener('click', () => openDialog(m, a));
      grid.append(button);
    });
    body.append(grid);
  }

  function renderResults(body, m, athletes) {
    const total = Math.max(0, Number(m.votiTotali) || 0);
    if (!total) {
      body.innerHTML = '<p class="mvp-notice">Votazione conclusa senza voti. Nessun podio assegnato.</p>';
      return;
    }
    const sorted = [...athletes].sort((a,b) => (Number(b.voti)||0) - (Number(a.voti)||0) || String(a.nome).localeCompare(String(b.nome),'it'));
    const winners = sorted.filter(a => Number(a.voti) > 0).slice(0,3);
    const pct = a => Math.round(100 * (Number(a.voti)||0)/total);
    const podiumItem = (a, rank) => !a ? '<div class="mvp-podium-placeholder" aria-hidden="true"></div>' :
      `<article class="mvp-podium-card mvp-rank-${rank}"><span class="mvp-podium-rank">${rank}°</span>
      <div class="mvp-podium-photo">${photoHTML(a, true)}</div><div class="mvp-podium-number">#${escapeHTML(a.numero)}</div>
      <strong>${escapeHTML(a.nome)}</strong><small>${escapeHTML(a.ruolo)}</small><span class="mvp-podium-percent">${pct(a)}%</span></article>`;
    body.innerHTML = `<div class="mvp-podium-title"><span>FINAL STANDINGS</span><strong>IL PODIO</strong></div>
      <div class="mvp-podium" aria-label="Podio dei tre più votati">
        ${podiumItem(winners[1],2)}${podiumItem(winners[0],1)}${podiumItem(winners[2],3)}
      </div>
      <h3 class="mvp-ranking-title">CLASSIFICA COMPLETA</h3>
      <div class="mvp-ranking">${sorted.map((a,i) => `<div class="mvp-result"><div class="mvp-result-header"><strong>${i+1}. #${escapeHTML(a.numero)} · ${escapeHTML(a.nome)}</strong><b>${pct(a)}%</b></div><div class="mvp-bar"><span style="width:${pct(a)}%"></span></div></div>`).join('')}</div>
      <p class="mvp-count">${total} vot${total === 1?'o':'i'} total${total === 1?'e':'i'}</p>`;
  }
  function lockScroll() {
    state.lastScroll = window.scrollY;
    document.body.style.setProperty('--mvp-dialog-scroll', '-' + state.lastScroll + 'px');
    document.body.classList.add('mvp-dialog-open');
  }
  function unlockScroll() {
    document.body.classList.remove('mvp-dialog-open');
    document.body.style.removeProperty('--mvp-dialog-scroll');
    window.scrollTo(0, state.lastScroll);
  }
  function openDialog(match, athlete) {
    if (state.busy) return;
    state.selected = {match, athlete};
    dialogName.textContent = athlete.nome;
    confirmButton.disabled = false;
    cancelButton.disabled = false;
    lockScroll();
    dialog.showModal();
  }
  function closeDialog() {
    if (state.busy) return;
    dialog.close();
    unlockScroll();
    state.selected = null;
  }
  cancelButton.addEventListener('click', closeDialog);
  dialog.addEventListener('cancel', e => {e.preventDefault();closeDialog();});
  dialog.addEventListener('close', () => {
    if (!state.busy && state.selected) { unlockScroll();state.selected=null; }
  });
  confirmButton.addEventListener('click', async () => {
    if (state.busy || !state.selected) return;
    const {match, athlete} = state.selected;
    state.busy = true;
    confirmButton.disabled = true;
    cancelButton.disabled = true;
    confirmButton.textContent = 'INVIO IN CORSO…';
    try {
      await rpc('vote', {partitaId:match.id, atletaId:athlete.id, browserId:browserID, turnstileToken:''});
      dialog.close();
      unlockScroll();
      state.selected = null;
      message('Voto registrato. Grazie per aver partecipato!');
      await loadState();
    } catch (error) {
      // Se il servizio ha registrato il voto ma la risposta si è persa, verificare
      // sul foglio prima di ritentare per non confondere l'utente.
      dialog.close();
      unlockScroll();
      state.selected = null;
      message(error.message || 'Il voto non è stato confermato.', true);
    } finally {
      state.busy = false;
      confirmButton.textContent = 'CONFERMA VOTO';
      confirmButton.disabled = false;
      cancelButton.disabled = false;
    }
  });

  loading();
  loadState();
})();
