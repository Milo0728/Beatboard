# BeatBoard

Plataforma web de votación y crítica musical para canales de reacciones. Reemplaza el uso de Excel en vivo por un sistema con rankings dinámicos, calificaciones 1–10 (paso 0.5) y comentarios persistentes.

El plan de proyecto detallado vive en [`docs/Plan_Proyecto_BeatBoard.docx`](docs/Plan_Proyecto_BeatBoard.docx).

## Stack

- **Frontend / backend:** Next.js 16 (App Router) + React 19 + TypeScript
- **Estilos:** Tailwind CSS 4
- **ORM:** Drizzle
- **BaaS:** Supabase (Postgres + Auth + Realtime + Storage)
- **Validación:** Zod
- **Deploy previsto:** Vercel

## Arrancar en local

1. Copia `.env.example` a `.env.local` y rellena las claves de tu proyecto Supabase.
2. Instala dependencias:
   ```bash
   npm install
   ```
3. Genera las migraciones de la base de datos y aplícalas:
   ```bash
   npm run db:generate
   npm run db:migrate
   ```
4. Arranca el dev server:
   ```bash
   npm run dev
   ```

Abre [http://localhost:3000](http://localhost:3000).

## Scripts

| Script | Acción |
|--------|--------|
| `dev` | Next.js en modo desarrollo (Turbopack) |
| `build` | Build de producción |
| `start` | Servir el build |
| `lint` | ESLint |
| `typecheck` | `tsc --noEmit` |
| `format` / `format:check` | Prettier |
| `db:generate` | Genera SQL desde el esquema Drizzle |
| `db:migrate` | Aplica migraciones pendientes |
| `db:push` | Sincroniza esquema directamente (dev rápido, sin migraciones) |
| `db:studio` | Drizzle Studio en `localhost:4983` |

## Estructura

```
src/
├── app/                Rutas (App Router)
├── db/
│   ├── schema.ts       Esquema Drizzle (users, artists, albums, songs, ratings, comments)
│   └── client.ts       Cliente postgres + drizzle
├── lib/supabase/
│   ├── browser.ts      Cliente Supabase para componentes cliente
│   └── server.ts       Cliente Supabase para Server Components y Route Handlers
└── env.ts              Validación de variables de entorno con Zod
```
