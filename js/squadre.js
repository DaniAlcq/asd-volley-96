// ======= Google Sheets via Opensheet: config + helper =======
const SHEET_ID = "INSERISCI_IL_TUO_SPREADSHEET_ID"; // <-- metti qui l'ID
const GS = (tab) => `https://opensheet.elk.sh/${SHEET_ID}/${encodeURIComponent(tab)}`;

async function fetchSheet(tab) {
  const url = GS(tab);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Fetch fallito: ${tab} (${res.status})`);
  return res.json(); // array di righe, con chiavi = intestazioni del foglio
}

// Utility: normalizza stringhe/immagini
const tidy = (s) => (typeof s === "string" ? s.trim() : s);
const fixImg = (s) => tidy(s); // qui potresti fare logiche extra se servono


document.addEventListener("DOMContentLoaded", () => {
  /* ========= Helper JSON (compatibile Decap) ========= */
  const asArray = (data) => Array.isArray(data) ? data : (data?.items || []);
  async function fetchJSON(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Fetch fallito: ${url} (${res.status})`);
    return res.json();
  }

  /* ========= Riferimenti DOM (con fallback) ========= */
  const btnFemminile = document.getElementById("btn-femminile");
  const btnMaschile  = document.getElementById("btn-maschile");
  const teamList     = document.getElementById("giocatori-list");
  const buttons      = [btnFemminile, btnMaschile].filter(Boolean);

  let playersData = {
    femminile: [],
    maschile:  [],
    staff:     []
  };

  /* ========= UI: Active state sui bottoni ========= */
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  /* ========= Render cards ========= */
  function cardHTML(player) {
    const hasNumero = player.numero !== undefined && player.numero !== null && player.numero !== "";
    return `
      <div class="team-cardList">
        <img src="${player.immagine}" alt="${player.nome || ""}">
        <div class="team-info">
          <h3>${player.nome || ""}</h3>
          ${hasNumero ? `<p>Numero: ${player.numero}</p>` : ""}
          <p>Ruolo: ${player.ruolo || ""}</p>
        </div>
      </div>
    `;
  }

  function displayPlayers(categoria) {
    if (!teamList) return;
    teamList.innerHTML = "";

    // Normalizza: accetta sia playersData.categoria come array, sia come { items: [...] }
    const list  = asArray(playersData[categoria] || []);
    const staff = asArray(playersData.staff || []);

    // Mostra giocatori della categoria + staff
    [...list, ...staff].forEach((p) => {
      teamList.insertAdjacentHTML("beforeend", cardHTML(p));
    });
  }

  /* ========= Caricamento dati ========= */
  async function loadData() {
    try {
      const json = await fetchJSON("data/squadra.json");

      // Se il JSON è un oggetto con chiavi (femminile/maschile/staff) lo manteniamo;
      // se fosse un array items, proviamo a smistarli per categoria/ruolo.
      if (Array.isArray(json) || Array.isArray(json?.items)) {
        const arr = asArray(json);
        playersData = { femminile: [], maschile: [], staff: [] };
        arr.forEach((p) => {
          const cat = String(p.categoria || "").toLowerCase();
          if (cat === "femminile") playersData.femminile.push(p);
          else if (cat === "maschile") playersData.maschile.push(p);
          else if (String(p.ruolo || "").toLowerCase() === "staff") playersData.staff.push(p);
        });
      } else {
        // Oggetto “a chiavi” già pronto
        playersData = {
          femminile: asArray(json.femminile || []),
          maschile:  asArray(json.maschile  || []),
          staff:     asArray(json.staff     || [])
        };
      }

      // Selettore categoria da URL ?cat=Femminile|Maschile
      const urlParams = new URLSearchParams(window.location.search);
      const rawCat = urlParams.get("cat");
      const catFromUrl = rawCat ? rawCat.toLowerCase() : null;

      let categoria = "femminile";
      if (catFromUrl === "femminile" || catFromUrl === "maschile") {
        categoria = catFromUrl;
      }

      // Aggiorna stato pulsanti (se esistono)
      buttons.forEach((b) => b.classList.remove("active"));
      if (categoria === "femminile" && btnFemminile) btnFemminile.classList.add("active");
      if (categoria === "maschile"  && btnMaschile)  btnMaschile.classList.add("active");

      displayPlayers(categoria);
    } catch (error) {
      console.error("Errore nel caricamento dati squadra:", error);
      if (teamList) teamList.innerHTML = `<p>Impossibile caricare i dati.</p>`;
    }
  }

  // Click handler per i bottoni (se presenti)
  if (btnFemminile) btnFemminile.addEventListener("click", () => displayPlayers("femminile"));
  if (btnMaschile)  btnMaschile.addEventListener("click",  () => displayPlayers("maschile"));

  loadData();

  /* ========= Evidenzia link di menu attivo ========= */
  const navLinks = document.querySelectorAll("nav a");
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  navLinks.forEach((link) => {
    const linkPage = link.getAttribute("href");
    if (linkPage === currentPage) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
});
