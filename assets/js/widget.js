/* ShellMind Widget v0.4.0 — Designer Panel Mode + Live Preview */
(function () {
'use strict';
if (typeof SMWidget === 'undefined') return;

/* ── SVGs ──────────────────────────────────────────── */
const BRAIN = `<svg width="20" height="20" viewBox="0 0 80 80" fill="none">
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

/* ── State ──────────────────────────────────────────── */
const S = {
  visitor: { msgs: [], busy: false },
  designer: { msgs: [], busy: false, edit: null, preview: null },
  mode: 'visitor', // 'visitor' | 'designer'
  isAdmin: SMWidget.isAdmin === '1',
  sesIn: 0, sesTot: 0,
};

/* ── ETA helper ─────────────────────────────────────── */
const ETA = {
  _t: null, _start: 0, _label: '',
  _estimates: {
    default: 8,
    logo: 15, imagen: 15, image: 15,
    css: 6, color: 5, fuente: 6, font: 6,
    menu: 8, navigation: 8,
    texto: 5, text: 5, titulo: 5,
    plugin: 20, instalar: 20,
  },
  guess(msg) {
    const m = msg.toLowerCase();
    for (const [k,v] of Object.entries(this._estimates)) {
      if (m.includes(k)) return v;
    }
    return this._estimates.default;
  },
  start(label, secs) {
    this._label = label;
    this._start = Date.now();
    this._total = secs * 1000;
    const bar = document.getElementById('smw-progress');
    const fill = bar && bar.querySelector('.smw-progress-fill');
    const lbl  = bar && bar.querySelector('.smw-progress-task');
    const eta  = bar && bar.querySelector('.smw-progress-eta');
    if (!bar) return;
    bar.classList.add('smw-active');
    if (lbl) lbl.textContent = label;
    if (fill) { fill.classList.remove('smw-determinate'); }
    if (eta) eta.textContent = '~' + secs + 's';
    clearInterval(this._t);
    this._t = setInterval(() => {
      const elapsed = Date.now() - this._start;
      const rem = Math.max(0, Math.round((this._total - elapsed) / 1000));
      if (eta) eta.textContent = rem > 0 ? '~' + rem + 's' : '✓';
    }, 500);
  },
  stop() {
    clearInterval(this._t);
    const bar = document.getElementById('smw-progress');
    if (bar) bar.classList.remove('smw-active');
  }
};

/* ── Live Preview ───────────────────────────────────── */
const Preview = {
  _styleTag: null,
  _pending: null,

  apply(cssContent, description) {
    if (!this._styleTag) {
      this._styleTag = document.createElement('style');
      this._styleTag.id = 'smw-live-preview';
      document.head.appendChild(this._styleTag);
    }
    this._styleTag.textContent = cssContent;
    this._pending = { type: 'css', content: cssContent, description };
    this._showBar(description);
  },

  applyHTML(selector, html, description) {
    this._pending = { type: 'html', selector, html, description };
    const el = document.querySelector(selector);
    if (el) {
      this._pending._original = el.outerHTML;
      el.outerHTML = html;
    }
    this._showBar(description);
  },

  _showBar(desc) {
    const bar = document.getElementById('smw-preview-bar');
    const lbl = bar && bar.querySelector('.smw-preview-task');
    if (!bar) return;
    bar.classList.add('smw-visible');
    if (lbl) lbl.textContent = desc || 'Vista previa activa';
  },

  reject() {
    if (this._styleTag) { this._styleTag.textContent = ''; }
    if (this._pending && this._pending.type === 'html' && this._pending._original) {
      const el = document.querySelector(this._pending.selector);
      if (el) el.outerHTML = this._pending._original;
    }
    this._pending = null;
    const bar = document.getElementById('smw-preview-bar');
    if (bar) bar.classList.remove('smw-visible');
  },

  clear() {
    this._pending = null;
    const bar = document.getElementById('smw-preview-bar');
    if (bar) bar.classList.remove('smw-visible');
  }
};

/* ── Build DOM ──────────────────────────────────────── */
function buildDOM() {
  const wrap = document.createElement('div');
  wrap.innerHTML = `
<div id="smw-btn" role="button" aria-label="ShellMind Designer" tabindex="0">
  <div id="smw-btn-brain">${BRAIN}</div>
  <div id="smw-btn-label">
    <span id="smw-btn-title">ShellMind</span>
    <span id="smw-btn-sub">Diseñador IA</span>
  </div>
  <div id="smw-btn-dot"></div>
  <div id="smw-badge"></div>
</div>

<div id="smw-overlay">
  <div id="smw-dialog" role="dialog" aria-modal="true" aria-label="ShellMind Diseñador">

    <div id="smw-header">
      <div class="smw-header-top">
        <div id="smw-header-brain">${BRAIN}</div>
        <div id="smw-header-info">
          <div id="smw-header-name">ShellMind</div>
          <div id="smw-header-site">${SMWidget.siteName}</div>
        </div>
        <div class="smw-header-actions">
          <button id="smw-mode-btn" title="Cambiar modo">🎨 Diseñador</button>
          <button id="smw-close" aria-label="Cerrar">✕</button>
        </div>
      </div>
      <div id="smw-designer-badge">⬡ modo diseñador</div>
    </div>

    <div id="smw-progress">
      <div class="smw-progress-label">
        <span class="smw-progress-task">Procesando…</span>
        <span class="smw-progress-eta"></span>
      </div>
      <div class="smw-progress-bar"><div class="smw-progress-fill"></div></div>
    </div>

    <div id="smw-preview-bar">
      <div class="smw-preview-label"><span class="smw-preview-task">Vista previa</span></div>
      <div class="smw-preview-actions">
        <button class="smw-preview-btn smw-preview-btn--pub" id="smw-preview-pub">Publicar</button>
        <button class="smw-preview-btn smw-preview-btn--rej" id="smw-preview-rej">Descartar</button>
      </div>
    </div>

    <div id="smw-messages"></div>

    <div id="smw-editcard">
      <div class="smw-ec-bar">
        <span class="smw-ec-file" id="smw-ec-file"></span>
        <div class="smw-ec-tabs">
          <button class="smw-ectab smw-ectab--on" id="smw-ect-diff">Diff</button>
          <button class="smw-ectab" id="smw-ect-full">Full</button>
        </div>
        <button class="smw-ec-xbtn" id="smw-ec-close">✕</button>
      </div>
      <div class="smw-ec-desc" id="smw-ec-desc"></div>
      <div class="smw-ec-code" id="smw-ec-code"></div>
      <div class="smw-ec-actions">
        <span class="smw-ec-status" id="smw-ec-status"></span>
        <button class="smw-ea-btn smw-ea-btn--rej" id="smw-ea-rej">Rechazar</button>
        <button class="smw-ea-btn smw-ea-btn--over" id="smw-ea-over">Sobrescribir</button>
        <button class="smw-ea-btn smw-ea-btn--pub" id="smw-ea-pub">Publicar</button>
      </div>
    </div>

    <div id="smw-inputbar">
      <textarea id="smw-input" rows="1" placeholder="Describí el cambio…" aria-label="Mensaje"></textarea>
      <button id="smw-send" aria-label="Enviar">${SEND}</button>
    </div>

    <div id="smw-footer">Powered by <b>ShellMind</b> · Claude IA</div>
  </div>
</div>`;

  document.body.appendChild(wrap.children[0]); // smw-btn
  document.body.appendChild(wrap.children[0]); // smw-overlay
}

/* ── Mode management ────────────────────────────────── */
function setMode(mode) {
  S.mode = mode;
  const overlay = document.getElementById('smw-overlay');
  const dialog  = document.getElementById('smw-dialog');
  const modeBtn = document.getElementById('smw-mode-btn');
  const badge   = document.getElementById('smw-designer-badge');
  const inp     = document.getElementById('smw-input');

  if (mode === 'designer') {
    overlay.classList.add('smw-designer-panel');
    dialog.classList.add('smw-designer');
    modeBtn && modeBtn.classList.add('smw-designer-on');
    badge  && badge.classList.add('smw-visible');
    if (inp) inp.placeholder = 'Describí el cambio de diseño…';
    // Show panel immediately without hiding page
    overlay.classList.add('smw-open');
  } else {
    overlay.classList.remove('smw-designer-panel');
    dialog.classList.remove('smw-designer');
    modeBtn && modeBtn.classList.remove('smw-designer-on');
    badge  && badge.classList.remove('smw-visible');
    if (inp) inp.placeholder = 'Escribí tu pregunta…';
    Preview.reject();
  }
  renderMessages();
}

function openDialog() {
  const overlay = document.getElementById('smw-overlay');
  if (S.mode === 'designer') {
    overlay.classList.add('smw-designer-panel', 'smw-open');
  } else {
    overlay.classList.remove('smw-designer-panel');
    overlay.classList.add('smw-open');
  }
  document.getElementById('smw-input') && document.getElementById('smw-input').focus();
}

function closeDialog() {
  const overlay = document.getElementById('smw-overlay');
  if (S.mode === 'designer') {
    // In designer mode, just hide - keep state
    overlay.classList.remove('smw-open');
    setTimeout(() => overlay.classList.remove('smw-designer-panel'), 300);
  } else {
    overlay.classList.remove('smw-open');
  }
}

/* ── Render messages for current mode ───────────────── */
function renderMessages() {
  const box  = document.getElementById('smw-messages');
  const msgs = S.mode === 'designer' ? S.designer.msgs : S.visitor.msgs;
  if (!box) return;
  box.innerHTML = '';
  if (!msgs.length) {
    const st = S.mode === 'designer';
    addSys(st
      ? '⬡ Modo diseñador activo — describí cualquier cambio visual'
      : `👋 Hola, soy el asistente IA de <strong>${esc(SMWidget.siteName)}</strong>.\n¿En qué te puedo ayudar hoy?`
    );
    return;
  }
  msgs.forEach(m => addBubble(m.role, m.content, false));
  box.scrollTop = box.scrollHeight;
}

/* ── Send message ───────────────────────────────────── */
async function sendMsg() {
  const inp  = document.getElementById('smw-input');
  const text = inp ? inp.value.trim() : '';
  if (!text) return;
  if (inp) { inp.value = ''; autoH(); }

  const st = S.mode === 'designer';
  const state = st ? S.designer : S.visitor;
  if (state.busy) return;

  state.msgs.push({ role: 'user', content: text });
  addBubble('user', text);
  setBusy(true);

  // Start ETA
  if (st) ETA.start('Analizando…', ETA.guess(text));

  const typing = addTyping();

  try {
    if (st) {
      await streamDesigner(text, typing);
    } else {
      await sendVisitor(text, typing);
    }
  } catch(e) {
    removeEl(typing);
    addBubble('bot', '⚠ Error: ' + e.message);
  } finally {
    setBusy(false);
    ETA.stop();
  }
}

/* ── Stream designer (SSE) ──────────────────────────── */
async function streamDesigner(userText, typingEl) {
  const msgs = S.designer.msgs.slice(0,-1).map(m => ({ role: m.role, content: m.content }));
  msgs.push({ role: 'user', content: userText });

  const resp = await fetch(SMWidget.restUrl + 'chat-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': SMWidget.nonce },
    body: JSON.stringify({ messages: msgs })
  });

  if (!resp.ok) throw new Error('HTTP ' + resp.status);

  const reader = resp.body.getReader();
  const dec    = new TextDecoder();
  let   text   = '';
  let   bubble = null;
  let   editPayload = null;

  removeEl(typingEl);

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = dec.decode(value, { stream: true });
    for (const line of chunk.split('\n')) {
      if (!line.startsWith('data:')) continue;
      const raw = line.slice(5).trim();
      if (!raw || raw === '[DONE]') continue;
      let ev;
      try { ev = JSON.parse(raw); } catch { continue; }

      if (ev.type === 'text') {
        text += ev.text;
        ETA.start('Generando respuesta…', 3);
        if (!bubble) {
          bubble = addBubble('bot', text, true);
        } else {
          const b = bubble.querySelector('.smw-bubble');
          if (b) b.innerHTML = mdLight(esc(text));
        }
        scrollDown();
      } else if (ev.type === 'tool_use') {
        ETA.start('Leyendo archivo…', 4);
      } else if (ev.type === 'edit') {
        editPayload = ev;
        ETA.start('Preparando diff…', 2);
      } else if (ev.type === 'usage') {
        S.sesIn += ev.input_tokens || 0;
        S.sesTot += (ev.input_tokens||0) + (ev.output_tokens||0);
        updateTokenBar();
      }
    }
  }

  if (text) {
    S.designer.msgs.push({ role: 'assistant', content: text });
    // Check if response has CSS in a code block - offer live preview
    const cssMatch = text.match(/```css([\s\S]*?)```/);
    if (cssMatch) {
      Preview.apply(cssMatch[1], 'CSS generado por ShellMind');
    }
  }
  if (editPayload) showEditCard(editPayload);
}

/* ── Send visitor (no stream) ───────────────────────── */
async function sendVisitor(userText, typingEl) {
  const msgs = S.visitor.msgs.map(m => ({ role: m.role, content: m.content }));
  const resp = await fetch(SMWidget.restUrl + 'widget-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: msgs, nonce: SMWidget.nonce })
  });
  removeEl(typingEl);
  if (!resp.ok) throw new Error('HTTP ' + resp.status);
  const data = await resp.json();
  const reply = data.text || data.message || '';
  S.visitor.msgs.push({ role: 'assistant', content: reply });
  addBubble('bot', reply);
}

/* ── Publish edit ───────────────────────────────────── */
async function publishEdit(override) {
  const edit = S.designer.edit;
  if (!edit) return;
  const statusEl = document.getElementById('smw-ec-status');
  const pubBtn   = document.getElementById('smw-ea-pub');
  const overBtn  = document.getElementById('smw-ea-over');
  if (pubBtn)  pubBtn.disabled  = true;
  if (overBtn) overBtn.disabled = true;
  if (statusEl) { statusEl.className='smw-ec-status'; statusEl.textContent='Publicando…'; }

  ETA.start('Escribiendo archivo…', 5);

  try {
    const resp = await fetch(SMWidget.restUrl + 'apply-edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': SMWidget.nonce },
      body: JSON.stringify({ file: edit.file, new_content: edit.new_content, override: !!override })
    });
    const data = await resp.json();
    ETA.stop();
    if (data.success) {
      if (statusEl) { statusEl.className='smw-ec-status ok'; statusEl.textContent='✓ Publicado — backup: '+data.backup_name; }
      Preview.clear();
      addSys('✓ Cambio publicado en servidor');
      setTimeout(() => closeEditCard(), 2000);
    } else {
      if (statusEl) { statusEl.className='smw-ec-status err'; statusEl.textContent='Error: '+(data.message||'desconocido'); }
    }
  } catch(e) {
    ETA.stop();
    if (statusEl) { statusEl.className='smw-ec-status err'; statusEl.textContent='Error: '+e.message; }
  } finally {
    if (pubBtn)  pubBtn.disabled  = false;
    if (overBtn) overBtn.disabled = false;
  }
}

/* ── Edit card ──────────────────────────────────────── */
function showEditCard(ev) {
  S.designer.edit = ev;
  const card    = document.getElementById('smw-editcard');
  const fileEl  = document.getElementById('smw-ec-file');
  const descEl  = document.getElementById('smw-ec-desc');
  const statusEl= document.getElementById('smw-ec-status');
  if (!card) return;
  if (fileEl)   fileEl.textContent  = ev.file || '';
  if (descEl)   descEl.textContent  = ev.description || '';
  if (statusEl) { statusEl.className='smw-ec-status warn'; statusEl.textContent='Pendiente de publicar'; }
  card.classList.add('smw-open');
  switchTab('diff');

  // If it's a CSS file, apply live preview
  if (ev.file && ev.file.endsWith('.css') && ev.new_content) {
    Preview.apply(ev.new_content, 'Vista previa: ' + ev.file);
  }
}

function closeEditCard() {
  S.designer.edit = null;
  const card = document.getElementById('smw-editcard');
  if (card) card.classList.remove('smw-open');
}

function switchTab(tab) {
  const diffBtn = document.getElementById('smw-ect-diff');
  const fullBtn = document.getElementById('smw-ect-full');
  const codeEl  = document.getElementById('smw-ec-code');
  const edit    = S.designer.edit;
  if (!edit || !codeEl) return;
  if (tab === 'diff') {
    diffBtn && diffBtn.classList.add('smw-ectab--on');
    fullBtn && fullBtn.classList.remove('smw-ectab--on');
    codeEl.innerHTML = renderDiff(edit.diff || []);
  } else {
    fullBtn && fullBtn.classList.add('smw-ectab--on');
    diffBtn && diffBtn.classList.remove('smw-ectab--on');
    codeEl.innerHTML = '<pre class="smw-fullpre smw-fullpre--on">' + esc(edit.new_content || '') + '</pre>';
  }
}

function renderDiff(lines) {
  if (!lines.length) return '<div style="padding:8px;color:rgba(255,255,255,.3);font-size:10px">Sin cambios</div>';
  return lines.map(dl => mkDl(dl)).join('');
}
function mkDl(dl) {
  if (dl.type === 'sep') return '<div class="smw-dl smw-dl--sep">@@ ' + esc(dl.context||'') + '</div>';
  const cls = dl.type==='add' ? 'smw-dl--a' : dl.type==='rem' ? 'smw-dl--r' : 'smw-dl--s';
  const gl  = dl.type==='add' ? '+' : dl.type==='rem' ? '-' : ' ';
  return '<div class="smw-dl '+cls+'"><div class="smw-dn">'+(dl.old_line||'')+
         '</div><div class="smw-dn">'+(dl.new_line||'')+
         '</div><div class="smw-dg">'+gl+'</div><div class="smw-dt">'+esc(dl.content||'')+'</div></div>';
}

/* ── Token bar ──────────────────────────────────────── */
function updateTokenBar() {
  // stored in sessionStorage for persistence within wp-admin
  const stored = JSON.parse(sessionStorage.getItem('smw_tokens')||'{"in":0,"out":0}');
  stored.in  += S.sesIn;
  stored.out += S.sesTot - S.sesIn;
  sessionStorage.setItem('smw_tokens', JSON.stringify(stored));
}

/* ── DOM helpers ────────────────────────────────────── */
function addBubble(role, content, live) {
  const box = document.getElementById('smw-messages');
  if (!box) return null;
  const div = document.createElement('div');
  div.className = 'smw-msg smw-msg--' + (role==='user'?'user':'bot');
  const inner = role==='user'
    ? '<div class="smw-bubble">'+esc(content)+'</div>'
    : '<div class="smw-bubble">'+mdLight(esc(content))+'</div>';
  div.innerHTML = inner;
  box.appendChild(div);
  if (!live) scrollDown();
  return div;
}
function addSys(html) {
  const box = document.getElementById('smw-messages');
  if (!box) return;
  const div = document.createElement('div');
  div.className = 'smw-msg smw-msg--sys';
  div.innerHTML = '<div class="smw-bubble">'+html+'</div>';
  box.appendChild(div);
  scrollDown();
}
function addTyping() {
  const box = document.getElementById('smw-messages');
  if (!box) return null;
  const div = document.createElement('div');
  div.className = 'smw-msg smw-msg--bot';
  div.innerHTML = '<div class="smw-typing"><div class="smw-dot"></div><div class="smw-dot"></div><div class="smw-dot"></div></div>';
  box.appendChild(div);
  scrollDown();
  return div;
}
function scrollDown() {
  const box = document.getElementById('smw-messages');
  if (box) box.scrollTop = box.scrollHeight;
}
function removeEl(el) { el && el.parentNode && el.parentNode.removeChild(el); }
function setBusy(v) {
  const state = S.mode==='designer' ? S.designer : S.visitor;
  state.busy = v;
  const inp  = document.getElementById('smw-input');
  const send = document.getElementById('smw-send');
  if (inp)  inp.disabled  = v;
  if (send) send.disabled = v;
}
function autoH() {
  const el = document.getElementById('smw-input');
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 100) + 'px';
}
function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function mdLight(s) {
  return s
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

/* ── Init ───────────────────────────────────────────── */
function init() {
  buildDOM();

  const btn      = document.getElementById('smw-btn');
  const overlay  = document.getElementById('smw-overlay');
  const closeBtn = document.getElementById('smw-close');
  const modeBtn  = document.getElementById('smw-mode-btn');
  const sendBtn  = document.getElementById('smw-send');
  const inp      = document.getElementById('smw-input');
  const pubBtn   = document.getElementById('smw-ea-pub');
  const overBtn  = document.getElementById('smw-ea-over');
  const rejBtn   = document.getElementById('smw-ea-rej');
  const diffBtn  = document.getElementById('smw-ect-diff');
  const fullBtn  = document.getElementById('smw-ect-full');
  const ecClose  = document.getElementById('smw-ec-close');
  const prevPub  = document.getElementById('smw-preview-pub');
  const prevRej  = document.getElementById('smw-preview-rej');

  // Show mode button only for admins
  if (S.isAdmin && modeBtn) modeBtn.classList.add('smw-visible');

  // Click pill button
  btn && btn.addEventListener('click', () => {
    const isOpen = overlay && overlay.classList.contains('smw-open');
    if (isOpen && S.mode !== 'designer') {
      closeDialog();
    } else {
      if (S.isAdmin && S.mode === 'visitor') {
        // Admins open in designer mode by default
        setMode('designer');
      } else {
        openDialog();
      }
    }
  });

  // Close button
  closeBtn && closeBtn.addEventListener('click', closeDialog);

  // Overlay click closes only in visitor mode
  overlay && overlay.addEventListener('click', e => {
    if (e.target === overlay && S.mode === 'visitor') closeDialog();
  });

  // Mode toggle
  modeBtn && modeBtn.addEventListener('click', () => {
    const newMode = S.mode === 'designer' ? 'visitor' : 'designer';
    setMode(newMode);
    if (newMode === 'designer') {
      modeBtn.textContent = '🎨 Diseñador';
    } else {
      modeBtn.textContent = '💬 Visitante';
    }
  });

  // Keyboard
  inp && inp.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); }
  });
  inp && inp.addEventListener('input', autoH);
  sendBtn && sendBtn.addEventListener('click', sendMsg);

  // Edit card buttons
  pubBtn  && pubBtn.addEventListener('click',  () => publishEdit(false));
  overBtn && overBtn.addEventListener('click', () => publishEdit(true));
  rejBtn  && rejBtn.addEventListener('click',  () => { Preview.reject(); closeEditCard(); addSys('↩ Cambio descartado'); });
  diffBtn && diffBtn.addEventListener('click', () => switchTab('diff'));
  fullBtn && fullBtn.addEventListener('click', () => switchTab('full'));
  ecClose && ecClose.addEventListener('click', () => { Preview.reject(); closeEditCard(); });

  // Preview bar
  prevPub && prevPub.addEventListener('click', () => {
    // Publish the pending edit if exists
    if (S.designer.edit) publishEdit(false);
    else Preview.clear();
  });
  prevRej && prevRej.addEventListener('click', () => Preview.reject());

  // ESC key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && S.mode === 'visitor') closeDialog();
  });

  // If admin, start in designer mode automatically
  if (S.isAdmin) {
    setMode('designer');
  } else {
    renderMessages();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

})();