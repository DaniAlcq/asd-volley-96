/* =============== Classifica (fluida, no scatti) =============== */
async function caricaClassifica(tabName, bottoneAttivo) {
  try {
    if (!tbody) return;

    tbody.classList.add("table-loading");

    const rows = await fetchSheet(tabName);

    const fragment = document.createDocumentFragment();

    rows.forEach(r => {
      const posizione = tidy(r.posizione) ?? "-";
      const nome      = tidy(r.nome) ?? "";
      const logo      = tidy(r.logo) ?? "";
      const punti     = tidy(r.punti) ?? "-";
      const pg        = tidy(r.partite_giocate) ?? "-";
      const v         = tidy(r.vittorie) ?? "-";
      const s         = tidy(r.sconfitte) ?? "-";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${posizione}</td>
        <td class="squadra-cell team-cell">
          ${logo ? `<img src="${logo}" alt="Logo ${nome}" class="logo-squadra">` : ""}
          <span class="team-name">${nome}</span>
        </td>
        <td>${punti}</td>
        <td>${pg}</td>
        <td>${v}</td>
        <td>${s}</td>
      `;
      fragment.appendChild(tr);
    });

    // Sostituzione atomica (NO SCATTO)
    tbody.replaceChildren(fragment);

    // Stato 'active'
    $$(".filter-buttons button").forEach(b => b.classList.remove("active"));
    if (bottoneAttivo) bottoneAttivo.classList.add("active");

  } catch (err) {
    console.error("Errore nel caricamento della classifica:", err);
    if (tbody) tbody.innerHTML = `<tr><td colspan="6">Impossibile caricare la classifica.</td></tr>`;
  } finally {
    tbody.classList.remove("table-loading");
  }
}
