document.addEventListener("DOMContentLoaded", () => {
    const btnF = document.getElementById("btn-femminile");
    const btnM = document.getElementById("btn-maschile");
    const tbody = document.getElementById("calendar-body");
  
    const buttons = [btnF, btnM];
    let calendarData = [];
  
    // Imposta l'evento click per evidenziare il pulsante attivo
    buttons.forEach(btn => {
      btn.addEventListener("click", () => {
        buttons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const category = btn === btnF ? "Femminile" : "Maschile";
        displayCalendar(category);
      });
    });
  
    // Funzione per caricare il JSON
    async function loadCalendar() {
      try {
        const res = await fetch("data/calendario.json");
        if (!res.ok) throw new Error("Errore caricamento calendario");
        calendarData = await res.json();
        btnF.classList.add("active");
        displayCalendar("Femminile");
      } catch (err) {
        console.error(err);
        tbody.innerHTML = `<tr><td colspan="5">Errore nel caricamento del calendario</td></tr>`;
      }
    }
  
    // Mostra le righe filtrate in tabella
    function displayCalendar(categoria) {
        tbody.innerHTML = "";
        const filtered = calendarData
          .filter(m => m.categoria === categoria)
          .sort((a, b) => new Date(a.data) - new Date(b.data));
      
        if (filtered.length === 0) {
          tbody.innerHTML = `<tr><td colspan="6">Nessuna partita per la categoria selezionata</td></tr>`;
          return;
        }
      
        filtered.forEach(m => {
          const tr = document.createElement("tr");
          tr.innerHTML = `
  <td>${m.giornata || "-"}</td>
  <td>${m.data}</td>
  <td class="avversario-cell">
    <img src="${m.logo}" alt="${m.avversario}" class="logo-squadra">
    <span>${m.avversario}</span>
  </td>
  <td>${m.luogo}</td>
  <td>${m.ora || "-"}</td>
  <td>${m.risultato || "-"}</td>
`;

          tbody.appendChild(tr);
        });
      }
      
      
  
    loadCalendar();
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
