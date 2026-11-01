/**
 * IntSeg Academy — ajustes.js
 * Ajustes del administrador y del capacitador.
 * Instructores: la lista de quienes imparten los cursos. Cada curso y cada sesión de aula
 * eligen a su instructor de esta lista, y su nombre y foto aparecen en el detalle del curso.
 *
 * Datos: tabla public.instructores (migración 004); fotos en el bucket "cursos".
 * Depende de: datos.js (sb), cursos-admin.js (CURSOS, escHtml), app.js (toast, currentUser).
 */
let INSTRUCTORES = [];   // [{ id, nombre, puesto, foto, activo }]

async function cargarInstructores() {
  const { data, error } = await sb.from("instructores").select("*").order("nombre");
  INSTRUCTORES = error ? [] : (data || []);
}

// Instructor de un curso: por id y, en cursos anteriores a esta lista, por coincidencia de nombre
const instructorDe = (c) =>
  INSTRUCTORES.find((i) => c?.instructorId && i.id === c.instructorId) ||
  INSTRUCTORES.find((i) => String(c?.instructor || "").trim() && i.nombre.trim().toLowerCase() === String(c.instructor).trim().toLowerCase()) ||
  null;

const AJUSTES = (() => {
  const $ = (id) => document.getElementById(id);
  const esc = escHtml;
  let ed = null;            // instructor en edición { id, nuevo, nombre, puesto, foto, activo, perfil_id }
  let PERFILES = {};        // id de cuenta -> { id, numero_empleado, nombre, rol, estado }  (solo para el administrador)
  const esAdmin = () => currentUser?.role === "admin";

  async function mostrar() {
    await cargarInstructores();
    PERFILES = {};
    if (esAdmin()) {
      const { data } = await sb.from("perfiles").select("id,numero_empleado,nombre,rol,estado");
      (data || []).forEach((p) => { PERFILES[p.id] = p; });
    }
    pintar();
  }

  const nCursos = (i) => Object.values(COURSE_CONTENT).filter((c) => (c.instructorId ? c.instructorId === i.id : String(c.instructor || "").trim().toLowerCase() === i.nombre.trim().toLowerCase())).length;
  const iniciales = (n) => n.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();

  function nombresEnCursos() {
    const ya = new Set(INSTRUCTORES.map((i) => i.nombre.trim().toLowerCase()));
    const vistos = new Map();
    Object.values(COURSE_CONTENT).forEach((c) => {
      const n = String(c.instructor || "").trim();
      if (n && !ya.has(n.toLowerCase())) vistos.set(n.toLowerCase(), n);
    });
    return [...vistos.values()];
  }

  function pintar() {
    const root = $("ajustesRoot"); if (!root) return;
    const sugeridos = nombresEnCursos();
    const aviso = sugeridos.length
      ? `<div class="ceAviso">Los cursos actuales mencionan a: <b>${sugeridos.map(esc).join(", ")}</b>. <button class="btnPrimary" data-aj="importar">Agregar a la lista</button></div>` : "";
    const filas = INSTRUCTORES.map((i) => {
      const n = nCursos(i);
      return `<div class="ajFila ${i.activo ? "" : "ajFila--off"}">
        ${i.foto ? `<img class="ajAvatar" src="${esc(i.foto)}" alt=""/>` : `<div class="ajAvatar ajAvatar--ini">${esc(iniciales(i.nombre))}</div>`}
        <div class="ajFila__main"><div class="ajFila__n">${esc(i.nombre)}</div>
          <div class="ajFila__s">${esc(i.puesto || "Instructor")} · ${n} curso${n === 1 ? "" : "s"}</div>
          ${esAdmin() ? (PERFILES[i.perfil_id] ? `<div class="ajAcc ajAcc--ok">🔑 Usuario: <b>${esc(PERFILES[i.perfil_id].numero_empleado)}</b></div>` : `<div class="ajAcc ajAcc--no">Sin acceso a la plataforma</div>`) : ""}</div>
        <span class="statusPill ${i.activo ? "statusPill--active" : "statusPill--inactive"}">${i.activo ? "Activo" : "Inactivo"}</span>
        <div class="actionBtns">
          <button class="btnAction btnAction--edit" title="Editar" data-aj="editar" data-id="${esc(i.id)}">✏️</button>
          <button class="btnAction" title="${i.activo ? "Desactivar" : "Activar"}" data-aj="activo" data-id="${esc(i.id)}">${i.activo ? "🔒" : "🔓"}</button>
          <button class="btnAction btnAction--del" title="Eliminar" data-aj="borrar" data-id="${esc(i.id)}">🗑️</button>
        </div></div>`;
    }).join("");
    root.innerHTML = `
      <div class="ajCard">
        <div class="ajCard__cab"><div><h3>Instructores</h3>
          <p class="ceNota">Quienes imparten los cursos. Cada curso y cada sesión de aula eligen a su instructor de esta lista.</p></div>
          <button class="btnPrimary" data-aj="nuevo">+ Agregar instructor</button></div>
        ${aviso}
        ${filas || `<div class="emptyState">Aún no hay instructores. Agrega el primero.</div>`}
      </div>`;
  }

  /* ── modal ── */
  function abrir(id) {
    const i = id ? INSTRUCTORES.find((x) => x.id === id) : null;
    ed = i ? { ...i, nuevo: false } : { id: crypto.randomUUID(), nuevo: true, nombre: "", puesto: "", foto: "", activo: true };
    $("insTitulo").textContent = ed.nuevo ? "Agregar instructor" : "Editar instructor";
    $("insNombre").value = ed.nombre; $("insPuesto").value = ed.puesto || ""; $("insActivo").value = ed.activo ? "1" : "0";
    $("insFoto").value = ""; pintarFoto();
    $("insError").classList.add("hidden");
    delete $("insUsuario").dataset.tocado;
    prepararAcceso();
    $("modalInstructor").classList.remove("hidden");
  }

  // ── Acceso (usuario y contraseña) ──
  const sinAcentos = (t) => String(t).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").trim();
  function sugerirUsuario(nombre) {
    const p = sinAcentos(nombre).split(/\s+/).filter(Boolean);
    let base = p.length > 1 ? p[0][0] + p[1] : (p[0] || "");
    let u = base, n = 2; const ocupados = new Set(Object.values(PERFILES).map((x) => x.numero_empleado));
    while (u && ocupados.has(u)) u = base + n++;
    return u;
  }
  function claveNueva() {
    const c = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"; const r = crypto.getRandomValues(new Uint32Array(10));
    return [...r].map((x) => c[x % c.length]).join("");
  }
  function prepararAcceso() {
    const box = $("insAcceso");
    box.classList.toggle("hidden", !esAdmin());           // solo el administrador crea cuentas
    if (!esAdmin()) return;
    const perfil = ed.perfil_id ? PERFILES[ed.perfil_id] : null;
    const act = $("insAccesoActual");
    $("insPass").value = ""; $("insUsuario").value = ""; $("insUsuario").disabled = false; $("insCrear").checked = false;
    $("insVincularWrap").classList.add("hidden");
    if (perfil) {                                           // ya tiene cuenta
      act.classList.remove("hidden");
      act.innerHTML = `🔑 Entra con el usuario <b>${esc(perfil.numero_empleado)}</b> (${esc(perfil.rol === "maestro" ? "Capacitador" : perfil.rol)}, ${esc(perfil.estado)}).`;
      $("insCrearWrap").classList.add("hidden");
      $("insCampos").classList.remove("hidden");
      $("insUsuarioLabel").classList.add("hidden"); $("insUsuario").classList.add("hidden");
      $("insPassLabel").textContent = "Nueva contraseña (déjala vacía para no cambiarla)";
      return;
    }
    act.classList.add("hidden");
    $("insCrearWrap").classList.remove("hidden");
    $("insUsuarioLabel").classList.remove("hidden"); $("insUsuario").classList.remove("hidden");
    $("insPassLabel").textContent = "Contraseña";
    $("insCrear").checked = ed.nuevo;                      // instructor nuevo: se propone crear su acceso
    $("insCampos").classList.toggle("hidden", !$("insCrear").checked);
    if ($("insCrear").checked) { $("insUsuario").value = sugerirUsuario(ed.nombre); }
    const libres = Object.values(PERFILES).filter((p) => ["maestro", "admin", "supervisor"].includes(p.rol) && !INSTRUCTORES.some((i) => i.perfil_id === p.id));
    $("insVincular").innerHTML = `<option value="">— Ninguno —</option>` + libres.map((p) => `<option value="${esc(p.id)}">${esc(p.numero_empleado)} · ${esc(p.nombre)}</option>`).join("");
    $("insVincularWrap").classList.toggle("hidden", !libres.length);
  }
  function cerrar() { $("modalInstructor").classList.add("hidden"); ed = null; }
  function pintarFoto() {
    $("insFotoVista").innerHTML = ed.foto ? `<img class="ajAvatar ajAvatar--g" src="${esc(ed.foto)}" alt=""/>` : `<div class="ajAvatar ajAvatar--g ajAvatar--ini">${esc(iniciales(ed.nombre || "?"))}</div>`;
  }
  async function reducir(file, ancho = 480) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, ancho / bmp.width);
    const c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(bmp, 0, 0, c.width, c.height);
    return new Promise((r) => c.toBlob((b) => r(b || file), "image/jpeg", 0.85));
  }
  async function subirFoto(file) {
    const blob = await reducir(file);
    const ruta = `instructores/${ed.id}/${Date.now()}.jpg`;
    const { error } = await sb.storage.from("cursos").upload(ruta, blob, { contentType: blob.type || "image/jpeg" });
    if (error) throw new Error("No se pudo subir la foto: " + error.message);
    return sb.storage.from("cursos").getPublicUrl(ruta).data.publicUrl;
  }
  async function guardar() {
    const err = $("insError"), btn = $("btnInsGuardar");
    const fallo = (m) => { err.textContent = m; err.classList.remove("hidden"); };
    const nombre = $("insNombre").value.trim();
    if (!nombre) return fallo("Escribe el nombre del instructor.");
    if (INSTRUCTORES.some((i) => i.id !== ed.id && i.nombre.trim().toLowerCase() === nombre.toLowerCase())) return fallo("Ya existe un instructor con ese nombre.");
    const activo = $("insActivo").value === "1";
    let perfilId = ed.perfil_id || null, cuentaNueva = false, clave = "";
    const crear = esAdmin() && !perfilId && $("insCrear").checked;
    const usuario = $("insUsuario").value.trim().toLowerCase();
    if (crear) {
      clave = $("insPass").value.trim();
      if (!usuario) return fallo("Escribe el usuario con el que va a entrar.");
      if (!/^[a-z0-9._-]+$/.test(usuario)) return fallo("El usuario solo puede llevar letras sin acento, números, punto, guion y guion bajo.");
      if (Object.values(PERFILES).some((p) => p.numero_empleado === usuario)) return fallo("Ese usuario ya existe. Elige otro.");
      if (clave.length < 6) return fallo("La contraseña debe tener al menos 6 caracteres (puedes usar Generar).");
    } else if (esAdmin() && perfilId && $("insPass").value.trim() && $("insPass").value.trim().length < 6) {
      return fallo("La nueva contraseña debe tener al menos 6 caracteres.");
    }
    btn.disabled = true; btn.textContent = "Guardando…";
    try {
      const f = $("insFoto").files[0];
      if (f) ed.foto = await subirFoto(f);
      if (crear) {                                          // 1) la cuenta primero, para no dejar un instructor a medias
        const r = await llamarAdminUsuarios({ action: "create", numero_empleado: usuario, nombre, password: clave, rol: "maestro" });
        perfilId = r.id; cuentaNueva = true;
      } else if (esAdmin() && !perfilId && $("insVincular").value) {
        perfilId = $("insVincular").value;
      } else if (esAdmin() && perfilId && $("insPass").value.trim()) {
        await llamarAdminUsuarios({ action: "update", id: perfilId, nombre, password: $("insPass").value.trim() });
      }
      const fila = { id: ed.id, nombre, puesto: $("insPuesto").value.trim() || null, foto: ed.foto || null, activo, perfil_id: perfilId };
      const { error } = await sb.from("instructores").upsert(fila, { onConflict: "id" });
      if (error) {
        if (cuentaNueva) { try { await llamarAdminUsuarios({ action: "delete", id: perfilId }); } catch (e) { /* mejor esfuerzo */ } }
        throw new Error(error.message);
      }
      // la cuenta de un capacitador sigue el estado del instructor (a los administradores no se les toca)
      const p = perfilId && (PERFILES[perfilId] || { rol: crear ? "maestro" : "" });
      if (esAdmin() && perfilId && p.rol === "maestro") {
        await sb.from("perfiles").update({ nombre, estado: activo ? "activo" : "inactivo" }).eq("id", perfilId);
      }
      cerrar(); await mostrar();
      toast(cuentaNueva ? `✅ Instructor guardado. Usuario: ${usuario}` : "✅ Instructor guardado");
      if (cuentaNueva) alert(`Datos de acceso de ${nombre}\n\nUsuario: ${usuario}\nContraseña: ${clave}\n\nEntrégaselos: esta contraseña no se vuelve a mostrar.`);
    } catch (e) { fallo(e.message); } finally { btn.disabled = false; btn.textContent = "Guardar"; }
  }
  async function alternar(id) {
    const i = INSTRUCTORES.find((x) => x.id === id); if (!i) return;
    const { error } = await sb.from("instructores").update({ activo: !i.activo }).eq("id", id);
    if (error) { toast("No se pudo actualizar: " + error.message); return; }
    const p = PERFILES[i.perfil_id];
    if (esAdmin() && p && p.rol === "maestro") await sb.from("perfiles").update({ estado: i.activo ? "inactivo" : "activo" }).eq("id", p.id);
    await mostrar();
    toast(i.activo ? "Instructor desactivado: ya no entra a la plataforma ni se ofrece en cursos y sesiones nuevos" : "Instructor activado");
  }
  async function borrar(id) {
    const i = INSTRUCTORES.find((x) => x.id === id); if (!i) return;
    const n = nCursos(i); const p = PERFILES[i.perfil_id]; const cuenta = esAdmin() && p && p.rol === "maestro";
    if (!confirm(`¿Eliminar a ${i.nombre}?${cuenta ? ` También se elimina su acceso (usuario ${p.numero_empleado}).` : ""}${n ? ` Está en ${n} curso${n === 1 ? "" : "s"}; seguirán mostrando su nombre, pero sin su foto.` : ""}`)) return;
    try {
      const { error } = await sb.from("instructores").delete().eq("id", id);
      if (error) throw new Error(error.message);
      if (cuenta) await llamarAdminUsuarios({ action: "delete", id: p.id });
      await mostrar(); toast("🗑️ Instructor eliminado");
    } catch (e) { toast("No se pudo eliminar: " + e.message); }
  }
  async function importar() {
    const filas = nombresEnCursos().map((n) => ({ nombre: n, puesto: "Instructor", activo: true }));
    if (!filas.length) return;
    const { error } = await sb.from("instructores").insert(filas);
    if (error) { toast("No se pudo agregar: " + error.message); return; }
    await cargarInstructores(); pintar(); toast("✅ Instructores agregados");
  }

  function enlazar() {
    const root = $("ajustesRoot"); if (!root || root.dataset.listo) return; root.dataset.listo = "1";
    root.addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-aj]"); if (!b) return;
      ({ nuevo: () => abrir(null), editar: () => abrir(b.dataset.id), activo: () => alternar(b.dataset.id), borrar: () => borrar(b.dataset.id), importar })[b.dataset.aj]?.();
    });
    $("insCrear").addEventListener("change", (e) => {
      $("insCampos").classList.toggle("hidden", !e.target.checked);
      if (e.target.checked && !$("insUsuario").value) $("insUsuario").value = sugerirUsuario($("insNombre").value);
    });
    $("insGenerar").addEventListener("click", () => { $("insPass").value = claveNueva(); });
    $("insNombre").addEventListener("blur", () => { if ($("insCrear").checked && !ed.perfil_id && !$("insUsuario").dataset.tocado) $("insUsuario").value = sugerirUsuario($("insNombre").value); });
    $("insUsuario").addEventListener("input", (e) => { e.target.dataset.tocado = "1"; });
    $("btnInsCancelar").addEventListener("click", cerrar);
    $("btnInsGuardar").addEventListener("click", guardar);
    $("insNombre").addEventListener("input", () => { if (ed && !ed.foto) { ed.nombre = $("insNombre").value; pintarFoto(); } });
    $("insFoto").addEventListener("change", async (e) => {
      const f = e.target.files[0]; if (!f) return;
      const url = URL.createObjectURL(f); $("insFotoVista").innerHTML = `<img class="ajAvatar ajAvatar--g" src="${url}" alt=""/>`;
    });
    $("modalInstructor").addEventListener("click", (e) => { if (e.target === $("modalInstructor")) cerrar(); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", enlazar); else enlazar();

  return { mostrar };
})();
