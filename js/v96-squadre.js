/* ASD Volley '96 — rose e staff da Google Sheets (foglio "Squadre").
   Colonne attese: nome | numero | ruolo | categoria | immagine
   Non richiede file JSON nel repository.
*/
document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const SHEET_ID = '1ucM1JY5MXHF7-9mpjp2mfB41TvoA1ziMUGGz86woQXA';
  const SHEET_NAME = 'Squadre';
  const DATA_URL = `https://opensheet.elk.sh/${SHEET_ID}/${encodeURIComponent(SHEET_NAME)}`;

  const list = document.getElementById('giocatori-list');
  const buttons = {
    femminile: document.getElementById('btn-femminile'),
    maschile: document.getElementById('btn-maschile'),
    staff: document.getElementById('btn-staff')
  };
  if (!list || !buttons.femminile || !buttons.maschile || !buttons.staff) {
    console.error('Squadre: manca il contenitore delle card o un pulsante del filtro.');
    return;
  }

  const clean = value => String(value ?? '').trim();
  const categoryOf = value => clean(value).toLocaleLowerCase('it-IT');
  const make = (tag, className, content) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (content !== undefined) element.textContent = clean(content);
    return element;
  };

  let data = { femminile: [], maschile: [], staff: [] };
  let loaded = false;
  const requestedCategory = categoryOf(new URLSearchParams(location.search).get('cat'));
  let active = Object.hasOwn(buttons, requestedCategory) ? requestedCategory : 'femminile';

  function message(content) {
    list.replaceChildren(make('p', 'v96-roster-status', content));
  }

  function personCard(person) {
    const name = clean(person.nome);
    if (!name) return null;

    const card = make('article', 'v96-person-card');
    const media = make('div', 'v96-person-media');
    const fallback = () => media.replaceChildren(make('span', 'v96-person-placeholder', '96'));

    const imagePath = clean(person.immagine);
    if (imagePath) {
      try {
        const imageUrl = new URL(imagePath, document.baseURI);
        if (!['http:', 'https:'].includes(imageUrl.protocol)) throw new Error('Percorso non valido');
        const img = make('img');
        img.src = imageUrl.href;
        img.alt = `Foto di ${name}`;
        img.loading = 'lazy';
        img.decoding = 'async';
        img.addEventListener('error', fallback, { once: true });
        media.append(img);
      } catch (error) {
        console.warn('Squadre: immagine non valida', name, imagePath, error);
        fallback();
      }
    } else {
      fallback();
    }

    const details = make('div', 'v96-person-details');
    const number = clean(person.numero);
    if (number) details.append(make('span', 'v96-person-number', `#${number}`));
    details.append(make('h3', '', name));
    const role = clean(person.ruolo);
    if (role) details.append(make('p', '', role));
    card.append(media, details);
    return card;
  }

  function render() {
    if (!loaded) return message('Caricamento squadra…');

    // Ogni scheda mostra solo la categoria selezionata.
    // Lo staff compare nell'apposita scheda Dirigenza & Staff.
    const cards = make('div', 'v96-person-grid');
    for (const person of data[active]) {
      const card = personCard(person);
      if (card) cards.append(card);
    }

    if (!cards.childElementCount) {
      return message('Nessun nominativo disponibile per questa categoria.');
    }
    list.replaceChildren(cards);
  }

  function selectCategory(category) {
    if (!Object.hasOwn(buttons, category)) return;
    active = category;
    for (const [key, button] of Object.entries(buttons)) {
      const selected = key === active;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    }
    const url = new URL(location.href);
    url.searchParams.set('cat', category === 'staff' ? 'Staff' : category === 'maschile' ? 'Maschile' : 'Femminile');
    history.replaceState(history.state, '', url.pathname + url.search + url.hash);
    render();
  }

  Object.entries(buttons).forEach(([category, button]) => {
    button.addEventListener('click', () => selectCategory(category));
  });
  selectCategory(active);

  async function loadData() {
    try {
      const response = await fetch(DATA_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const rows = await response.json();
      if (!Array.isArray(rows)) throw new Error('La risposta di Opensheet non è un elenco di righe.');

      const nextData = { femminile: [], maschile: [], staff: [] };
      for (const row of rows) {
        if (!row || typeof row !== 'object') continue;
        const category = categoryOf(row.categoria);
        if (Object.hasOwn(nextData, category) && clean(row.nome)) {
          nextData[category].push(row);
        }
      }
      if (!Object.values(nextData).some(items => items.length)) {
        throw new Error('Nessuna riga riconosciuta: verifica nome del foglio e intestazioni delle colonne.');
      }

      data = nextData;
      loaded = true;
      console.info('Squadre caricate da Google Sheets:', {
        femminile: data.femminile.length,
        maschile: data.maschile.length,
        staff: data.staff.length
      });
      render();
    } catch (error) {
      console.error('Errore caricamento Google Sheets — Squadre:', error);
      message('Impossibile caricare le squadre da Google Sheets. Verifica la condivisione del foglio e la connessione Internet.');
    }
  }

  loadData();
});
