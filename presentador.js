/**
 * IntSeg Academy — presentador.js
 * Modo presentador para dar clase en aula con segunda pantalla.
 *  • Tu pantalla: vista del presentador con diapositiva actual, siguiente, notas del instructor,
 *    cronómetro, lista de temas y control del video.
 *  • Proyector: ventana "proyeccion.html" que solo muestra la diapositiva o el video.
 * Las dos ventanas se comunican con un BroadcastChannel (mismo navegador, sin servidor).
 * Depende de: app.js (buildSlides, COURSE_CONTENT, toast, esStaff).
 */
const PRES = (() => {
  const $ = (id) => document.getElementById(id);
  const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  let canal = null, win = null, key = null, slides = [], i = 0, negro = false;
  let t0 = 0, reloj = null, vigila = null, conectada = false;
  let vid = { pausado: true, tiempo: 0, duracion: 0, terminado: false };

  const curso = () => COURSE_CONTENT[key];
  const mmss = (s) => `${String(Math.floor((s || 0) / 60)).padStart(2, "0")}:${String(Math.floor((s || 0) % 60)).padStart(2, "0")}`;
  const esVideo = (s) => !!(s && s.video);

  // ── mensajes hacia la ventana de proyección ──
  function enviar() {
    if (!canal) return;
    const s = slides[i];
    const base = { t: "slide", i, title: s.title, items: s.items || [] };
    canal.postMessage(esVideo(s)
      ? { ...base, kind: "video", src: s.video.src || null, webm: s.video.webm || null, poster: s.video.poster || "" }
      : s.src ? { ...base, kind: "img", src: new URL(s.src, location.href).href } : { ...base, kind: "texto" });
    canal.postMessage({ t: "negro", on: negro });
  }

  // ── abrir la ventana de proyección (debe ocurrir dentro del clic del usuario) ──
  function abrirProyeccion() {
    win = window.open("proyeccion.html", "intseg-proyeccion", "popup=yes,width=1280,height=720");
    if (!win) return false;
    // Si hay segunda pantalla y el navegador lo permite (Chrome/Edge), la ventana se coloca ahí
    if (window.getScreenDetails) {
      window.getScreenDetails().then((d) => {
        const ext = d.screens.find((s) => !s.isPrimary);
        if (ext && win && !win.closed) { win.moveTo(ext.availLeft, ext.availTop); win.resizeTo(ext.availWidth, ext.availHeight); }
      }).catch(() => {});
    }
    return true;
  }

  function iniciar(k, desde = 0) {
    if (!COURSE_CONTENT[k]) return;
    if (document.getElementById("presRoot")) salir(true);
    key = k; slides = buildSlides(k);
    if (!slides.length) { toast("Este curso todavía no tiene temas para presentar"); return; }
    i = Math.max(0, Math.min(desde, slides.length - 1)); negro = false; conectada = false;
    vid = { pausado: true, tiempo: 0, duracion: 0, terminado: false };
    if (!abrirProyeccion()) { toast("El navegador bloqueó la ventana de proyección. Permite las ventanas emergentes para este sitio e inténtalo de nuevo."); return; }
    canal = new BroadcastChannel("intseg-presentador");
    canal.onmessage = (e) => {
      const m = e.data || {};
      if (m.t === "listo") { conectada = true; enviar(); pintarEstado(); }
      else if (m.t === "estado") { vid = m; pintarVideo(); }
      else if (m.t === "tecla" && m.k === "Escape") salir();
    };
    montar(); t0 = Date.now();
    reloj = setInterval(tictac, 1000); vigila = setInterval(vigilar, 1000);
    document.addEventListener("keydown", teclado, true);
    canal.postMessage({ t: "hola" });
    pintar(); tictac();
  }

  // ── interfaz del presentador ──
  function montar() {
    const el = document.createElement("div"); el.id = "presRoot"; el.className = "presRoot";
    el.innerHTML = `
      <header class="presTop">
        <div class="presTitulo" id="presTitulo"></div>
        <div class="presInfo"><span id="presEstado" class="presEstado"></span><span class="presCrono" title="Tiempo de clase"><b id="presTimer">00:00</b> · <span id="presHora"></span></span><button class="presBtn presBtn--sal" id="presSalir">Salir</button></div>
      </header>
      <main class="presMain">
        <section class="presActual">
          <div class="presEtq">Ahora proyectando <span id="presCont"></span></div>
          <div class="presVista" id="presVista"></div>
          <div class="presVideo hidden" id="presVideo">
            <button class="presBtn" id="presAtras" title="Retroceder 10 segundos">−10 s</button>
            <button class="presBtn presBtn--play" id="presPlay">▶ Reproducir</button>
            <button class="presBtn" id="presAdelante" title="Adelantar 10 segundos">+10 s</button>
            <input type="range" id="presBarra" min="0" max="1000" value="0" aria-label="Progreso del video"/>
            <span class="presTiempo" id="presTiempo">00:00 / 00:00</span>
          </div>
        </section>
        <aside class="presLado">
          <div class="presEtq">Siguiente</div><div class="presSig" id="presSig"></div>
          <div class="presEtq">Notas del instructor</div><div class="presNotas" id="presNotas"></div>
          <div class="presEtq">Temas</div><ol class="presLista" id="presLista"></ol>
        </aside>
      </main>
      <footer class="presPie">
        <button class="presBtn" id="presAnt">◀ Anterior</button>
        <button class="presBtn" id="presNegro">Pantalla negra (B)</button>
        <span class="presAyuda">← → o espacio para avanzar · B pantalla negra · Esc salir</span>
        <button class="presBtn presBtn--sig" id="presSgte">Siguiente ▶</button>
      </footer>`;
    document.body.appendChild(el);
    $("presSalir").onclick = () => salir();
    $("presAnt").onclick = anterior; $("presSgte").onclick = siguiente; $("presNegro").onclick = alternarNegro;
    $("presPlay").onclick = () => canal.postMessage({ t: "video", cmd: "toggle" });
    $("presAtras").onclick = () => canal.postMessage({ t: "video", cmd: "rel", v: -10 });
    $("presAdelante").onclick = () => canal.postMessage({ t: "video", cmd: "rel", v: 10 });
    $("presBarra").oninput = (e) => { if (vid.duracion) canal.postMessage({ t: "video", cmd: "ir", v: (e.target.value / 1000) * vid.duracion }); };
    $("presLista").onclick = (e) => { const li = e.target.closest("[data-mi]"); if (li) ir(slides.findIndex((s) => s.mi === Number(li.dataset.mi))); };
  }

  function pintar() {
    const s = slides[i], c = curso(), m = c.modules[s.mi];
    $("presTitulo").textContent = c.title;
    $("presCont").textContent = `· ${i + 1} / ${slides.length} · ${s.title}`;
    $("presVista").innerHTML = esVideo(s)
      ? `<div class="presVideoPoster">${s.video.poster ? `<img src="${esc(s.video.poster)}" alt=""/>` : ""}<div class="presVideoIcono">▶ Video</div></div>`
      : s.src ? `<img src="${esc(s.src)}" alt=""/>`
      : `<div class="presTexto"><h2>${esc(s.title)}</h2><ul>${(s.items || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>`;
    const sg = slides[i + 1];
    $("presSig").innerHTML = !sg ? `<div class="presFin">Fin de la presentación</div>`
      : esVideo(sg) ? `<div class="presMini presMini--video">${sg.video.poster ? `<img src="${esc(sg.video.poster)}" alt=""/>` : ""}<span>▶ ${esc(sg.title)}</span></div>`
      : sg.src ? `<div class="presMini"><img src="${esc(sg.src)}" alt=""/></div>`
      : `<div class="presMini presMini--txt">${esc(sg.title)}</div>`;
    const notas = String(m.notas || "").trim();
    $("presNotas").innerHTML = notas ? esc(notas).replace(/\n/g, "<br>") : `<span class="presSinNotas">Sin notas en este tema. Puedes agregarlas al editar el curso.</span>`;
    $("presLista").innerHTML = c.modules.map((mm, k) => `<li data-mi="${k}" class="${k === s.mi ? "on" : ""}">${esc(mm.title || "Tema " + (k + 1))}${mm.video ? " ▶" : ""}</li>`).join("");
    const act = $("presLista").querySelector(".on"); if (act) act.scrollIntoView({ block: "nearest" });
    $("presVideo").classList.toggle("hidden", !esVideo(s));
    $("presNegro").classList.toggle("on", negro);
    vid = { pausado: true, tiempo: 0, duracion: 0, terminado: false }; pintarVideo(); pintarEstado();
    enviar();
  }
  function pintarVideo() {
    if (!$("presPlay")) return;
    $("presPlay").textContent = vid.pausado ? (vid.terminado ? "↺ Repetir" : "▶ Reproducir") : "⏸ Pausar";
    $("presTiempo").textContent = `${mmss(vid.tiempo)} / ${mmss(vid.duracion)}`;
    if (document.activeElement !== $("presBarra")) $("presBarra").value = vid.duracion ? Math.round((vid.tiempo / vid.duracion) * 1000) : 0;
  }
  function pintarEstado() {
    const el = $("presEstado"); if (!el) return;
    if (!win || win.closed) { el.innerHTML = `<span class="mal">Proyección cerrada</span> <button class="presBtn presBtn--mini" id="presReabrir">Reabrir</button>`; const b = $("presReabrir"); if (b) b.onclick = reabrir; return; }
    el.innerHTML = conectada ? `<span class="ok">● Proyección conectada</span>` : `<span class="esp">Esperando la ventana de proyección… haz clic en ella para activar la pantalla completa</span>`;
  }
  function tictac() {
    if (!$("presTimer")) return;
    $("presTimer").textContent = mmss((Date.now() - t0) / 1000);
    $("presHora").textContent = new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
  }
  function vigilar() { pintarEstado(); }
  function reabrir() { if (abrirProyeccion()) { conectada = false; canal.postMessage({ t: "hola" }); pintarEstado(); } else toast("El navegador bloqueó la ventana de proyección."); }

  // ── navegación ──
  function ir(n) { if (n < 0 || n >= slides.length) return; i = n; pintar(); }
  function siguiente() { if (i < slides.length - 1) ir(i + 1); else toast("Es la última diapositiva"); }
  function anterior() { if (i > 0) ir(i - 1); }
  function alternarNegro() { negro = !negro; $("presNegro").classList.toggle("on", negro); canal.postMessage({ t: "negro", on: negro }); }
  function teclado(e) {
    if (!$("presRoot")) return;
    const k = e.key;
    if (["ArrowRight", "PageDown", "ArrowDown"].includes(k)) { e.preventDefault(); siguiente(); }
    else if (["ArrowLeft", "PageUp", "ArrowUp"].includes(k)) { e.preventDefault(); anterior(); }
    else if (k === " ") { e.preventDefault(); if (esVideo(slides[i])) canal.postMessage({ t: "video", cmd: "toggle" }); else siguiente(); }
    else if (k === "b" || k === "B" || k === ".") { e.preventDefault(); alternarNegro(); }
    else if (k === "Home") { e.preventDefault(); ir(0); }
    else if (k === "End") { e.preventDefault(); ir(slides.length - 1); }
    else if (k === "Escape") { e.preventDefault(); salir(); }
  }

  function salir(silencioso) {
    document.removeEventListener("keydown", teclado, true);
    clearInterval(reloj); clearInterval(vigila);
    try { if (canal) { canal.postMessage({ t: "cerrar" }); canal.close(); } } catch (e) { /* ya cerrado */ }
    try { if (win && !win.closed) win.close(); } catch (e) { /* ya cerrada */ }
    canal = null; win = null;
    const el = $("presRoot"); if (el) el.remove();
    if (!silencioso) toast("Presentación terminada");
  }

  return { iniciar, salir, ir, _estado: () => ({ i, n: slides.length, negro, conectada, vid }) };
})();
