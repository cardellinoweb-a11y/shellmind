# ShellMind - Contexto del Proyecto

> Plugin WordPress propio (v0.5.2) que actua como terminal de servidor con IA.
> Permite chatear con Claude para leer/editar archivos del servidor, hacer backups
> y operar el sitio desde el admin de WP. "Como Elementor pero por chat": describis
> el cambio, Claude propone el diff, vos publicas. Tambien genera imagenes con Flux.

## Identidad y entorno
- Repo: https://github.com/cardellinoweb-a11y/shellmind
- Produccion: https://studio.uy (WordPress + Elementor)
- Path: /home/hgcomuy/public_html/wp-content/plugins/shellmind/
- PHP 7.4.33 | WP 7.0 | Hosting: cPanel SiteJet | Usuario admin WP: cardellinoweb
- Usuario GitHub: cardellinoweb-a11y

## Stack
- Backend: PHP / WordPress Plugin API / REST API de WP
- IA: Claude Sonnet (claude-sonnet-4-6) via Anthropic API - max_tokens 8192 - streaming SSE
- Imagenes: Replicate - Flux Schnell (black-forest-labs/flux-schnell) ~0.003 USD/img
- Frontend: vistas PHP + CSS/JS vanilla
- License: GPL v2

## Estructura del proyecto
shellmind.php                      # Bootstrap: constantes, requires, hooks
includes/
  class-claude-api.php             # Nucleo IA: chat, stream_chat (SSE), call_api,
                                   #   build_system_prompt(), widget_chat, Replicate/Flux
  class-file-editor.php            # Lectura/escritura de archivos del servidor
  class-backup-manager.php         # Backups en wp-content/shellmind-backups/
api/
  class-rest-api.php               # Endpoints REST de WP
admin/
  class-admin.php                  # Encola assets (admin + widget frontend)
  views/page-chat.php              # UI del chat (admin)
  views/page-settings.php          # Ajustes (API keys, etc.)
  views/page-backups.php           # Gestion de backups
assets/
  css/widget.css                   # Estilos del chat flotante (FRONTEND, studio.uy)
  css/chat.css                     # Estilos del chat del admin
  js/widget.js                     # Logica del widget frontend
  js/chat.js                       # Logica del chat admin
CLAUDE.md                          # ESTE archivo (contexto persistente)

## Tools del agente
- read_file              - leer un archivo del servidor
- list_directory         - listar contenido de un directorio
- propose_file_edit      - proponer un diff (confirmacion del usuario antes de aplicar)
- generate_image         - generar imagen con Flux/Replicate
- list_pages             - listar paginas de WP con sus post_ids
- read_elementor_page    - leer el JSON de widgets Elementor de una pagina
- propose_elementor_edit - proponer edicion Elementor en DB (confirmacion del usuario)

## Reglas de comportamiento (IMPORTANTE)
- SIEMPRE proponer el cambio como diff y esperar confirmacion antes de escribir.
- Antes de editar un archivo, leerlo con read_file; no asumir su contenido.
- Hacer backup antes de toda escritura destructiva.
- Cambios de diseno del WIDGET -> editar assets/css/widget.css (NO chat.css).
- Cambios de diseno del ADMIN  -> editar assets/css/chat.css.
- No tocar shellmind.php ni clases del core para cambios de estilo.
- Mantener PHP 7.4 compatible (sin sintaxis de PHP 8+).

## Flujo de desarrollo de CSS/HTML (local, sin latencia)
- Prototipar reglas en vivo con DevTools en studio.uy, luego volcarlas al .css.
- Cache-busting de assets: usar filemtime() en class-admin.php (en vez de
  SHELLMIND_VERSION fija) para ver cambios al instante. Purgar SpeedyCache al desarrollar.

## Pendientes / notas
- generate_image existe como tool pero no esta documentada en el system prompt -> agregar linea.
- widget.js actual (714 lineas) es MAS NUEVO que widget.js.backup_20260608 (391) -> el backup es solo referencia.
- PLAN.md tiene el roadmap por fases; DEVLOG.md el diario de sesiones. Actualizar ambos al cerrar cada sesion.
