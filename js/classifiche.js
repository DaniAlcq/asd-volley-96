document.addEventListener("DOMContentLoaded", () => {
  /* =============== Helper =============== */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const asArray = (data) => Array.isArray(data) ? data : (data?.items || []);

  async function fetchJSON(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Fetch fallito: ${url} (${res.status})`);
    return res.json();
  }

  /* =============== Classifica =============== */
  async function caricaClassifica(fileJson, bottoneAttivo) {
    try {
      const data = await fetchJSON(fileJson);
      const rows = asArray(data);

      const tbody = $("#tabella-classifica");
      if (!tbody) return;

      tbody.innerHTML = "";

      rows.forEach((giocatore) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${giocatore.posizione ?? "-"}</td>
          <td class="squadra-cell">
            <img src="${giocatore.logo}" alt="Logo ${giocatore.nome || ""}" class="logo-squadra">
            <span class="team-name">${giocatore.nome || ""}</span>
          </td>
          <td>${giocatore.punti ?? "-"}</td>
          <td>${giocatore.partite_giocate ?? "-"}</td>
          <td>${giocatore.vittorie ?? "-"}</td>
          <td>${giocatore.sconfitte ?? "-"}</td>
        `;
        tbody.appendChild(tr);
      });

      // Stato 'active' pulsanti filtro
      $$(".filter-buttons button").forEach((btn) => btn.classList.remove("active"));
      if (bottoneAttivo) bottoneAttivo.classList.add("active");
    } catch (err) {
      console.error("Errore nel caricamento della classifica:", err);
      const tbody = $("#tabella-classifica");
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="6">Impossibile caricare la classifica.</td></tr>`;
      }
    }
  }

  // Eventi filtro (usa function per mantenere il this del bottone)
  const btnFem = $("#btn-femminile");
  const btnMas = $("#btn-maschile");

  if (btnFem) {
    btnFem.addEventListener("click", function () {
      caricaClassifica("data/classifica_femminile.json", this);
    });
  }
  if (btnMas) {
    btnMas.addEventListener("click", function () {
      caricaClassifica("data/classifica_maschile.json", this);
    });
  }

  // Caricamento iniziale (supporta ?cat=Femminile|Maschile, default Femminile)
  (function initClassifica() {
    const params = new URLSearchParams(location.search);
    const cat = (params.get("cat") || "Femminile").toLowerCase();
    if (cat === "maschile" && btnMas) {
      caricaClassifica("data/classifica_maschile.json", btnMas);
    } else if (btnFem) {
      caricaClassifica("data/classifica_femminile.json", btnFem);
    }
  })();

  /* =============== Evidenzia voce di menu attiva =============== */
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  $$("nav a").forEach((link) => {
    const linkPage = link.getAttribute("href");
    if (linkPage === currentPage) link.classList.add("active");
    else link.classList.remove("active");
  });
});
