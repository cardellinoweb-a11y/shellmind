/* ShellMind Widget v0.4.0 — Dual mode: Visitor + Designer + Live Preview Engine */
(function () {
  'use strict';
  if (typeof SMWidget === 'undefined') return;

  /* ── SVGs ──────────────────────────────────────────── */
  const BRAIN = `<svg width="22" height="22" viewBox="0 0 80 80" fill="none">
    <circle cx="40" cy="16" r="3.5" fill="#4dd9ff" opacity=".9"/>
    <circle cx="20" cy="28" r="3.5" fill="#4dd9ff" opacity=".9"/>
    <circle cx="60" cy="28" r="3.5" fill="#4dd9ff" opacity=".9"/>
    <circle cx="12" cy="44" r="3.5" fill="#4dd9ff" opacity=".8"/>
    <circle cx="40" cy="42" r="3.5" fill="#4dd9ff"/>
    <circle cx="68" cy="44" r="3.5" fill="#4dd9ff" opacity=".8"/>
    <circle cx="24" cy="60" r="3.5" fill="#4dd9ff" opacity=".9"/>
    <circle cx="56" cy="60" r="3.5" fill="#4dd9ff" opacity=".9"/>
    <circle cx="40" cy="68" r="3" fill="#4dd9ff" opacity=".7"/>
    <line x1="40" y1="16" x2="20" y2="28" stroke="#4dd9ff" stroke-width="1.2" opacity=".5"/>
    <line x1="40" y1="16" x2="60" y2="28" stroke="#4dd9ff" stroke-width="1.2" opacity=".5"/>
    <line x1="40" y1="16" x2="40" y2="42" stroke="#4dd9ff" stroke-width="1" opacity=".3"/>
    <line x1="20" y1="28" x2="12" y2="44" stroke="#4dd9ff" stroke-width="1.2" opacity=".5"/>
    <line x1="20" y1="28" x2="40" y2="42" stroke="#4dd9ff" stroke-width="1" opacity=".35"/>
    <line x1="60" y1="28" x2="68" y2="44" stroke="#4dd9ff" stroke-width="1.2" opacity=".5"/>
    <line x1="60" y1="28" x2="40" y2="42" stroke="#4dd9ff" stroke-width="1" opacity=".35"/>
    <line x1="12" y1="44" x2="24" y2="60" stroke="#4dd9ff" stroke-width="1.2" opacity=".5"/>
    <line x1="68" y1="44" x2="56" y2="60" stroke="#4dd9ff" stroke-width="1.2" opacity=".5"/>
    <line x1="40" y1="42" x2="24" y2="60" stroke="#4dd9ff" stroke-width="1" opacity=".35"/>
    <line x1="40" y1="42" x2="56" y2="60" stroke="#4dd9ff" stroke-width="1" opacity=".35"/>
    <line x1="24" y1="60" x2="40" y2="68" stroke="#4dd9ff" stroke-width="1.2" opacity=".5"/>
    <line x1="56" y1="60" x2="40" y2="68" stroke="#4dd9ff" stroke-width="1.2" opacity=".5"/>
    <line x1="24" y1="60" x2="56" y2="60" stroke="#4dd9ff" stroke-width="1" opacity=".25"/>
  </svg>`;
  const SEND = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;

  /* ── State ─────────────────────────────────────────── */
  const S = {
    visitorMsgs:  [],
    designerMsgs: [],
    busy:    false,
    designer: false,
    edit:    null,
  };

  const isAdmin = !!SMWidget.isAdmin;

  /* ── Build DOM ─────────────────────────────────────── */
  const root = document.createElement('div');
  root.id = 'smw-root';
  root.innerHTML = `
    <button id="smw-btn" aria-label="Abrir chat Claude IA">
      <div id="smw-btn-brain">${BRAIN}</div>
      <div id="smw-btn-label">
        <div id="smw-btn-title">Claude IA</div>
        <div id="smw-btn-sub">Asistente inteligente</div>
      </div>
      <div id="smw-btn-dot"></div>
      <div id="smw-badge"></div>
    </button>

    <div id="smw-overlay" role="dialog" aria-modal="true">
      <div id="smw-dialog">

        <div id="smw-header">
          <div class="smw-header-top">
            <div id="smw-header-brain">${BRAIN}</div>
            <div id="smw-header-info">
              <div id="smw-header-name">Claude IA</div>
              <div id="smw-header-site">${SMWidget.siteName}</div>
            </div>
            <div class="smw-header-actions">
              <button id="smw-mode-btn" title="Activar modo diseñador">🎨 Diseñador</button>
              <button id="smw-close" aria-label="Cerrar">✕</button>
            </div>
          </div>
          <div id="smw-designer-badge">⚡ Modo Diseñador activo</div>
        </div>

        <div id="smw-messages"></div>

        <div id="smw-editcard">
          <div class="smw-ec-bar">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;color:rgba(255,255,255,.3)"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            <span id="smw-ec-file" class="smw-ec-filename"></span>
            <span id="smw-ec-status" class="smw-ec-status"></span>
            <span id="smw-ec-desc" class="smw-ec-desc"></span>
            <button id="smw-ec-close" class="smw-ec-x" aria-label="Cerrar">✕</button>
          </div>
          <div class="smw-ectabs">
            <button id="smw-ect-diff" class="smw-ectab smw-ectab--on">Diff</button>
            <button id="smw-ect-full" class="smw-ectab">Archivo completo</button>
          </div>
          <div id="smw-ec-code"></div>
          <div class="smw-ec-actions">
            <button id="smw-ea-prev" class="smw-btn-prev" title="Ver preview en el sitio antes de publicar">👁 Preview</button>
            <button id="smw-ea-pub"  class="smw-btn-pub">▲ Publicar</button>
            <button id="smw-ea-over" class="smw-btn-over">⚠ Sobrescribir</button>
            <button id="smw-ea-rej"  class="smw-btn-rej">✕ Rechazar</button>
          </div>
        </div>

        <div id="smw-input-area">
          <textarea id="smw-input" placeholder="Describí el cambio de diseño…" rows="1"></textarea>
          <button id="smw-send">${SEND}</button>
        </div>

      </div>
    </div>
  `;

  document.body.appendChild(root);

  /* ── Refs ──────────────────────────────────────────── */
  function $(id) { return document.getElementById(id); }
  const overlay  = $('smw-overlay');
  const btn      = $('smw-btn');
  const badge    = $('smw-badge');
  const feed     = $('smw-messages');
  const input    = $('smw-input');
  const sendBtn  = $('smw-send');
  const editcard = $('smw-editcard');
  const modeBtn  = $('smw-mode-btn');
  const desBadge = $('smw-designer-badge');

  /* ── Toggle open/close ─────────────────────────────── */
  btn.addEventListener('click', () => {
    overlay.classList.add('smw-open');
    badge.style.display = 'none';
    badge.textContent = '0';
    input.focus();
  });
  $('smw-close').addEventListener('click', () => overlay.classList.remove('smw-open'));

  /* ── Designer mode toggle ──────────────────────────── */
  if (isAdmin) {
    modeBtn.style.display = 'block';
    modeBtn.addEventListener('click', () => {
      S.designer = !S.designer;
      desBadge.style.display = S.designer ? 'block' : 'none';
      modeBtn.textContent = S.designer ? '👤 Visitante' : '🎨 Diseñador';
      input.placeholder = S.designer ? 'Describí el cambio de diseño…' : 'Hacé una pregunta…';
      if (!S.designer) {
        closeEditCard();
        addSys('👤 Modo Visitante activado.');
      }
    });
  }

  /* ── Send ──────────────────────────────────────────── */
  sendBtn.addEventListener('click', send);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });

  function send() {
    const text = input.value.trim();
    if (!text || S.busy) return;
    addBubble('user', text);
    input.value = '';
    if (S.designer && isAdmin) {
      sendDesigner(text);
    } else {
      sendVisitor(text);
    }
  }

  /* ── Visitor mode ──────────────────────────────────── */
  function sendVisitor(text) {
    S.visitorMsgs.push({ role: 'user', content: text });
    const tid = addTyping(); setBusy(true);
    fetch(SMWidget.restUrl + 'widget-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: S.visitorMsgs }),
    })
      .then(r => r.json())
      .then(r => {
        removeEl(tid);
        const txt = r.text || r.message || '⚠ Sin respuesta';
        addBubble('bot', txt);
        if (r.text) S.visitorMsgs.push({ role: 'assistant', content: r.text });
        showBadgeIfClosed();
      })
      .catch(() => { removeEl(tid); addBubble('bot', '⚠ Error de conexión.'); })
      .finally(() => setBusy(false));
  }

  /* ── Designer mode ─────────────────────────────────── */
  function sendDesigner(text) {
    S.designerMsgs.push({ role: 'user', content: text });
    const tid = addTyping(); setBusy(true);
    fetch(SMWidget.restUrl + 'chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': SMWidget.nonce },
      body: JSON.stringify({ messages: S.designerMsgs }),
    })
      .then(r => r.json())
      .then(r => {
        removeEl(tid);
        if (r.type === 'message') {
          addBubble('bot', r.text);
          S.designerMsgs.push({ role: 'assistant', content: r.text });
        } else if (r.type === 'pending_edit') {
          if (r.text) addBubble('bot', r.text);
          S.edit = r.edit;
          openEditCard(r.edit);
        } else if (r.code) {
          addBubble('bot', '❌ ' + (r.message || r.code));
        }
        showBadgeIfClosed();
      })
      .catch(e => { removeEl(tid); addBubble('bot', '❌ ' + e.message); })
      .finally(() => setBusy(false));
  }

  /* ── Edit card ─────────────────────────────────────── */
  $('smw-ect-diff').addEventListener('click', () => switchTab('diff'));
  $('smw-ect-full').addEventListener('click', () => switchTab('full'));
  $('smw-ec-close').addEventListener('click', closeEditCard);
  $('smw-ea-prev').addEventListener('click', () => Preview.apply(S.edit));
  $('smw-ea-pub').addEventListener('click',  () => applyEdit(false));
  $('smw-ea-over').addEventListener('click', () => {
    if (confirm('⚠ Sobrescribir sin backup. ¿Continuar?')) applyEdit(true);
  });
  $('smw-ea-rej').addEventListener('click', rejectEdit);

  function openEditCard(edit) {
    $('smw-ec-file').textContent = edit.file;
    $('smw-ec-desc').textContent = edit.description;
    setEcStatus('Revisá antes de publicar', '');
    enableEcBtns(true);
    $('smw-ea-pub').textContent = '▲ Publicar';

    let pre = $('smw-fullpre-el');
    if (!pre) { pre = document.createElement('pre'); pre.className = 'smw-fullpre'; pre.id = 'smw-fullpre-el'; $('smw-ec-code').appendChild(pre); }
    pre.textContent = edit.new_content;

    let dw = $('smw-dlwrap'); if (dw) dw.remove();
    const ph = document.createElement('div'); ph.id = 'smw-dlwrap';
    ph.innerHTML = '<div class="smw-dl smw-dl--s"><span class="smw-dn"></span><span class="smw-dn"></span><span class="smw-dg"></span><span class="smw-dt" style="color:rgba(255,255,255,.2)">Calculando diff…</span></div>';
    $('smw-ec-code').prepend(ph);

    editcard.classList.add('smw-open');
    switchTab('diff');

    // Aplicar preview automático inmediato
    Preview.apply(edit);

    fetch(SMWidget.restUrl + 'diff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': SMWidget.nonce },
      body: JSON.stringify({ file: edit.file, new_content: edit.new_content }),
    })
      .then(r => r.json())
      .then(d => renderDiff(d))
      .catch(() => {});
  }

  function renderDiff(d) {
    const wrap = document.createElement('div'); wrap.id = 'smw-dlwrap';
    if (d.type === 'new_file') {
      d.lines.forEach((l, i) => wrap.appendChild(mkDl('a', '', i+1, '+', l)));
    } else {
      (d.hunks || []).forEach((hunk, hi) => {
        if (hi > 0) { const s = document.createElement('div'); s.className = 'smw-dl smw-dl--sep'; s.textContent = '···'; wrap.appendChild(s); }
        hunk.forEach(ln => {
          const t = ln.type;
          wrap.appendChild(mkDl(t==='same'?'s':t==='add'?'a':'r',
            t!=='add'?(ln.old_no||''):'', t!=='remove'?(ln.new_no||''):'',
            t==='add'?'+':t==='remove'?'-':' ', ln.content));
        });
      });
    }
    const old = $('smw-dlwrap'); if (old) old.replaceWith(wrap);
  }

  function mkDl(type, oldN, newN, g, txt) {
    const d = document.createElement('div'); d.className = `smw-dl smw-dl--${type}`;
    d.innerHTML = `<span class="smw-dn">${oldN}</span><span class="smw-dn">${newN}</span><span class="smw-dg">${g}</span><span class="smw-dt">${esc(txt??'')}</span>`;
    return d;
  }

  function switchTab(tab) {
    $('smw-ect-diff').classList.toggle('smw-ectab--on', tab==='diff');
    $('smw-ect-full').classList.toggle('smw-ectab--on', tab==='full');
    const dw = $('smw-dlwrap'), fp = $('smw-fullpre-el');
    if (dw) dw.style.display = tab==='diff'?'block':'none';
    if (fp) fp.classList.toggle('smw-fullpre--on', tab==='full');
  }

  function closeEditCard() {
    editcard.classList.remove('smw-open');
    Preview.revert();
  }

  function applyEdit(overwrite) {
    if (!S.edit) return;
    Preview.revert();
    enableEcBtns(false); $('smw-ea-pub').textContent = 'Publicando…'; setEcStatus('Guardando…', 'warn');
    fetch(SMWidget.restUrl + 'apply-edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': SMWidget.nonce },
      body: JSON.stringify({ file: S.edit.file, new_content: S.edit.new_content, overwrite }),
    })
      .then(r => r.json())
      .then(r => {
        if (!r.success) throw new Error(r.error || 'Error');
        setEcStatus(overwrite ? '✅ Sobrescrito' : `✅ Publicado · ${r.backup_name}`, 'ok');
        $('smw-ea-pub').textContent = '✅ Publicado';
        addBubble('bot', `✅ \`${S.edit.file.split('/').pop()}\` actualizado.`);
        S.designerMsgs.push({ role: 'assistant', content: `Cambio aplicado: ${S.edit.file}` });
        S.edit = null;
      })
      .catch(e => { setEcStatus('❌ ' + e.message, 'err'); enableEcBtns(true); $('smw-ea-pub').textContent = '▲ Publicar'; });
  }

  function rejectEdit() {
    closeEditCard(); S.edit = null;
    addBubble('bot', '¿Querés que proponga otra solución?');
    S.designerMsgs.push({ role: 'user', content: 'Rechacé ese cambio. Proponé una alternativa.' });
  }

  function setEcStatus(t, cls) { const el = $('smw-ec-status'); el.textContent = t; el.className = 'smw-ec-status ' + (cls||''); }
  function enableEcBtns(on) { [$('smw-ea-pub'),$('smw-ea-over'),$('smw-ea-rej'),$('smw-ea-prev')].forEach(b => { if(b) b.disabled = !on; }); }

  /* ================================================================
     LIVE PREVIEW ENGINE v2 — Elementor-style, zero server round-trip
     Soporta: CSS, texto, HTML sections, SVG icons, imágenes
  ================================================================ */
  const Preview = {
    _domUndo:    [],   // [{type, node/el, oldVal/parent/nextSibling}]
    _active:     false,
    _pendingImg: [],   // blob URLs a revocar al revertir

    /* Punto de entrada principal */
    apply(edit) {
      if (!edit) return;
      Preview.revert(); // limpiar preview anterior

      const file = (edit.file || '').toLowerCase();
      const ext  = file.split('.').pop();

      if (ext === 'css') {
        Preview._applyCSS(edit.new_content, edit.file);
      } else if (['php','html','htm'].includes(ext)) {
        Preview._applyHTML(edit);
      } else if (ext === 'js') {
        Preview._showUnsupported('JavaScript — preview solo visual no disponible. Revisá el diff y publicá.');
        return;
      } else if (['jpg','jpeg','png','gif','svg','webp'].includes(ext)) {
        Preview._applyImage(edit);
      } else {
        // Intentar DOM diff genérico
        Preview._applyDOMDiff(edit.diff);
      }

      Preview._active = true;
      Preview._showBanner(edit);
    },

    /* ── 1. CSS: inyectar <style> en <head> ──────────────── */
    _applyCSS(cssText, filename) {
      let el = document.getElementById('smw-preview-css');
      if (!el) {
        el = document.createElement('style');
        el.id = 'smw-preview-css';
        document.head.appendChild(el);
        Preview._domUndo.push({ type: 'style-created', el });
      } else {
        Preview._domUndo.push({ type: 'style-content', el, oldVal: el.textContent });
      }
      el.textContent = cssText;
      console.log('[ShellMind Preview] CSS inyectado:', filename);
    },

    /* ── 2. HTML/PHP: diff quirúrgico + secciones nuevas ─── */
    _applyHTML(edit) {
      if (!edit.diff && !edit.new_content) return;

      // Estrategia A: diff quirúrgico línea a línea
      if (edit.diff) {
        const applied = Preview._applyDOMDiff(edit.diff);
        if (applied) return;
      }

      // Estrategia B: detectar bloques nuevos completos (sección, div, etc.)
      if (edit.new_content) {
        Preview._injectHTMLBlock(edit);
      }
    },

    /* ── 3. Diff quirúrgico sobre nodos de texto ─────────── */
    _applyDOMDiff(diff) {
      if (!diff) return false;
      const lines   = diff.split('\n');
      const removed = lines
        .filter(l => l.startsWith('-') && !l.startsWith('---'))
        .map(l => l.slice(1).trim())
        .filter(l => l.length > 3)
        .join(' ')
        .replace(/<[^>]*>/g, '')
        .trim();
      const added = lines
        .filter(l => l.startsWith('+') && !l.startsWith('+++'))
        .map(l => l.slice(1).trim())
        .filter(l => l.length > 3)
        .join(' ')
        .replace(/<[^>]*>/g, '')
        .trim();

      if (!removed || !added) return false;

      // Buscar nodo de texto que contenga el string removido
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        { acceptNode: n => n.parentElement && n.parentElement.id !== 'smw-root' ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT }
      );
      let node, found = false;
      while ((node = walker.nextNode())) {
        if (node.nodeValue && node.nodeValue.trim().includes(removed.substring(0, 40))) {
          Preview._domUndo.push({ type: 'text', node, oldVal: node.nodeValue });
          node.nodeValue = node.nodeValue.replace(removed.substring(0, 40), added.substring(0, 40));
          found = true;
          break;
        }
      }
      return found;
    },

    /* ── 4. Inyectar bloque HTML nuevo (sección, iconos, etc.) ── */
    _injectHTMLBlock(edit) {
      // Detectar si es una sección nueva (no modifica existente)
      const diffLines   = (edit.diff || '').split('\n');
      const onlyAdded   = diffLines.every(l => !l.startsWith('-') || l.startsWith('---'));
      const addedHTML   = diffLines
        .filter(l => l.startsWith('+') && !l.startsWith('+++'))
        .map(l => l.slice(1))
        .join('\n');

      if (!addedHTML.trim()) return;

      // Crear el elemento preview en el DOM
      const wrapper = document.createElement('div');
      wrapper.id    = 'smw-preview-block';
      wrapper.setAttribute('data-smw-preview', '1');
      wrapper.style.cssText = 'outline: 2px dashed #22c55e; outline-offset: 4px; position: relative;';

      // Badge "PREVIEW" sobre el bloque
      const badge = document.createElement('div');
      badge.style.cssText = 'position:absolute;top:0;left:0;background:#22c55e;color:#000;font-size:10px;font-weight:700;padding:2px 6px;z-index:9999;font-family:monospace;';
      badge.textContent = '⚡ PREVIEW';
      wrapper.appendChild(badge);

      // Parsear el HTML y agregarlo
      const tmp = document.createElement('div');
      tmp.innerHTML = addedHTML;
      Array.from(tmp.children).forEach(child => wrapper.appendChild(child.cloneNode(true)));

      // Insertar al final del main content o del body
      const mainContent = document.querySelector('main') || document.querySelector('.entry-content') || document.querySelector('#content') || document.body;
      mainContent.appendChild(wrapper);

      Preview._domUndo.push({ type: 'element', el: wrapper, parent: mainContent });
      console.log('[ShellMind Preview] Bloque HTML inyectado en', mainContent.tagName);
    },

    /* ── 5. Imagen: reemplazar src via blob URL ──────────── */
    _applyImage(edit) {
      if (!edit.new_content) return;
      // edit.new_content puede ser base64 o URL
      const filename = edit.file.split('/').pop();

      // Buscar <img> con ese filename en el src
      const imgs = document.querySelectorAll('img');
      imgs.forEach(img => {
        if (img.src && img.src.includes(filename)) {
          Preview._domUndo.push({ type: 'img', el: img, oldVal: img.src });
          // Si new_content es base64
          if (edit.new_content.startsWith('data:')) {
            img.src = edit.new_content;
          } else if (edit.new_content.startsWith('http')) {
            img.src = edit.new_content;
          }
          console.log('[ShellMind Preview] Imagen reemplazada:', filename);
        }
      });
    },

    /* ── 6. Revertir todo ────────────────────────────────── */
    revert() {
      // Revocar blob URLs
      Preview._pendingImg.forEach(url => URL.revokeObjectURL(url));
      Preview._pendingImg = [];

      // Deshacer cambios DOM en orden inverso
      const undos = Preview._domUndo.reverse();
      undos.forEach(u => {
        try {
          if (u.type === 'style-created') {
            u.el.textContent = '';
          } else if (u.type === 'style-content') {
            u.el.textContent = u.oldVal;
          } else if (u.type === 'text') {
            u.node.nodeValue = u.oldVal;
          } else if (u.type === 'element') {
            if (u.el && u.el.parentNode) u.el.parentNode.removeChild(u.el);
          } else if (u.type === 'img') {
            u.el.src = u.oldVal;
          } else if (u.type === 'attr') {
            u.el.setAttribute(u.attr, u.oldVal);
          }
        } catch(e) { console.warn('[ShellMind Preview] Revert error:', e); }
      });

      Preview._domUndo  = [];
      Preview._active   = false;

      // Sacar banner
      const banner = document.getElementById('smw-live-banner');
      if (banner) banner.remove();
    },

    /* ── 7. Banner flotante ──────────────────────────────── */
    _showBanner(edit) {
      const existing = document.getElementById('smw-live-banner');
      if (existing) existing.remove();

      const ext    = (edit.file || '').split('.').pop().toLowerCase();
      const isCSS  = ext === 'css';
      const isNew  = edit.diff && edit.diff.split('\n').every(l => !l.startsWith('-') || l.startsWith('---'));
      const typeLabel = isCSS ? '🎨 CSS' : isNew ? '➕ Nueva sección' : '✏️ Contenido';

      const banner = document.createElement('div');
      banner.id = 'smw-live-banner';
      banner.style.cssText = `
        position:fixed;top:0;left:0;right:0;z-index:2147483647;
        background:#0f172a;color:#fff;padding:10px 20px;
        display:flex;align-items:center;justify-content:space-between;
        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
        font-size:13px;border-bottom:2px solid #22c55e;
        box-shadow:0 2px 16px rgba(0,0,0,.6);
      `;
      banner.innerHTML = `
        <span style="display:flex;align-items:center;gap:10px;">
          <span style="color:#22c55e;font-weight:700;font-size:14px;">⚡ PREVIEW LOCAL</span>
          <span style="background:#1e293b;padding:2px 8px;border-radius:4px;font-size:11px;font-family:monospace;">${edit.file.split('/').pop()}</span>
          <span style="color:#94a3b8;font-size:12px;">${typeLabel} — sin publicar</span>
        </span>
        <div style="display:flex;gap:8px;">
          <button id="smw-lb-pub"  style="background:#22c55e;color:#000;border:none;padding:7px 18px;border-radius:6px;cursor:pointer;font-weight:700;font-size:13px;">▲ Publicar</button>
          <button id="smw-lb-disc" style="background:#374151;color:#fff;border:none;padding:7px 14px;border-radius:6px;cursor:pointer;font-size:13px;">✕ Descartar</button>
        </div>
      `;
      document.body.appendChild(banner);

      document.getElementById('smw-lb-pub').addEventListener('click', () => {
        banner.remove();
        Preview.revert();
        applyEdit(false);
      });
      document.getElementById('smw-lb-disc').addEventListener('click', () => {
        Preview.revert();
      });
    },

    _showUnsupported(msg) {
      addBubble('bot', '⚠️ ' + msg);
    }
  };

  /* ── Bubble helpers ────────────────────────────────── */
  function addBubble(role, text) {
    const wrap = document.createElement('div'); wrap.className = `smw-msg smw-msg--${role}`;
    const b = document.createElement('div'); b.className = 'smw-bubble';
    b.innerHTML = mdLight(text); wrap.appendChild(b);
    feed.appendChild(wrap); feed.scrollTop = feed.scrollHeight;
    return wrap;
  }
  function addSys(text) {
    const wrap = document.createElement('div'); wrap.className = 'smw-msg smw-msg--sys';
    const b = document.createElement('div'); b.className = 'smw-bubble'; b.textContent = text;
    wrap.appendChild(b); feed.appendChild(wrap); feed.scrollTop = feed.scrollHeight;
  }
  function addTyping() {
    const id = 'smwt' + Date.now();
    const w = document.createElement('div'); w.id = id; w.className = 'smw-msg smw-msg--bot';
    w.innerHTML = '<div class="smw-typing"><div class="smw-dot"></div><div class="smw-dot"></div><div class="smw-dot"></div></div>';
    feed.appendChild(w); feed.scrollTop = feed.scrollHeight; return id;
  }
  function showBadgeIfClosed() {
    if (!overlay.classList.contains('smw-open')) {
      badge.style.display = 'flex';
      badge.textContent = (parseInt(badge.textContent) || 0) + 1;
    }
  }

  /* ── Utils ─────────────────────────────────────────── */
  function removeEl(id) { const e = document.getElementById(id); if (e) e.remove(); }
  function setBusy(v) { S.busy = v; sendBtn.disabled = v; input.disabled = v; }
  function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function mdLight(t) {
    return String(t||'')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2" target="_blank">$1</a>')
      .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
      .replace(/`([^`]+)`/g,'<code>$1</code>')
      .replace(/\n/g,'<br>');
  }
})();
