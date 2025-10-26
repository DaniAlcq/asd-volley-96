document.addEventListener("DOMContentLoaded", () => {
  const hamburger = document.getElementById("hamburger");
  const navbar    = document.getElementById("navbar");

  if (!hamburger || !navbar) {
    console.warn("[menu] hamburger o navbar non trovati");
    return;
  }

  const open = () => {
    navbar.classList.add("active");
    hamburger.setAttribute("aria-expanded", "true");
    document.body.classList.add("nav-open");
  };
  const close = () => {
    navbar.classList.remove("active");
    hamburger.setAttribute("aria-expanded", "false");
    document.body.classList.remove("nav-open");
  };
  const toggle = (e) => {
    e.stopPropagation();
    navbar.classList.contains("active") ? close() : open();
  };

  // Apri/chiudi con click (e touch)
  ["click","touchstart"].forEach(evt =>
    hamburger.addEventListener(evt, toggle, {passive:true})
  );

  // Chiudi cliccando fuori
  document.addEventListener("click", (e) => {
    if (navbar.classList.contains("active") &&
        !navbar.contains(e.target) &&
        !hamburger.contains(e.target)) {
      close();
    }
  });

  // Evita propagazione click interni al menu
  navbar.addEventListener("click", (e) => e.stopPropagation());

  // Chiudi quando selezioni una voce
  navbar.querySelectorAll("a").forEach(a => {
    a.addEventListener("click", () => close());
  });

  // Chiudi con ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
  // --- ACCENSIONE PALLINO LIVE DA GOOGLE SHEET ---
(function(){
  const SHEET_ID = "1ucM1JY5MXHF7-9mpjp2mfB41TvoA1ziMUGGz86woQXA";
  const GS = (tab) => `https://opensheet.elk.sh/${SHEET_ID}/${encodeURIComponent(tab)}`;

  async function updateLiveDot(){
    try{
      const res = await fetch(GS("Diretta"), { cache: "no-store" });
      if(!res.ok) throw new Error(res.status);
      const rows = await res.json();
      const r = rows?.[0] || {};
      const isLive = String((r.live||"").trim().toLowerCase());
      const dot = document.getElementById("liveDot");
      if(!dot) return;
      if(isLive === "si" || isLive === "1" || isLive === "true"){
        dot.classList.add("on");
      }else{
        dot.classList.remove("on");
      }
    }catch(e){
      // in errore, spegni il pallino
      const dot = document.getElementById("liveDot");
      if(dot) dot.classList.remove("on");
    }
  }

  // al load e poi ogni 60s
  document.addEventListener("DOMContentLoaded", updateLiveDot);
  setInterval(updateLiveDot, 60000);
})();

});
