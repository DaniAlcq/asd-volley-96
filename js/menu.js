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
});
