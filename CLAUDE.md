# ShellMind  Contexto del Proyecto

## Que es

Plugin WordPress propio que actua como terminal de servidor con IA.
Permite chatear con Claude (claude-sonnet-4-6) para leer, editar archivos del servidor,
hacer backups y operar el sitio desde una interfaz de chat dentro del admin de WordPress.
Como Elementor pero por chat: describs el cambio, Claude propone el diff, vos publicas.

## Repo

https://github.com/cardellinoweb-a11y/shellmind

## Sitio de produccion

https://studio.uy
Path: /home/hgcomuy/public_html/wp-content/plugins/shellmind/
PHP 7.4.33 | WP 7.0 | Hosting: cPanel SiteJet

## Usuario GitHub

cardellinoweb-a11y

## Stack tecnico

- Backend: PHP / WordPress plugin API / REST API de WP
- IA: Claude Sonnet 4-6 via Anthropic API (claude-sonnet-4-6)
- Frontend: PHP views + CSS/JS vanilla
- Tools del agente: read_file, list_directory, propose_file_edit
- Max tokens: 8192
- License: GPL v2

## Estructura del proyecto

shellmind/
  shellmind.php                      # Plugin bootstrap, v0.3.1
  CLAUDE.md                          # Este archivo
  includes/
    class-claude-api.php             # Claude API + streaming SSE + tool loop
    class-file-editor.php            # Aplica ediciones, genera diffs
    class-backup-manager.php         # Backups automaticos antes de editar
    class-claude-api.php.bak_callapi # Backup del metodo call_api
  api/
    class-rest-api.php               # Endpoints WP REST API
  admin/
    class-admin.php                  # Panel de admin WordPress
  assets/
    js/
      widget.js                      # Widget frontend v0.4.0 + Live Preview Engine v2
      widget.js.bak                  # Backup anterior del widget
      chat.js                        # JS del chat admin
    css/                             # Estilos del plugin

## Version actual

- Plugin bootstrap: v0.3.1
- Widget frontend (widget.js): v0.4.0

## Estado actual

COMPLETADO:
- Chat con Claude (REST API)
- Streaming SSE via curl WRITEFUNCTION (loop hasta 8 iteraciones)
- Lee archivos del servidor (tool: read_file)
- Lista directorios (tool: list_directory)
- Propone ediciones con diff visual (tool: propose_file_edit)
- Boton Publicar / Apply (usuario confirma antes de aplicar)
- Boton Preview antes de publicar
- Boton Sobrescribir
- Backup automatico antes de editar
- Restore de backups
- Widget frontend dual: modo Visitante + modo Disenador
- Modo Disenador activo solo para admins
- Contador de tokens (con reset)
- Codigo en GitHub
- SSE streaming activo en produccion
- Live Preview Engine v2: CSS inject, DOM diff, HTML sections, imagenes

## Live Preview Engine v2 (widget.js v0.4.0)

Implementado en assets/js/widget.js como parte del Modo Disenador.
Funcionalidades del ultimo commit (fb87458):
- CSS inject: aplica estilos en tiempo real en el iframe/pagina
- DOM diff: compara y actualiza nodos del DOM sin recargar
- HTML sections: edita secciones HTML del sitio en vivo
- Imagenes: soporte para preview de cambios en imagenes
Boton "Preview" en el editcard permite ver cambios antes de publicar.

## Endpoints REST (namespace: shellmind/v1)

/chat            POST  admin   Chat bloqueante (fallback)
/chat-stream     POST  admin   Chat con SSE streaming
/apply-edit      POST  admin   Aplica edicion propuesta
/diff            POST  admin   Genera diff entre versiones
/backups         GET   admin   Lista backups disponibles
/restore         POST  admin   Restaura un backup
/widget-chat     POST  public  Chat del widget frontend
/tokens          GET   admin   Stats de tokens usados
/tokens/reset    POST  admin   Resetea contador de tokens
/settings        GET/POST admin Configuracion del plugin

## Tools del agente Claude

read_file         - Lee contenido de un archivo del servidor
list_directory    - Lista archivos en un directorio
propose_file_edit - Propone edicion completa (requiere confirmacion del usuario)

## Config API

- Modelo: claude-sonnet-4-6
- max_tokens: 8192
- Streaming: SSE via curl WRITEFUNCTION
- Tool loop: max 8 iteraciones
- Historial: 2 mensajes activos

## Problema conocido (resuelto parcialmente)

Hosting compartido SiteJet puede bloquear SSE en algunos casos.
El endpoint /chat-stream usa curl directo con WRITEFUNCTION para bypasear timeouts de WP HTTP.
Actualmente funcional en produccion.
Solucion pendiente largo plazo: migrar a VPS ($6/mes DigitalOcean).

## Rate limit Anthropic

- Tier 1: 30k tokens/min (sube automatico al gastar $5 USD)
- Total gastado hasta hoy: ~$1.13

## Fases del proyecto

FASE 1 - Core (COMPLETADA)
- Chat con Claude en WP Admin
- Leer/editar archivos con diff visual
- Backup automatico
- Widget frontend

FASE 1.5 - Streaming (COMPLETADA)
- SSE streaming via curl WRITEFUNCTION
- Tool-use loop interno (hasta 8 iteraciones)
- Eventos SSE: delta, tool_start, tool_done, edit, done, error

FASE 2 - Live Preview (COMPLETADA)
- Widget v0.4.0 dual mode: Visitante + Disenador
- Live Preview Engine v2: CSS inject, DOM diff, HTML sections, imagenes
- Boton Preview antes de publicar

FASE 3 - En progreso
- Optimizar UX del widget
- Panel de admin mejorado
- Onboarding wizard al instalar

FASE 4 - Pendiente
- Integrar Freemius (licencias $49/anio)
- Subir a WordPress.org
- Landing page en studio.uy

FASE 5 - Futuro
- Theme + Plugin pack ($199)
- Multi-idioma EN/ES
- Programa de afiliados

## Modelo de negocio

- Free: WordPress.org (3 ediciones/dia)
- Pro: $49/anio por sitio
- Agency: $149/anio hasta 10 sitios
- Plataforma: Freemius

## Como retomar cada dia

1. Abri claude.ai (o usa ShellMind en el admin)
2. Pega el contenido de este archivo CLAUDE.md
3. Escripi: "Continuamos con ShellMind. Por donde seguimos?"

## Ultima actualizacion

2025-05-27 - Widget actualizado a v0.4.0. Live Preview Engine v2 implementado
(CSS inject, DOM diff, HTML sections, imagenes). Estructura del proyecto
actualizada con nuevos archivos en assets/js.
