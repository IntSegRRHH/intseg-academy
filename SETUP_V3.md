# IntSeg Academy v3 — Puesta en marcha

Esta versión reúne los 7 cursos, las sesiones del capacitador, las fichas técnicas y el módulo de evidencias, todo guardado en Supabase.

## 1. Base de datos (Supabase → SQL Editor)
1. Si no lo has hecho, corre `supabase/migrations/001_schema.sql`.
2. Corre `supabase/migrations/002_academy.sql` completo y dale **Run** (confirma el aviso de operaciones destructivas). Debe decir **Success**.

## 2. Función de acceso del guardia (Supabase → Edge Functions)
1. **Deploy a new function → Via Editor**, nombre exacto: `acceso-guardia`.
2. Pega el contenido de `supabase/functions/acceso-guardia/index.ts`.
3. **Deploy**, y en los ajustes de la función **desactiva "Verify JWT"** (el guardia aún no tiene sesión cuando llega a esta función).
4. La función `admin-users` ya está desplegada y no cambia.

## 3. Publicar el sitio (GitHub, cuenta IntSegRRHH, repositorio intseg-academy)
GitHub permite subir máximo 100 archivos por vez desde el navegador, así que sube en dos tandas:
1. Todos los archivos sueltos: `index.html`, `styles.css`, `config.js`, los `.js` y los PDF.
2. La carpeta `assets` (103 imágenes y videos).
No subas la carpeta `supabase`. Reemplaza los archivos que ya existan.

## 4. Cargar la lista de empleados
Entra como `admin` → **Admin → Empleados**, pega una fila por empleado (`número, nombre, área`, también sirve copiar de Excel) y dale **Importar lista**. Sin esta lista ningún guardia podrá entrar.

## 5. Probar
1. Guardia: número de empleado + foto → catálogo con 7 cursos → una evaluación.
2. Capacitador: crear una sesión con asistencia y foto.
3. Supervisor: Evidencias → elegir empleado → subir una foto → descargar expediente.
Crea los usuarios de personal en **Admin → Usuarios** (roles Supervisor, Capacitador, Administrador). Los guardias se crean solos la primera vez que entran.

## PDFs de los cursos
Los 3 primeros PDF vienen incluidos. Faltan 4 que el catálogo ya enlaza: `SafeR_NextGen.pdf`, `Rondines_Perimetrales.pdf`, `Medidas_Preventivas_EHS.pdf` y `Operaciones_Ilicitas.pdf`. Súbelos junto a `index.html` con esos nombres exactos.

## Cómo se conecta IntsegWeb
Hoy la lista de empleados vive en la tabla `empleados`. Cuando Sistemas conecte IntsegWeb, solo se cambia la función `buscarEmpleado()` dentro de `acceso-guardia/index.ts`; el resto de la plataforma no cambia.

## Pendiente conocido
- El contenido de los cursos y exámenes sigue en `cursos.js`. Las ediciones desde Admin → Cursos no se guardan al recargar.
- El acceso del guardia confía en el número de empleado y deja la foto como rastro de auditoría. Quien conozca un número puede entrar como ese guardia; la función limita los intentos por número, pero no verifica el rostro.
