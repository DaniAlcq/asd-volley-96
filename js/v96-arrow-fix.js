/* Volley '96: frecce vettoriali coerenti su Safari iOS, Android e desktop.
   Non modifica i link né il contenuto dei Google Sheets. */
(() => {
  'use strict';
  const selectors = [
    '.v96-text-link',
    '.v96-news-card-content b',
    '.v96-footer-links a',
    '.v96-team-tile strong span'
  ].join(', ');
  const ns = 'http://www.w3.org/2000/svg';
  const makeArrow = () => {
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '18');
    svg.setAttribute('height', '18');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.8');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('class', 'v96-svg-arrow');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', 'M5 19 19 5 M7 5h12v12');
    svg.append(path);
    return svg;
  };
  function fix(container) {
    if (!(container instanceof Element)) return;
    const elements = [...(container.matches(selectors) ? [container] : []), ...container.querySelectorAll(selectors)];
    for (const el of elements) {
      for (const child of [...el.childNodes]) {
        if (child.nodeType !== Node.TEXT_NODE || !child.textContent.includes('↗')) continue;
        const segments = child.textContent.split('↗');
        const fragment = document.createDocumentFragment();
        segments.forEach((part, index) => {
          if (part) fragment.append(document.createTextNode(part));
          if (index < segments.length - 1) fragment.append(makeArrow());
        });
        child.replaceWith(fragment);
      }
    }
  }
  function start() {
    const style = document.createElement('style');
    style.textContent = `
      .v96-svg-arrow { display:inline-block; vertical-align:-0.15em; width:1.05em; height:1.05em; flex-shrink:0; }
      .v96-news-card-content b .v96-svg-arrow { width:23px; height:23px; color:#ff00a7; }
      .v96-team-tile strong span .v96-svg-arrow { width:28px; height:28px; }
      .v96-footer-links a .v96-svg-arrow { width:15px; height:15px; }
    `;
    document.head.append(style);
    fix(document.body);
    const news = document.getElementById('v96-news-grid');
    if (news) new MutationObserver(() => fix(news)).observe(news, {childList:true,subtree:true});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
