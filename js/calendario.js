document.addEventListener("DOMContentLoaded", () => {
  /* =============== Helpers =============== */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const asArray = (data) => (Array.isArray(data) ? data : (data?.items || []));

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
          <td class="squadra-cell team-cell">
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

      // Stato 'active' sui bottoni filtro
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

  // Eventi filtro
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

  // Iniziale (supporta ?cat=Femminile|Maschile)
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

  /* =============== Hamburger menu =============== */
  const hamburger = $("#hamburger");
  const navbar = $("#navbar");

  if (hamburger && navbar) {
    const toggleMenu = () => navbar.classList.toggle("active");
    const closeMenu = () => navbar.classList.remove("active");

    hamburger.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleMenu();
    });

    // Chiudi su click fuori
    document.addEventListener("click", (e) => {
      if (navbar.classList.contains("active")) {
        const clickInside = navbar.contains(e.target) || hamburger.contains(e.target);
        if (!clickInside) closeMenu();
      }
    });

    // Chiudi con ESC
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMenu();
    });

    // Chiudi cliccando un link del menu
    $$("nav a", navbar).forEach((a) =>
      a.addEventListener("click", () => closeMenu())
    );
  }
});
