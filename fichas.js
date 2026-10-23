/**
 * IntSeg Academy — fichas.js
 * Ficha técnica de capacitación por guardia (para capacitador y administrador).
 * Junta dos fuentes y toma, por curso, la aprobación más reciente:
 *   1. Sesiones en aula del capacitador (datos.js → DB)
 *   2. Evaluaciones en línea del guardia (avance por usuario)
 * En producción, las tres fuentes se sustituyen por una consulta a IntsegWeb.
 */
const FICHAS = (() => {
  const CALIF_MIN = 8;
  const DIAS_AVISO = 30; // "por vencer" cuando faltan 30 días o menos
  const $root = () => document.getElementById("fichasRoot");
  const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (d) => (d ? new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "—");
  let busqueda = "";

  function sumarMeses(fecha, meses) {
    const d = new Date(fecha);
    const dia = d.getDate();
    d.setMonth(d.getMonth() + meses);
    if (d.getDate() < dia) d.setDate(0); // fin de mes
    return d;
  }

  function estatus(vence) {
    const dias = Math.ceil((vence - new Date()) / 86400000);
    if (dias < 0) return { clave: "vencido", texto: "Vencido", dias };
    if (dias <= DIAS_AVISO) return { clave: "porvencer", texto: `Vence en ${dias} día${dias === 1 ? "" : "s"}`, dias };
    return { clave: "vigente", texto: "Vigente", dias };
  }

  // Reúne todos los registros aprobados de todas las fuentes
  async function registros() {
    const out = [];
    // Datos frescos de Supabase cada vez que se abre la lista o una ficha
    await Promise.all([cargarUsuarios(), cargarProgresoTodos(), EMPLEADOS.cargar()]);
    const sesiones = await DB.listarSesiones();
    sesiones.forEach((s) =>
      s.participantes.forEach((p) => {
        if (!p.presente || p.calificacion === null || p.calificacion === "" || !p.numEmpleado) return;
        out.push({ num: String(p.numEmpleado), nombre: p.nombre, cursoKey: s.cursoKey, fecha: s.fecha + "T12:00:00", calificacion: Number(p.calificacion), modalidad: "Aula", capacitador: s.capacitador, sede: s.sede });
      })
    );
    getUsersDB()
      .filter((u) => u.role === "guardia" && u.numEmpleado)
      .forEach((u) => {
        const prog = getAllProgress(u.user);
        Object.entries(prog).forEach(([k, v]) => {
          if (!v || !v.date) return;
          out.push({ num: String(u.numEmpleado), nombre: u.nombre, cursoKey: k, fecha: v.date, calificacion: v.score, modalidad: "En línea", intentos: v.intentos });
        });
      });
    return out.filter((r) => COURSE_CONTENT[r.cursoKey]);
  }

  // Ficha de una persona: un renglón por curso del catálogo
  function armarFicha(num, regs) {
    const mios = regs.filter((r) => r.num === String(num));
    return Object.entries(COURSE_CONTENT).map(([key, c]) => {
      const delCurso = mios.filter((r) => r.cursoKey === key).sort((a, b) => b.fecha.localeCompare(a.fecha));
      const aprob = delCurso.find((r) => Number(r.calificacion) >= CALIF_MIN);
      if (!aprob) {
        const ultimo = delCurso[0];
        return { key, curso: c.title, categoria: c.badge, est: { clave: "pendiente", texto: ultimo ? "No aprobado" : "Pendiente" }, calificacion: ultimo ? ultimo.calificacion : null, fecha: ultimo ? ultimo.fecha : null };
      }
      const vence = sumarMeses(aprob.fecha, c.vigenciaMeses || 12);
      return { key, curso: c.title, categoria: c.badge, fecha: aprob.fecha, calificacion: aprob.calificacion, modalidad: aprob.modalidad, vence, est: estatus(vence) };
    });
  }

  const TXT = { vigente: ["vigente", "vigentes"], porvencer: ["por vencer", "por vencer"], vencido: ["vencido", "vencidos"], pendiente: ["pendiente", "pendientes"] };
  const cuenta = (n, k) => `${n} ${TXT[k][n === 1 ? 0 : 1]}`;
  function resumen(ficha) {
    const n = { vigente: 0, porvencer: 0, vencido: 0, pendiente: 0 };
    ficha.forEach((f) => n[f.est.clave]++);
    return n;
  }

  async function personas(regs) {
    const mapa = new Map();
    EMPLEADOS.todos().forEach((e) => mapa.set(e.num, { num: e.num, nombre: e.nombre, area: e.area }));
    regs.forEach((r) => { if (!mapa.has(r.num)) mapa.set(r.num, { num: r.num, nombre: r.nombre || "Sin nombre", area: "—" }); });
    return [...mapa.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }

  // ── Lista de guardias ───────────────────────────────────────
  async function mostrarLista() {
    navigate("fichas");
    const regs = await registros();
    const gente = await personas(regs);
    const q = busqueda.toLowerCase();
    const filas = gente
      .filter((p) => !q || p.nombre.toLowerCase().includes(q) || p.num.includes(q))
      .map((p) => {
        const n = resumen(armarFicha(p.num, regs));
        const chip = (k) => (n[k] ? `<span class="fiChip fiChip--${k}">${cuenta(n[k], k)}</span>` : "");
        return `<button class="fiFila" data-ficha="${esc(p.num)}">
          <div class="fiFila__nombre"><b>${esc(p.nombre)}</b><small>No. ${esc(p.num)} · ${esc(p.area)}</small></div>
          <div class="fiFila__chips">${chip("vigente")}${chip("porvencer")}${chip("vencido")}${chip("pendiente")}</div>
          <span class="fiFila__ir" aria-hidden="true">›</span>
        </button>`;
      })
      .join("");
    $root().innerHTML = `
      <header class="topbar"><div class="topbar__left"><div class="topbar__title">Fichas técnicas</div></div>
        <button class="btnSecondaryWide fiCsv" data-fi="csv">Exportar todo (CSV)</button></header>
      <div class="page-content fiPage">
        <input class="editInput fiBuscar" id="fiBuscar" placeholder="Buscar por nombre o número de empleado" value="${esc(busqueda)}"/>
        <div class="fiLista">${filas || '<div class="trVacio"><p>Sin resultados.</p></div>'}</div>
      </div>`;
  }

  // ── Ficha de un guardia ────────────────────────────────────
  async function mostrarFicha(num) {
    navigate("fichas");
    const regs = await registros();
    const gente = await personas(regs);
    const p = gente.find((x) => x.num === String(num));
    const ficha = armarFicha(num, regs);
    const n = resumen(ficha);
    const filas = ficha
      .map((f) => `<tr>
        <td class="fiTd--curso"><b>${esc(f.curso)}</b><small>${esc(f.categoria)}</small></td>
        <td data-label="Lo tomó">${fmt(f.fecha)}${f.modalidad ? `<small>${esc(f.modalidad)}</small>` : ""}</td>
        <td data-label="Calificación">${f.calificacion ?? "—"}</td>
        <td data-label="Vence">${f.vence ? fmt(f.vence) : "—"}</td>
        <td class="fiTd--estatus"><span class="fiChip fiChip--${f.est.clave}">${esc(f.est.texto)}</span></td>
      </tr>`)
      .join("");
    $root().innerHTML = `
      <header class="topbar"><div class="topbar__left">
        <button class="iconBtn" data-fi="lista" aria-label="Regresar a la lista"><svg viewBox="0 0 24 24" class="icon"><path d="M15.5 5l-7 7 7 7 1.5-1.5L11.5 12 17 6.5 15.5 5z"/></svg></button>
        <div class="topbar__title">Ficha técnica</div></div></header>
      <div class="page-content fiPage">
        <div class="fiCabecera">
          <div><div class="fiNombre">${esc(p.nombre)}</div><div class="fiMeta">No. de empleado ${esc(p.num)} · ${esc(p.area)}</div></div>
          <div class="fiResumen">
            ${["vigente", "porvencer", "vencido", "pendiente"].map((k) => `<span class="fiChip fiChip--${k}">${cuenta(n[k], k)}</span>`).join("")}
          </div>
        </div>
        <div class="fiTablaWrap"><table class="fiTabla">
          <thead><tr><th>Curso</th><th>Lo tomó</th><th>Calif.</th><th>Vence</th><th>Estatus</th></tr></thead>
          <tbody>${filas}</tbody>
        </table></div>
        <div class="fiAcciones">
          <button class="btnPrimaryWide" data-fi="pdf" data-num="${esc(p.num)}">Descargar ficha (PDF)</button>
        </div>
        <p class="trAyuda">Vigencia de ${COURSE_CONTENT.dc3?.vigenciaMeses || 12} meses por curso a partir de la fecha de aprobación. "Por vencer" = ${DIAS_AVISO} días o menos.</p>
      </div>`;
  }

  async function imprimir(num) {
    const regs = await registros();
    const gente = await personas(regs);
    const p = gente.find((x) => x.num === String(num));
    const ficha = armarFicha(num, regs);
    const n = resumen(ficha);
    const logo = document.querySelector(".sidebar__logo img")?.getAttribute("src") || "";
    const quien = currentUser?.nombre || "";
    document.getElementById("printArea").innerHTML = `
      <div class="pr">
        <div class="pr__head">${logo ? `<img src="${logo}" alt=""/>` : ""}<div><h1>Ficha técnica de capacitación</h1><p>Grupo IntSeg — IntSeg Academy</p></div></div>
        <table class="pr__datos">
          <tr><th>Nombre</th><td>${esc(p.nombre)}</td><th>No. de empleado</th><td>${esc(p.num)}</td></tr>
          <tr><th>Área</th><td>${esc(p.area)}</td><th>Fecha de emisión</th><td>${fmt(new Date())}</td></tr>
          <tr><th>Resumen</th><td colspan="3">${["vigente", "porvencer", "vencido", "pendiente"].map((k) => cuenta(n[k], k)).join(" · ")}</td></tr>
        </table>
        <table class="pr__tabla">
          <thead><tr><th>Curso</th><th>Categoría</th><th>Fecha en que lo tomó</th><th>Modalidad</th><th>Calif.</th><th>Vence</th><th>Estatus</th></tr></thead>
          <tbody>${ficha.map((f) => `<tr><td>${esc(f.curso)}</td><td>${esc(f.categoria)}</td><td>${fmt(f.fecha)}</td><td>${esc(f.modalidad || "—")}</td><td>${f.calificacion ?? "—"}</td><td>${f.vence ? fmt(f.vence) : "—"}</td><td>${esc(f.est.texto)}</td></tr>`).join("")}</tbody>
        </table>
        <p class="pr__nota">Calificación aprobatoria: ${CALIF_MIN}/10. Vigencia contada a partir de la fecha de aprobación.</p>
        <div class="pr__firmas"><div><span></span>${esc(quien)}<br/>Elaboró</div><div><span></span>Nombre y firma<br/>Coordinación de Capacitación</div></div>
      </div>`;
    setTimeout(() => window.print(), 150);
  }

  async function exportarCSV() {
    const regs = await registros();
    const gente = await personas(regs);
    const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const enc = ["num_empleado", "nombre", "area", "curso", "fecha_tomado", "modalidad", "calificacion", "vence", "estatus"];
    const filas = [];
    gente.forEach((p) =>
      armarFicha(p.num, regs).forEach((f) =>
        filas.push([p.num, p.nombre, p.area, f.curso, f.fecha ? f.fecha.slice(0, 10) : "", f.modalidad || "", f.calificacion ?? "", f.vence ? f.vence.toISOString().slice(0, 10) : "", f.est.texto].map(q).join(","))
      )
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff" + [enc.join(","), ...filas].join("\r\n")], { type: "text/csv;charset=utf-8" }));
    a.download = `fichas_capacitacion_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
  }

  // ── Eventos ────────────────────────────────────────────────
  document.addEventListener("click", (e) => {
    if (!e.target.closest("#viewFichas")) return;
    let el;
    if ((el = e.target.closest("[data-ficha]"))) mostrarFicha(el.dataset.ficha);
    else if ((el = e.target.closest("[data-fi]"))) {
      const a = el.dataset.fi;
      if (a === "lista") mostrarLista();
      else if (a === "pdf") imprimir(el.dataset.num);
      else if (a === "csv") exportarCSV();
    }
  });
  let tBusq;
  document.addEventListener("input", (e) => {
    if (e.target.id !== "fiBuscar") return;
    busqueda = e.target.value;
    clearTimeout(tBusq);
    tBusq = setTimeout(async () => {
      const pos = e.target.selectionStart;
      await mostrarLista();
      const inp = document.getElementById("fiBuscar");
      inp.focus(); inp.setSelectionRange(pos, pos);
    }, 200);
  });

  return { mostrarLista, mostrarFicha, armarFicha, registros };
})();
