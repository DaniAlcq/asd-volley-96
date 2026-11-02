/* DEMO LOCALE: NON è un sistema di voto pubblico né un sistema anti-frode.
 * Modifica DEMO_MATCHES per sostituire atleti e partita con dati reali. */
(() => {
  'use strict';
  const DEMO_MATCHES = {
    femminile: { id: '2026-27-f-demo-01', label: 'Partita dimostrativa · Serie C femminile', athletes: [
      {id:'f7', number:7, name:'Atleta #7', role:'Schiacciatrice'},
      {id:'f6', number:6, name:'Atleta #6', role:'Centrale'},
      {id:'f17', number:17, name:'Atleta #17', role:'Opposto'},
      {id:'f1', number:1, name:'Atleta #1', role:'Palleggiatrice'}
    ]},
    maschile: { id: '2026-27-m-demo-01', label: 'Partita dimostrativa · Serie C maschile', athletes: [
      {id:'m4', number:4, name:'Atleta #4', role:'Schiacciatore'},
      {id:'m9', number:9, name:'Atleta #9', role:'Centrale'},
      {id:'m11', number:11, name:'Atleta #11', role:'Libero'},
      {id:'m12', number:12, name:'Atleta #12', role:'Palleggiatore'}
    ]}
  };
  const storeKey='volley96-mvp-demo-v1';
  const $=id=>document.getElementById(id);
  let team='femminile';
  const getState=()=>{try{return JSON.parse(localStorage.getItem(storeKey))||{}}catch{return {}}};
  const saveState=s=>{try{localStorage.setItem(storeKey,JSON.stringify(s));return true}catch{return false}};
  const getMatch=()=>DEMO_MATCHES[team];
  const hasVoted=()=>Boolean(getState()[getMatch().id]?.choice);
  function render(){
    const match=getMatch(), state=getState()[match.id]||{votes:{}};
    $('match-label').textContent=match.label;
    document.querySelectorAll('[data-team]').forEach(button=>{
      const selected=button.dataset.team===team;
      button.classList.toggle('selected',selected);
      button.setAttribute('aria-pressed',String(selected));
    });
    const grid=$('athletes');grid.replaceChildren();
    for(const person of match.athletes){
      const label=document.createElement('label');label.className='athlete';
      const input=document.createElement('input');input.type='radio';input.name='athlete';input.value=person.id;input.disabled=hasVoted();
      const card=document.createElement('span');card.className='face';
      const num=document.createElement('span');num.className='num';num.textContent='#'+person.number;
      const caption=document.createElement('span');const name=document.createElement('strong');name.textContent=person.name;const small=document.createElement('small');small.textContent=person.role;caption.append(name,small);
      card.append(num,caption);label.append(input,card);grid.append(label);
      input.addEventListener('change',()=>{$('submit-vote').disabled=false;$('notice').textContent='Pronto a votare per '+person.name+'.'});
    }
    $('submit-vote').disabled=hasVoted();
    $('notice').textContent=hasVoted()?'Hai già votato per questa partita su questo browser.':'Seleziona un atleta per votare.';
    renderResults(state,match);
  }
  function renderResults(state,match){
    const voted=Boolean(state.choice);
    $('results').hidden=!voted;
    if(!voted)return;
    const votes=state.votes||{};
    const total=Object.values(votes).reduce((a,b)=>a+Number(b||0),0);
    $('total-votes').textContent=total+' '+(total===1?'voto':'voti')+' di prova';
    const bars=$('bars');bars.replaceChildren();
    for(const person of [...match.athletes].sort((a,b)=>(votes[b.id]||0)-(votes[a.id]||0))){
      const count=votes[person.id]||0,percent=total?Math.round(count/total*100):0;
      const row=document.createElement('div');row.className='result-row';
      const info=document.createElement('div');info.className='result-info';
      const name=document.createElement('span');name.textContent=person.name;
      const num=document.createElement('strong');num.textContent=percent+'% · '+count+' '+(count===1?'voto':'voti');
      info.append(name,num);
      const track=document.createElement('div');track.className='track';
      const fill=document.createElement('div');fill.className='fill';fill.style.width=percent+'%';
      track.append(fill);row.append(info,track);bars.append(row);
    }
  }
  $('vote-form').addEventListener('submit',event=>{
    event.preventDefault();const selected=document.querySelector('input[name="athlete"]:checked');
    if(!selected||hasVoted())return;
    const match=getMatch(),all=getState();all[match.id]??={votes:{}};
    all[match.id].votes[selected.value]=(all[match.id].votes[selected.value]||0)+1;
    all[match.id].choice=selected.value;
    if(!saveState(all)){$('notice').textContent='Impossibile salvare il voto: verifica le impostazioni del browser.';return}
    render();
  });
  document.querySelectorAll('[data-team]').forEach(button=>button.addEventListener('click',()=>{team=button.dataset.team;render()}));
  $('reset-demo').addEventListener('click',()=>{try{localStorage.removeItem(storeKey)}catch{}render()});
  render();
})();
