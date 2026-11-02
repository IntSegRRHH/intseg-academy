/**
 * IntSeg Academy — cursos-admin.js
 * Cursos en la nube y editor para administrador y capacitador, sin programar:
 * crear y editar cursos con temas, imágenes, videos con preguntas, PDF descargable y examen;
 * importar un PDF como diapositivas; pegar preguntas desde Excel; publicar u ocultar.
 *
 * Datos: tabla public.cursos y bucket público "cursos" de Supabase (migración 003).
 * Mientras la tabla esté vacía (o no exista) se usan los cursos incluidos en cursos.js.
 * Depende de: datos.js (sb), cursos.js (COURSE_CONTENT, QUIZZES), app.js (currentUser, esStaff, toast, loadDetail, navigate).
 */
const escHtml = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ═══ Módulos (clasificación de los cursos) ═══════════════════
 * Para agregar un módulo nuevo basta con sumar una línea a esta lista.
 * Cada curso guarda el número de su módulo en datos.modulo. */
const MODULOS = [
  { id: 1, nombre: "Humanístico" },
  { id: 2, nombre: "Operativo" },
  { id: 3, nombre: "Líderes 1a Etapa" },
  { id: 4, nombre: "Líderes 2a Etapa" },
];
const nombreModulo = (id) => { const m = MODULOS.find((x) => x.id === Number(id)); return m ? `Módulo ${m.id}: ${m.nombre}` : "Sin módulo"; };

/* ═══ Datos: carga, orden, publicación ═══════════════════════ */
const CURSOS = (() => {
  const INTEGRADOS = { c: JSON.parse(JSON.stringify(COURSE_CONTENT)), q: JSON.parse(JSON.stringify(QUIZZES)) };
  Object.values(INTEGRADOS.c).forEach((c) => { if (!c.modulo) c.modulo = 2; });   // los cursos incluidos son operativos
  let meta = {};          // clave -> { publicado, orden }
  let enBD = false;       // ya hay cursos en la base de datos
  let tabla = true;       // la tabla existe (migración 003 corrida)

  function vaciar() {
    Object.keys(COURSE_CONTENT).forEach((k) => delete COURSE_CONTENT[k]);
    Object.keys(QUIZZES).forEach((k) => delete QUIZZES[k]);
    meta = {};
  }
  function usarIntegrados() {
    vaciar();
    const c = JSON.parse(JSON.stringify(INTEGRADOS.c)), q = JSON.parse(JSON.stringify(INTEGRADOS.q));
    Object.keys(c).forEach((k, i) => { COURSE_CONTENT[k] = c[k]; QUIZZES[k] = q[k] || []; meta[k] = { publicado: true, orden: i * 10 }; });
  }

  async function cargar() {
    const { data, error } = await sb.from("cursos").select("key,datos,quiz,orden,publicado").order("orden").order("creado");
    if (error) { console.warn("cursos:", error.message); tabla = false; enBD = false; usarIntegrados(); return; }
    tabla = true;
    if (!data.length) { enBD = false; usarIntegrados(); return; }
    enBD = true; vaciar();
    data.forEach((f) => { COURSE_CONTENT[f.key] = f.datos; QUIZZES[f.key] = f.quiz || []; meta[f.key] = { publicado: f.publicado, orden: f.orden }; });
  }

  const claves = () => Object.keys(COURSE_CONTENT).sort((a, b) => (meta[a]?.orden ?? 0) - (meta[b]?.orden ?? 0));
  const modulo = (k) => Number(COURSE_CONTENT[k]?.modulo) || 0;
  // Para las listas: primero por módulo (los sin módulo al final) y dentro de cada uno por orden
  const clavesPorModulo = () => claves().sort((a, b) => ((modulo(a) || 99) - (modulo(b) || 99)) || ((meta[a]?.orden ?? 0) - (meta[b]?.orden ?? 0)));
  const esBorrador = (k) => meta[k]?.publicado === false;
  const visible = (k) => esStaff() || !esBorrador(k);

  async function importarIntegrados() {
    const filas = Object.keys(INTEGRADOS.c).map((k, i) => ({ key: k, datos: INTEGRADOS.c[k], quiz: INTEGRADOS.q[k] || [], orden: i * 10, publicado: true }));
    const { error } = await sb.from("cursos").upsert(filas, { onConflict: "key" });
    if (error) throw new Error(error.message);
    await cargar();
  }
  async function guardarFila(fila) {
    const { error } = await sb.from("cursos").upsert({ ...fila, actualizado: new Date().toISOString() }, { onConflict: "key" });
    if (error) throw new Error(error.message);
  }
  async function publicar(key, valor) {
    const { error } = await sb.from("cursos").update({ publicado: valor, actualizado: new Date().toISOString() }).eq("key", key);
    if (error) throw new Error(error.message);
  }
  async function mover(key, dir) {
    const todas = clavesPorModulo(); const grupo = todas.filter((k) => modulo(k) === modulo(key));
    const i = grupo.indexOf(key), j = i + dir;
    if (j < 0 || j >= grupo.length) return;
    const a = todas.indexOf(grupo[i]), b = todas.indexOf(grupo[j]);
    [todas[a], todas[b]] = [todas[b], todas[a]];
    for (const [n, k] of todas.entries()) {
      if ((meta[k]?.orden ?? -1) === n * 10) continue;
      const { error } = await sb.from("cursos").update({ orden: n * 10 }).eq("key", k);
      if (error) throw new Error(error.message);
    }
  }
  async function eliminar(key) {
    const { error } = await sb.from("cursos").delete().eq("key", key);
    if (error) throw new Error(error.message);
    // archivos del curso (mejor esfuerzo)
    try {
      const rutas = [];
      for (const sub of ["", "/slides", "/imgs", "/video", "/pdf", "/portada"]) {
        const { data } = await sb.storage.from("cursos").list(key + sub);
        (data || []).filter((f) => f.id).forEach((f) => rutas.push(`${key}${sub}/${f.name}`));
      }
      if (rutas.length) await sb.storage.from("cursos").remove(rutas);
    } catch (e) { /* los archivos sueltos no impiden borrar el curso */ }
  }

  return { cargar, claves, clavesPorModulo, modulo, esBorrador, visible, importarIntegrados, guardarFila, publicar, mover, eliminar,
           enBD: () => enBD, tabla: () => tabla, orden: (k) => meta[k]?.orden ?? 0, maxOrden: () => Math.max(-10, ...Object.values(meta).map((m) => m.orden)) };
})();

/* ═══ Editor (pestaña Admin → Cursos) ════════════════════════ */
const CURSOS_ADMIN = (() => {
  const $ = (id) => document.getElementById(id);
  const esc = escHtml;
  const pl = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
  const MAX_VIDEO_MB = 50;
  let ED = null;          // borrador en edición: { key, nuevo, publicado, orden, datos, quiz }

  /* ── utilidades ── */
  const copia = (o) => JSON.parse(JSON.stringify(o));
  const seguro = (n) => String(n).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_");
  function cargarScript(src) {
    return new Promise((ok, mal) => {
      if ([...document.scripts].some((s) => s.src.endsWith(src))) return ok();
      const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => mal(new Error("No se pudo cargar " + src)); document.head.appendChild(s);
    });
  }
  function estado(t, error = false) {
    const el = $("ceEstado"); if (!el) return;
    el.textContent = t || ""; el.className = "ceEstado" + (error ? " mal" : "");
  }
  async function subir(blob, carpeta, nombre) {
    const ruta = `${ED.key}/${carpeta}/${Date.now()}_${Math.random().toString(36).slice(2, 6)}_${seguro(nombre)}`;
    const { error } = await sb.storage.from("cursos").upload(ruta, blob, { contentType: blob.type || undefined, upsert: false });
    if (error) throw new Error("No se pudo subir " + nombre + ": " + error.message);
    return sb.storage.from("cursos").getPublicUrl(ruta).data.publicUrl;
  }
  // Reduce las fotos grandes (menos peso = carga rápida y menos consumo de datos)
  async function aImagen(file, maxAncho = 1600) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, maxAncho / bmp.width);
    const c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(bmp, 0, 0, c.width, c.height);
    return new Promise((r) => c.toBlob((b) => r(b || file), "image/jpeg", 0.85));
  }
  // Archivos que el curso ya no usa (video reemplazado, imagen quitada…): se borran del almacenamiento
  // solo cuando el curso se guarda, para no romper el curso publicado si se cancela la edición.
  const rutaPropia = (url) => {
    if (!url) return null;
    const base = sb.storage.from("cursos").getPublicUrl("").data.publicUrl;
    return base && String(url).startsWith(base) ? decodeURIComponent(String(url).slice(base.length)) : null;
  };
  const huerfano = (url) => { const r = rutaPropia(url); if (r && ED) (ED.huerfanos = ED.huerfanos || new Set()).add(r); };
  async function limpiarHuerfanos(datosGuardados) {
    if (!ED || !ED.huerfanos || !ED.huerfanos.size) return;
    const usado = JSON.stringify(datosGuardados);
    const borrar = [...ED.huerfanos].filter((r) => !usado.includes(encodeURI(r)) && !usado.includes(r));
    ED.huerfanos = new Set();
    if (borrar.length) { try { await sb.storage.from("cursos").remove(borrar); } catch (e) { console.warn("limpieza:", e.message); } }
  }
  const get = (path) => path.split(".").reduce((o, k) => (o == null ? o : o[k]), ED);
  function set(path, valor) {
    const ks = path.split("."); const ult = ks.pop();
    const o = ks.reduce((x, k) => x[k], ED);
    if (ult === "itemsText") o.items = String(valor).split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    else o[ult] = valor;
  }
  const preguntaVacia = () => ({ q: "", opts: ["", "", "", ""], ans: 0 });
  const rellenar = (q) => ({ ...q, opts: [...q.opts, "", "", "", ""].slice(0, 4) });

  /* ── lista de cursos ── */
  function render() {
    const cont = $("adminCourseList"); if (!cont) return;
    $("cursoEditor").classList.add("hidden"); $("cursosLista").classList.remove("hidden");
    const puede = currentUser && ["admin", "maestro"].includes(currentUser.role);
    let aviso = "";
    if (!CURSOS.tabla()) aviso = `<div class="ceAviso mal">Falta activar los cursos en la nube: corre <b>003_cursos.sql</b> en Supabase. Mientras tanto se muestran los cursos incluidos en la plataforma.</div>`;
    else if (!CURSOS.enBD()) aviso = `<div class="ceAviso">Estos cursos vienen incluidos en la plataforma y todavía no están en la base de datos. Impórtalos para poder editarlos, ocultarlos o agregar más. <button class="btnPrimary" data-ca="importar">Importar cursos actuales</button></div>`;
    const ks = CURSOS.clavesPorModulo();
    const filas = ks.map((k, i) => {
      const c = COURSE_CONTENT[k]; const nq = (QUIZZES[k] || []).length; const pub = !CURSOS.esBorrador(k);
      const vids = c.modules.filter((m) => m.video).length;
      const acciones = CURSOS.enBD() && puede ? `
        <button class="btnAction" title="Subir" data-ca="subir" data-k="${esc(k)}" ${i === 0 || CURSOS.modulo(ks[i - 1]) !== CURSOS.modulo(k) ? "disabled" : ""}>▲</button>
        <button class="btnAction" title="Bajar" data-ca="bajar" data-k="${esc(k)}" ${i === ks.length - 1 || CURSOS.modulo(ks[i + 1]) !== CURSOS.modulo(k) ? "disabled" : ""}>▼</button>
        <button class="btnAction btnAction--edit" title="Editar" data-ca="editar" data-k="${esc(k)}">✏️</button>
        <button class="btnAction" title="${pub ? "Ocultar a los guardias" : "Publicar"}" data-ca="publicar" data-k="${esc(k)}">${pub ? "🙈" : "📢"}</button>
        <button class="btnAction btnAction--del" title="Eliminar" data-ca="borrar" data-k="${esc(k)}">🗑️</button>` : "";
      return `<div class="ceFila">
        <div class="ceFila__main"><div class="ceFila__t">${esc(c.title)}</div>
          <div class="ceFila__s"><span class="ceMod${CURSOS.modulo(k) ? "" : " ceMod--no"}">${esc(nombreModulo(CURSOS.modulo(k)))}</span> ${esc(c.badge)} · ${pl(c.modules.length, "tema", "temas")} · ${pl(nq, "pregunta", "preguntas")}${vids ? ` · ${vids} video${vids > 1 ? "s" : ""}` : ""}</div></div>
        <span class="statusPill ${pub ? "statusPill--active" : "statusPill--inactive"}">${pub ? "Publicado" : "Borrador"}</span>
        <div class="actionBtns"><button class="btnAction" title="Ver el curso (videos y diapositivas)" data-ca="ver" data-k="${esc(k)}">👁️</button><button class="btnAction" title="Presentar en pantalla (segunda pantalla, con notas)" data-ca="presentar" data-k="${esc(k)}">▶️</button>${acciones}</div>
      </div>`;
    }).join("");
    cont.innerHTML = `${aviso}
      ${puede ? `<div class="tabToolbar"><div class="sectionTitle" style="margin:0">${ks.length} curso${ks.length === 1 ? "" : "s"}</div>
        <div class="ceAcciones"><label class="ceArchivo" title="Curso armado y preparado por el equipo (archivo .zip)">Importar paquete de curso<input type="file" accept=".zip,application/zip" data-pkg/></label>
        <button class="btnPrimary" data-ca="nuevo">+ Nuevo curso</button></div></div><div class="ceNota" id="cePkgMsg"></div>` : ""}
      ${filas || `<div class="emptyState">Aún no hay cursos.</div>`}`;
  }

  /* ── editor ── */
  function abrir(key) {
    if (key) {
      ED = { key, nuevo: false, publicado: !CURSOS.esBorrador(key), orden: CURSOS.orden(key), datos: copia(COURSE_CONTENT[key]), quiz: copia(QUIZZES[key] || []).map(rellenar) };
      ED.datos.modules.forEach((m) => { if (m.video?.preguntas) m.video.preguntas = m.video.preguntas.map(rellenar); });
    } else {
      ED = { key: "c" + Date.now().toString(36), nuevo: true, publicado: false, orden: CURSOS.maxOrden() + 10,
        datos: { modulo: 0, badge: "", title: "", duration: "", vigenciaMeses: 12, img: "", pdf: "", desc: "", modules: [{ title: "", items: [] }] },
        quiz: [] };
    }
    $("cursosLista").classList.add("hidden"); $("cursoEditor").classList.remove("hidden");
    pintar(); window.scrollTo(0, 0);
  }
  function pintar() {
    const y = window.scrollY;
    $("cursoEditor").innerHTML = htmlEditor();
    window.scrollTo(0, y);
  }
  // Tema oficial con el que sale este curso en la lista de asistencia (SPGIP-FO-050)
  function htmlListaOficial(d) {
    const auto = temaListaAuto(ED && ED.key), l = d.lista || {};
    const sel = l.id || (String(l.tema || "").trim() ? "otro" : "");
    return `<div class="ceListaOf">
      <label class="editLabel">Lista de asistencia oficial <span class="ceNota">(${esc(LISTA_CODIGO)}: tema y objetivos que salen impresos)</span></label>
      <select class="editInput" data-lista-sel>
        <option value="">— Automático${auto ? ": " + esc(auto.nombre) : " (usa el nombre del curso)"} —</option>
        ${LISTA_TEMAS.map((t) => `<option value="${t.id}" ${sel === t.id ? "selected" : ""}>${esc(t.nombre)}</option>`).join("")}
        <option value="otro" ${sel === "otro" ? "selected" : ""}>Personalizado…</option>
      </select>
      <div class="ceListaCampos ${sel ? "" : "hidden"}" id="ceListaCampos">
        <label class="editLabel">Tema</label><textarea class="editTextarea" rows="2" data-p="datos.lista.tema">${esc(l.tema || "")}</textarea>
        <label class="editLabel">Objetivos</label><textarea class="editTextarea" rows="3" data-p="datos.lista.objetivos">${esc(l.objetivos || "")}</textarea>
      </div>
    </div>`;
  }
  function htmlEditor() {
    const d = ED.datos;
    const nv = d.modules.reduce((n, m) => n + (m.video ? 1 : 0), 0);
    return `
    <div class="ceTop"><button class="btnAction ceVolver" data-ca="cerrar">← Volver a cursos</button>
      <div class="sectionTitle" style="margin:0">${ED.nuevo ? "Nuevo curso" : "Editar curso"} <span class="ceBorr${ED.publicado ? " ceBorr--pub" : ""}">${ED.publicado ? "Publicado" : "Borrador"}</span></div></div>

    <div class="ceBloque"><h4>1. Datos del curso</h4>
      <label class="editLabel">Título</label><input class="editInput" data-p="datos.title" value="${esc(d.title)}" placeholder="Ej. Uso de la fuerza"/>
      <div class="ceDos">
        <div><label class="editLabel">Módulo</label><select class="editInput" data-num data-p="datos.modulo">
          <option value="0">— Elige el módulo —</option>${MODULOS.map((m) => `<option value="${m.id}" ${Number(d.modulo) === m.id ? "selected" : ""}>${esc(nombreModulo(m.id))}</option>`).join("")}</select></div>
        <div><label class="editLabel">Categoría</label><input class="editInput" data-p="datos.badge" value="${esc(d.badge)}" placeholder="Ej. Certificación DC3"/></div>
        <div><label class="editLabel">Duración</label><input class="editInput" data-p="datos.duration" value="${esc(d.duration)}" placeholder="Ej. 2 horas"/></div>
        <div><label class="editLabel">Vigencia de la constancia (meses)</label><input class="editInput" type="number" min="1" max="60" data-num data-p="datos.vigenciaMeses" value="${esc(d.vigenciaMeses ?? 12)}"/></div>
      </div>
      <label class="editLabel">Descripción</label><textarea class="editTextarea" rows="3" data-p="datos.desc" placeholder="De qué trata el curso (1 o 2 líneas)">${esc(d.desc)}</textarea>
      ${htmlListaOficial(d)}
      <div class="ceDos">
        <div><label class="editLabel">Portada</label>${d.img ? `<img class="cePortada" src="${esc(d.img)}" alt=""/>` : `<div class="ceVacio">Sin portada</div>`}
          <label class="ceArchivo">${d.img ? "Cambiar portada" : "+ Subir portada"}<input type="file" accept="image/*" data-file="portada"/></label></div>
        <div><label class="editLabel">PDF descargable (opcional)</label>${d.pdf ? `<a class="ceLink" href="${esc(d.pdf)}" target="_blank" rel="noopener">Ver PDF actual</a>` : `<div class="ceVacio">Sin PDF</div>`}
          <label class="ceArchivo">${d.pdf ? "Cambiar PDF" : "+ Subir PDF"}<input type="file" accept="application/pdf" data-file="pdf"/></label></div>
      </div>
    </div>

    <div class="ceBloque"><h4>2. Temas <span class="ceCuenta">${pl(d.modules.length, "tema", "temas")}${nv ? ` · ${nv} video${nv > 1 ? "s" : ""}` : ""}</span></h4>
      <div class="ceImportar"><b>¿Ya tienes la presentación?</b> Sube el PDF y cada página se vuelve una diapositiva del curso.
        <label class="ceArchivo ceArchivo--solido">Importar PDF como diapositivas<input type="file" accept="application/pdf" data-file="pdfSlides"/></label>
        <span class="ceNota">Desde PowerPoint: Archivo → Exportar → PDF.</span></div>
      ${d.modules.map((m, i) => htmlTema(m, i, d.modules.length)).join("")}
      <button class="btnAction ceAgregar" data-ca="temaNuevo">+ Agregar tema</button>
    </div>

    <div class="ceBloque"><h4>3. Examen <span class="ceCuenta">${pl(ED.quiz.length, "pregunta", "preguntas")}</span></h4>
      <p class="ceNota">El guardia recibe hasta 10 preguntas al azar de este banco y aprueba con el 80 % o más. Conviene tener 15 o más para que no se repitan.</p>
      ${ED.quiz.map((q, j) => htmlPregunta(q, j)).join("")}
      <button class="btnAction ceAgregar" data-ca="qNueva">+ Agregar pregunta</button>
      <div class="ceExcel"><b>Pegar desde Excel</b>
        <span class="ceNota">Una pregunta por fila, con columnas: pregunta, opción A, B, C, D y la letra correcta (A, B, C o D). Selecciona las celdas en Excel, cópialas y pégalas aquí.</span>
        <textarea class="editTextarea" id="cePegar" rows="4" placeholder="¿Cuál es el número de emergencias?&#9;800-911-2000&#9;070&#9;9-1-1&#9;55-5588-4444&#9;C"></textarea>
        <button class="btnAction" data-ca="qImportar">Agregar estas preguntas</button><span id="cePegarMsg" class="ceNota"></span></div>
    </div>

    <div class="ceBarra">
      <span class="ceEstado" id="ceEstado"></span>
      <button class="modal__btn modal__btn--cancel" data-ca="cerrar">Cancelar</button>
      <button class="modal__btn modal__btn--sec" data-ca="guardar">Guardar${ED.publicado ? "" : " borrador"}</button>
      ${ED.publicado ? "" : `<button class="modal__btn" data-ca="guardarPub">Guardar y publicar</button>`}
    </div>`;
  }
  function htmlTema(m, i, n) {
    const imgs = (m.imgs || []).map((u, k) => `<div class="ceThumb"><img src="${esc(u)}" alt=""/><button title="Quitar" data-ca="imgQuitar" data-i="${i}" data-k="${k}">✕</button></div>`).join("");
    const v = m.video;
    const video = v ? `<div class="ceVideo"><div class="ceVideo__t">▶ Video del tema</div>
        <video controls preload="metadata" src="${esc(v.src || v.webm)}" ${v.poster ? `poster="${esc(v.poster)}"` : ""}></video>
        <div class="ceVideoAcc"><label class="ceArchivo">Reemplazar video<input type="file" accept="video/mp4,video/webm" data-file="videoReemplazo" data-i="${i}"/></label>
          <button class="btnAction" data-ca="videoQuitar" data-i="${i}">Quitar video</button></div>
        <div class="ceNota">Preguntas durante el video: se muestran al llegar al segundo indicado y el guardia debe contestarlas para continuar.</div>
        ${(v.preguntas || []).map((p, j) => htmlPreguntaVideo(p, i, j)).join("")}
        <button class="btnAction" data-ca="vqNueva" data-i="${i}">+ Pregunta en el video</button></div>`
      : `<label class="ceArchivo">+ Agregar video (MP4 o WebM, máx. ${MAX_VIDEO_MB} MB)<input type="file" accept="video/mp4,video/webm" data-file="video" data-i="${i}"/></label>`;
    return `<div class="ceTema">
      <div class="ceTema__cab"><span class="ceTema__n">Tema ${i + 1}</span>
        <div class="ceMini"><button title="Subir" data-ca="temaSubir" data-i="${i}" ${i === 0 ? "disabled" : ""}>▲</button><button title="Bajar" data-ca="temaBajar" data-i="${i}" ${i === n - 1 ? "disabled" : ""}>▼</button><button title="Eliminar tema" data-ca="temaBorrar" data-i="${i}">🗑️</button></div></div>
      <label class="editLabel">Título del tema</label><input class="editInput" data-p="datos.modules.${i}.title" value="${esc(m.title)}"/>
      <label class="editLabel">Puntos clave (uno por línea)</label><textarea class="editTextarea" rows="4" data-p="datos.modules.${i}.itemsText">${esc((m.items || []).join("\n"))}</textarea>
      <label class="editLabel">Notas del instructor <span class="ceNota">(solo las ves tú al presentar; los guardias no)</span></label><textarea class="editTextarea" rows="3" data-p="datos.modules.${i}.notas" placeholder="Ej. Preguntar al grupo si ha vivido una situación así. Dar 2 minutos para comentarios.">${esc(m.notas || "")}</textarea>
      <label class="editLabel">Imágenes <span class="ceNota">(cada imagen es una diapositiva)</span></label>
      ${imgs ? `<div class="ceThumbs">${imgs}</div>` : ""}
      <label class="ceArchivo">+ Agregar imágenes<input type="file" accept="image/*" multiple data-file="imgs" data-i="${i}"/></label>
      ${video}
    </div>`;
  }
  function htmlOpciones(opts, base, ans, nombre) {
    return opts.map((o, k) => `<div class="ceOpc"><label class="ceRadio"><input type="radio" name="${nombre}" data-num data-p="${base}.ans" value="${k}" ${ans === k ? "checked" : ""}/> ${"ABCD"[k]}</label>
      <input class="editInput" data-p="${base}.opts.${k}" value="${esc(o)}" placeholder="Opción ${"ABCD"[k]}"/></div>`).join("");
  }
  function htmlPregunta(q, j) {
    return `<div class="cePreg"><div class="cePreg__cab"><span class="ceTema__n">Pregunta ${j + 1}</span><button class="ceMiniX" title="Eliminar" data-ca="qBorrar" data-j="${j}">🗑️</button></div>
      <textarea class="editTextarea" rows="2" data-p="quiz.${j}.q" placeholder="Escribe la pregunta">${esc(q.q)}</textarea>
      ${htmlOpciones(q.opts, `quiz.${j}`, q.ans, "qa" + j)}<div class="ceNota">Marca la letra de la respuesta correcta.</div></div>`;
  }
  function htmlPreguntaVideo(p, i, j) {
    const base = `datos.modules.${i}.video.preguntas.${j}`;
    return `<div class="cePreg cePreg--video"><div class="cePreg__cab"><span class="ceTema__n">Pregunta en el video ${j + 1}</span><button class="ceMiniX" title="Eliminar" data-ca="vqBorrar" data-i="${i}" data-j="${j}">🗑️</button></div>
      <label class="editLabel">Aparece en el segundo</label><input class="editInput ceSeg" type="number" min="0" step="0.5" data-num data-p="${base}.t" value="${esc(p.t ?? 0)}"/>
      <textarea class="editTextarea" rows="2" data-p="${base}.q" placeholder="Pregunta">${esc(p.q)}</textarea>
      ${htmlOpciones(p.opts, base, p.ans, `va${i}_${j}`)}
      <input class="editInput" data-p="${base}.exp" value="${esc(p.exp || "")}" placeholder="Explicación al responder (opcional)"/></div>`;
  }

  /* ── lectura y validación ── */
  function compactarPregunta(p, etiqueta, errores) {
    const q = String(p.q || "").trim(); const opts = p.opts.map((o) => String(o || "").trim());
    if (!q) { errores.push(`${etiqueta}: falta el texto de la pregunta.`); return null; }
    if (!opts[p.ans]) { errores.push(`${etiqueta}: la respuesta correcta apunta a una opción vacía.`); return null; }
    const lleno = opts.filter(Boolean);
    if (lleno.length < 2) { errores.push(`${etiqueta}: necesita al menos 2 opciones.`); return null; }
    const ans = opts.slice(0, p.ans).filter(Boolean).length;
    return { q, opts: lleno, ans };
  }
  function construir(publicar) {
    const errores = []; const d = ED.datos;
    if (!d.title.trim()) errores.push("Falta el título del curso.");
    const modules = [];
    d.modules.forEach((m, i) => {
      const titulo = String(m.title || "").trim();
      const items = (m.items || []).filter(Boolean);
      const imgs = (m.imgs || []).filter(Boolean);
      const notas = String(m.notas || "").trim();
      if (!titulo && !items.length && !imgs.length && !m.video && !notas) return;   // tema vacío: se descarta
      if (!titulo) { errores.push(`Tema ${i + 1}: falta el título.`); return; }
      const tema = { title: titulo, items };
      if (imgs.length) tema.imgs = imgs;
      if (notas) tema.notas = notas;
      if (m.video) {
        const preguntas = [];
        (m.video.preguntas || []).forEach((p, j) => {
          const c = compactarPregunta(p, `Tema ${i + 1}, pregunta del video ${j + 1}`, errores);
          if (c) { c.t = Number(p.t) || 0; if (String(p.exp || "").trim()) c.exp = String(p.exp).trim(); preguntas.push(c); }
        });
        preguntas.sort((a, b) => a.t - b.t);
        tema.video = { ...m.video, preguntas };
      }
      modules.push(tema);
    });
    const quiz = [];
    ED.quiz.forEach((p, j) => { const c = compactarPregunta(p, `Pregunta ${j + 1}`, errores); if (c) quiz.push(c); });
    if (publicar) {
      if (!Number(d.modulo)) errores.push("Elige el módulo del curso para publicarlo.");
      if (!modules.length) errores.push("Para publicar agrega al menos un tema.");
      if (!quiz.length) errores.push("Para publicar agrega al menos una pregunta de examen.");
    }
    const datos = { modulo: Number(d.modulo) || 0, badge: d.badge.trim() || "Curso", title: d.title.trim(), duration: d.duration.trim(),
      vigenciaMeses: Number(d.vigenciaMeses) || 12, img: d.img || "", pdf: d.pdf || "", desc: d.desc.trim(), modules };
    if (d.lista && String(d.lista.tema || "").trim()) datos.lista = { id: d.lista.id || "", tema: String(d.lista.tema).trim(), objetivos: String(d.lista.objetivos || "").trim() };
    return { errores, datos, quiz };
  }
  async function guardar(publicar) {
    const r = construir(publicar === true || (publicar === null && ED.publicado));
    if (r.errores.length) { estado(r.errores[0] + (r.errores.length > 1 ? ` (y ${r.errores.length - 1} más)` : ""), true); return; }
    estado("Guardando…");
    try {
      if (!CURSOS.enBD()) await CURSOS.importarIntegrados();     // para no perder los cursos incluidos al crear el primero
      const pub = publicar === null ? ED.publicado : publicar;
      await CURSOS.guardarFila({ key: ED.key, datos: r.datos, quiz: r.quiz, orden: ED.orden, publicado: pub });
      await limpiarHuerfanos(r.datos);
      await CURSOS.cargar();
      renderCatalog();
      toast(pub ? "✅ Curso guardado y publicado" : "✅ Borrador guardado");
      render(); renderAdminDashboard?.();
    } catch (e) { estado("No se pudo guardar: " + e.message, true); }
  }

  /* ── importar preguntas desde Excel ── */
  function parsearPreguntas(texto) {
    const nuevas = []; let ignoradas = 0;
    texto.split(/\r?\n/).forEach((linea) => {
      if (!linea.trim()) return;
      const sep = linea.includes("\t") ? "\t" : linea.includes("|") ? "|" : ";";
      const c = linea.split(sep).map((s) => s.trim().replace(/^"(.*)"$/, "$1"));
      if (c.length < 4) { ignoradas++; return; }
      const letra = c[c.length - 1].toUpperCase();
      const idx = "ABCD".indexOf(letra[0]) >= 0 && letra.length === 1 ? "ABCD".indexOf(letra) : (/^[1-4]$/.test(letra) ? Number(letra) - 1 : -1);
      const opts = c.slice(1, c.length - 1).slice(0, 4);
      if (!c[0] || idx < 0 || opts.length < 2 || idx >= opts.length || !opts[idx]) { ignoradas++; return; }
      nuevas.push({ q: c[0], opts: [...opts, "", "", "", ""].slice(0, 4), ans: idx });
    });
    return { nuevas, ignoradas };
  }

  /* ── PDF → diapositivas ── */
  async function importarPdf(file) {
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) throw new Error(`El PDF pesa más de ${MAX_VIDEO_MB} MB.`);
    await cargarScript("vendor/pdf.min.js");
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = "vendor/pdf.worker.min.js";
    const pdf = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    if (pdf.numPages > 80 && !confirm(`El PDF tiene ${pdf.numPages} páginas. ¿Importarlas todas?`)) return;
    const urls = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      estado(`Procesando diapositiva ${p} de ${pdf.numPages}…`);
      const page = await pdf.getPage(p);
      const k = 1280 / page.getViewport({ scale: 1 }).width;
      const vp = page.getViewport({ scale: k });
      const c = document.createElement("canvas"); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
      await page.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise;
      const blob = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.82));
      urls.push(await subir(blob, "slides", `p${String(p).padStart(2, "0")}.jpg`));
    }
    const d = ED.datos;
    const titulo = d.title.trim() || file.name.replace(/\.pdf$/i, "");
    const vacio = d.modules.length === 1 && !d.modules[0].title && !(d.modules[0].items || []).length && !(d.modules[0].imgs || []).length;
    if (vacio) d.modules = [];
    d.modules.push({ title: titulo, items: [], imgs: urls });
    if (!d.pdf) { estado("Guardando el PDF para descarga…"); d.pdf = await subir(file, "pdf", file.name); }
    if (!d.img) d.img = urls[0];
    if (!d.title.trim()) d.title = titulo;
  }

  /* ── Importar paquete de curso (.zip con curso.json + archivos) ── */
  const MIME = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", mp4: "video/mp4", webm: "video/webm", pdf: "application/pdf", vtt: "text/vtt" };
  async function importarPaquete(file) {
    const msg = (t, mal = false) => { const el = $("cePkgMsg"); if (el) { el.textContent = t; el.className = "ceNota" + (mal ? " mal" : ""); } };
    try {
      msg("Leyendo el paquete…");
      await cargarScript("vendor/jszip.min.js");
      const zip = await window.JSZip.loadAsync(file);
      const jf = zip.file("curso.json");
      if (!jf) throw new Error("El archivo no es un paquete de curso (falta curso.json).");
      const j = JSON.parse(await jf.async("string"));
      if (!j.datos || !Array.isArray(j.datos.modules)) throw new Error("El paquete está incompleto.");
      ED = { key: "c" + Date.now().toString(36), nuevo: true, publicado: false, orden: CURSOS.maxOrden() + 10,
             datos: j.datos, quiz: (j.quiz || []).map(rellenar) };
      ED.datos.modules.forEach((m) => { if (m.video?.preguntas) m.video.preguntas = m.video.preguntas.map(rellenar); });
      // archivos referenciados por ruta local dentro del zip
      const rutas = new Set(); const local = (r) => r && !/^(https?:)?\/\//.test(r) && !r.startsWith("assets/");
      const d = ED.datos;
      [d.img, d.pdf].forEach((r) => local(r) && rutas.add(r));
      d.modules.forEach((m) => { (m.imgs || []).forEach((r) => local(r) && rutas.add(r)); if (m.video) [m.video.src, m.video.webm, m.video.poster, m.video.vtt].forEach((r) => local(r) && rutas.add(r)); });
      const subidos = {}; let n = 0;
      for (const r of rutas) {
        const f = zip.file(r); if (!f) throw new Error("Falta el archivo " + r + " dentro del paquete.");
        const ext = r.split(".").pop().toLowerCase();
        const blob = new Blob([await f.async("arraybuffer")], { type: MIME[ext] || "application/octet-stream" });
        if (blob.size > MAX_VIDEO_MB * 1048576) throw new Error(`${r} pesa más de ${MAX_VIDEO_MB} MB.`);
        const carpeta = /^video|\.(mp4|webm)$/i.test(r) ? "video" : /\.pdf$/i.test(r) ? "pdf" : /portada/i.test(r) ? "portada" : "slides";
        msg(`Subiendo archivo ${++n} de ${rutas.size}…`);
        subidos[r] = await subir(blob, carpeta, r.split("/").pop());
      }
      const u = (r) => (r in subidos ? subidos[r] : r);
      d.img = u(d.img); d.pdf = u(d.pdf);
      d.modules.forEach((m) => { if (m.imgs) m.imgs = m.imgs.map(u); if (m.video) ["src", "webm", "poster", "vtt"].forEach((k) => { if (m.video[k]) m.video[k] = u(m.video[k]); }); });
      msg("");
      $("cursosLista").classList.add("hidden"); $("cursoEditor").classList.remove("hidden");
      pintar(); estado("Paquete cargado. Revisa el curso y dale Guardar y publicar."); window.scrollTo(0, 0);
    } catch (e) { ED = null; msg("No se pudo importar: " + e.message, true); }
  }

  /* ── eventos ── */
  async function accion(a, el) {
    const i = Number(el.dataset.i), j = Number(el.dataset.j), k = Number(el.dataset.k);
    const mods = ED?.datos.modules;
    switch (a) {
      case "temaNuevo": mods.push({ title: "", items: [] }); break;
      case "temaBorrar": if (!confirm("¿Eliminar este tema?")) return; mods.splice(i, 1); if (!mods.length) mods.push({ title: "", items: [] }); break;
      case "temaSubir": [mods[i - 1], mods[i]] = [mods[i], mods[i - 1]]; break;
      case "temaBajar": [mods[i + 1], mods[i]] = [mods[i], mods[i + 1]]; break;
      case "imgQuitar": huerfano(mods[i].imgs[k]); mods[i].imgs.splice(k, 1); if (!mods[i].imgs.length) delete mods[i].imgs; break;
      case "videoQuitar": if (!confirm("¿Quitar el video de este tema?")) return; [mods[i].video.src, mods[i].video.webm, mods[i].video.poster, mods[i].video.vtt].forEach(huerfano); delete mods[i].video; break;
      case "vqNueva": mods[i].video.preguntas = [...(mods[i].video.preguntas || []), { ...preguntaVacia(), t: 0 }]; break;
      case "vqBorrar": mods[i].video.preguntas.splice(j, 1); break;
      case "qNueva": ED.quiz.push(preguntaVacia()); break;
      case "qBorrar": ED.quiz.splice(j, 1); break;
      case "qImportar": {
        const { nuevas, ignoradas } = parsearPreguntas($("cePegar").value);
        if (!nuevas.length) { $("cePegarMsg").textContent = "No encontré filas válidas. Revisa que cada fila tenga la letra correcta al final."; return; }
        ED.quiz.push(...nuevas); pintar();
        $("cePegarMsg").textContent = `Se agregaron ${nuevas.length} preguntas${ignoradas ? ` y se ignoraron ${ignoradas} filas` : ""}.`; return;
      }
      case "guardar": return guardar(null);
      case "guardarPub": return guardar(true);
      case "cerrar": if (confirm("¿Salir del editor? Los cambios sin guardar se perderán.")) { ED = null; render(); } return;
      default: return;
    }
    pintar();
  }
  async function archivo(tipo, el) {
    const f = el.files && el.files[0]; if (!f) return;
    const i = Number(el.dataset.i); const d = ED.datos;
    try {
      estado("Subiendo…");
      if (tipo === "portada") { const antes = d.img; d.img = await subir(await aImagen(f, 900), "portada", f.name); huerfano(antes); }
      else if (tipo === "pdf") { if (f.size > MAX_VIDEO_MB * 1048576) throw new Error(`El PDF pesa más de ${MAX_VIDEO_MB} MB.`); const antes = d.pdf; d.pdf = await subir(f, "pdf", f.name); huerfano(antes); }
      else if (tipo === "imgs") {
        d.modules[i].imgs = d.modules[i].imgs || [];
        for (const [n, x] of [...el.files].entries()) { estado(`Subiendo imagen ${n + 1} de ${el.files.length}…`); d.modules[i].imgs.push(await subir(await aImagen(x), "imgs", x.name)); }
      } else if (tipo === "video") {
        if (f.size > MAX_VIDEO_MB * 1048576) throw new Error(`El video pesa ${(f.size / 1048576).toFixed(0)} MB y el máximo es ${MAX_VIDEO_MB} MB. Comprímelo o baja la resolución a 720p.`);
        const url = await subir(f, "video", f.name);
        d.modules[i].video = { [/\.webm$/i.test(f.name) ? "webm" : "src"]: url, preguntas: [] };
      } else if (tipo === "videoReemplazo") {
        if (f.size > MAX_VIDEO_MB * 1048576) throw new Error(`El video pesa ${(f.size / 1048576).toFixed(0)} MB y el máximo es ${MAX_VIDEO_MB} MB. Comprímelo o baja la resolución a 720p.`);
        const v = d.modules[i].video; const url = await subir(f, "video", f.name);
        [v.src, v.webm, v.poster, v.vtt].forEach(huerfano);                  // lo anterior se borra al guardar
        delete v.src; delete v.webm; delete v.poster; delete v.vtt;          // el póster y los subtítulos viejos ya no corresponden
        v[/\.webm$/i.test(f.name) ? "webm" : "src"] = url;                    // las preguntas del video se conservan
      } else if (tipo === "pdfSlides") await importarPdf(f);
      estado(""); pintar();
    } catch (e) { estado(e.message, true); }
    el.value = "";
  }
  function enlazar() {
    const ed = $("cursoEditor"), lista = $("cursosLista");
    if (!ed || ed.dataset.listo) return; ed.dataset.listo = "1";
    const entrada = (ev) => {
      const t = ev.target;
      if (t.dataset.listaSel !== undefined && ED) {
        const campos = $("ceListaCampos"), v = t.value, oficial = temaListaPorId(v);
        if (!v) { delete ED.datos.lista; campos.classList.add("hidden"); return; }
        ED.datos.lista = oficial ? { id: oficial.id, tema: oficial.tema, objetivos: oficial.objetivos } : { id: "", tema: (ED.datos.lista && ED.datos.lista.tema) || "", objetivos: (ED.datos.lista && ED.datos.lista.objetivos) || "" };
        campos.querySelector('[data-p="datos.lista.tema"]').value = ED.datos.lista.tema;
        campos.querySelector('[data-p="datos.lista.objetivos"]').value = ED.datos.lista.objetivos;
        campos.classList.remove("hidden"); return;
      }
      if (!t.dataset.p || !ED) return;
      if (t.type === "radio" && ev.type !== "change") return;
      set(t.dataset.p, t.dataset.num !== undefined ? Number(t.value) : t.value);
    };
    ed.addEventListener("input", entrada); ed.addEventListener("change", entrada);
    ed.addEventListener("change", (ev) => { const f = ev.target.dataset.file; if (f) archivo(f, ev.target); });
    ed.addEventListener("click", (ev) => { const b = ev.target.closest("[data-ca]"); if (b && ED) accion(b.dataset.ca, b); });
    lista.addEventListener("change", (ev) => { const t = ev.target; if (t.matches && t.matches("input[data-pkg]") && t.files[0]) { const f = t.files[0]; t.value = ""; importarPaquete(f); } });
    lista.addEventListener("click", async (ev) => {
      const b = ev.target.closest("[data-ca]"); if (!b) return; const k = b.dataset.k;
      try {
        switch (b.dataset.ca) {
          case "ver": loadDetail(k); navigate("detail"); break;
          case "presentar": PRES.iniciar(k); break;
          case "editar": abrir(k); break;
          case "nuevo": abrir(null); break;
          case "importar": b.disabled = true; await CURSOS.importarIntegrados(); renderCatalog(); render(); toast("✅ Cursos importados. Ya puedes editarlos."); break;
          case "publicar": await CURSOS.publicar(k, CURSOS.esBorrador(k)); await CURSOS.cargar(); renderCatalog(); render(); toast(CURSOS.esBorrador(k) ? "Curso oculto para los guardias" : "✅ Curso publicado"); break;
          case "subir": await CURSOS.mover(k, -1); await CURSOS.cargar(); renderCatalog(); render(); break;
          case "bajar": await CURSOS.mover(k, 1); await CURSOS.cargar(); renderCatalog(); render(); break;
          case "borrar":
            if (!confirm(`¿Eliminar el curso «${COURSE_CONTENT[k].title}»? Se borran también sus archivos. El avance ya registrado de los guardias no se borra.`)) return;
            await CURSOS.eliminar(k); await CURSOS.cargar(); renderCatalog(); render(); toast("🗑️ Curso eliminado"); break;
        }
      } catch (e) { toast("Error: " + e.message); render(); }
    });
  }
  document.addEventListener("DOMContentLoaded", enlazar);
  if (document.readyState !== "loading") enlazar();

  return { render, abrir, _estado: () => ED, parsearPreguntas };
})();
