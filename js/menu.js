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
  const GS = t => `https://opensheet.elk.sh/${SHEET_ID}/${encodeURIComponent(t)}`;
  const btn = document.getElementById("live-button");
  const FALLBACK = "https://www.youtube.com/@ASD_VOLLEY96/live";
  const URL_KEYS = ["youtube_url","url","link","youtube","live_url","YouTube","YouTube_URL"];

  let liveURL = FALLBACK;

  function pickUrl(row){
    for (const k of URL_KEYS){
      const v = row?.[k];
      if (v && String(v).trim()) return String(v).trim();
    }
    return FALLBACK;
  }

  async function refresh(){
    if (!btn) return;
    try{
      const res = await fetch(GS("Diretta"), { cache: "no-store" });
      const rows = res.ok ? await res.json() : [];
      const r = rows[0] || {};
      const flag = String((r.live||"").trim().toLowerCase());
      const on = /^(si|1|true|on|live)$/i.test(flag);
      liveURL = pickUrl(r);

      // normalizza
      if (!/^https?:\/\//i.test(liveURL)) liveURL = FALLBACK;

      btn.href = liveURL;
      btn.classList.toggle("live-hidden", !on);
    } catch {
      btn && btn.classList.add("live-hidden");
      liveURL = FALLBACK;
      btn.href = liveURL;
    }
  }

  // apertura affidabile anche se l'href fosse rimasto "#"
  if (btn){
    btn.addEventListener("click", (e) => {
      if (btn.classList.contains("live-hidden")) { e.preventDefault(); return; }
      if (!/^https?:\/\//i.test(liveURL)) liveURL = FALLBACK;
      window.open(liveURL, "_blank", "noopener");
      e.preventDefault();
    });
  }

  document.addEventListener("DOMContentLoaded", refresh);
  setInterval(refresh, 60000);
})();



  


  

});
