/* ASD Volley '96 - titoli editoriali bicolore (esclusivamente intestazioni di sezioni). */
(() => {
  'use strict';
  const selectors = [
    'main .v96-section-head h2',
    'main .v96-data-title h1',
    'main .v96-contact-main > h2',
    'main .v96-hero-inner h1',
    'main .v96-team-hero h1',
    'main .v96-page-hero h1',
    'main .v96-squadre-hero h1',
    'main .v96-training-section h2',
    'main > section > .v96-container > h2',
    'main .v96-results-heading h2'
  ];
  function applyHeading(h) {
    if (h.dataset.v96TwoTone === 'done') return;
    // Non toccare titoli che contengono gia' markup (es. corsivo rosa preesistente).
    if (h.children.length) return;
    const text = (h.textContent || '').replace(/\s+/g, ' ').trim();
    const words = text.split(' ');
    if (words.length < 2) return;
    const last = words.pop();
    // Non evidenziare il numero finale del nome dell'associazione.
    if (/^[’']?96$/.test(last)) return;
    h.replaceChildren(document.createTextNode(words.join(' ') + ' '));
    const span = document.createElement('span');
    span.className = 'v96-title-accent';
    span.textContent = last;
    h.appendChild(span);
    h.dataset.v96TwoTone = 'done';
  }
  function run() {
    document.querySelectorAll(selectors.join(',')).forEach(applyHeading);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
