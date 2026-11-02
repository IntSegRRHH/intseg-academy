/**
 * IntSeg Academy — capacitador.js
 * Vista del capacitador: sesiones de capacitación en aula.
 * Flujo: crear sesión → asistencia → presentación → evaluación → evidencia.
 * Depende de: cursos.js (COURSE_CONTENT, QUIZZES), datos.js (DB), app.js (navigate, openSlides, startQuiz, toast).
 */
const TR = (() => {
  const CALIF_MIN = 8; // aprobatoria sobre 10
  let sesion = null;   // sesión abierta en pantalla
  let paso = "asistencia";
  let pantalla = "lista";

  const $root = () => document.getElementById("trainerRoot");
  const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const hoy = () => new Date().toISOString().slice(0, 10);
  const horaAhora = () => new Date().toTimeString().slice(0, 5);
  const fechaLarga = (f) => (f ? new Date(f + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" }) : "—");
  const presentes = (s) => s.participantes.filter((p) => p.presente);
  const evaluados = (s) => presentes(s).filter((p) => p.calificacion !== null && p.calificacion !== "");
  const aprobado = (p) => Number(p.calificacion) >= CALIF_MIN;
  const cerrada = () => sesion?.estado === "cerrada";

  const ICON = {
    back: '<svg viewBox="0 0 24 24" class="icon"><path d="M15.5 5l-7 7 7 7 1.5-1.5L11.5 12 17 6.5 15.5 5z"/></svg>',
    cam: '<svg viewBox="0 0 24 24"><path d="M9 3 7.2 5H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3.2L15 3H9zm3 5a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
    del: '<svg viewBox="0 0 24 24"><path d="M6 7h12l-1 14H7L6 7zm3-4h6l1 2h4v2H4V5h4l1-2z"/></svg>',
  };

  async function guardar() {
    try {
      await DB.guardarSesion(sesion);
    } catch (e) {
      toast("No se pudo guardar. Revisa el espacio del equipo.");
    }
  }

  // ── Lista de sesiones ─────────────────────────────────────
  async function mostrarLista() {
    pantalla = "lista";
    sesion = null;
    navigate("trainer");
    const lista = await DB.listarSesiones();
    const tarjetas = lista.length
      ? lista
          .map((s) => {
            const pr = presentes(s).length;
            const ap = presentes(s).filter(aprobado).length;
            return `<button class="trCard" data-abrir="${esc(s.id)}">
              <div class="trCard__top">
                <span class="trEstado trEstado--${s.estado}">${s.estado === "cerrada" ? "Cerrada" : "En curso"}</span>
                <span class="trCard__fecha">${esc(fechaLarga(s.fecha))}</span>
              </div>
              <div class="trCard__titulo">${esc(s.cursoTitulo)}</div>
              <div class="trCard__meta">${esc(s.sede || "Sin sede")}${s.lugar ? " — " + esc(s.lugar) : ""}</div>
              <div class="trCard__nums"><span><b>${pr}</b> asistentes</span><span><b>${ap}</b> aprobados</span><span><b>${s.fotos.length}</b> fotos</span></div>
            </button>`;
          })
          .join("")
      : `<div class="trVacio"><p>Todavía no hay sesiones.</p><p>Crea una para pasar lista, proyectar el curso y registrar calificaciones.</p></div>`;

    $root().innerHTML = `
      <header class="topbar"><div class="topbar__left"><div class="topbar__title">Sesiones de capacitación</div></div>
        <button class="btnPrimary" data-tr="nueva">+ Nueva sesión</button></header>
      <div class="page-content trPage">${tarjetas}</div>`;
  }

  // ── Nueva sesión ──────────────────────────────────────────
  function mostrarNueva() {
    pantalla = "nueva";
    navigate("trainer");
    const opciones = Object.entries(COURSE_CONTENT)
      .map(([k, c]) => `<option value="${k}">${esc(c.title)}</option>`)
      .join("");
    $root().innerHTML = `
      <header class="topbar"><div class="topbar__left">
        <button class="iconBtn" data-tr="lista" aria-label="Regresar">${ICON.back}</button>
        <div class="topbar__title">Nueva sesión</div></div></header>
      <div class="page-content trPage trForm">
        <label class="editLabel" for="nsCurso">Curso</label>
        <select class="editInput" id="nsCurso">${opciones}</select>
        ${(() => { const act = INSTRUCTORES.filter((i) => i.activo); if (!act.length) return ""; const pre = INSTRUCTORES.find((i) => i.perfil_id && i.perfil_id === currentUser?.id) || act[0]; return `<label class="editLabel" for="nsInstructor">Instructor</label><select class="editInput" id="nsInstructor">${act.map((i) => `<option value="${esc(i.id)}" ${pre && pre.id === i.id ? "selected" : ""}>${esc(i.nombre)}</option>`).join("")}</select>`; })()}
        <label class="editLabel" for="nsSede">Cliente / sede</label>
        <input class="editInput" id="nsSede" placeholder="Ej. Planta Rosarito"/>
        <label class="editLabel" for="nsLugar">Lugar</label>
        <input class="editInput" id="nsLugar" placeholder="Ej. Sala de capacitación"/>
        <div class="trForm__fila">
          <div><label class="editLabel" for="nsFecha">Fecha</label><input class="editInput" id="nsFecha" type="date" value="${hoy()}"/></div>
          <div><label class="editLabel" for="nsHora">Hora de inicio</label><input class="editInput" id="nsHora" type="time" value="${horaAhora()}"/></div>
        </div>
        <button class="btnPrimaryWide" data-tr="crear">Crear sesión</button>
      </div>`;
  }

  async function crear() {
    const key = document.getElementById("nsCurso").value;
    const c = COURSE_CONTENT[key];
    sesion = {
      id: DB.nuevoId("s"),
      cursoKey: key,
      cursoTitulo: c.title,
      sede: document.getElementById("nsSede").value.trim(),
      lugar: document.getElementById("nsLugar").value.trim(),
      fecha: document.getElementById("nsFecha").value || hoy(),
      horaInicio: document.getElementById("nsHora").value,
      duracion: c.duration,
      capacitador: (() => { const s = document.getElementById("nsInstructor"); return s ? s.options[s.selectedIndex].text : (currentUser?.nombre || ""); })(),
      capacitadorUser: currentUser?.user || "",
      estado: "abierta",
      columnaBotas: false,
      lista: null,
      participantes: [],
      fotos: [],
      creada: new Date().toISOString(),
      cerrada: null,
    };
    await guardar();
    abrir(sesion.id, "asistencia");
  }

  // ── Sesión abierta ────────────────────────────────────────
  async function abrir(id, nuevoPaso) {
    if (!sesion || sesion.id !== id) sesion = await DB.obtenerSesion(id);
    if (!sesion) return mostrarLista();
    pantalla = "sesion";
    if (nuevoPaso) paso = nuevoPaso;
    navigate("trainer");
    render();
  }

  function render() {
    const s = sesion;
    const pr = presentes(s).length;
    const pasos = [
      ["asistencia", "Asistencia", pr],
      ["presentacion", "Presentación"],
      ["evaluacion", "Evaluación", `${evaluados(s).length}/${pr}`],
      ["evidencia", "Evidencia", s.fotos.length],
    ];
    const tabs = pasos
      .map(([k, t, n]) => `<button class="trTab ${paso === k ? "trTab--on" : ""}" data-paso="${k}">${t}${n !== undefined ? `<span class="trTab__n">${n}</span>` : ""}</button>`)
      .join("");
    const cuerpo = { asistencia: vAsistencia, presentacion: vPresentacion, evaluacion: vEvaluacion, evidencia: vEvidencia }[paso]();

    $root().innerHTML = `
      <header class="topbar"><div class="topbar__left">
        <button class="iconBtn" data-tr="lista" aria-label="Regresar a sesiones">${ICON.back}</button>
        <div class="topbar__title trTitulo">${esc(s.cursoTitulo)}</div></div>
        ${cerrada() ? "" : `<button class="trCamBtn" data-tr="foto" aria-label="Tomar foto de evidencia">${ICON.cam}<span>Foto</span></button>`}
      </header>
      <div class="page-content trPage">
        <div class="trMeta">
          <span>${esc(fechaLarga(s.fecha))}${s.horaInicio ? " · " + esc(s.horaInicio) : ""}</span>
          <span>${esc(s.sede || "Sin sede")}${s.lugar ? " — " + esc(s.lugar) : ""}</span>
          <span>Capacitador: ${esc(s.capacitador)}</span>
          ${cerrada() ? '<span class="trEstado trEstado--cerrada">Cerrada</span>' : ""}
        </div>
        <nav class="trTabs">${tabs}</nav>
        ${cuerpo}
      </div>`;
    if (paso === "asistencia" && !cerrada()) document.getElementById("paNum")?.focus();
  }

  // Asistencia
  function vAsistencia() {
    const s = sesion;
    const sugerencias = EMPLEADOS.todos()
      .map((e) => `<option value="${esc(e.nombre)}"></option>`)
      .join("");
    const filas = s.participantes.length
      ? s.participantes
          .map(
            (p, i) => `<div class="trFila ${p.presente ? "" : "trFila--ausente"}">
              <span class="trFila__i">${i + 1}</span>
              <div class="trFila__nombre"><b>${esc(p.nombre)}</b><small>No. ${esc(p.numEmpleado || "—")} · ${esc(p.servicio || "sin servicio")} · ${esc(p.puesto || "Guardia")}</small></div>
              ${s.columnaBotas ? `<button class="trMini ${p.botas === false ? "" : "trMini--on"}" data-botas="${p.id}" ${cerrada() ? "disabled" : ""} title="Revisión de botas">Botas: ${p.botas === false ? "No" : "Sí"}</button>` : ""}
              <button class="trMini ${p.enLinea ? "trMini--on" : ""}" data-enlinea="${p.id}" ${cerrada() ? "disabled" : ""} title="Marcar si tomó la capacitación en línea (en la firma sale &quot;En línea&quot;)">En línea</button>
              ${cerrada() ? "" : `<button class="trIcono" data-editarp="${p.id}" aria-label="Editar servicio y puesto de ${esc(p.nombre)}" title="Editar servicio y puesto">${ICON.edit || "✎"}</button>`}
              <button class="trToggle ${p.presente ? "trToggle--on" : ""}" data-presente="${p.id}" ${cerrada() ? "disabled" : ""}>${p.presente ? "Presente" : "Ausente"}</button>
              ${cerrada() ? "" : `<button class="trIcono" data-quitar="${p.id}" aria-label="Quitar a ${esc(p.nombre)}">${ICON.del}</button>`}
            </div>`
          )
          .join("")
      : `<div class="trVacio"><p>Agrega a los participantes con su número de empleado y nombre.</p></div>`;
    return `
      ${cerrada() ? "" : `<div class="trAlta">
        <input class="editInput" id="paNum" placeholder="No. empleado" inputmode="numeric" title="Teclea el número y presiona Enter: el nombre aparece solo"/>
        <input class="editInput" id="paNombre" placeholder="Nombre completo" list="paSug"/>
        <datalist id="paSug">${sugerencias}</datalist>
        <input class="editInput" id="paServicio" placeholder="Servicio / cliente" title="Servicio donde labora; sale en la lista de asistencia"/>
        <button class="btnPrimary" data-tr="agregar">Agregar</button>
      </div>`}
      <label class="trCheckBotas"><input type="checkbox" id="trBotas" ${s.columnaBotas ? "checked" : ""} ${cerrada() ? "disabled" : ""}/> Incluir la columna «Botas» (revisión de calzado) en la lista de asistencia</label>
      <div class="trResumen">${presentes(s).length} presentes de ${s.participantes.length} registrados</div>
      <div class="trLista">${filas}</div>`;
  }

  async function agregar() {
    const num = document.getElementById("paNum");
    const nom = document.getElementById("paNombre");
    const nombre = nom.value.trim();
    if (!nombre) {
      toast("Escribe el nombre del participante");
      nom.focus();
      return;
    }
    const numEmpleado = num.value.trim();
    if (numEmpleado && sesion.participantes.some((p) => p.numEmpleado === numEmpleado)) {
      toast("Ese número de empleado ya está en la lista");
      return;
    }
    sesion.participantes.push({ id: DB.nuevoId("p"), numEmpleado, nombre, servicio: (document.getElementById("paServicio")?.value || "").trim(), puesto: "Guardia", enLinea: false, botas: true, presente: true, calificacion: null, origen: null });
    await guardar();
    render();
  }

  // Mismo flujo que IntsegWeb: se teclea el número y el nombre sale del directorio de empleados
  async function buscarPorNumero() {
    const num = document.getElementById("paNum").value.trim();
    const nom = document.getElementById("paNombre");
    if (!num) return nom.focus();
    const emp = await EMPLEADOS.buscar(num);
    if (emp) {
      nom.value = emp.nombre;
      const sv = document.getElementById("paServicio"); if (sv && !sv.value.trim()) sv.value = emp.area || "";   // el área del directorio sale como servicio
      agregar();
    } else {
      toast("Número no encontrado. Escribe el nombre a mano.");
      nom.focus();
    }
  }

  // Presentación
  function vPresentacion() {
    const c = COURSE_CONTENT[sesion.cursoKey];
    const temas = c.modules.map((m, i) => `<button class="trTema" data-proyectar="${i}"><span>${i + 1}</span>${esc(m.title)}</button>`).join("");
    return `
      <div class="trProyectar">
        <button class="trProyectar__btn" data-proyectar="0">${ICON.play}<span>Proyectar curso completo</span></button>
        <p>Usa las flechas del teclado o los botones para avanzar. Al terminar regresas a esta sesión.</p>
      </div>
      <div class="trSub">O empieza desde un tema</div>
      <div class="trTemas">${temas}</div>`;
  }

  function proyectar(idx) {
    openSlides(sesion.cursoKey, idx, {
      modoCapacitador: true, // en aula puede adelantar el video y avanzar sin terminarlo
      textoFinal: "Terminar",
      alTerminar: () => {
        paso = "evaluacion";
        render();
      },
    });
  }

  // Evaluación
  function vEvaluacion() {
    const lista = presentes(sesion);
    if (!lista.length) return `<div class="trVacio"><p>Primero registra la asistencia.</p></div>`;
    const sinBanco = !QUIZZES[sesion.cursoKey];
    const filas = lista
      .map((p) => {
        const tiene = p.calificacion !== null && p.calificacion !== "";
        const estado = tiene ? (aprobado(p) ? '<span class="trChip trChip--ok">Aprobado</span>' : '<span class="trChip trChip--no">No aprobado</span>') : '<span class="trChip">Pendiente</span>';
        return `<div class="trFila">
          <div class="trFila__nombre"><b>${esc(p.nombre)}</b><small>No. ${esc(p.numEmpleado || "—")}${p.origen === "equipo" ? " · aplicada en equipo" : ""}</small></div>
          <input class="trCalif" type="number" min="0" max="10" step="1" inputmode="numeric" value="${tiene ? esc(p.calificacion) : ""}" data-calif="${p.id}" aria-label="Calificación de ${esc(p.nombre)}" ${cerrada() ? "disabled" : ""}/>
          ${estado}
          ${cerrada() || sinBanco ? "" : `<button class="btnNavy trAplicar" data-aplicar="${p.id}">Aplicar aquí</button>`}
        </div>`;
      })
      .join("");
    return `
      <p class="trAyuda">Captura la calificación del examen en papel (0 a 10) o usa <b>Aplicar aquí</b> para que el guardia responda en este equipo. Aprobatoria: ${CALIF_MIN}.</p>
      <div class="trLista">${filas}</div>`;
  }

  async function guardarCalif(id, valor) {
    const p = sesion.participantes.find((x) => x.id === id);
    if (!p) return;
    if (valor === "") p.calificacion = null;
    else {
      const n = Math.max(0, Math.min(10, Math.round(Number(valor))));
      p.calificacion = n;
    }
    p.origen = p.calificacion === null ? null : "manual";
    await guardar();
    // Actualiza solo la fila para no perder el foco al capturar en serie
    const input = document.querySelector(`[data-calif="${id}"]`);
    if (input) {
      input.value = p.calificacion ?? "";
      const chip = input.parentElement.querySelector(".trChip");
      const tiene = p.calificacion !== null;
      chip.className = "trChip" + (tiene ? (aprobado(p) ? " trChip--ok" : " trChip--no") : "");
      chip.textContent = tiene ? (aprobado(p) ? "Aprobado" : "No aprobado") : "Pendiente";
      const n = document.querySelector('[data-paso="evaluacion"] .trTab__n');
      if (n) n.textContent = `${evaluados(sesion).length}/${presentes(sesion).length}`;
    }
  }

  function aplicar(id) {
    const p = sesion.participantes.find((x) => x.id === id);
    startQuiz({
      cursoKey: sesion.cursoKey,
      nombre: p.nombre,
      alTerminar: async (score) => {
        p.calificacion = score;
        p.origen = "equipo";
        await guardar();
      },
    });
  }

  // Evidencia
  function vEvidencia() {
    const s = sesion;
    const pr = presentes(s).length;
    const ev = evaluados(s).length;
    const checks = [
      [pr > 0, `Asistencia registrada (${pr})`],
      [pr > 0 && ev === pr, `Calificaciones completas (${ev}/${pr})`],
      [s.fotos.length > 0, `Fotos de evidencia (${s.fotos.length})`],
    ];
    const fotos = s.fotos.length
      ? s.fotos
          .map(
            (f) => `<figure class="trFoto"><img src="${f.data}" alt="Foto de evidencia" data-ver="${f.id}"/>
            ${cerrada() ? "" : `<button class="trFoto__del" data-borrarfoto="${f.id}" aria-label="Eliminar foto">${ICON.del}</button>`}</figure>`
          )
          .join("")
      : "";
    return `
      <div class="trChecks">${checks.map(([ok, t]) => `<div class="trCheck ${ok ? "trCheck--ok" : ""}">${ok ? "✓" : "•"} ${t}</div>`).join("")}</div>
      <div class="trSub">Fotos</div>
      <div class="trFotos">${fotos}${cerrada() ? "" : `<button class="trFotoAdd" data-tr="foto">${ICON.cam}<span>Tomar foto</span></button>`}</div>
      <div class="trSub">Datos de la lista de asistencia <span class="trCodigo">${LISTA_CODIGO}</span></div>
      ${panelLista()}
      <div class="trSub">Documentos</div>
      <div class="trAcciones">
        <button class="btnNavy" data-tr="oficial">Lista de asistencia (formato oficial)</button>
        <button class="btnSecondaryWide trAccion" data-tr="imprimir">Resultados y evidencia fotográfica</button>
        <button class="btnSecondaryWide trAccion" data-tr="csv">Exportar CSV</button>
      </div>
      ${
        cerrada()
          ? `<p class="trAyuda">Sesión cerrada el ${esc(new Date(s.cerrada).toLocaleString("es-MX"))}. Ya no admite cambios.</p>`
          : `<div class="trCierre"><button class="btnPrimaryWide" data-tr="cerrar">Cerrar sesión</button>
             <p class="trAyuda">Al cerrar, la asistencia y las calificaciones quedan bloqueadas.</p></div>`
      }
      <button class="trEliminar" data-tr="eliminar">Eliminar sesión</button>`;
  }

  // Cámara: reduce la foto antes de guardarla
  function pedirFoto() {
    const input = document.getElementById("trCamara");
    input.value = "";
    input.click();
  }

  function procesarFoto(file) {
    if (!file || !sesion) return;
    const lector = new FileReader();
    lector.onload = () => {
      const img = new Image();
      img.onload = async () => {
        const max = 1280;
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const cv = document.createElement("canvas");
        cv.width = Math.round(img.width * k);
        cv.height = Math.round(img.height * k);
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        sesion.fotos.push({ id: DB.nuevoId("f"), data: cv.toDataURL("image/jpeg", 0.72), fecha: new Date().toISOString() });
        await guardar();
        toast("Foto agregada a la evidencia");
        render();
      };
      img.src = lector.result;
    };
    lector.readAsDataURL(file);
  }

  async function cerrar() {
    const pr = presentes(sesion).length;
    const faltan = pr - evaluados(sesion).length;
    let msg = "¿Cerrar la sesión? Ya no podrás modificar asistencia ni calificaciones.";
    if (!pr) msg = "La sesión no tiene asistentes. ¿Cerrarla de todos modos?";
    else if (faltan) msg = `Faltan ${faltan} calificaciones. ¿Cerrar de todos modos?`;
    if (!confirm(msg)) return;
    sesion.estado = "cerrada";
    sesion.cerrada = new Date().toISOString();
    await guardar();
    render();
    toast("Sesión cerrada");
  }

  async function eliminar() {
    if (!confirm("¿Eliminar esta sesión con su asistencia, calificaciones y fotos? No se puede deshacer.")) return;
    await DB.eliminarSesion(sesion.id);
    toast("Sesión eliminada");
    mostrarLista();
  }

  // Datos del formato oficial: salen del curso, y se pueden ajustar para esta sesión
  function datosLista(s) {
    const base = listaDelCurso(s.cursoKey), l = s.lista || {};
    return {
      tema: l.tema ?? base.tema, objetivos: l.objetivos ?? base.objetivos, observaciones: l.observaciones ?? "",
      responsable: l.responsable ?? s.capacitador, puesto: l.puesto ?? LISTA_AREA,
    };
  }
  function panelLista() {
    const d = datosLista(sesion), dis = cerrada() ? "disabled" : "";
    return `<div class="trLista2">
      <label class="editLabel">Tema</label><textarea class="editTextarea" rows="2" data-lista="tema" ${dis}>${esc(d.tema)}</textarea>
      <label class="editLabel">Objetivos</label><textarea class="editTextarea" rows="3" data-lista="objetivos" ${dis}>${esc(d.objetivos)}</textarea>
      <label class="editLabel">Observaciones</label><textarea class="editTextarea" rows="2" data-lista="observaciones" placeholder="Opcional" ${dis}>${esc(d.observaciones)}</textarea>
      <div class="trDos"><div><label class="editLabel">Responsable (nombre)</label><input class="editInput" data-lista="responsable" value="${esc(d.responsable)}" ${dis}/></div>
      <div><label class="editLabel">Responsable (puesto)</label><input class="editInput" data-lista="puesto" value="${esc(d.puesto)}" ${dis}/></div></div>
    </div>`;
  }

  // Lista de asistencia en el formato oficial SPGIP-FO-050 (una hoja por cada 20 participantes)
  function imprimirOficial() {
    const s = sesion, d = datosLista(s);
    const lista = s.participantes.filter((p) => p.presente);
    if (!lista.length) { toast("Registra al menos un participante presente"); return; }
    const hojas = []; for (let i = 0; i < lista.length; i += LISTA_FILAS_POR_HOJA) hojas.push(lista.slice(i, i + LISTA_FILAS_POR_HOJA));
    const botas = !!s.columnaBotas, col = botas ? 5 : 4;
    const lineas = (t) => esc(t).replace(/\n/g, "<br/>");
    const obs = String(d.observaciones || "").trim();
    const hoja = (grupo) => {
      const filas = grupo.map((p) => `<tr>${botas ? `<td class="c">${p.botas === false ? "No" : "Si"}</td>` : ""}<td>${esc(p.nombre)}</td><td>${esc(p.servicio || "")}</td><td>${esc(p.puesto || "Guardia")}</td><td class="c">${p.enLinea ? "En línea" : ""}</td></tr>`);
      while (filas.length < LISTA_FILAS_POR_HOJA) filas.push(`<tr>${botas ? "<td></td>" : ""}<td></td><td></td><td></td><td></td></tr>`);
      return `<section class="fo">
        <div class="fo__titulo"><span>LISTA DE ASISTENCIA</span></div>
        <div class="fo__datos">
          <span class="fo__et">FECHA</span><span class="fo__caja fo__caja--fecha">${esc(fechaLarga(s.fecha))}</span>
          <span class="fo__et">EMPRESA</span><span class="fo__caja">${esc(LISTA_EMPRESA)}</span>
          <span class="fo__et">ÁREA</span><span class="fo__caja fo__caja--area">${esc(LISTA_AREA)}</span>
        </div>
        <div class="fo__tema"><span class="fo__et">TEMA:</span><div class="fo__temaCaja">${lineas(d.tema)}</div></div>
        <div class="fo__obj"><span class="fo__et">OBJETIVOS</span><div class="fo__objTexto">${lineas(d.objetivos)}</div></div>
        <table class="fo__tabla">
          <thead><tr><th colspan="${col}" class="fo__banda">A&nbsp; S&nbsp; I&nbsp; S&nbsp; T&nbsp; E&nbsp; N&nbsp; C&nbsp; I&nbsp; A</th></tr>
            <tr class="fo__cols">${botas ? "<th>Botas</th>" : ""}<th>NOMBRE</th><th>SERVICIO</th><th>PUESTO</th><th>FIRMA</th></tr></thead>
          <tbody>${filas.join("")}</tbody>
        </table>
        <table class="fo__pie">
          <tr><th>OBSERVACIONES</th><th colspan="2">RESPONSABLE</th></tr>
          <tr><td rowspan="3" class="fo__obs">${obs ? lineas(obs) : ""}</td><td class="fo__lbl">NOMBRE:</td><td class="fo__val">${esc(d.responsable)}</td></tr>
          <tr><td class="fo__lbl">PUESTO:</td><td class="fo__val">${esc(d.puesto)}</td></tr>
          <tr><td class="fo__lbl">FIRMA:</td><td class="fo__val"></td></tr>
        </table>
        <div class="fo__codigo">${esc(LISTA_CODIGO)}</div>
      </section>`;
    };
    document.getElementById("printArea").innerHTML = hojas.map(hoja).join("");
    imprimirConPagina("oficial");
  }
  // La hoja oficial lleva sus propios márgenes (los del documento original de Word)
  function imprimirConPagina(tipo) {
    const st = document.createElement("style"); st.id = "pageOficial";
    st.textContent = tipo === "oficial" ? "@page{size:letter;margin:20mm 14mm 14mm 17mm;}" : "";
    document.head.appendChild(st);
    const quitar = () => { document.getElementById("pageOficial")?.remove(); window.removeEventListener("afterprint", quitar); };
    window.addEventListener("afterprint", quitar);
    setTimeout(() => window.print(), 150);
  }

  // Resultados y evidencia (se guarda como PDF desde el diálogo de impresión)
  function imprimir() {
    const s = sesion;
    const filas = s.participantes
      .map((p, i) => {
        const tiene = p.presente && p.calificacion !== null && p.calificacion !== "";
        return `<tr><td>${i + 1}</td><td>${esc(p.numEmpleado)}</td><td>${esc(p.nombre)}</td>
          <td>${p.presente ? "Presente" : "Ausente"}</td><td>${tiene ? esc(p.calificacion) : "—"}</td>
          <td>${tiene ? (aprobado(p) ? "Aprobado" : "No aprobado") : "—"}</td><td class="firma"></td></tr>`;
      })
      .join("");
    const logo = document.querySelector(".sidebar__logo img")?.getAttribute("src") || "";
    document.getElementById("printArea").innerHTML = `
      <div class="pr">
        <div class="pr__head">${logo ? `<img src="${logo}" alt=""/>` : ""}<div><h1>Lista de asistencia y resultados</h1><p>Grupo IntSeg — IntSeg Academy</p></div></div>
        <table class="pr__datos">
          <tr><th>Curso</th><td>${esc(s.cursoTitulo)}</td><th>Duración</th><td>${esc(s.duracion || "—")}</td></tr>
          <tr><th>Fecha</th><td>${esc(fechaLarga(s.fecha))}</td><th>Hora de inicio</th><td>${esc(s.horaInicio || "—")}</td></tr>
          <tr><th>Cliente / sede</th><td>${esc(s.sede || "—")}</td><th>Lugar</th><td>${esc(s.lugar || "—")}</td></tr>
          <tr><th>Capacitador</th><td colspan="3">${esc(s.capacitador)}</td></tr>
        </table>
        <table class="pr__tabla">
          <thead><tr><th>#</th><th>No. empleado</th><th>Nombre</th><th>Asistencia</th><th>Calif.</th><th>Resultado</th><th>Firma</th></tr></thead>
          <tbody>${filas || '<tr><td colspan="7">Sin participantes</td></tr>'}</tbody>
        </table>
        <p class="pr__nota">Calificación aprobatoria: ${CALIF_MIN}/10. Presentes: ${presentes(s).length}. Aprobados: ${presentes(s).filter(aprobado).length}.</p>
        ${s.fotos.length ? `<h2>Evidencia fotográfica</h2><div class="pr__fotos">${s.fotos.map((f) => `<img src="${f.data}" alt=""/>`).join("")}</div>` : ""}
        <div class="pr__firmas"><div><span></span>${esc(s.capacitador)}<br/>Capacitador</div><div><span></span>Nombre y firma<br/>Supervisor / cliente</div></div>
      </div>`;
    setTimeout(() => window.print(), 150);
  }

  function exportarCSV() {
    const s = sesion;
    const enc = ["fecha", "curso", "sede", "lugar", "capacitador", "num_empleado", "nombre", "asistencia", "calificacion", "resultado", "origen", "servicio", "puesto", "en_linea"];
    const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const filas = s.participantes.map((p) => {
      const tiene = p.presente && p.calificacion !== null && p.calificacion !== "";
      return [s.fecha, s.cursoTitulo, s.sede, s.lugar, s.capacitador, p.numEmpleado, p.nombre, p.presente ? "presente" : "ausente", tiene ? p.calificacion : "", tiene ? (aprobado(p) ? "aprobado" : "no aprobado") : "", p.origen || "", p.servicio || "", p.puesto || "Guardia", p.enLinea ? "si" : "no"].map(q).join(",");
    });
    const csv = "\ufeff" + [enc.join(","), ...filas].join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `sesion_${s.cursoKey}_${s.fecha}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // ── Eventos ───────────────────────────────────────────────
  document.addEventListener("change", async (e) => {
    if (!sesion || !e.target.closest("#viewTrainer")) return;
    if (e.target.id === "trBotas") { sesion.columnaBotas = e.target.checked; await guardar(); render(); return; }
    const k = e.target.dataset?.lista;
    if (k) { sesion.lista = { ...(sesion.lista || datosLista(sesion)), [k]: e.target.value }; await guardar(); }
  });
  document.addEventListener("click", async (e) => {
    if (!e.target.closest("#viewTrainer")) return;
    const t = (sel) => e.target.closest(sel);
    let el;
    if ((el = t("[data-tr]"))) {
      const a = el.dataset.tr;
      if (a === "nueva") mostrarNueva();
      else if (a === "lista") mostrarLista();
      else if (a === "crear") crear();
      else if (a === "agregar") agregar();
      else if (a === "foto") pedirFoto();
      else if (a === "imprimir") imprimir();
      else if (a === "oficial") imprimirOficial();
      else if (a === "csv") exportarCSV();
      else if (a === "cerrar") cerrar();
      else if (a === "eliminar") eliminar();
    } else if ((el = t("[data-abrir]"))) abrir(el.dataset.abrir, "asistencia");
    else if ((el = t("[data-paso]"))) {
      paso = el.dataset.paso;
      render();
    } else if ((el = t("[data-presente]"))) {
      const p = sesion.participantes.find((x) => x.id === el.dataset.presente);
      p.presente = !p.presente;
      await guardar();
      render();
    } else if ((el = t("[data-enlinea]"))) {
      const p = sesion.participantes.find((x) => x.id === el.dataset.enlinea); p.enLinea = !p.enLinea; await guardar(); render();
    } else if ((el = t("[data-botas]"))) {
      const p = sesion.participantes.find((x) => x.id === el.dataset.botas); p.botas = p.botas === false; await guardar(); render();
    } else if ((el = t("[data-editarp]"))) {
      const p = sesion.participantes.find((x) => x.id === el.dataset.editarp);
      const sv = prompt(`Servicio de ${p.nombre}:`, p.servicio || ""); if (sv === null) return;
      const pu = prompt(`Puesto de ${p.nombre}:`, p.puesto || "Guardia"); if (pu === null) return;
      p.servicio = sv.trim(); p.puesto = pu.trim() || "Guardia"; await guardar(); render();
    } else if ((el = t("[data-quitar]"))) {
      const p = sesion.participantes.find((x) => x.id === el.dataset.quitar);
      if (!confirm(`¿Quitar a ${p.nombre} de la lista?`)) return;
      sesion.participantes = sesion.participantes.filter((x) => x.id !== p.id);
      await guardar();
      render();
    } else if ((el = t("[data-proyectar]"))) proyectar(Number(el.dataset.proyectar));
    else if ((el = t("[data-aplicar]"))) aplicar(el.dataset.aplicar);
    else if ((el = t("[data-borrarfoto]"))) {
      if (!confirm("¿Eliminar esta foto?")) return;
      sesion.fotos = sesion.fotos.filter((f) => f.id !== el.dataset.borrarfoto);
      await guardar();
      render();
    } else if ((el = t("[data-ver]"))) openLightbox(el.getAttribute("src"));
  });

  document.addEventListener("change", (e) => {
    if (e.target.matches("[data-calif]")) guardarCalif(e.target.dataset.calif, e.target.value.trim());
    if (e.target.id === "trCamara") procesarFoto(e.target.files[0]);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    if (e.target.id === "paNum") buscarPorNumero();
    else if (e.target.id === "paNombre") agregar();
    else if (e.target.matches("[data-calif]")) e.target.blur();
  });

  return {
    mostrarLista,
    volver: () => (sesion ? abrir(sesion.id, paso) : mostrarLista()),
  };
})();
