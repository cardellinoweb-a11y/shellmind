/* ShellMind Widget v0.3.0 — Dual mode: Visitor + Designer */
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
    visitorMsgs:  [],   // visitor mode history
    designerMsgs: [],   // designer mode history
    busy:    false,
    designer: false,    // is designer mode active?
    edit:    null,      // pending edit proposal
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

        <!-- Edit card (designer mode) -->
        <div id="smw-editcard">
          <div class="smw-ec-bar">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;color:rgba(255,255,255,.3)"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            <span class="smw-ec-file" id="smw-ec-file">—</span>
            <div class="smw-ec-tabs">
              <button class="smw-ectab smw-ectab--on" id="smw-ect-diff">Diff</button>
              <button class="smw-ectab" id="smw-ect-full">Full</button>
            </div>
            <button class="smw-ec-xbtn" id="smw-ec-close">✕</button>
          </div>
          <div class="smw-ec-desc" id="smw-ec-desc"></div>
          <div class="smw-ec-code" id="smw-ec-code"></div>
          <div class="smw-ec-actions">
            <span class="smw-ec-status" id="smw-ec-status">Revisá antes de publicar</span>
            <button class="smw-ea-btn smw-ea-btn--rej"  id="smw-ea-rej">✕ Rechazar</button>
            <button class="smw-ea-btn smw-ea-btn--over" id="smw-ea-over">⚠ Sobrescribir</button>
            <button class="smw-ea-btn smw-ea-btn--pub"  id="smw-ea-pub">▲ Publicar</button>
          </div>
        </div>

        <div id="smw-inputbar">
          <input id="smw-input" type="text" placeholder="Escribí tu pregunta…" autocomplete="off"/>
          <button id="smw-send">${SEND}</button>
        </div>
        <div id="smw-footer">Powered by <b>ShellMind</b> · Claude IA</div>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  /* ── Refs ──────────────────────────────────────────── */
  const $ = id => document.getElementById(id);
  const btn      = $('smw-btn');
  const overlay  = $('smw-overlay');
  const dialog   = $('smw-dialog');
  const closeBtn = $('smw-close');
  const modeBtn  = $('smw-mode-btn');
  const badge    = $('smw-badge');
  const feed     = $('smw-messages');
  const input    = $('smw-input');
  const sendBtn  = $('smw-send');
  const dbadge   = $('smw-designer-badge');
  const editcard = $('smw-editcard');

  /* ── Init ──────────────────────────────────────────── */
  // Show designer button only for admins
  if (isAdmin) {
    modeBtn.classList.add('smw-visible');
  }

  // Welcome message
  addBubble('bot', `👋 Hola, soy el asistente IA de **${SMWidget.siteName}**.\n¿En qué te puedo ayudar hoy?`);

  /* ── Open / Close ──────────────────────────────────── */
  btn.addEventListener('click', openDialog);
  closeBtn.addEventListener('click', closeDialog);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeDialog(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDialog(); });

  function openDialog() {
    overlay.classList.add('smw-open');
    badge.style.display = 'none';
    badge.textContent = '';
    setTimeout(() => input.focus(), 300);
  }
  function closeDialog() {
    overlay.classList.remove('smw-open');
  }

  /* ── Mode toggle ───────────────────────────────────── */
  modeBtn.addEventListener('click', toggleDesigner);

  function toggleDesigner() {
    S.designer = !S.designer;

    if (S.designer) {
      dialog.classList.add('smw-designer');
      modeBtn.classList.add('smw-designer-on');
      modeBtn.textContent = '👤 Visitante';
      dbadge.classList.add('smw-visible');
      input.placeholder = 'Decile a Claude qué cambiar…';
      addSys('⚡ Modo Diseñador activado. Claude puede leer y editar archivos del servidor.');
    } else {
      dialog.classList.remove('smw-designer');
      modeBtn.classList.remove('smw-designer-on');
      modeBtn.innerHTML = '🎨 Diseñador';
      dbadge.classList.remove('smw-visible');
      input.placeholder = 'Escribí tu pregunta…';
      closeEditCard();
      addSys('👤 Modo Visitante activado.');
    }
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
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': SMWidget.nonce,
      },
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

    // Full file tab
    let pre = $('smw-fullpre-el');
    if (!pre) { pre = document.createElement('pre'); pre.className = 'smw-fullpre'; pre.id = 'smw-fullpre-el'; $('smw-ec-code').appendChild(pre); }
    pre.textContent = edit.new_content;

    // Diff placeholder
    let dw = $('smw-dlwrap'); if (dw) dw.remove();
    const ph = document.createElement('div'); ph.id = 'smw-dlwrap';
    ph.innerHTML = '<div class="smw-dl smw-dl--s"><span class="smw-dn"></span><span class="smw-dn"></span><span class="smw-dg"></span><span class="smw-dt" style="color:rgba(255,255,255,.2)">Calculando diff…</span></div>';
    $('smw-ec-code').prepend(ph);

    editcard.classList.add('smw-open');
    switchTab('diff');

    // Load diff
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

  function closeEditCard() { editcard.classList.remove('smw-open'); }

  function applyLivePreview() {
    if (!S.edit || !S.edit.diff) { applyEdit(false); return; }
    const lines = S.edit.diff.split('\n');
    const removed = lines.filter(l => l.startsWith('-') && !l.startsWith('---')).map(l => l.slice(1).trim()).join(' ');
    const added   = lines.filter(l => l.startsWith('+') && !l.startsWith('+++')).map(l => l.slice(1).trim()).join(' ');
    if (!removed || !added) { applyEdit(false); return; }
    const originalHTML = document.body.innerHTML;
    const stripped_removed = removed.replace(/<[^>]*>/g,'').trim();
    const stripped_added   = added.replace(/<[^>]*>/g,'').trim();
    let previewApplied = false;
    if (stripped_removed && document.body.innerHTML.includes(stripped_removed)) {
      document.body.innerHTML = document.body.innerHTML.replace(stripped_removed, stripped_added);
      previewApplied = true;
    }
    const existing = document.getElementById('smw-live-banner');
    if (existing) existing.remove();
    const banner = document.createElement('div');
    banner.id = 'smw-live-banner';
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#1a1a2e;color:#fff;padding:12px 20px;display:flex;align-items:center;justify-content:space-between;font-family:sans-serif;font-size:14px;box-shadow:0 2px 12px rgba(0,0,0,0.5);';
    const msg = previewApplied ? ' Preview en vivo aplicado  confirmar cambio?' : ' Preview no disponible para este cambio  publicar igual?';
    banner.innerHTML = '<span>' + msg + '</span><div style="display:flex;gap:10px;"><button id="smw-lb-pub" style="background:#22c55e;color:#fff;border:none;padding:8px 18px;border-radius:6px;cursor:pointer;font-weight:600;"> Publicar definitivamente</button><button id="smw-lb-disc" style="background:#ef4444;color:#fff;border:none;padding:8px 18px;border-radius:6px;cursor:pointer;font-weight:600;"> Descartar</button></div>';
    document.body.appendChild(banner);
    document.getElementById('smw-lb-pub').addEventListener('click', () => {
      banner.remove();
      applyEdit(false);
    });
    document.getElementById('smw-lb-disc').addEventListener('click', () => {
      if (previewApplied) document.body.innerHTML = originalHTML;
      banner.remove();
      setEcStatus('Cambio descartado', '');
    });
  }

  function applyEdit(overwrite) {
    if (!S.edit) return;
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
  function enableEcBtns(on) { [$('smw-ea-pub'),$('smw-ea-over'),$('smw-ea-rej')].forEach(b => { if(b) b.disabled = !on; }); }

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
