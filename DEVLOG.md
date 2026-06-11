# ShellMind — Devlog de sesiones
> Entrada nueva ARRIBA al cerrar cada sesión: hecho / a medias / próximo paso / decisiones.

## 2026-06-11 (fix selectores design-ops)
- Bug hallado: design_ops inventaba selectores .elementor-* pero la home es template custom (sin Elementor) -> CSS publicado apuntaba al vacio. En otro intento pinto button#smw-send (su propio boton de enviar) porque el unico <button> de la pagina era el del widget.
- Fix en 3 capas: pageContext emite selectores reales verificados con texto visible (SELECTOR | "texto") excluyendo el propio widget; prompt de design_ops con regla estricta; applyOps valida cada selector contra el DOM, descarta los que no matchean y avisa. Solo ops aplicadas se publican.
- Limpieza: bloques ShellMind muertos removidos del Additional CSS (1074 -> 168 bytes).

## 2026-06-11 (Fase 2: publicar CSS)
- Hecho: botones Publicar/Descartar del preview ahora se renderizan (DOM + clases) y funcionan via delegacion. Nuevo endpoint publish-css: convierte ops a CSS sanitizado y persiste en Additional CSS (wp_update_custom_css_post) con backup en shellmind-backups/files/ y audit log. design-ops asegurado: solo manage_options.
- Pendiente: ops de texto (op=text) quedan solo en preview; persistirlas requiere edicion Elementor. Editor CSS manual sin IA aun no hecho.
- Proximo paso: probar ciclo completo describir -> preview -> Publicar -> recargar. Despues: editor manual.

## 2026-06-11 (cierre Fase 1)
- Hecho: version unificada a 0.6.0. build_system_prompt() ahora inyecta CLAUDE.md como PROJECT CONTEXT. CLAUDE.md actualizado (7 tools reales incl. Elementor, pendientes al dia). PLAN.md: Fase 1 completa.
- Verificado: widget.js actual tiene 714 lineas (mas nuevo que el backup de 391). Repo limpio.
- Proximo paso: Fase 2 - preview por inyeccion de <style> en vivo en el modo Disenador.
- Decision: trabajar con Claude (Fable 5) en claude.ai como arquitecto que prepara parches probados; la terminal cPanel los aplica.

## 2026-06-11
- Hecho: recuperado contexto post-pérdida de historial. Confirmado que CLAUDE.md quedó pusheado. Creados PLAN.md y DEVLOG.md. Definido método de memoria: CLAUDE.md (largo plazo) + DEVLOG.md (corto plazo) + PLAN.md (progreso).
- A medias: Fase 1 de higiene.
- Próximo paso: unificar versión a 0.6.0 e inyectar CLAUDE.md en build_system_prompt().
- Decisión: sesiones de CSS sin IA (DevTools + modo manual); API solo para lógica y análisis.
