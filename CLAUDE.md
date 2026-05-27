# ShellMind — Contexto del Proyecto

## Qué es
Plugin WordPress que permite editar archivos del servidor via chat con Claude.
Como Elementor pero por chat — describís el cambio, Claude propone el diff, vos publicás.

## Repo
https://github.com/cardellinoweb-a11y/shellmind

## Sitio de prueba
https://studio.uy
Path: /home/hgcomuy/public_html/wp-content/plugins/shellmind/
PHP 7.4.33 | WP 7.0 | Hosting: cPanel SiteJet

## Estado actual v0.3.0
✅ Chat con Claude (REST API)
✅ Lee archivos del servidor (tool use)
✅ Diff visual + botón Publicar
✅ Backup automático antes de editar
✅ Widget frontend visitantes
✅ Modo Diseñador en widget (solo admins)
✅ Contador de tokens
✅ Código en GitHub

## Problema principal
Hosting compartido bloquea SSE streaming → respuestas tardan 45-60s
Solución pendiente: Cloudflare Worker o cambio a VPS ($6/mes DigitalOcean)

## Rate limit Anthropic
Tier 1: 30k tokens/min → sube automático al gastar $5 USD
Total gastado hasta hoy: ~$1.13

## Config API
Modelo: claude-sonnet-4-6
max_tokens: 4096
timeout: 60s
Historial activo: 2 mensajes

## Fases del proyecto

### ✅ FASE 1 — Core (completada)
- Chat con Claude en WP Admin
- Leer/editar archivos con diff visual
- Backup automático
- Widget frontend

### 🔄 FASE 2 — En progreso
- [ ] Chat flotante sobre el sitio (como Chrome sidebar)
- [ ] Cloudflare Worker para SSE streaming
- [ ] Optimizar tiempo de respuesta

### 📋 FASE 3 — Pendiente
- [ ] Onboarding wizard al instalar
- [ ] Integrar Freemius (licencias $49/año)
- [ ] Subir a WordPress.org
- [ ] Landing page en studio.uy

### 🚀 FASE 4 — Futuro
- [ ] Theme + Plugin pack ($199)
- [ ] Multi-idioma EN/ES
- [ ] Programa de afiliados

## Modelo de negocio
- Free: WordPress.org (3 ediciones/día)
- Pro: $49/año por sitio
- Agency: $149/año hasta 10 sitios
- Plataforma: Freemius

## Cómo retomar cada día
1. Abrí claude.ai
2. Pegá el contenido de este archivo CLAUDE.md
3. Escribí: "Continuamos con ShellMind. ¿Por dónde seguimos?"
