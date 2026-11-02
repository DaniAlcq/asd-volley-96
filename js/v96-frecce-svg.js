/* ASD Volley '96 — sostituisce frecce Unicode con SVG coerenti su iPhone. */
(() => {
  'use strict';
  const svg = () => {
    const ns = 'http://www.w3.org/2000/svg';
    const el = document.createElementNS(ns, 'svg');
    el.setAttribute('viewBox', '0 0 24 24');
    el.setAttribute('width', '15');
    el.setAttribute('height', '15');
    el.setAttribute('fill', 'none');
    el.setAttribute('stroke', 'currentColor');
    el.setAttribute('stroke-width', '1.8');
    el.setAttribute('stroke-linecap', 'round');
    el.setAttribute('stroke-linejoin', 'round');
    el.setAttribute('aria-hidden', 'true');
    el.style.cssText = 'display:inline-block;vertical-align:-.12em;flex-shrink:0;';
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', 'M5 19 19 5M8 5h11v11');
    el.append(path);
    return el;
  };
  const replace = (root) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const matches = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.nodeValue.includes('↗')) continue;
      const parent = node.parentElement;
      if (!parent || !parent.closest('a') || parent.closest('script,style,svg,textarea')) continue;
      matches.push(node);
    }
    for (const node of matches) {
      const parts = node.nodeValue.split('↗');
      const fragment = document.createDocumentFragment();
      for (let i = 0; i < parts.length; i++) {
        if (parts[i]) fragment.append(document.createTextNode(parts[i]));
        if (i < parts.length - 1) fragment.append(svg());
      }
      node.replaceWith(fragment);
    }
  };
  const init = () => {
    replace(document.body);
    // I link creati successivamente da altri script vengono aggiornati a loro volta.
    const obs = new MutationObserver(records => {
      for (const record of records) {
        for (const n of record.addedNodes) {
          if (n.nodeType === 1) replace(n);
          else if (n.nodeType === 3 && n.parentElement) replace(n.parentElement);
        }
      }
    });
    obs.observe(document.body, {childList:true,subtree:true});
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
