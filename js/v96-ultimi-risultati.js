/* ASD Volley '96 — Ultimi risultati (JSON FIPAV). Non altera la sezione Prossime partite. */
(() => {
  'use strict';
  const anchor = document.querySelector('#prossime-gare');
  if (!anchor || document.querySelector('#ultimi-risultati')) return;
  const section = document.createElement('section');
  section.id = 'ultimi-risultati';
  section.className = 'v96-section v96-results-section';
  section.setAttribute('aria-labelledby', 'v96-results-title');
  section.innerHTML = `<div class="v96-container">
    <div class="v96-section-head"><div><h2 id="v96-results-title">Ultimi <em>risultati</em></h2></div>
    <a class="v96-text-link" href="calendario.html">Tutti i risultati →</a></div>
    <div class="v96-results-grid">
      <article class="v96-result-card" id="v96-result-femminile" aria-live="polite"><div class="v96-result-top"><span>SERIE C FEMMINILE</span><span class="v96-result-round">—</span></div><div class="v96-result-body"><p class="v96-result-hint">Ultima partita</p><strong class="v96-result-opponent">Caricamento…</strong><p class="v96-result-meta"></p><div class="v96-result-score" hidden></div><div class="v96-result-sets"></div></div><a class="v96-result-foot" href="calendario.html?cat=Femminile">Calendario e Risultati <span aria-hidden="true">→</span></a></article>
      <article class="v96-result-card" id="v96-result-maschile" aria-live="polite"><div class="v96-result-top"><span>SERIE C MASCHILE</span><span class="v96-result-round">—</span></div><div class="v96-result-body"><p class="v96-result-hint">Ultima partita</p><strong class="v96-result-opponent">Caricamento…</strong><p class="v96-result-meta"></p><div class="v96-result-score" hidden></div><div class="v96-result-sets"></div></div><a class="v96-result-foot" href="calendario.html?cat=Maschile">Calendario e Risultati <span aria-hidden="true">→</span></a></article>
    </div></div>`;
  anchor.insertAdjacentElement('afterend', section);

  const dateOf = value => {
    const m = String(value || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})/);
    if (m) return new Date(Number(m[3]) + (m[3].length === 2 ? 2000 : 0), Number(m[2])-1, Number(m[1]), 12);
    const iso = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    return iso ? new Date(+iso[1],+iso[2]-1,+iso[3],12) : new Date(NaN);
  };
  const cleanScore = value => {
    const s=String(value ?? '').replace(/[–—−:]/g,'-').trim();
    const m=s.match(/(?:^|\s)([0-3])\s*-\s*([0-3])(?:$|\s)/);
    return m ? [Number(m[1]),Number(m[2])] : null;
  };
  const fetchJson = async path => { const r=await fetch(path,{cache:'no-store'});if(!r.ok)throw new Error(`${path}: HTTP ${r.status}`);return r.json(); };
  function setPairs(game) {
    // Richiede parziali effettivamente presenti nel JSON: non li ricava dal risultato finale.
    const sources=[game.parziali,game.set,game.sets,game.dettagliSet,game.dettagli,game.risultatiSet];
    for(const source of sources){
      if(!source)continue;
      const items = Array.isArray(source) ? source : typeof source==='string' ? source.split(/[;,|]/) : [];
      const pairs=items.map(x=>{
        if(typeof x==='object' && x){
          const a=x.casa??x.home??x.puntiCasa, b=x.ospite??x.away??x.puntiOspite;
          return Number.isFinite(+a)&&Number.isFinite(+b) ? [+a,+b] : null;
        }
        const m=String(x).trim().match(/^(\d{1,2})\s*[-–:]\s*(\d{1,2})$/);
        return m?[+m[1],+m[2]]:null;
      }).filter(Boolean);
      if(pairs.length) return pairs.slice(0,5);
    }
    return [];
  }
  const setText=(node,value)=>{node.textContent=value;};
  function render(cat,season,game){
    const card=document.getElementById('v96-result-'+cat);
    if(!card)return;
    const result=cleanScore(game.risultato);
    if(!result)return;
    // I JSON esistenti salvano il risultato dal punto di vista Volley '96.
    // Per il risultato ufficiale si inverte in trasferta (casa-ospite).
    const away=String(game.luogo||'').toUpperCase().trim()==='T';
    const homeAway=away?[result[1],result[0]]:result;
    const label=game.data?String(game.data):'';
    setText(card.querySelector('.v96-result-opponent'),game.avversario||'Avversaria');
    setText(card.querySelector('.v96-result-meta'),[label,game.orario?'ore '+game.orario:'',away?'Trasferta':'Casa'].filter(Boolean).join(' · '));
    setText(card.querySelector('.v96-result-round'),`G${game.giornata||'—'} · ${season.etichetta||season.id}`);
    const score=card.querySelector('.v96-result-score');score.hidden=false;
    score.replaceChildren();
    const sc=document.createElement('strong');sc.textContent=`${homeAway[0]} – ${homeAway[1]}`;score.append(sc);
    const scoreCaption=document.createElement('small');scoreCaption.textContent='Risultato casa–ospite';score.append(scoreCaption);
    const setsBox=card.querySelector('.v96-result-sets');setsBox.replaceChildren();
    const pairs=setPairs(game);
    if(pairs.length){
      const label=document.createElement('span');label.className='v96-set-label';label.textContent='Parziali dei set';setsBox.appendChild(label);
      const list=document.createElement('div');list.className='v96-sets-list';
      pairs.forEach((pair,i)=>{const item=document.createElement('span');item.textContent=`${i+1}° ${pair[0]}–${pair[1]}`;list.append(item)});
      setsBox.append(list);
    }else{
      const note=document.createElement('span');note.className='v96-set-missing';note.textContent='Parziali dei set non disponibili nei dati FIPAV salvati';setsBox.append(note);
    }
  }
  function empty(cat,message){const card=document.getElementById('v96-result-'+cat);if(card){setText(card.querySelector('.v96-result-opponent'),message);card.querySelector('.v96-result-score').hidden=true;card.querySelector('.v96-result-sets').textContent='';}}
  async function init(){
    try{
      const cfg=await fetchJson('data/stagioni.json');
      const seasons=[...(cfg.stagioni||[])].sort((a,b)=>String(b.id).localeCompare(String(a.id)));
      for(const cat of ['femminile','maschile']){
        let found=false;
        // Preferisce la stagione attiva. Se non è iniziata, mostra l'ultima partita dell'archivio.
        for(const season of seasons){
          try{
            const json=await fetchJson(`data/calendari/${season.id}/${cat}.json`);
            const games=(json.dati||[]).map(g=>({...g,_time:dateOf(g.data).getTime()}))
              .filter(g=>Number.isFinite(g._time) && g._time<=Date.now() && cleanScore(g.risultato))
              .sort((a,b)=>b._time-a._time);
            if(games.length){render(cat,season,games[0]);found=true;break;}
          }catch(e){console.info('Ultimi risultati',cat,season.id,e.message);}
        }
        if(!found)empty(cat,'Nessun risultato disponibile');
      }
    }catch(e){console.info('Ultimi risultati:',e);for(const cat of ['femminile','maschile'])empty(cat,'Risultati temporaneamente non disponibili');}
  }
  init();
})();
