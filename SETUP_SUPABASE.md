# Migración a Supabase — Guía paso a paso

Con esto, IntSeg Academy pasa de "guardado en el navegador" a un backend
real: cualquier supervisor sube evidencia desde su celular y tú la ves
desde tu compu al instante. Sígueme en orden, no te saltes pasos.

---

## 1. Crear el proyecto Supabase (5 min)

1. Ve a https://supabase.com → **Start your project** → inicia sesión (puedes usar GitHub).
2. **New project** → nombre: `intseg-academy` → elige una contraseña de base de datos (guárdala, no la necesitarás seguido) → región: la más cercana a Tijuana (ej. `us-west-1`) → **Create new project**.
3. Espera 1-2 minutos mientras se aprovisiona.

## 2. Correr el esquema SQL (2 min)

1. En el panel izquierdo: **SQL Editor** → **New query**.
2. Abre el archivo `supabase/migrations/001_schema.sql` de este proyecto, copia **todo** el contenido, pégalo ahí.
3. Dale **Run**. Debe decir "Success. No rows returned".
   - Esto crea las tablas (`perfiles`, `evidencias`, `progreso`, `tipos_entrenamiento`), las reglas de seguridad (RLS) y el bucket de Storage `evidencias`.

## 3. Conectar el frontend (2 min)

1. Panel izquierdo: **Project Settings** (engrane) → **API**.
2. Copia **Project URL** y la llave **anon public** (⚠️ NO la `service_role`, esa nunca va en el frontend).
3. Abre `config.js` en este proyecto y reemplaza:
   ```js
   const SUPABASE_URL = "https://TU-PROYECTO.supabase.co";
   const SUPABASE_ANON_KEY = "TU-ANON-KEY-AQUI";
   ```

## 4. Desplegar la Edge Function (crear/editar/eliminar usuarios)

Esto corre en el servidor de Supabase, nunca en el navegador (por eso puede crear usuarios con contraseña de forma segura).

1. Instala la CLI de Supabase (una sola vez en tu compu):
   ```bash
   npm install -g supabase
   ```
2. Desde la carpeta raíz de este proyecto:
   ```bash
   supabase login
   supabase link --project-ref TU-PROJECT-REF
   ```
   (El `project-ref` está en la URL de tu proyecto: `https://TU-PROJECT-REF.supabase.co`)
3. Despliega la función:
   ```bash
   supabase functions deploy admin-users
   ```

## 5. Crear tu primer usuario administrador (bootstrap)

La app no puede crear el primer admin sola (necesita que YA exista un admin para crear más usuarios). Este primer paso se hace a mano, una sola vez:

1. Panel izquierdo: **Authentication** → **Users** → **Add user** → **Create new user**.
   - Email: `admin@intseg.local`
   - Password: la que tú quieras (mínimo 6 caracteres)
   - ✅ Marca "Auto Confirm User"
2. Copia el **UUID** del usuario recién creado (aparece en la lista).
3. **SQL Editor** → nueva consulta:
   ```sql
   insert into public.perfiles (id, numero_empleado, nombre, rol, estado)
   values ('PEGA-AQUI-EL-UUID', 'admin', 'Administrador', 'admin', 'activo');
   ```
4. Listo. Ya puedes entrar a la app con:
   - Número de empleado: `admin`
   - Contraseña: la que elegiste

Desde ahí, **Admin → Usuarios → + Nuevo usuario** crea a todos los demás (guardias, supervisores, instructores) sin volver a tocar SQL.

## 6. Publicar en GitHub Pages

Sube estos archivos (incluyendo el nuevo `config.js`, pero asegúrate de que `config.js` **no** contenga la `service_role key`, solo la `anon key`) igual que siempre. La carpeta `supabase/` no necesita subirse a GitHub Pages — solo la usa la CLI para desplegar la función, no la sirve el sitio.

## Qué cambia para el usuario final

- El login ahora pide **número de empleado** (no "usuario").
- Todo lo que suba un supervisor se ve al instante desde cualquier otro dispositivo — ya no vive solo en su navegador.
- Los archivos de evidencia se guardan en un bucket **privado** de Supabase Storage; solo admin/supervisor/instructor pueden leerlos (y cada guardia puede ver los suyos).

## Límites del plan gratuito de Supabase (a tener en cuenta)

- 500 MB de base de datos y 1 GB de Storage — para fotos/PDFs de 550 guardias alcanza bien; videos pesados lo llenan más rápido.
- El proyecto se pausa tras 1 semana sin actividad (se reactiva solo al usarlo de nuevo, tarda ~1 min).
- Cuando el uso crezca (sobre todo si suben muchos videos), el plan Pro (25 USD/mes) quita esos límites.

## Pendiente para una fase 2 (si quieres)

- Mover el contenido de los cursos y preguntas de examen a la base de datos (hoy sigue en `app.js`, se pierden ediciones de admin al recargar).
- Reset de contraseña "olvidé mi contraseña" para los guardias (hoy solo el admin puede cambiarla).
