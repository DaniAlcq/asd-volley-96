document.addEventListener("DOMContentLoaded", () => {
  const navLinks = document.querySelectorAll("nav a");           // Restituisce tutti i link nav
  navLinks.forEach((link, index) => {
    link.addEventListener("click", e => {
      //e.preventDefault();
    });
  });
});
document.addEventListener("DOMContentLoaded", () => {
  // Carica il JSON del carosello e inizializza
  async function fetchCarosello() {
    try {
      const res = await fetch("data/carosello.json");
      if (!res.ok) throw new Error("Errore nel caricamento del carosello");
      const slidesData = await res.json();

      const slidesContainer = document.querySelector(".news-carousel .slides");
      slidesContainer.innerHTML = ""; // pulisci

      slidesData.forEach(slide => {
        const slideDiv = document.createElement("div");
        slideDiv.className = "slide";
        slideDiv.innerHTML = `
          <img src="${slide.immagine}" alt="${slide.caption}">
          <div class="caption">${slide.caption}</div>
        `;
        slidesContainer.appendChild(slideDiv);
      });

      initCarosello(); // inizializza SOLO dopo che le slide ci sono
    } catch (err) {
      console.error(err);
    }
  }

  function initCarosello() {
    const wrapper = document.querySelector(".news-carousel .slides");
    const slides = document.querySelectorAll(".news-carousel .slide");
    const prevBtn = document.querySelector(".news-carousel .prev");
    const nextBtn = document.querySelector(".news-carousel .next");
    const total = slides.length;
    let current = 0;

    function updateSlides() {
      const x = -current * 100;
      wrapper.style.transform = `translateX(${x}%)`;
    }

    prevBtn.addEventListener("click", () => {
      current = (current - 1 + total) % total;
      updateSlides();
    });

    nextBtn.addEventListener("click", () => {
      current = (current + 1) % total;
      updateSlides();
    });

    document.addEventListener("keydown", e => {
      if (e.key === "ArrowLeft") prevBtn.click();
      if (e.key === "ArrowRight") nextBtn.click();
    });

    updateSlides();
  }

  fetchCarosello(); // avvia caricamento
});


//click delle card
document.addEventListener("DOMContentLoaded", () => {
  const main = document.querySelector("main");
  let newsData = [];

  // Carica il JSON delle news (ritorna una Promise)
  async function fetchNews() {
    try {
      const res = await fetch("data/news.json");
      if (!res.ok) throw new Error("Errore nel caricamento delle news");
      newsData = await res.json();
  
      // Genera le card dinamicamente
      const newsGrid = document.querySelector(".news-grid");
      newsGrid.innerHTML = ""; // pulisci prima
  
      newsData.forEach(news => {
        const figure = document.createElement("figure");
        figure.className = "news-card";
        figure.setAttribute("data-id", news.id);
        figure.style.cursor = "pointer";
  
        figure.innerHTML = `
          <img src="${news.immagine}" alt="${news.titolo}">
          <figcaption>${news.titolo}</figcaption>
        `;
  
        newsGrid.appendChild(figure);
      });
  
    } catch (err) {
      console.error(err);
    }
  }
  
  
  // Mostra una news specifica
  function showNews(id, replace = false) {
    console.log("ID richiesto:", id);
    console.log("Dati news:", newsData);
    const news = newsData.find(n => n.id === id);
    if (!news) {
      main.innerHTML = `<p>News non trovata.</p>`;
      return;
    }
    main.innerHTML = `
      <article class="news-detail">
        <h2>${news.titolo}</h2>
        <img src="${news.immagine}" alt="${news.titolo}">
        <p>${news.contenuto}</p>
        <button onclick="history.back()">⬅ Torna indietro</button>
      </article>
    `;
    window.scrollTo({ top: 0 });
    if (replace) {
      history.replaceState({ id }, "", `#${id}`);
    } else {
      history.pushState({ id }, "", `#${id}`);
    }
  }

  // Inizializza tutto solo DOPO che le news sono state caricate
  async function init() {
    await fetchNews();

    document.addEventListener("click", e => {
      const card = e.target.closest(".news-card");
      if (card) {
        e.preventDefault();
        const id = card.getAttribute("data-id");
        showNews(id);
      }
    });

    window.addEventListener("popstate", e => {
      if (e.state?.id) {
        showNews(e.state.id, true);
      } else {
        location.reload();
      }
    });

    // Se la pagina è caricata con un hash (es: #news2), mostra subito quella news
    const hashId = location.hash.slice(1);
    if (hashId) {
      showNews(hashId, true);
    }
  }

  init();
});

//Scarabei di giornata

document.addEventListener("DOMContentLoaded", () => {
  fetch("data/scarabei.json")
    .then(response => response.json())
    .then(data => {
      const container = document.getElementById("scarabei-container");
      
      data.forEach(player => {
        const card = document.createElement("div");
        card.className = "mvp-card";
        
        card.innerHTML = `
          <img src="${player.immagine}" alt="${player.nome}">
          <h3><span class="volley-icon"></span> ${player.nome}</h3>
          <p>${player.categoria}</p>
          <p>${player.prestazione}</p>
        `;
        
        container.appendChild(card);
      });
    })
    .catch(error => console.error("Errore nel caricamento JSON:", error));
});


//ultimi risultati
document.addEventListener("DOMContentLoaded", () => {
  const buttons = document.querySelectorAll(".filter-btn");
  const container = document.getElementById("results-container");

  // Funzione per renderizzare le card
  function render(category, data) {
    container.innerHTML = "";
    const filtered = data.filter(m => m.categoria === category);
    filtered.slice(0, 3).forEach(match => {
      const card = document.createElement("div");
      card.className = "result-card";
      card.innerHTML = `
        <h4 class="result-day">${match.giorno}</h4>
        <div class="logos">
          <div class="team">
            <img src="${match.squadraCasa.logo}" alt="${match.squadraCasa.nome}">
            <span>${match.squadraCasa.nome}</span>
          </div>
          <div class="resCasa">${match.risultatoCasa}</div>
          <div class="vs">-</div>
                  <div class="resOsp">${match.risultatoOspite}</div>
          <div class="team">
            <img src="${match.squadraOspite.logo}" alt="${match.squadraOspite.nome}">
            <span>${match.squadraOspite.nome}</span>
          </div>
        </div>
        <ul class="result-sets">${match.sets.map(s => `<li>${s}</li>`).join("")}</ul>
      `;
      container.appendChild(card);
    });
  }

  // Caricamento dei dati dal file JSON
  fetch("data/results.json")
    .then(response => response.json())
    .then(data => {
      // Render iniziale per la categoria "Femminile"
      render("Femminile", data);

      // Gestione dei click sui pulsanti
      buttons.forEach(btn => {
        btn.addEventListener("click", () => {
          buttons.forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          render(btn.dataset.cat, data);
        });
      });
    })
    .catch(error => console.error("Errore nel caricamento dei dati:", error));
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

