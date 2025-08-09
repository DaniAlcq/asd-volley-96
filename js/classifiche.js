function caricaClassifica(fileJson, bottoneAttivo) {
    fetch(fileJson)
      .then(response => response.json())
      .then(data => {
        const tbody = document.getElementById("tabella-classifica");
        tbody.innerHTML = "";
  
        data.forEach(giocatore => {
            const row = document.createElement("tr");
            row.innerHTML = `
              <td>${giocatore.posizione}</td>
              <td class="squadra-cell">
                <img src="${giocatore.logo}" alt="Logo ${giocatore.nome}" class="logo-squadra">
                <span>${giocatore.nome}</span>
              </td>
              <td>${giocatore.punti}</td>
              <td>${giocatore.partite_giocate}</td>
              <td>${giocatore.vittorie}</td>
              <td>${giocatore.sconfitte}</td>
            `;
            tbody.appendChild(row);
          });
          
  
        // Rimuovi 'active' da tutti i bottoni
        document.querySelectorAll(".filter-buttons button").forEach(btn => {
          btn.classList.remove("active");
        });
  
        // Aggiungi 'active' al bottone cliccato
        bottoneAttivo.classList.add("active");
      })
      .catch(error => console.error("Errore nel caricamento della classifica:", error));
  }
  
  // Eventi filtro
  document.getElementById("btn-femminile").addEventListener("click", function () {
    caricaClassifica("data/classifica_femminile.json", this);
  });
  
  document.getElementById("btn-maschile").addEventListener("click", function () {
    caricaClassifica("data/classifica_maschile.json", this);
  });
  
  // Caricamento iniziale
  window.addEventListener("DOMContentLoaded", () => {
    const btnDefault = document.getElementById("btn-femminile");
    caricaClassifica("data/classifica_femminile.json", btnDefault);
  });
  
document.addEventListener("DOMContentLoaded", () => {
    const navLinks = document.querySelectorAll("nav a");
    const currentPage = window.location.pathname.split("/").pop(); // prende il file corrente, es: "index.html"
  
    navLinks.forEach(link => {
      const linkPage = link.getAttribute("href");
      if (linkPage === currentPage) {
        link.classList.add("active"); // aggiunge la classe 'active' al link della pagina corrente
      }
    });
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
  