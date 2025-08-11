document.addEventListener("DOMContentLoaded", () => {

  /* ========================
     CAROSELLO NEWS
  ======================== */
  async function fetchCarosello() {
    try {
      const res = await fetch("data/carosello.json");
      if (!res.ok) throw new Error("Errore nel caricamento del carosello");
      const slidesData = await res.json();

      const slidesContainer = document.querySelector(".news-carousel .slides");
      slidesContainer.innerHTML = "";

      slidesData.forEach(slide => {
        const slideDiv = document.createElement("div");
        slideDiv.className = "slide";
        slideDiv.innerHTML = `
          <div class="slide-left">
            <img src="${slide.immagine}" alt="${slide.caption}">
          </div>
          <div class="slide-right">
            <h3>${slide.caption}</h3>
            <p>${slide.descrizione || ""}</p>
          </div>
        `;
        slidesContainer.appendChild(slideDiv);
      });

      initCarosello();
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
      wrapper.style.transform = `translateX(${-current * 100}%)`;
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

  fetchCarosello();

  /* ========================
     NEWS GRID
  ======================== */
  let newsData = [];

  async function fetchNews() {
    try {
      const res = await fetch("data/news.json");
      if (!res.ok) throw new Error("Errore nel caricamento delle news");
      newsData = await res.json();

      const newsGrid = document.querySelector(".news-grid");
      newsGrid.innerHTML = "";

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

  function showNews(id, replace = false) {
    const main = document.querySelector("main");
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
        <button class="back-btn" onclick="history.back()">⬅ Torna indietro</button>

      </article>
    `;
    window.scrollTo({ top: 0 });
    if (replace) {
      history.replaceState({ id }, "", `#${id}`);
    } else {
      history.pushState({ id }, "", `#${id}`);
    }
  }

  async function initNewsGrid() {
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

    const hashId = location.hash.slice(1);
    if (hashId) {
      showNews(hashId, true);
    }
  }
  initNewsGrid();

  /* ========================
     SCARABEI DI GIORNATA
  ======================== */
  fetch("data/scarabei.json")
    .then(response => response.json())
    .then(data => {
      const container = document.getElementById("scarabei-container");
      data.forEach(player => {
        const card = document.createElement("div");
        card.className = "mvp-card";
        card.innerHTML = `
          <img src="${player.immagine}" alt="${player.nome}">
          <h3>${player.nome}</h3>
          <p>${player.categoria}</p>
          <p>${player.prestazione}</p>
        `;
        container.appendChild(card);
      });
    })
    .catch(error => console.error("Errore nel caricamento JSON:", error));

  /* ========================
     ULTIMI RISULTATI
  ======================== */
  const buttons = document.querySelectorAll(".filter-btn");
  const resultsContainer = document.getElementById("results-container");

  function renderResults(category, data) {
    resultsContainer.innerHTML = "";
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
      resultsContainer.appendChild(card);
    });
  }

  fetch("data/results.json")
    .then(response => response.json())
    .then(data => {
      renderResults("Femminile", data);
      buttons.forEach(btn => {
        btn.addEventListener("click", () => {
          buttons.forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          renderResults(btn.dataset.cat, data);
        });
      });
    })
    .catch(error => console.error("Errore nel caricamento dei dati:", error));

  /* ========================
     MENU ATTIVO
  ======================== */
  const navLinks = document.querySelectorAll("nav a");
  const currentPage = window.location.pathname.split("/").pop();
  navLinks.forEach(link => {
    const linkPage = link.getAttribute("href");
    if (linkPage === currentPage) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });

});
