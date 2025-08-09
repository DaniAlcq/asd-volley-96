document.addEventListener("DOMContentLoaded", () => {
    document.body.classList.add("loaded");
  
    document.querySelectorAll("a").forEach(link => {
      if (link.hostname === window.location.hostname) {
        link.addEventListener("click", e => {
          e.preventDefault();
          const href = link.href;
  
          document.body.classList.add("fade-out");
  
          setTimeout(() => {
            window.location.href = href;
          }, 500);
        });
      }
    });
  });
  