# ShellMind — Contexto del Proyecto

## Qué es

Plugin WordPress propio que actúa como terminal de servidor con IA. Permite chatear con Claude (claude-sonnet-4-6) para leer, editar archivos del servidor, hacer backups y operar el sitio desde una interfaz de chat dentro del admin de WordPress. Como Elementor pero por chat: describís el cambio, Claude propone el diff, vos publicás. También puede generar imágenes con Flux (Replicate).

## Repo

https://github.com/cardellinoweb-a11y/shellmind

## Sitio de producción

https://studio.uy
Path: /home/hgcomuy/public_html/wp-content/plugins/shellmind/
PHP 7.4.33 | WP 7.0 | Hosting: cPanel SiteJet

## Usuario GitHub

cardellinoweb-a11y

## Stack técnico

- Backend: PHP / WordPress plugin API / REST API de WP
- IA: Claude Sonnet 4-6 via Anthropic API (claude-sonnet-4-6)
- Imágenes: Replicate API — Flux Schnell (black-forest-labs/flux-schnell) ~$0.003/imagen
- Frontend: PHP views + CSS/JS vanilla
- Tools del agente: read_file, list_directory, propose_file_edit, generate_image
- Max tokens: 8192
- License: GPL v2

## Estructura del proyecto
