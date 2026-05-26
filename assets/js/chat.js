/* ShellMind v0.4.0  chat.js  SSE streaming */
(function () {
'use strict';

const S = { messages:[], busy:false, edit:null, sesIn:0, sesOut:0 };
const $ = id => document.getElementById(id);
const pg = (typeof SM !== 'undefined') ? (SM.page||'shellmind') : 'shellmind';

document.addEventListener('DOMContentLoaded', () => {
  if (pg==='shellmind')          initChat();
  if (pg==='shellmind-backups')  initBackups();
  if (pg==='shellmind-settings') initSettings();
});

/* 
   CHAT
 */
function initChat() {
  if (!$('sm-input')) return;

  document.querySelectorAll('.sm-chip').forEach(b =>
    b.addEventListener('click', () => { $('sm-input').value = b.dataset.msg; sendMsg(); })
  );
  $('sm-input').addEventListener('input', autoH);
  $('sm-input').addEventListener('keydown', e => {
    if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); }
  });
  $('sm-send-btn').addEventListener('click', sendMsg);
  $('sm-new-chat-btn').addEventListener('click', newChat);

  $('sm-ect-diff').addEventListener('click', () => switchTab('diff'));
  $('sm-ect-full').addEventListener('click', () => switchTab('full'));
  $('sm-ec-close').addEventListener('click', closeCard);
  $('sm-ec-publish').addEventListener('click', () => applyEdit(false));
  $('sm-ec-overwrite').addEventListener('click', () => {
    if (confirm(' Sobrescribir sin backup. Continuar?')) applyEdit(true);
  });
  $('sm-ec-reject').addEventListener('click', rejectEdit);

  fetchTotals();
  $('tk-reset').addEventListener('click', () => {
    if (!confirm('Resetear contadores?')) return;
    api('tokens/reset','POST').then(fetchTotals);
  });

  initPip();
}

/*  Send  */
function sendMsg() {
  const txt = $('sm-input').value.trim();
  if (!txt || S.busy) return;
  const w = $('sm-welcome'); if (w) w.style.display='none';
  addBubble('user', txt);
  S.messages.push({ role:'user', content:txt });
  $('sm-input').value=''; autoH.call($('sm-input'));
  setBusy(true);

  // Create the assistant bubble upfront for streaming into
  const assistantEl = addBubble('claude', '');
  const bubbleEl    = assistantEl.querySelector('.sm-bubble');
  bubbleEl.innerHTML = '<span class="sm-typing"><span class="sm-dot"></span><span class="sm-dot"></span><span class="sm-dot"></span></span>';

  streamChat(S.messages, bubbleEl, assistantEl);
}

/*  SSE Stream  */
function streamChat(messages, bubbleEl, wrapEl) {
  let fullText   = '';
  let toolStatus = null;  // DOM element showing tool activity

  fetch(SM.rest + 'chat-stream', {
    method: 'POST',
    headers: { 'Content-Type':'application/json', 'X-WP-Nonce': SM.nonce },
    body: JSON.stringify({ messages })
  })
  .then(res => {
    if (!res.ok) throw new Error('HTTP ' + res.status);

    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let   buffer  = '';

    function pump() {
      return reader.read().then(({ done, value }) => {
        if (done) {
          setBusy(false);
          if (fullText) {
            S.messages.push({ role:'assistant', content: fullText });
            bubbleEl.innerHTML = md(fullText);
          }
          scrollFeed();
          return;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();  // keep incomplete line

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            // next data line will carry the payload; handled below
          } else if (line.startsWith('data: ')) {
            const raw = line.slice(6).trim();
            if (!raw) continue;

            let ev;
            try { ev = JSON.parse(raw); } catch(e) { continue; }

            // parse event type from previous event: line
            const prevLine = lines[lines.indexOf(line) - 1] || '';
            const evType   = prevLine.startsWith('event: ')
              ? prevLine.slice(7).trim()
              : 'delta';

            handleStreamEvent(evType, ev, { fullText: ft => { fullText = ft; },
              bubbleEl, wrapEl });
          }
        }

        scrollFeed();
        return pump();
      });
    }
    return pump();
  })
  .catch(e => {
    setBusy(false);
    bubbleEl.innerHTML = md(' ' + e.message);
    scrollFeed();
  });
}

/* Better SSE parser using event/data pairing */
function streamChatV2(messages, bubbleEl, wrapEl) {
  let fullText = '';
  let textStarted = false;

  fetch(SM.rest + 'chat-stream', {
    method: 'POST',
    headers: { 'Content-Type':'application/json', 'X-WP-Nonce': SM.nonce },
    body: JSON.stringify({ messages })
  })
  .then(res => {
    if (!res.ok) return res.text().then(t => { throw new Error(t || 'HTTP '+res.status); });

    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let   buf     = '';
    let   curEvt  = 'delta';

    function process(chunk) {
      buf += chunk;
      const parts = buf.split('\n');
      buf = parts.pop();

      for (const line of parts) {
        if (line.startsWith('event: ')) {
          curEvt = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          const raw = line.slice(6).trim();
          if (!raw) continue;
          let ev;
          try { ev = JSON.parse(raw); } catch(e) { continue; }

          switch (curEvt) {
            case 'delta':
              if (!textStarted) {
                bubbleEl.innerHTML = '';  // clear typing indicator
                textStarted = true;
              }
              fullText += ev.text || '';
              // Append text node for efficiency
              bubbleEl.appendChild(document.createTextNode(ev.text || ''));
              scrollFeed();
              break;

            case 'tool_start':
              const icon = ev.name === 'read_file' ? '' : '';
              const msg  = ev.name === 'read_file'
                ? `${icon} Leyendo \`${shortPath(ev.path)}\``
                : `${icon} Listando \`${shortPath(ev.path)}\``;
              if (!textStarted) {
                bubbleEl.innerHTML = '';
                textStarted = true;
              }
              const toolEl = document.createElement('div');
              toolEl.className = 'sm-tool-status';
              toolEl.innerHTML = md(msg);
              bubbleEl.appendChild(toolEl);
              scrollFeed();
              break;

            case 'edit':
              // Claude proposed a file edit
              S.edit = ev;
              // Re-render the bubble with just the text so far
              if (fullText) bubbleEl.innerHTML = md(fullText);
              else          bubbleEl.innerHTML = '';
              openCard(ev);
              break;

            case 'done':
              // Stream finished
              if (ev.usage) addUsageTag(wrapEl, ev.usage);
              if (ev.usage) updateSes(ev.usage);
              // Re-render full markdown
              if (fullText) {
                bubbleEl.innerHTML = md(fullText);
                S.messages.push({ role:'assistant', content: fullText });
              }
              scrollFeed();
              setBusy(false);
              break;

            case 'error':
              bubbleEl.innerHTML = md(' ' + (ev.message||'Error desconocido'));
              scrollFeed();
              setBusy(false);
              break;
          }
          curEvt = 'delta';  // reset after consuming
        }
      }
    }

    function pump() {
      return reader.read().then(({ done, value }) => {
        if (done) { setBusy(false); return; }
        process(decoder.decode(value, { stream: true }));
        return pump();
      });
    }
    return pump();
  })
  .catch(e => {
    setBusy(false);
    bubbleEl.innerHTML = md(' ' + e.message);
    scrollFeed();
  });
}

// Replace sendMsg to use V2
function sendMsg() {
  const txt = $('sm-input').value.trim();
  if (!txt || S.busy) return;
  const w = $('sm-welcome'); if (w) w.style.display='none';
  addBubble('user', txt);
  S.messages.push({ role:'user', content:txt });
  $('sm-input').value=''; autoH.call($('sm-input'));
  setBusy(true);

  const assistantEl = addBubble('claude', '');
  const bubbleEl    = assistantEl.querySelector('.sm-bubble');
  bubbleEl.innerHTML = '<span class="sm-typing"><span class="sm-dot"></span><span class="sm-dot"></span><span class="sm-dot"></span></span>';

  streamChatV2(S.messages, bubbleEl, assistantEl);
}

/*  Edit card  */
function openCard(edit) {
  $('sm-ec-file').textContent = edit.file;
  $('sm-ec-desc').textContent = edit.description;
  setStatus('Revis los cambios antes de publicar','');
  enableBtns(true); $('sm-ec-publish').textContent=' Publicar';

  let pre = $('sm-fullpre-el');
  if (!pre) { pre=document.createElement('pre'); pre.className='sm-fullpre'; pre.id='sm-fullpre-el'; $('sm-ec-code').appendChild(pre); }
  pre.innerHTML = hlBasic(edit.new_content);

  let dw=$('sm-dlwrap'); if(dw) dw.remove();
  const ph=document.createElement('div'); ph.id='sm-dlwrap';
  ph.innerHTML='<div class="sm-dl sm-dl--s"><span class="sm-dn"></span><span class="sm-dn"></span><span class="sm-dg"></span><span class="sm-dt" style="color:var(--txt3)">Calculando diff</span></div>';
  $('sm-ec-code').prepend(ph);

  $('sm-editcard').classList.add('sm-editcard--open');
  switchTab('diff'); scrollFeed();

  api('diff','POST',{ file:edit.file, new_content:edit.new_content })
    .then(d => renderDiff(d)).catch(()=>{});
}

function renderDiff(d) {
  const wrap=document.createElement('div'); wrap.id='sm-dlwrap';
  if(d.type==='new_file') {
    d.lines.forEach((l,i) => wrap.appendChild(mkDl('a','',i+1,'+',l)));
  } else {
    (d.hunks||[]).forEach((hunk,hi) => {
      if(hi>0){const s=document.createElement('div');s.className='sm-dl sm-dl--sep';s.textContent='';wrap.appendChild(s);}
      hunk.forEach(ln=>{
        const t=ln.type;
        wrap.appendChild(mkDl(t==='same'?'s':t==='add'?'a':'r',t!=='add'?(ln.old_no||''):'',t!=='remove'?(ln.new_no||''):'',t==='add'?'+':t==='remove'?'-':' ',ln.content));
      });
    });
  }
  const old=$('sm-dlwrap'); if(old) old.replaceWith(wrap);
}

function mkDl(type,oldN,newN,g,txt) {
  const d=document.createElement('div'); d.className=`sm-dl sm-dl--${type}`;
  d.innerHTML=`<span class="sm-dn">${oldN}</span><span class="sm-dn">${newN}</span><span class="sm-dg">${g}</span><span class="sm-dt">${esc(txt??'')}</span>`;
  return d;
}

function switchTab(tab) {
  $('sm-ect-diff').classList.toggle('sm-ectab--on',tab==='diff');
  $('sm-ect-full').classList.toggle('sm-ectab--on',tab==='full');
  const dw=$('sm-dlwrap'),fp=$('sm-fullpre-el');
  if(dw) dw.style.display=tab==='diff'?'block':'none';
  if(fp) fp.classList.toggle('sm-fullpre--on',tab==='full');
}

function closeCard() { $('sm-editcard').classList.remove('sm-editcard--open'); }

function applyEdit(overwrite) {
  if(!S.edit) return;
  enableBtns(false); $('sm-ec-publish').textContent='Publicando'; setStatus('Guardando','warn');
  api('apply-edit','POST',{ file:S.edit.file, new_content:S.edit.new_content, overwrite })
    .then(r => {
      if(!r.success) throw new Error(r.error||'Error');
      setStatus(overwrite?' Sobrescrito':` Publicado  Backup: ${r.backup_name}`,'ok');
      $('sm-ec-publish').textContent=' Publicado';
      addBubble('claude',` \`${shortPath(S.edit.file)}\` actualizado.`);
      S.messages.push({ role:'assistant', content:`Cambio aplicado: ${S.edit.file}` });
      S.edit=null;
      setTimeout(() => reloadPip(true), 500);
    })
    .catch(e => { setStatus(' '+e.message,'err'); enableBtns(true); $('sm-ec-publish').textContent=' Publicar'; });
}

function rejectEdit() {
  closeCard(); S.edit=null;
  addBubble('claude','Quers que proponga otra solucin?');
  S.messages.push({ role:'user', content:'Rechac ese cambio. Propon una alternativa.' });
}

function setStatus(t,cls){const el=$('sm-ec-status');el.textContent=t;el.className='sm-ec-status '+(cls||'');}
function enableBtns(on){[$('sm-ec-publish'),$('sm-ec-overwrite'),$('sm-ec-reject')].forEach(b=>{if(b)b.disabled=!on;});}

/*  PiP  */
function initPip() {
  const pip=$('sm-pip'),bar=$('sm-pip-bar'),iframe=$('sm-iframe'),loader=$('sm-pip-loader');
  $('sm-pip-toggle').addEventListener('click',()=>{
    const v=pip.classList.toggle('sm-pip--visible');
    $('sm-pip-toggle').classList.toggle('sm-tb-btn--active',v);
  });
  $('sm-pip-close').addEventListener('click',()=>{pip.classList.remove('sm-pip--visible','sm-pip--expanded');$('sm-pip-toggle').classList.remove('sm-tb-btn--active');});
  $('sm-pip-expand').addEventListener('click',()=>pip.classList.toggle('sm-pip--expanded'));
  $('sm-pip-reload').addEventListener('click',()=>reloadPip(false));
  iframe.addEventListener('load',()=>loader.classList.add('gone'));
  document.querySelectorAll('.sm-pipd').forEach(btn=>btn.addEventListener('click',()=>{
    document.querySelectorAll('.sm-pipd').forEach(b=>b.classList.remove('sm-pipd--on'));
    btn.classList.add('sm-pipd--on');
    const w=btn.dataset.w; iframe.style.width=w;
    if(w!=='100%'){const fw=pip.offsetWidth-2,iw=parseInt(w);iframe.style.transform=iw>fw?`scale(${fw/iw})`:'scale(1)';}
    else iframe.style.transform='scale(1)';
  }));
  let dragging=false,ox=0,oy=0;
  bar.addEventListener('mousedown',e=>{
    if(['BUTTON','SVG','polyline','path','line'].includes(e.target.tagName))return;
    dragging=true;const r=pip.getBoundingClientRect();ox=e.clientX-r.left;oy=e.clientY-r.top;pip.style.transition='none';
  });
  document.addEventListener('mousemove',e=>{if(!dragging)return;pip.style.right='auto';pip.style.bottom='auto';pip.style.left=(e.clientX-ox)+'px';pip.style.top=(e.clientY-oy)+'px';});
  document.addEventListener('mouseup',()=>{dragging=false;pip.style.transition='';});
}

function reloadPip(flash){
  const fr=$('sm-iframe'),ld=$('sm-pip-loader'),rb=$('sm-pip-reload');
  ld.classList.remove('gone');rb.classList.add('spin');fr.src=fr.src;
  fr.addEventListener('load',()=>{ld.classList.add('gone');rb.classList.remove('spin');if(flash)pubFlash();},{once:true});
}
function pubFlash(){const f=$('sm-pub-flash');f.classList.add('sm-pub-flash--on');setTimeout(()=>f.classList.remove('sm-pub-flash--on'),2400);}

/*  Bubbles  */
function addBubble(role,text) {
  const feed=$('sm-feed');
  const wrap=document.createElement('div'); wrap.className=`sm-msg sm-msg--${role}`;
  if(role!=='sys'){const l=document.createElement('div');l.className='sm-lbl';l.textContent=role==='user'?'Vos':'Claude IA';wrap.appendChild(l);}
  const b=document.createElement('div'); b.className='sm-bubble'; b.innerHTML=md(text); wrap.appendChild(b);
  feed.appendChild(wrap); scrollFeed(); return wrap;
}

function addUsageTag(el,u){
  if(!u||!el)return;
  const t=document.createElement('div');t.className='sm-usage';
  t.textContent=` ${(u.input_tokens||0).toLocaleString()} in  ${(u.output_tokens||0).toLocaleString()} out`;
  el.appendChild(t);
}

function updateSes(u){
  if(!u)return;
  S.sesIn+=(u.input_tokens||0);S.sesOut+=(u.output_tokens||0);
  const si=$('tk-si'),so=$('tk-so');
  if(si)si.textContent=S.sesIn.toLocaleString();
  if(so)so.textContent=S.sesOut.toLocaleString();
}

function fetchTotals(){
  api('tokens','GET').then(d=>{
    const ti=$('tk-ti'),to=$('tk-to'),tc=$('tk-cost');
    if(ti)ti.textContent=(d.input||0).toLocaleString();
    if(to)to.textContent=(d.output||0).toLocaleString();
    if(tc)tc.textContent=(d.cost_usd||0).toFixed(4);
  }).catch(()=>{});
}

function newChat(){
  S.messages=[];S.edit=null;closeCard();
  const feed=$('sm-feed');feed.innerHTML='';
  const w=document.createElement('div');w.id='sm-welcome';w.className='sm-welcome';
  w.innerHTML='<div class="sm-welcome-hex"><svg width="36" height="36" viewBox="0 0 24 24" fill="none"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5" stroke="#00ff88" stroke-width="1" fill="none"/></svg></div><h2>Claude IA</h2><p>Nuevo chat. Qu quers cambiar?</p>';
  feed.appendChild(w);
}

/* 
   BACKUPS
 */
function initBackups(){
  loadBackups();
  const r=$('sm-refresh-backups');if(r)r.addEventListener('click',loadBackups);
}
function loadBackups(){
  const wrap=$('sm-bwrap-inner');if(!wrap)return;
  wrap.innerHTML='<p class="sm-loading">Cargando</p>';
  api('backups','GET').then(list=>{
    if(!list.length){wrap.innerHTML='<p class="sm-loading">Sin backups todava.</p>';return;}
    const t=document.createElement('table');t.className='sm-table';
    t.innerHTML='<thead><tr><th>Archivo</th><th>Fecha</th><th>Tamao</th><th></th></tr></thead><tbody></tbody>';
    list.forEach(b=>{
      const tr=document.createElement('tr');
      const btn=document.createElement('button');btn.className='sm-btn';
      btn.style.cssText='font-size:10px;padding:3px 10px;background:var(--bg3);border:1px solid var(--line2);color:var(--txt2);border-radius:4px;cursor:pointer;';
      btn.textContent=' Restaurar';
      btn.onclick=()=>{if(!confirm('Restaurar '+b.filename+'?'))return;api('restore','POST',{backup_path:b.path,original_path:b.original}).then(r=>{btn.textContent=r.success?'':'';});};
      tr.innerHTML=`<td class="tfn">${esc(b.filename)}</td><td>${new Date(b.created*1000).toLocaleString()}</td><td class="tfs">${fmtB(b.size)}</td><td></td>`;
      tr.querySelector('td:last-child').appendChild(btn);
      t.querySelector('tbody').appendChild(tr);
    });
    wrap.innerHTML='';wrap.appendChild(t);
  }).catch(e=>{wrap.innerHTML=`<p class="sm-loading"> ${esc(e.message)}</p>`;});
}

/* 
   SETTINGS
 */
function initSettings(){
  const sv=$('sm-save-key'),ki=$('sm-api-key'),ks=$('sm-key-st');if(!sv)return;
  api('settings','GET').then(d=>{
    if(ks)ks.innerHTML=d.has_key?`<span style="color:var(--green)"> Configurada (${esc(d.key_preview)})</span>`:`<span style="color:var(--red)"> Sin API key</span>`;
    const wt=$('sm-widget-on');if(wt)wt.checked=d.widget_enabled!==false;
  });
  sv.onclick=()=>{
    const k=ki.value.trim();if(!k)return;
    sv.disabled=true;sv.textContent='Guardando';
    api('settings','POST',{api_key:k}).then(()=>{if(ks)ks.innerHTML='<span style="color:var(--green)"> Guardada</span>';ki.value='';}).catch(()=>{if(ks)ks.innerHTML='<span style="color:var(--red)"> Error</span>';}).finally(()=>{sv.disabled=false;sv.textContent='Guardar';});
  };
  const sw=$('sm-save-widget'),ws=$('sm-widget-st');
  if(sw)sw.onclick=()=>{
    const en=$('sm-widget-on')?$('sm-widget-on').checked:true;
    sw.disabled=true;sw.textContent='Guardando';
    api('settings','POST',{widget_enabled:en}).then(()=>{if(ws)ws.innerHTML='<span style="color:var(--green)"> Guardado</span>';}).catch(()=>{if(ws)ws.innerHTML='<span style="color:var(--red)"> Error</span>';}).finally(()=>{sw.disabled=false;sw.textContent='Guardar';});
  };
}

/* 
   UTILS
 */
function api(ep,method,body){
  const opts={method,headers:{'Content-Type':'application/json','X-WP-Nonce':SM.nonce}};
  if(body&&method!=='GET')opts.body=JSON.stringify(body);
  return fetch(SM.rest+ep,opts).then(r=>{
    if(!r.ok)return r.json().then(e=>{throw new Error(e.message||'HTTP '+r.status);});
    return r.json();
  });
}
function setBusy(v){S.busy=v;const s=$('sm-send-btn'),i=$('sm-input');if(s)s.disabled=v;if(i)i.disabled=v;}
function scrollFeed(){const f=$('sm-feed');if(f)f.scrollTop=f.scrollHeight;}
function autoH(){this.style.height='auto';this.style.height=Math.min(this.scrollHeight,90)+'px';}
function shortPath(p){return p?p.split('/').slice(-2).join('/'):p;}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function fmtB(n){if(n<1024)return n+' B';if(n<1048576)return(n/1024).toFixed(1)+' KB';return(n/1048576).toFixed(2)+' MB';}
function hlBasic(c){let h=esc(c);h=h.replace(/(\/\/[^\n]*)/g,'<span class="hl-c">$1</span>');h=h.replace(/\b(function|class|if|else|return|echo|new|foreach|while|for|true|false|null|const|let|var|async|await|use|public|private|protected|static)\b/g,'<span class="hl-k">$1</span>');h=h.replace(/(\$[a-zA-Z_]\w*)/g,'<span class="hl-v">$1</span>');return h;}
function md(t){let h=esc(t);h=h.replace(/```([^`]*?)```/gs,(_,c)=>`<pre><code>${c.trim()}</code></pre>`);h=h.replace(/`([^`]+)`/g,'<code>$1</code>');h=h.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');h=h.replace(/\n/g,'<br>');return h;}
})();
