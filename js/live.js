// js/live.js — mostra "Diretta" e linka subito YouTube Live
(function(){
    const SHEET_ID = "1ucM1JY5MXHF7-9mpjp2mfB41TvoA1ziMUGGz86woQXA";
    const GS = t => `https://opensheet.elk.sh/${SHEET_ID}/${encodeURIComponent(t)}`;
  
    // fallback se lo Sheet non fornisce l'URL della live
    const FALLBACK_YT = "https://www.youtube.com/@ASD_VOLLEY96/live"; // <-- metti il tuo canale
  
    // override manuale: ?live=1 o ?live=0
    const qp = new URLSearchParams(location.search);
    const FORCE_ON  = qp.get("live") === "1";
    const FORCE_OFF = qp.get("live") === "0";
  
    const nav = document.getElementById("nav-live");
    if(!nav) return;
  
    function show(url){
      nav.href   = url || FALLBACK_YT;
      nav.target = "_blank";
      nav.rel    = "noopener";
      nav.style.display = "inline-flex";
      nav.classList.add("live-on");
    }
    function hide(){
      nav.style.display = "none";
      nav.classList.remove("live-on");
    }
  
    function parseLive(rows){
      if(!Array.isArray(rows)) return {on:false, url:null};
      const r = rows.find(x => x && (x.live || x.attiva || x.online || x.status));
      if(!r) return {on:false, url:null};
      const flag = String(r.live || r.attiva || r.online || r.status).toLowerCase().trim();
      const on = /^(si|sì|true|1|on|live)$/.test(flag);
      const url = (r.youtube_url || r.url || "").trim();
      return {on, url: url || null};
    }
  
    async function refresh(){
      try{
        if(FORCE_OFF){ hide(); return; }
        if(FORCE_ON){ show(FALLBACK_YT); return; }
  
        const res  = await fetch(GS("Diretta"), { cache:"no-store" });
        const json = await res.json();
        const {on, url} = parseLive(json);
        on ? show(url) : hide();
      }catch(e){
        hide();
      }
    }
  
    document.addEventListener("DOMContentLoaded", ()=>{
      refresh();
      setInterval(refresh, 60000); // aggiorna ogni minuto
    });
  })();
  