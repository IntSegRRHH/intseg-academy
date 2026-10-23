/**
 * IntSeg Academy — evidencias.js
 * Evidencia documentada de entrenamiento por empleado, para auditorías ISO / C-TPAT.
 * Supervisores, capacitadores y administradores cargan fotos, videos, PDF o listas firmadas
 * desde su dispositivo; cada carga queda en el historial del empleado y se puede descargar
 * como expediente (ZIP). Solo el administrador puede eliminar evidencias.
 *
 * Datos: tabla public.evidencias + bucket privado "evidencias" de Supabase Storage.
 * Depende de: datos.js (sb, EMPLEADOS), app.js (currentUser, toast, esStaff) y JSZip.
 */
const EVID = (() => {
  const $ = (id) => document.getElementById(id);
  const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ICONO = { Foto: "📷", Video: "🎥", PDF: "📄", "Lista de asistencia": "📋" };
  const MAX_MB = 50;
  let numSel = null;      // número de empleado seleccionado
  let tipos = [];         // catálogo de tipos de entrenamiento

  function empleadoDe(valor) {
    const m = String(valor || "").match(/^\s*(\d+)/);
    if (!m) return null;
    const n = m[1].replace(/^0+/, "");
    return EMPLEADOS.todos().find((e) => e.num === n) || null;
  }

  async function mostrar() {
    if (!EMPLEADOS.todos().length) await EMPLEADOS.cargar();
    if (!tipos.length) {
      const { data } = await sb.from("tipos_entrenamiento").select("nombre").order("nombre");
      tipos = (data || []).map((t) => t.nombre);
    }
    $("evidEmpList").innerHTML = EMPLEADOS.todos().map((e) => `<option value="${esc(e.num)} — ${esc(e.nombre)}"></option>`).join("");
    $("evidTipoList").innerHTML = tipos.map((t) => `<option value="${esc(t)}"></option>`).join("");
    const e = numSel ? EMPLEADOS.todos().find((x) => x.num === numSel) : null;
    $("evidEmp").value = e ? `${e.num} — ${e.nombre}` : "";
    if (!EMPLEADOS.todos().length) {
      $("evidHistorial").innerHTML = `<div class="emptyState">Aún no hay empleados cargados. El administrador debe cargar la lista en Admin → Empleados.</div>`;
      return;
    }
    await pintarHistorial();
  }

  async function pintarHistorial() {
    const cont = $("evidHistorial");
    const emp = numSel ? EMPLEADOS.todos().find((x) => x.num === numSel) : null;
    $("evidAcciones").classList.toggle("hidden", !emp);
    if (!emp) { cont.innerHTML = `<div class="emptyState">Escribe el número o nombre del empleado para ver su historial.</div>`; return; }
    cont.innerHTML = `<div class="emptyState">Cargando…</div>`;
    const { data, error } = await sb.from("evidencias")
      .select("*, autor:perfiles!evidencias_subido_por_fkey(nombre)")
      .eq("empleado_num", emp.num)
      .order("fecha", { ascending: false });
    if (error) { cont.innerHTML = `<div class="emptyState">No se pudo cargar: ${esc(error.message)}</div>`; return; }
    if (!data || !data.length) { cont.innerHTML = `<div class="emptyState">${esc(emp.nombre)} aún no tiene evidencias registradas.</div>`; return; }
    const admin = currentUser?.role === "admin";
    cont.innerHTML = data.map((e) => `
      <div class="evidCard">
        <div class="evidCard__icon">${ICONO[e.tipo_evidencia] || "📁"}</div>
        <div class="evidCard__body">
          <div class="evidCard__title">${esc(e.tipo_entrenamiento)}</div>
          <div class="evidCard__meta">${esc(e.tipo_evidencia)} · ${esc(e.fecha)} · subido por ${esc(e.autor?.nombre || "—")}</div>
          ${e.notas ? `<div class="evidCard__notas">${esc(e.notas)}</div>` : ""}
        </div>
        <div class="evidCard__actions">
          <button class="btnAction" title="Descargar archivo" data-evid-bajar="${esc(e.id)}">⬇️</button>
          ${admin ? `<button class="btnAction btnAction--del" title="Eliminar" data-evid-borrar="${esc(e.id)}">🗑️</button>` : ""}
        </div>
      </div>`).join("");
    cont._filas = data;
  }

  function descargarBlob(blob, nombre) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = nombre;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  async function bajar(id) {
    const fila = ($("evidHistorial")._filas || []).find((x) => x.id === id);
    if (!fila) return;
    const { data, error } = await sb.storage.from("evidencias").download(fila.archivo_path);
    if (error || !data) { toast("No se pudo descargar el archivo"); return; }
    descargarBlob(data, fila.archivo_nombre || "evidencia");
  }

  async function borrar(id) {
    const fila = ($("evidHistorial")._filas || []).find((x) => x.id === id);
    if (!fila) return;
    if (!confirm("¿Eliminar esta evidencia? Esta acción no se puede deshacer.")) return;
    await sb.storage.from("evidencias").remove([fila.archivo_path]);
    const { error } = await sb.from("evidencias").delete().eq("id", id);
    if (error) { toast("No se pudo eliminar: " + error.message); return; }
    await pintarHistorial();
    toast("Evidencia eliminada");
  }

  // ── Modal de carga ──────────────────────────────────────────
  function abrirModal() {
    const emp = numSel ? EMPLEADOS.todos().find((x) => x.num === numSel) : null;
    if (!emp) { toast("Primero elige al empleado"); return; }
    $("evidModalEmp").textContent = `${emp.nombre} · No. ${emp.num}`;
    $("evidModalError").classList.add("hidden");
    $("evidEntrenamiento").value = "";
    $("evidTipo").value = "Foto";
    $("evidFecha").value = new Date().toISOString().slice(0, 10);
    $("evidNotas").value = "";
    $("evidArchivo").value = "";
    $("modalEvidencia").classList.remove("hidden");
  }
  function cerrarModal() { $("modalEvidencia").classList.add("hidden"); }

  async function guardar() {
    const emp = numSel ? EMPLEADOS.todos().find((x) => x.num === numSel) : null;
    const entrenamiento = $("evidEntrenamiento").value.trim();
    const tipo = $("evidTipo").value;
    const fecha = $("evidFecha").value;
    const notas = $("evidNotas").value.trim();
    const file = $("evidArchivo").files[0];
    const err = $("evidModalError");
    const btn = $("btnSaveEvid");
    const fallo = (m) => { err.textContent = m; err.classList.remove("hidden"); };

    if (!emp || !entrenamiento || !fecha || !file) return fallo("Empleado, tipo de entrenamiento, fecha y archivo son obligatorios.");
    if (file.size > MAX_MB * 1024 * 1024) return fallo(`El archivo no debe superar ${MAX_MB} MB.`);

    btn.disabled = true; btn.textContent = "Guardando…";
    const seguro = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${emp.num}/${Date.now()}_${seguro}`;
    try {
      const { error: up } = await sb.storage.from("evidencias").upload(path, file);
      if (up) throw new Error("No se pudo subir el archivo: " + up.message);
      const perfil = getUsersDB().find((u) => u.user === emp.num);   // si el guardia ya entró a Academy
      const { error: ins } = await sb.from("evidencias").insert({
        empleado_num: emp.num,
        guardia_id: perfil ? perfil.id : null,
        subido_por: currentUser.id,
        tipo_entrenamiento: entrenamiento,
        tipo_evidencia: tipo,
        fecha, notas: notas || null,
        archivo_path: path,
        archivo_nombre: file.name,
      });
      if (ins) {
        await sb.storage.from("evidencias").remove([path]);   // no dejar el archivo huérfano
        throw new Error("No se pudo registrar la evidencia: " + ins.message);
      }
      cerrarModal();
      await pintarHistorial();
      toast("✅ Evidencia guardada correctamente");
    } catch (e) {
      fallo(e.message);
    } finally {
      btn.disabled = false; btn.textContent = "Guardar evidencia";
    }
  }

  async function expediente() {
    const emp = numSel ? EMPLEADOS.todos().find((x) => x.num === numSel) : null;
    const filas = $("evidHistorial")._filas || [];
    if (!emp || !filas.length) { toast("Este empleado no tiene evidencias registradas"); return; }
    if (typeof JSZip === "undefined") { toast("No se pudo cargar el generador de ZIP. Revisa tu conexión."); return; }
    toast("Generando expediente…");
    const zip = new JSZip();
    let manifiesto = `Expediente de capacitación — ${emp.nombre} (No. ${emp.num})\nGenerado: ${new Date().toLocaleString("es-MX")}\n\n`;
    for (const e of filas) {
      const { data: blob } = await sb.storage.from("evidencias").download(e.archivo_path);
      const nombre = `${e.fecha}_${e.tipo_evidencia}_${e.archivo_nombre}`.replace(/[\\/:*?"<>|]/g, "_");
      if (blob) zip.file(nombre, blob);
      manifiesto += `- ${e.fecha} | ${e.tipo_evidencia} | ${e.tipo_entrenamiento} | subido por ${e.autor?.nombre || "—"}${e.notas ? " | " + e.notas : ""}\n`;
    }
    zip.file("expediente.txt", manifiesto);
    descargarBlob(await zip.generateAsync({ type: "blob" }), `Expediente_${emp.num}.zip`);
  }

  // ── Eventos ────────────────────────────────────────────────
  $("evidEmp")?.addEventListener("input", (ev) => {
    const e = empleadoDe(ev.target.value);
    const nuevo = e ? e.num : null;
    if (nuevo !== numSel) { numSel = nuevo; pintarHistorial(); }
  });
  $("btnNuevaEvidencia")?.addEventListener("click", abrirModal);
  $("btnCancelEvid")?.addEventListener("click", cerrarModal);
  $("btnSaveEvid")?.addEventListener("click", guardar);
  $("btnExpediente")?.addEventListener("click", expediente);
  $("evidHistorial")?.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-evid-bajar]"); if (b) return bajar(b.dataset.evidBajar);
    const d = ev.target.closest("[data-evid-borrar]"); if (d) return borrar(d.dataset.evidBorrar);
  });
  $("modalEvidencia")?.addEventListener("click", (ev) => { if (ev.target === $("modalEvidencia")) cerrarModal(); });

  return { mostrar };
})();
