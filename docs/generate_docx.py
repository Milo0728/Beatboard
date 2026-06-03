"""Generate the BeatBoard project plan as a .docx file."""
from docx import Document
from docx.shared import Pt, RGBColor, Cm, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_ALIGN_VERTICAL
from docx.oxml.ns import qn
from docx.oxml import OxmlElement


def shade_cell(cell, color_hex):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:fill'), color_hex)
    tc_pr.append(shd)


def set_cell_border(cell):
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_borders = OxmlElement('w:tcBorders')
    for edge in ('top', 'left', 'bottom', 'right'):
        b = OxmlElement(f'w:{edge}')
        b.set(qn('w:val'), 'single')
        b.set(qn('w:sz'), '4')
        b.set(qn('w:color'), '999999')
        tc_borders.append(b)
    tc_pr.append(tc_borders)


def add_heading(doc, text, level):
    h = doc.add_heading(text, level=level)
    for run in h.runs:
        run.font.name = 'Calibri'
    return h


def add_para(doc, text, bold=False, italic=False, size=11):
    p = doc.add_paragraph()
    run = p.add_run(text)
    run.font.name = 'Calibri'
    run.font.size = Pt(size)
    run.bold = bold
    run.italic = italic
    return p


def add_bullet(doc, text, level=0):
    p = doc.add_paragraph(style='List Bullet')
    p.paragraph_format.left_indent = Cm(0.75 + 0.5 * level)
    # parse simple **bold** markers
    parts = text.split('**')
    for i, part in enumerate(parts):
        run = p.add_run(part)
        run.font.name = 'Calibri'
        run.font.size = Pt(11)
        if i % 2 == 1:
            run.bold = True
    return p


def add_numbered(doc, text):
    p = doc.add_paragraph(style='List Number')
    parts = text.split('**')
    for i, part in enumerate(parts):
        run = p.add_run(part)
        run.font.name = 'Calibri'
        run.font.size = Pt(11)
        if i % 2 == 1:
            run.bold = True
    return p


def add_code(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Cm(0.5)
    run = p.add_run(text)
    run.font.name = 'Consolas'
    run.font.size = Pt(9)
    return p


def add_table(doc, headers, rows, col_widths=None):
    table = doc.add_table(rows=1 + len(rows), cols=len(headers))
    table.style = 'Light Grid Accent 1'
    table.autofit = True
    # header
    for i, h in enumerate(headers):
        cell = table.rows[0].cells[i]
        cell.text = ''
        p = cell.paragraphs[0]
        run = p.add_run(h)
        run.bold = True
        run.font.name = 'Calibri'
        run.font.size = Pt(10)
        run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        shade_cell(cell, '1F4E78')
    for r_idx, row in enumerate(rows, start=1):
        for c_idx, val in enumerate(row):
            cell = table.rows[r_idx].cells[c_idx]
            cell.text = ''
            p = cell.paragraphs[0]
            # support **bold**
            parts = str(val).split('**')
            for i, part in enumerate(parts):
                run = p.add_run(part)
                run.font.name = 'Calibri'
                run.font.size = Pt(10)
                if i % 2 == 1:
                    run.bold = True
    if col_widths:
        for row in table.rows:
            for i, w in enumerate(col_widths):
                row.cells[i].width = Cm(w)
    return table


# ============================================================
doc = Document()

# Default styles
style = doc.styles['Normal']
style.font.name = 'Calibri'
style.font.size = Pt(11)

# Page margins
for section in doc.sections:
    section.top_margin = Cm(2.2)
    section.bottom_margin = Cm(2.2)
    section.left_margin = Cm(2.2)
    section.right_margin = Cm(2.2)

# ============= TITLE PAGE =============
title = doc.add_paragraph()
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = title.add_run('PLAN DE PROYECTO Y DISEÑO TÉCNICO')
r.bold = True
r.font.size = Pt(24)
r.font.color.rgb = RGBColor(0x1F, 0x4E, 0x78)

subtitle = doc.add_paragraph()
subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = subtitle.add_run('Plataforma Web "BeatBoard"\nSistema de Votación y Crítica Musical\npara Canales de Reacciones')
r.font.size = Pt(16)
r.italic = True
r.font.color.rgb = RGBColor(0x40, 0x40, 0x40)

doc.add_paragraph()
doc.add_paragraph()

meta_table = doc.add_table(rows=4, cols=2)
meta_table.style = 'Light Shading Accent 1'
meta_rows = [
    ('Versión', '1.0'),
    ('Fecha', '03 de junio de 2026'),
    ('Autor', 'Equipo de Arquitectura'),
    ('Estado', 'Borrador para aprobación'),
]
for i, (k, v) in enumerate(meta_rows):
    meta_table.rows[i].cells[0].text = k
    meta_table.rows[i].cells[1].text = v
    for cell in meta_table.rows[i].cells:
        for para in cell.paragraphs:
            for run in para.runs:
                run.font.name = 'Calibri'
                run.font.size = Pt(11)
    meta_table.rows[i].cells[0].paragraphs[0].runs[0].bold = True

doc.add_page_break()

# ============= SECTION 1 =============
add_heading(doc, '1. RESUMEN DEL PROYECTO', 1)

add_heading(doc, '1.1. Descripción General', 2)
add_para(doc,
    'BeatBoard es una plataforma web interactiva diseñada para reemplazar el uso de hojas de cálculo de '
    'Excel durante las transmisiones en vivo de canales de reacciones musicales. La aplicación permitirá '
    'a los hosts e invitados calificar álbumes y canciones en tiempo real, dejar reseñas escritas, y '
    'generar de forma automática rankings dinámicos visualmente atractivos. La plataforma funcionará '
    'como un tablero público (estilo foro/leaderboard) consultable por la audiencia, generando un '
    'histórico permanente y navegable del contenido reseñado en el canal.')

add_heading(doc, '1.2. Problema Actual', 2)
add_para(doc, 'El flujo de trabajo basado en Excel presenta limitaciones críticas para la operación de un canal de reacciones musicales:')
for b in [
    '**Rigidez de formato:** Excel no está diseñado para mostrar información rica (portadas, multimedia, comentarios estructurados).',
    '**Pobre experiencia visual en pantalla:** Las hojas son poco atractivas para la audiencia que sigue el stream.',
    '**Falta de interactividad:** El público no puede explorar rankings históricos ni navegar entre álbumes pasados.',
    '**Histórico difícil de mantener:** Cada show suele crear archivos nuevos; consolidar tendencias es manual y propenso a errores.',
    '**Sin persistencia pública:** No existe una URL pública que los seguidores puedan consultar entre transmisiones.',
    '**Errores de cálculo:** Los promedios se calculan a mano o con fórmulas frágiles que se rompen al editarse en vivo.',
]:
    add_bullet(doc, b)

add_heading(doc, '1.3. Objetivos del Proyecto', 2)
add_heading(doc, 'Objetivo Principal', 3)
add_para(doc,
    'Automatizar el sistema de calificaciones musicales del canal, ofreciendo una experiencia visual '
    'atractiva para streamings en vivo y una plataforma pública con histórico navegable para la audiencia.')

add_heading(doc, 'Objetivos Específicos', 3)
for b in [
    '**Automatizar el cálculo de promedios** por canción y por álbum según las reglas de votación definidas.',
    '**Permitir reseñas en texto libre** asociadas a cada calificación, capturando el contexto del veredicto.',
    '**Mostrar rankings dinámicos** ordenados por puntuación, con filtros por año, género y artista.',
    '**Optimizar la UI para streaming** con un modo oscuro de alto contraste, tipografía grande y elementos animados.',
    '**Crear un histórico público permanente** consultable vía URL desde cualquier dispositivo.',
    '**Reducir el tiempo de preparación** del host antes de cada transmisión a menos de 2 minutos por álbum.',
]:
    add_numbered(doc, b)

add_heading(doc, '1.4. Alcance', 2)
add_bullet(doc, '**Incluido en MVP:** Calificación de álbumes/canciones, sistema de comentarios, rankings públicos, gestión de usuarios con roles, modo presentación para streaming.')
add_bullet(doc, '**Fuera del MVP (Fases futuras):** App móvil nativa, integración con Spotify/Last.fm para metadatos automáticos, sistema de votación abierta a la audiencia, monetización (sponsorships, ads).')

doc.add_page_break()

# ============= SECTION 2 =============
add_heading(doc, '2. REQUERIMIENTOS FUNCIONALES (FEATURES CLAVE)', 1)

add_heading(doc, '2.1. Sistema de Calificación Preciso', 2)
add_heading(doc, '2.1.1. Reglas de Votación', 3)
add_bullet(doc, '**Rango válido:** Notas enteras y decimales entre **1.0 y 10.0**.')
add_bullet(doc, '**Paso (incremento):** **0.5 puntos**. Valores aceptados: 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0, 9.5, 10.0')
add_bullet(doc, '**Validación backend:** Cualquier valor recibido se valida con la regla value >= 1 && value <= 10 && (value * 2) % 1 === 0.')
add_bullet(doc, '**Almacenamiento:** El valor se persiste como DECIMAL(3,1) o equivalente para evitar errores de punto flotante.')

add_heading(doc, '2.1.2. Tipos de Calificación', 3)
add_numbered(doc, '**Calificación de Canción:** Cada track recibe una nota individual del host.')
add_numbered(doc, '**Calificación de Álbum (calculada):** Promedio aritmético de las notas de todas las canciones del álbum.')
add_code(doc, 'promedio_album = SUMA(notas_canciones) / COUNT(canciones_calificadas)')
add_bullet(doc, 'Redondeo al múltiplo de 0.5 más cercano para visualización (manteniendo el valor exacto interno).', level=1)
add_numbered(doc, '**Calificación de Álbum Manual (opcional):** El host puede sobrescribir el promedio automático con una nota holística del álbum como un todo. En ese caso, se almacena tanto el promedio calculado como la nota manual.')

add_heading(doc, '2.1.3. Múltiples Calificadores', 3)
add_bullet(doc, 'Cada **host/invitado autenticado** puede emitir su propia calificación independiente sobre el mismo álbum o canción.')
add_bullet(doc, 'La calificación pública mostrada es el **promedio entre los calificadores**, ponderado opcionalmente por rol (host principal vs. invitado).')
add_bullet(doc, 'Se mantienen visibles las calificaciones individuales para transparencia.')

add_heading(doc, '2.2. Módulos de Contenido', 2)
add_heading(doc, '2.2.1. Módulo Álbumes', 3)
add_para(doc, 'Cada álbum contiene los siguientes campos:')
for b in [
    '**Título** (obligatorio)',
    '**Artista / Banda** (relación con tabla artists)',
    '**Año de lanzamiento**',
    '**Portada (cover art)** — URL o archivo subido a almacenamiento.',
    '**Género/s** (multi-tag)',
    '**Sello discográfico** (opcional)',
    '**Duración total** (calculada a partir de las canciones)',
    '**Tracklist ordenado** — lista de canciones con número de pista.',
    '**Fecha de reseña en el canal** — cuándo fue cubierto en stream.',
    '**Episodio asociado** — opcional, link al vídeo del stream.',
]:
    add_bullet(doc, b)

add_heading(doc, '2.2.2. Módulo Canciones', 3)
add_para(doc, 'Cada canción contiene:')
for b in [
    '**Título de la pista**',
    '**Número de track** dentro del álbum',
    '**Duración**',
    '**Artistas invitados (features)** — opcional',
    '**Calificación individual** asignada en vivo',
    '**Comentarios/notas** asociados a la pista',
    '**Highlight flag** — marca de "canción destacada" del álbum',
]:
    add_bullet(doc, b)

add_heading(doc, '2.3. Sistema de Foros y Comentarios', 2)
for b in [
    '**Comentarios por canción:** texto libre, máx. 1000 caracteres, justificación del veredicto.',
    '**Comentarios por álbum:** reseña global, máx. 4000 caracteres, conclusión del host.',
    '**Comentarios anidados (replies):** un nivel de respuesta para permitir conversación entre hosts.',
    '**Markdown ligero:** soporte para negritas, cursivas, listas y enlaces.',
    '**Timestamp y autor visibles** en cada comentario.',
    '**Edición/eliminación** restringida al autor o al rol Admin.',
]:
    add_bullet(doc, b)

add_heading(doc, '2.4. Rankings Públicos (Leaderboards)', 2)
add_heading(doc, '2.4.1. Tipos de Ranking', 3)
for i, b in enumerate([
    '**Top Álbumes (global):** Listado descendente por calificación promedio.',
    '**Top Canciones (global):** Las pistas individuales mejor valoradas, sin importar álbum.',
    '**Top por Año:** Filtro por año de lanzamiento.',
    '**Top por Género:** Listado segmentado por género musical.',
    '**Top por Host:** Calificaciones agrupadas por crítico.',
    '**Hall of Fame:** Álbumes con calificación ≥ 9.0.',
    '**Hall of Shame:** Álbumes con calificación ≤ 3.0.',
], 1):
    add_numbered(doc, b)

add_heading(doc, '2.4.2. Reglas de Visualización', 3)
for b in [
    'Mostrar **portada, título, artista, calificación y posición** (#1, #2, etc.).',
    'Ordenamiento principal: calificación descendente; desempate por fecha de reseña descendente.',
    'Paginación o scroll infinito a partir de 50 entradas.',
    'Vista "Modo Stream" optimizada para captura por OBS (1920x1080, sin scroll, tipografía grande).',
]:
    add_bullet(doc, b)

add_heading(doc, '2.5. Roles de Usuario', 2)
add_table(doc,
    ['Rol', 'Permisos'],
    [
        ['**Admin**', 'CRUD completo de álbumes, canciones, usuarios, calificaciones y comentarios. Gestión de roles.'],
        ['**Host**', 'Crear álbumes/canciones, emitir calificaciones, dejar comentarios. Editar su propio contenido.'],
        ['**Invitado (Guest Host)**', 'Emitir calificaciones y comentarios durante streams donde haya sido invitado. No puede crear álbumes.'],
        ['**Espectador (público)**', 'Lectura pública de rankings, álbumes y comentarios. No requiere cuenta.'],
        ['**Espectador Registrado (futuro)**', 'Espectador + capacidad de dar "me gusta" a comentarios y mantener favoritos.'],
    ],
    col_widths=[5, 11])

add_heading(doc, '2.6. Modo Presentación / Live Stream', 2)
for b in [
    '**Pantalla de votación en vivo:** Vista grande con el álbum actual, tracklist visible, y campos para introducir notas con teclado o slider.',
    '**Atajos de teclado:** Teclas numéricas para puntuación rápida (1-9 + Shift para .5).',
    '**Overlay para OBS:** Vista en URL dedicada (/live/overlay) con fondo transparente para usar como capa en streaming.',
    '**Indicador de "Calificando ahora":** Estado público que muestra qué álbum se está reseñando en tiempo real.',
]:
    add_bullet(doc, b)

doc.add_page_break()

# ============= SECTION 3 =============
add_heading(doc, '3. ARQUITECTURA TECNOLÓGICA PROPUESTA', 1)

add_heading(doc, '3.1. Stack Recomendado', 2)
add_table(doc,
    ['Capa', 'Tecnología', 'Justificación'],
    [
        ['**Frontend Framework**', 'Next.js 15 (App Router) + React 19 + TypeScript', 'SSR/SSG para SEO en rankings públicos, rutas API integradas, ecosistema robusto, soporte para streaming UI.'],
        ['**UI / Estilos**', 'Tailwind CSS 4 + shadcn/ui + Framer Motion', 'Velocidad de desarrollo, modo oscuro nativo, componentes accesibles y animaciones fluidas para streams.'],
        ['**Backend / API**', 'Next.js API Routes + tRPC o Node.js (Fastify)', 'TypeScript end-to-end, tipado seguro entre cliente y servidor, baja latencia.'],
        ['**Base de Datos**', 'PostgreSQL gestionada (Supabase)', 'Relacional robusta, ideal para Usuarios → Álbumes → Canciones → Calificaciones. Soporte de Row Level Security.'],
        ['**ORM**', 'Prisma o Drizzle ORM', 'Migraciones declarativas, tipado en TypeScript, esquema versionado.'],
        ['**Tiempo Real**', 'Supabase Realtime (WebSockets sobre Postgres)', 'Actualización instantánea de rankings y comentarios sin polling.'],
        ['**Autenticación**', 'Supabase Auth o Auth.js (NextAuth)', 'Soporte OAuth (Google, Twitch, Discord), roles personalizados, JWT.'],
        ['**Almacenamiento de Portadas**', 'Supabase Storage o Cloudflare R2', 'CDN integrado, costo bajo, optimización de imágenes.'],
        ['**Despliegue**', 'Vercel (frontend) + Supabase (backend gestionado)', 'Despliegue automático desde Git, edge functions, escalado transparente.'],
        ['**Monitoreo**', 'Sentry + Vercel Analytics', 'Alertas de errores en producción durante streams en vivo.'],
    ],
    col_widths=[3.5, 5, 8])

add_heading(doc, '3.1.1. Justificación del Stack', 3)
add_para(doc, 'La combinación Next.js + Supabase es óptima para este proyecto porque:')
for b in [
    '**Time-to-market mínimo:** Supabase elimina la necesidad de construir backend de autenticación, almacenamiento y tiempo real desde cero.',
    '**Tipado fuerte end-to-end:** TypeScript en frontend, backend y esquema de BD reduce bugs en producción.',
    '**Tiempo real out-of-the-box:** Los rankings se actualizan al instante para la audiencia sin recargar.',
    '**SEO:** Next.js renderiza los rankings públicos en el servidor, indexables por Google.',
    '**Costo cero/bajo en MVP:** Ambos servicios tienen tier gratuito generoso.',
]:
    add_bullet(doc, b)

add_heading(doc, '3.2. Estructura de Componentes Frontend', 2)
add_code(doc, """/app
├── (public)
│   ├── page.tsx                  → Home con Top Álbumes
│   ├── albums/
│   │   ├── page.tsx              → Listado completo
│   │   └── [slug]/page.tsx       → Detalle de álbum + canciones + comentarios
│   ├── songs/page.tsx            → Top canciones
│   ├── artists/[slug]/page.tsx   → Página de artista
│   └── rankings/page.tsx         → Vista de leaderboards con filtros
│
├── (auth)
│   ├── login/page.tsx
│   └── register/page.tsx
│
├── (dashboard)
│   ├── layout.tsx                → Layout con sidebar para hosts/admin
│   ├── admin/
│   │   ├── albums/page.tsx       → CRUD de álbumes
│   │   ├── users/page.tsx        → Gestión de roles
│   │   └── analytics/page.tsx
│   ├── live/
│   │   ├── page.tsx              → Pantalla de votación en vivo
│   │   └── overlay/page.tsx      → Overlay transparente para OBS
│   └── my-ratings/page.tsx
│
├── api/                          → API Routes (tRPC handlers)
│
└── components/
    ├── ui/                       → shadcn/ui base components
    ├── ratings/
    │   ├── RatingInput.tsx       → Slider 1-10 con paso 0.5
    │   ├── RatingDisplay.tsx     → Visualización con estrellas/badge
    │   └── RatingHistogram.tsx
    ├── albums/
    │   ├── AlbumCard.tsx
    │   ├── AlbumGrid.tsx
    │   ├── TrackList.tsx
    │   └── AlbumHeader.tsx
    ├── comments/
    │   ├── CommentThread.tsx
    │   └── CommentEditor.tsx
    ├── rankings/
    │   ├── Leaderboard.tsx
    │   ├── RankingRow.tsx
    │   └── FilterBar.tsx
    └── live/
        ├── LivePanel.tsx
        ├── KeyboardShortcuts.tsx
        └── StreamOverlay.tsx""")

add_heading(doc, '3.2.1. Principios de UI/UX', 3)
for b in [
    '**Modo oscuro por defecto** con paleta de alto contraste (negro/grafito + acentos neón).',
    '**Tipografía display** para títulos de álbumes (ej. Bebas Neue, Anton) y sans-serif legible para cuerpo (ej. Inter).',
    '**Animaciones sutiles** al actualizarse rankings (Framer Motion) para impacto visual en streams.',
    '**Diseño mobile-first**, pero priorizando la vista 1080p+ para overlays de OBS.',
    '**Accesibilidad WCAG AA**: contraste mínimo, etiquetas ARIA, navegación por teclado completa.',
]:
    add_bullet(doc, b)

add_heading(doc, '3.3. Diseño de Base de Datos', 2)
add_heading(doc, '3.3.1. Diagrama Entidad-Relación (resumen)', 3)
add_code(doc, """users ──< ratings >── songs >── albums >── artists
              │                  │
              └──> comments <─────┘""")

add_heading(doc, '3.3.2. Esquema Detallado de Tablas', 3)

# users table
add_para(doc, 'Tabla: users', bold=True)
add_table(doc, ['Campo', 'Tipo', 'Restricciones'], [
    ['id', 'UUID', 'PK'],
    ['email', 'VARCHAR(255)', 'UNIQUE, NOT NULL'],
    ['username', 'VARCHAR(50)', 'UNIQUE, NOT NULL'],
    ['display_name', 'VARCHAR(100)', 'NOT NULL'],
    ['avatar_url', 'TEXT', 'NULL'],
    ['role', "ENUM('admin','host','guest','viewer')", "NOT NULL, DEFAULT 'viewer'"],
    ['created_at', 'TIMESTAMPTZ', 'DEFAULT NOW()'],
    ['last_seen_at', 'TIMESTAMPTZ', 'NULL'],
])
doc.add_paragraph()

add_para(doc, 'Tabla: artists', bold=True)
add_table(doc, ['Campo', 'Tipo', 'Restricciones'], [
    ['id', 'UUID', 'PK'],
    ['name', 'VARCHAR(200)', 'NOT NULL'],
    ['slug', 'VARCHAR(200)', 'UNIQUE, NOT NULL'],
    ['bio', 'TEXT', 'NULL'],
    ['image_url', 'TEXT', 'NULL'],
    ['created_at', 'TIMESTAMPTZ', 'DEFAULT NOW()'],
])
doc.add_paragraph()

add_para(doc, 'Tabla: albums', bold=True)
add_table(doc, ['Campo', 'Tipo', 'Restricciones'], [
    ['id', 'UUID', 'PK'],
    ['artist_id', 'UUID', 'FK → artists(id), NOT NULL'],
    ['title', 'VARCHAR(255)', 'NOT NULL'],
    ['slug', 'VARCHAR(255)', 'UNIQUE, NOT NULL'],
    ['release_year', 'SMALLINT', 'NOT NULL'],
    ['cover_url', 'TEXT', 'NULL'],
    ['genres', 'TEXT[]', "DEFAULT '{}'"],
    ['label', 'VARCHAR(150)', 'NULL'],
    ['total_duration_seconds', 'INT', 'NULL'],
    ['reviewed_at', 'TIMESTAMPTZ', 'NULL'],
    ['stream_episode_url', 'TEXT', 'NULL'],
    ['created_by', 'UUID', 'FK → users(id)'],
    ['created_at', 'TIMESTAMPTZ', 'DEFAULT NOW()'],
    ['**avg_rating**', 'DECIMAL(3,1)', 'Calculado (vista materializada o trigger)'],
    ['**rating_count**', 'INT', 'Calculado'],
])
doc.add_paragraph()

add_para(doc, 'Tabla: songs', bold=True)
add_table(doc, ['Campo', 'Tipo', 'Restricciones'], [
    ['id', 'UUID', 'PK'],
    ['album_id', 'UUID', 'FK → albums(id), NOT NULL, ON DELETE CASCADE'],
    ['track_number', 'SMALLINT', 'NOT NULL'],
    ['title', 'VARCHAR(255)', 'NOT NULL'],
    ['duration_seconds', 'INT', 'NULL'],
    ['featured_artists', 'TEXT[]', "DEFAULT '{}'"],
    ['is_highlight', 'BOOLEAN', 'DEFAULT FALSE'],
    ['**avg_rating**', 'DECIMAL(3,1)', 'Calculado'],
    ['**rating_count**', 'INT', 'Calculado'],
    ['UNIQUE (album_id, track_number)', '', ''],
])
doc.add_paragraph()

add_para(doc, 'Tabla: ratings', bold=True)
add_table(doc, ['Campo', 'Tipo', 'Restricciones'], [
    ['id', 'UUID', 'PK'],
    ['user_id', 'UUID', 'FK → users(id), NOT NULL'],
    ['song_id', 'UUID', 'FK → songs(id), NULL'],
    ['album_id', 'UUID', 'FK → albums(id), NULL'],
    ['score', 'DECIMAL(3,1)', 'NOT NULL, CHECK (score >= 1 AND score <= 10 AND (score * 2) = FLOOR(score * 2))'],
    ['rating_type', "ENUM('song','album_manual','album_auto')", 'NOT NULL'],
    ['created_at', 'TIMESTAMPTZ', 'DEFAULT NOW()'],
    ['updated_at', 'TIMESTAMPTZ', 'DEFAULT NOW()'],
    ['UNIQUE (user_id, song_id)', '', 'cuando es de canción'],
    ['UNIQUE (user_id, album_id, rating_type)', '', 'cuando es de álbum'],
    ['CHECK ((song_id IS NOT NULL) OR (album_id IS NOT NULL))', '', ''],
])
doc.add_paragraph()

add_para(doc, 'Tabla: comments', bold=True)
add_table(doc, ['Campo', 'Tipo', 'Restricciones'], [
    ['id', 'UUID', 'PK'],
    ['user_id', 'UUID', 'FK → users(id), NOT NULL'],
    ['song_id', 'UUID', 'FK → songs(id), NULL'],
    ['album_id', 'UUID', 'FK → albums(id), NULL'],
    ['parent_comment_id', 'UUID', 'FK → comments(id), NULL (anidación 1 nivel)'],
    ['body', 'TEXT', 'NOT NULL, max 4000 chars'],
    ['created_at', 'TIMESTAMPTZ', 'DEFAULT NOW()'],
    ['updated_at', 'TIMESTAMPTZ', 'DEFAULT NOW()'],
    ['deleted_at', 'TIMESTAMPTZ', 'NULL (soft delete)'],
])
doc.add_paragraph()

add_para(doc, 'Tabla: live_sessions (opcional, tracking de stream actual)', bold=True)
add_table(doc, ['Campo', 'Tipo', 'Restricciones'], [
    ['id', 'UUID', 'PK'],
    ['current_album_id', 'UUID', 'FK → albums(id), NULL'],
    ['started_at', 'TIMESTAMPTZ', 'DEFAULT NOW()'],
    ['ended_at', 'TIMESTAMPTZ', 'NULL'],
    ['host_user_id', 'UUID', 'FK → users(id)'],
])

add_heading(doc, '3.3.3. Índices Recomendados', 3)
for b in [
    'idx_ratings_album_id y idx_ratings_song_id para agregaciones rápidas.',
    'idx_albums_avg_rating DESC para rankings.',
    'idx_songs_avg_rating DESC para top tracks.',
    'idx_comments_album_id y idx_comments_song_id.',
    'idx_albums_release_year y GIN sobre albums.genres para filtros.',
]:
    add_bullet(doc, b)

add_heading(doc, '3.3.4. Triggers y Vistas Materializadas', 3)
for b in [
    '**Trigger update_album_avg_rating:** Tras INSERT/UPDATE/DELETE en ratings, recalcular albums.avg_rating y albums.rating_count.',
    '**Trigger update_song_avg_rating:** Equivalente para canciones.',
    '**Vista materializada mv_leaderboard_albums:** Top 100 álbumes con refresh cada 60 segundos (o on-demand vía función REFRESH MATERIALIZED VIEW).',
    '**Función recalculate_album_from_songs(album_id):** Recalcula album_auto como promedio de las canciones.',
]:
    add_bullet(doc, b)

add_heading(doc, '3.4. Lógica de Votación — Especificación Técnica', 2)
add_heading(doc, '3.4.1. Flujo de Calificación de una Canción', 3)
flow = [
    'El host autenticado abre la vista /live y selecciona el álbum activo.',
    'Para cada canción del tracklist, introduce una nota mediante un slider visual con paso de 0.5 (input range con step="0.5") o atajos de teclado: dígitos 1-9 = nota entera; Shift + dígito = nota + 0.5; 0 = 10.0.',
    'El frontend valida localmente: score ∈ [1, 10] AND (score * 2) % 1 === 0.',
    'Se envía un POST /api/ratings con { song_id, score, rating_type: \'song\' }.',
    'El backend valida nuevamente con la restricción CHECK en la BD.',
    'Si ya existe una calificación de ese usuario para esa canción → UPDATE; si no → INSERT.',
    'El trigger de Postgres recalcula songs.avg_rating y dispara un evento Realtime.',
    'Todos los clientes suscritos (audiencia + overlay OBS) reciben la actualización vía WebSocket.',
]
for s in flow:
    add_numbered(doc, s)

add_heading(doc, '3.4.2. Cálculo del Promedio de Álbum', 3)
add_bullet(doc, '**Modo automático (album_auto):** Se recalcula cuando cambia cualquier rating de canción del álbum.')
add_code(doc, """UPDATE albums
SET avg_rating = ROUND(
  (SELECT AVG(score) FROM ratings
   WHERE album_id = albums.id
     AND rating_type = 'song') * 2
) / 2.0
WHERE id = :album_id;""")
add_bullet(doc, '**Modo manual (album_manual):** Si existe una entrada rating_type = \'album_manual\', ésta prevalece visualmente, pero ambas se persisten.')
add_bullet(doc, '**Modo mixto entre hosts:** Si hay múltiples hosts, el avg_rating mostrado es el promedio de los promedios por host (no de calificaciones planas), evitando que un host con más canciones calificadas distorsione el resultado.')

add_heading(doc, '3.4.3. Redondeo y Visualización', 3)
add_bullet(doc, '**Cálculo interno:** Precisión completa (DECIMAL(10,4) en operaciones intermedias).')
add_bullet(doc, '**Almacenamiento:** DECIMAL(3,1) redondeado al múltiplo de 0.5 más cercano.')
add_bullet(doc, '**Algoritmo de redondeo a 0.5:**')
add_code(doc, """function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}""")
add_bullet(doc, '**Visualización:** Siempre con un decimal explícito (ej. 8.0, no 8).')

add_heading(doc, '3.4.4. Reglas de Integridad', 3)
for b in [
    'Un usuario no puede calificar la misma canción dos veces (restricción UNIQUE).',
    'Una calificación se puede editar siempre que se mantenga el id original (UPDATE, no INSERT nuevo).',
    'Borrar una canción elimina en cascada sus calificaciones y comentarios asociados.',
    'Solo Admin puede borrar un álbum; los hosts pueden archivar sus propias creaciones.',
]:
    add_bullet(doc, b)

add_heading(doc, '3.5. Seguridad', 2)
for b in [
    '**Row Level Security (RLS) en Supabase:** Cada tabla tiene políticas que restringen escritura por rol.',
    '**Sanitización de Markdown:** Librería DOMPurify en comentarios para prevenir XSS.',
    '**Rate limiting:** Máx. 30 calificaciones/minuto por usuario (anti-spam).',
    '**HTTPS obligatorio** + CORS estricto.',
    '**Tokens JWT** con expiración corta (1h) + refresh tokens.',
    '**Auditoría:** Tabla audit_log que registra cambios sensibles (cambio de rol, borrado de álbum).',
]:
    add_bullet(doc, b)

doc.add_page_break()

# ============= SECTION 4 =============
add_heading(doc, '4. PLAN DE DESARROLLO POR FASES (ROADMAP)', 1)

# Phase 1
add_heading(doc, 'Fase 1 — Configuración y Base de Datos', 2)
add_para(doc, 'Duración estimada: 1.5 – 2 semanas', bold=True)
add_para(doc, 'Meta: Tener la infraestructura lista y el modelo de datos funcionando con datos de prueba.', italic=True)

add_heading(doc, 'Entregables', 3)
for b in [
    'Repositorio Git inicializado con Next.js + TypeScript + Tailwind + ESLint + Prettier.',
    'Proyecto Supabase creado con esquema completo (users, artists, albums, songs, ratings, comments).',
    'Migraciones versionadas con Prisma/Drizzle.',
    'Seeds con 5 álbumes reales con tracklists completos para pruebas.',
    'Autenticación básica funcionando (email/password + OAuth Google).',
    'Configuración de variables de entorno (.env.local, .env.production).',
    'Despliegue inicial en Vercel + dominio de staging.',
    'CI/CD configurado (lint, typecheck, build en cada PR).',
]:
    add_numbered(doc, b)

add_heading(doc, 'Criterios de aceptación', 3)
for b in [
    'Es posible crear un usuario, loggearse, y consultar álbumes vía API.',
    'Las restricciones CHECK impiden insertar notas fuera del rango 1-10 paso 0.5.',
    'Las migraciones son reproducibles desde cero.',
]:
    add_bullet(doc, b)

# Phase 2
add_heading(doc, 'Fase 2 — Backend y Lógica de Votación', 2)
add_para(doc, 'Duración estimada: 2 – 3 semanas', bold=True)
add_para(doc, 'Meta: Toda la lógica de votación y agregación opera correctamente vía API.', italic=True)

add_heading(doc, 'Entregables', 3)
add_para(doc, 'Endpoints API (tRPC o REST):', bold=True)
for b in [
    'POST /api/ratings — crear/actualizar calificación.',
    'GET /api/albums/:slug — detalle de álbum con tracklist y promedios.',
    'GET /api/rankings/albums?limit=50&year=2025&genre=metal — leaderboard filtrado.',
    'GET /api/rankings/songs — top canciones.',
    'POST /api/comments — crear comentario.',
    'PATCH /api/albums/:id — editar álbum (admin/host).',
    'DELETE /api/albums/:id — borrar (admin).',
]:
    add_bullet(doc, b, level=1)
for b in [
    'Triggers de Postgres para recalcular promedios automáticamente.',
    'Vista materializada mv_leaderboard_albums con job de refresh.',
    'Validación con Zod en cada endpoint para score y datos de entrada.',
    'Tests unitarios sobre la función roundToHalf y validadores.',
    'Tests de integración sobre el flujo completo: crear álbum → calificar canciones → verificar promedio.',
    'Suscripciones Realtime funcionando para ratings y comments.',
    'Sistema de roles con middleware que valida permisos por endpoint.',
]:
    add_numbered(doc, b)

add_heading(doc, 'Criterios de aceptación', 3)
for b in [
    'Insertar 10 calificaciones produce el promedio matemáticamente correcto.',
    'Una calificación inválida (ej. 7.3) es rechazada en frontend, API y BD.',
    'Los cambios en calificaciones se propagan al cliente en < 500ms.',
]:
    add_bullet(doc, b)

# Phase 3
add_heading(doc, 'Fase 3 — Frontend e Interfaz de Usuario', 2)
add_para(doc, 'Duración estimada: 3 – 4 semanas', bold=True)
add_para(doc, 'Meta: UI completa, atractiva, funcional para hosts y audiencia.', italic=True)

add_heading(doc, 'Entregables', 3)
add_para(doc, 'Vistas Públicas', bold=True)
for b in [
    'Home (/): Hero con Top 10 álbumes + accesos rápidos a rankings.',
    'Listado de álbumes (/albums) con grid de portadas, búsqueda, filtros por género/año.',
    'Detalle de álbum (/albums/[slug]) con portada grande, metadatos, calificación promedio destacada (badge grande), tracklist con notas individuales y comentarios, sección de reseña del álbum.',
    'Detalle de artista (/artists/[slug]) con discografía calificada.',
    'Rankings (/rankings) con tabs: Álbumes, Canciones, Por año, Por género, Hall of Fame.',
]:
    add_numbered(doc, b)

add_para(doc, 'Vistas Privadas', bold=True)
for b in [
    'Login/Registro estilizados.',
    'Dashboard admin (/admin) con CRUD de álbumes, gestión de usuarios.',
    'Pantalla de votación en vivo (/live): selector de álbum activo, tracklist con sliders/botones para cada canción, atajos de teclado documentados visualmente, indicador de promedio actualizándose en vivo.',
    'Overlay OBS (/live/overlay): fondo transparente, card flotante con álbum actual + última nota emitida + promedio actual, animaciones al actualizarse (Framer Motion).',
]:
    add_numbered(doc, b)

add_para(doc, 'Componentes clave', bold=True)
for b in [
    'RatingInput — slider + input numérico + atajos de teclado.',
    'RatingDisplay — badge con color según rango (rojo <4, amarillo 4–6, verde 6–8, oro >8).',
    'Leaderboard — tabla responsive con paginación.',
    'CommentThread — hilo con replies y editor en línea.',
]:
    add_numbered(doc, b)

add_heading(doc, 'Criterios de aceptación', 3)
for b in [
    'Toda la app funciona en modo oscuro de forma nativa.',
    'La vista /live permite calificar un álbum de 12 canciones en < 90 segundos.',
    'El overlay funciona correctamente como capa transparente en OBS Studio.',
    'Lighthouse Performance ≥ 90 en rankings públicos.',
]:
    add_bullet(doc, b)

# Phase 4
add_heading(doc, 'Fase 4 — Despliegue y Pruebas en Vivo', 2)
add_para(doc, 'Duración estimada: 1 – 2 semanas', bold=True)
add_para(doc, 'Meta: Plataforma en producción, validada en transmisiones reales y optimizada.', italic=True)

add_heading(doc, 'Entregables', 3)
add_para(doc, 'Configuración de producción:', bold=True)
for b in [
    'Dominio definitivo + SSL.',
    'Variables de entorno productivas.',
    'Backups automáticos de Supabase.',
]:
    add_bullet(doc, b, level=1)
add_para(doc, 'Optimización para streaming:', bold=True)
for b in [
    'Pre-render de portadas en múltiples resoluciones.',
    'Caché agresivo con stale-while-revalidate en rankings.',
    'Tiempo de respuesta API < 200ms (p95).',
]:
    add_bullet(doc, b, level=1)
add_para(doc, 'Monitorización:', bold=True)
for b in [
    'Sentry para errores en frontend y API.',
    'Alertas Slack/Discord ante caída del servicio.',
    'Dashboard de uso (Vercel Analytics + Supabase metrics).',
]:
    add_bullet(doc, b, level=1)
add_para(doc, 'Pruebas en vivo:', bold=True)
for b in [
    'Prueba 1: Stream de prueba interno con 2 hosts calificando 1 álbum.',
    'Prueba 2: Stream real con audiencia limitada (beta cerrada).',
    'Prueba 3: Lanzamiento público.',
]:
    add_bullet(doc, b, level=1)
add_para(doc, 'Documentación:', bold=True)
for b in [
    'Guía de uso para hosts (PDF + vídeo).',
    'Manual de configuración de OBS con overlay.',
    'README técnico para futuros desarrolladores.',
]:
    add_bullet(doc, b, level=1)
add_para(doc, 'Plan de mantenimiento:', bold=True)
for b in [
    'Política de backups (diarios, retención 30 días).',
    'Ventana de mantenimiento semanal fuera de horas de stream.',
    'Roadmap de Fase 5 (móvil, integración Spotify, votación pública).',
]:
    add_bullet(doc, b, level=1)

add_heading(doc, 'Criterios de aceptación', 3)
for b in [
    '0 errores críticos durante el primer stream público.',
    'Tiempo de carga de página inicial < 2 segundos.',
    'Latencia de actualización de rankings < 1 segundo durante el stream.',
    'Feedback positivo de al menos 80% de la audiencia encuestada.',
]:
    add_bullet(doc, b)

doc.add_page_break()

# ============= SECTION 5: RIESGOS =============
add_heading(doc, '5. RIESGOS Y MITIGACIONES', 1)
add_table(doc,
    ['Riesgo', 'Impacto', 'Probabilidad', 'Mitigación'],
    [
        ['Caída de Supabase durante stream', 'Alto', 'Baja', 'Backups + plan B con BD local; mostrar última versión cacheada.'],
        ['Errores de cálculo de promedios', 'Alto', 'Media', 'Tests unitarios exhaustivos; restricciones a nivel BD; auditoría manual de primeros streams.'],
        ['Sobrecarga al hacerse viral', 'Medio', 'Media', 'Caché agresivo en rankings públicos; CDN; escalado automático de Vercel.'],
        ['Bug en input de votación en vivo', 'Alto', 'Media', 'Atajos de teclado redundantes; modo manual de respaldo (volver a Excel temporalmente).'],
        ['Comentarios ofensivos públicos', 'Medio', 'Media', 'Moderación admin; rate limiting; lista de palabras bloqueadas.'],
    ],
    col_widths=[5, 2, 2.5, 6.5])

doc.add_page_break()

# ============= SECTION 6: RESUMEN =============
add_heading(doc, '6. RESUMEN EJECUTIVO', 1)
add_para(doc,
    'BeatBoard transformará el flujo de trabajo del canal de reacciones musicales pasando de hojas de '
    'cálculo estáticas a una plataforma web profesional, en tiempo real y consultable públicamente. El '
    'stack propuesto (Next.js + Supabase + TypeScript) prioriza la velocidad de desarrollo, la robustez '
    'y la escalabilidad sin sobreingeniería. El sistema de votación queda definido con precisión '
    'matemática (1.0–10.0, paso 0.5) tanto a nivel de validación frontend, API y restricciones de base '
    'de datos. El roadmap de 4 fases entrega un MVP funcional en aproximadamente 8–11 semanas, listo '
    'para mejorar la experiencia tanto del host durante el stream como de la audiencia que consulta el '
    'histórico.')

doc.add_paragraph()
end = doc.add_paragraph()
end.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = end.add_run('— Fin del documento —')
r.italic = True
r.font.size = Pt(11)

# Save
output_path = r'C:\Users\usuario\Desktop\Programacion\Portafolio\beatboard\Plan_Proyecto_BeatBoard.docx'
doc.save(output_path)
print(f'OK: {output_path}')
