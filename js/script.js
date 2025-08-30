document.addEventListener("DOMContentLoaded", () => {
  /* ========================
     Helper per JSON (Decap-ready)
  ======================== */
  const asArray = (data) => Array.isArray(data) ? data : (data?.items || []);
  async function fetchJSON(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Fetch fallito: ${url} (${res.status})`);
    return res.json();
  }

  /* ========================
     CAROSELLO NEWS
  ======================== */
  async function fetchCarosello() {
    try {
      const json = await fetchJSON("data/carosello.json");
      const slidesData = asArray(json);

      const slidesContainer = document.querySelector(".news-carousel .slides");
      if (!slidesContainer) return;
      slidesContainer.innerHTML = "";

      slidesData.forEach((slide) => {
        const slideDiv = document.createElement("div");
        slideDiv.className = "slide";
        slideDiv.innerHTML = `
          <div class="slide-left">
            <img src="${slide.immagine}" alt="${slide.caption || ""}">
          </div>
          <div class="slide-right">
            <h3>${slide.caption || ""}</h3>
            <p>${slide.descrizione || ""}</p>
          </div>
        `;
        slidesContainer.appendChild(slideDiv);
      });

      initCarosello();
    } catch (err) {
      console.error("Errore carosello:", err);
    }
  }

  function initCarosello() {
    const wrapper = document.querySelector(".news-carousel .slides");
    const slides = document.querySelectorAll(".news-carousel .slide");
    const prevBtn = document.querySelector(".news-carousel .prev");
    const nextBtn = document.querySelector(".news-carousel .next");
    if (!wrapper || !slides.length || !prevBtn || !nextBtn) return;

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

    document.addEventListener("keydown", (e) => {
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
      const json = await fetchJSON("data/news.json");
      newsData = asArray(json);

      const newsGrid = document.querySelector(".news-grid");
      if (!newsGrid) return;
      newsGrid.innerHTML = "";

      newsData.forEach((news) => {
        const figure = document.createElement("figure");
        figure.className = "news-card";
        figure.setAttribute("data-id", news.id);
        figure.style.cursor = "pointer";
        figure.innerHTML = `
          <img src="${news.immagine}" alt="${news.titolo || ""}">
          <figcaption>${news.titolo || ""}</figcaption>
        `;
        newsGrid.appendChild(figure);
      });
    } catch (err) {
      console.error("Errore news:", err);
    }
  }

  function showNews(id, replace = false) {
    const main = document.querySelector("main");
    if (!main) return;
    const news = newsData.find((n) => String(n.id) === String(id));
    if (!news) {
      main.innerHTML = `<p>News non trovata.</p>`;
      return;
    }
    main.innerHTML = `
      <article class="news-detail">
        <h2>${news.titolo || ""}</h2>
        <img src="${news.immagine}" alt="${news.titolo || ""}">
        <p>${news.contenuto || ""}</p>
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

    document.addEventListener("click", (e) => {
      const card = e.target.closest(".news-card");
      if (card) {
        e.preventDefault();
        const id = card.getAttribute("data-id");
        showNews(id);
      }
    });

    window.addEventListener("popstate", (e) => {
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
  (async () => {
    try {
      const json = await fetchJSON("data/scarabei.json");
      const data = asArray(json);
      const container = document.getElementById("scarabei-container");
      if (!container) return;

      container.innerHTML = "";
      data.forEach((player) => {
        const card = document.createElement("div");
        card.className = "mvp-card";
        card.innerHTML = `
          <img src="${player.immagine}" alt="${player.nome || ""}">
          <h3>${player.nome || ""}</h3>
          <p>${player.categoria || ""}</p>
          <p>${player.prestazione || ""}</p>
        `;
        container.appendChild(card);
      });
    } catch (error) {
      console.error("Errore scarabei:", error);
    }
  })();

  /* ========================
     ULTIMI RISULTATI
  ======================== */
  const buttons = document.querySelectorAll(".filter-btn");
  const resultsContainer = document.getElementById("results-container");

  function renderResults(category, data) {
    if (!resultsContainer) return;
    resultsContainer.innerHTML = "";
    const filtered = data.filter((m) => m.categoria === category);
    filtered.slice(0, 3).forEach((match) => {
      const card = document.createElement("div");
      card.className = "result-card";
      card.innerHTML = `
        <h4 class="result-day">${match.giorno || ""}</h4>
        <div class="logos">
          <div class="team">
            <img src="${match.squadraCasa?.logo}" alt="${match.squadraCasa?.nome || ""}">
            <span>${match.squadraCasa?.nome || ""}</span>
          </div>
          <div class="resCasa">${match.risultatoCasa ?? ""}</div>
          <div class="vs">-</div>
          <div class="resOsp">${match.risultatoOspite ?? ""}</div>
          <div class="team">
            <img src="${match.squadraOspite?.logo}" alt="${match.squadraOspite?.nome || ""}">
            <span>${match.squadraOspite?.nome || ""}</span>
          </div>
        </div>
        <ul class="result-sets">
          ${(match.sets || []).map((s) => `<li>${s}</li>`).join("")}
        </ul>
      `;
      resultsContainer.appendChild(card);
    });
  }

  (async () => {
    try {
      const json = await fetchJSON("data/results.json");
      const data = asArray(json);

      renderResults("Femminile", data);
      buttons.forEach((btn) => {
        btn.addEventListener("click", () => {
          buttons.forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          renderResults(btn.dataset.cat, data);
        });
      });
    } catch (error) {
      console.error("Errore risultati:", error);
    }
  })();

  /* ========================
     MENU ATTIVO
  ======================== */
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
