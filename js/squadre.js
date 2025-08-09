document.addEventListener("DOMContentLoaded", () => {
    const btnFemminile = document.getElementById("btn-femminile");
    const btnMaschile = document.getElementById("btn-maschile");
    const teamList = document.getElementById("giocatori-list");
  
    const buttons = [btnFemminile, btnMaschile];
    let playersData = {};
  
    // Aggiunge classe active al pulsante selezionato e rimuove dagli altri
    buttons.forEach(btn => {
      btn.addEventListener("click", () => {
        buttons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });
  
    // Visualizza membri della categoria selezionata + staff
    function displayPlayers(categoria) {
      teamList.innerHTML = "";
      const list = playersData[categoria] ?? [];
      const staff = playersData.staff ?? [];
  
      [...list, ...staff].forEach(player => {
        const card = document.createElement("div");
        card.className = "team-cardList";
        card.innerHTML = `
          <img src="${player.immagine}" alt="${player.nome}">
          <div class="team-info">
            <h3>${player.nome}</h3>
            ${player.numero !== undefined ? `<p>Numero: ${player.numero}</p>` : ""}
            <p>Ruolo: ${player.ruolo}</p>
          </div>
        `;
        teamList.appendChild(card);
      });
    }
  
    // Carica i dati dal file JSON e gestisce la selezione in base a URL
    async function loadData() {
      try {
        const response = await fetch("data/squadra.json");
        if (!response.ok) throw new Error("Errore nel caricamento dati");
        playersData = await response.json();
  
        // Leggi parametro URL
        const urlParams = new URLSearchParams(window.location.search);
        const catFromUrl = urlParams.get("cat");
  
        if (catFromUrl && (catFromUrl.toLowerCase() === "femminile" || catFromUrl.toLowerCase() === "maschile")) {
          const categoria = catFromUrl.toLowerCase();
          buttons.forEach(b => b.classList.remove("active"));
          if (categoria === "femminile") btnFemminile.classList.add("active");
          else if (categoria === "maschile") btnMaschile.classList.add("active");
          displayPlayers(categoria);
        } else {
          // Default: femminile
          btnFemminile.classList.add("active");
          displayPlayers("femminile");
        }
      } catch (error) {
        console.error(error);
      }
    }
  
    btnFemminile.addEventListener("click", () => displayPlayers("femminile"));
    btnMaschile.addEventListener("click", () => displayPlayers("maschile"));
  
    loadData();
  });
  document.addEventListener("DOMContentLoaded", () => {
    const navLinks = document.querySelectorAll("nav a");
    const currentPage = window.location.pathname.split("/").pop(); // es: "squadre.html"
  
    navLinks.forEach(link => {
      const linkPage = link.getAttribute("href");
      if (linkPage === currentPage) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });
  });
  