# ShellMind — Plan de desarrollo hasta lanzamiento
> Actualizar al cerrar cada sesión. [x] = hecho, [~] = a medias

## Fase 1 — Higiene (1-2 días)
- [x] Unificar versión a 0.6.0 (header de shellmind.php + SHELLMIND_VERSION)
- [x] .gitignore (error_log, *.bak, backups)
- [x] Limpiar .bak y dir {includes,api,admin} del repo
- [x] Quitar error_log del repo
- [x] build_system_prompt() inyecta CLAUDE.md
- [x] Crear DEVLOG.md y flujo de cierre de sesión

## Fase 2 — Modo Diseñador completo (3-5 días)
- [ ] Preview por inyección de <style> en vivo (aplicar/descartar)
- [ ] Editor CSS manual sin IA (latencia cero)
- [ ] Modo IA conectado al preview (streaming)
- [ ] Botón "publicar": escribe widget.css con backup previo

## Fase 3 — Análisis de sitio + SEO (1-2 semanas)
- [ ] Tool get_site_overview (páginas, posts, productos, tema, plugins)
- [ ] Tool analyze_seo (titles/metas Yoast, alt faltantes, H1, descriptions)
- [ ] Tool get_page_content
- [ ] Reporte con sugerencias aplicables una por una

## Fase 4 — Cambios estructurales + Woo (2 semanas)
- [ ] Tool create_page / update_post_content
- [ ] Tool bulk_update con dry-run obligatorio
- [ ] Tool get_woo_overview (productos incompletos, sugerencias)

## Fase 5 — Pre-lanzamiento (1-2 semanas)
- [ ] Sanitización + nonces + capability checks en REST
- [ ] readme.txt formato WordPress.org
- [ ] Onboarding de API key
- [ ] Probar en WP limpio (no studio.uy)
- [ ] Freemius / modelo freemium
