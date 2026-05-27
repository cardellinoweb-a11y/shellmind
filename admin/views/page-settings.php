<?php if ( ! defined( 'ABSPATH' ) ) exit; ?>
<div class="sm-app sm-app--scroll">
  <div class="sm-topbar">
    <div class="sm-brand">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5" stroke="#00ff88" stroke-width="1.5"/></svg>
      <span>Shell<b>Mind</b></span>
      <span class="sm-ver">v<?php echo SHELLMIND_VERSION; ?></span>
    </div>
    <div style="flex:1"></div>
    <span style="font-size:11px;color:var(--txt2)">Settings</span>
  </div>
  <div class="sm-page">

    <div class="sm-card">
      <h3>Anthropic API Key</h3>
      <p>Obtené tu clave en <a href="https://console.anthropic.com" target="_blank">console.anthropic.com</a></p>
      <div class="sm-frow">
        <input type="password" id="sm-api-key" class="sm-finput" placeholder="sk-ant-api03-…"/>
        <button class="sm-btn sm-btn--g" id="sm-save-key">Guardar</button>
<!-- Replicate API Key -->
<div class="sm-section">
  <h3>Replicate API Key <span style="font-size:11px;color:#4dd9ff;font-weight:400;">(para generar imagenes con Flux)</span></h3>
  <input type="password" id="sm-replicate-key" class="sm-finput" placeholder="r8_..." value="<?php echo esc_attr(get_option('shellmind_replicate_key','')); ?>"/>
  <div style="font-size:11px;color:rgba(255,255,255,.4);margin:4px 0 8px;">Consegui tu key en <a href="https://replicate.com/account/api-tokens" target="_blank" style="color:#4dd9ff">replicate.com/account/api-tokens</a>  ~$0.003/imagen con Flux Schnell</div>
  <button class="sm-btn sm-btn--g" id="sm-save-replicate">Guardar</button>
</div>
<script>
document.getElementById('sm-save-replicate').addEventListener('click',function(){
  fetch(SMAdmin.restUrl+'shellmind/v1/settings',{method:'POST',headers:{'Content-Type':'application/json','X-WP-Nonce':SMAdmin.nonce},body:JSON.stringify({replicate_key:document.getElementById('sm-replicate-key').value})})
  .then(r=>r.json()).then(()=>{ this.textContent='Guardado!'; setTimeout(()=>{this.textContent='Guardar'},2000); });
});
</script>

      </div>
      <p id="sm-key-st" class="sm-fstatus"></p>
    </div>

    <div class="sm-card">
      <h3>Widget de Chat (Frontend)</h3>
      <p>Ícono de cerebro IA flotante en el sitio. Los visitantes pueden chatear con Claude sobre tu negocio.</p>
      <div class="sm-frow" style="align-items:center">
        <label style="font-size:12px;color:var(--txt2);display:flex;align-items:center;gap:8px;cursor:pointer">
          <input type="checkbox" id="sm-widget-on" style="accent-color:var(--green);width:13px;height:13px" <?php echo get_option('shellmind_widget_enabled', true) ? 'checked' : ''; ?>>
          Activar widget en el frontend
        </label>
        <button class="sm-btn sm-btn--g" id="sm-save-widget" style="margin-left:auto">Guardar</button>
      </div>
      <p id="sm-widget-st" class="sm-fstatus"></p>
    </div>

    <div class="sm-card">
      <h3>Directorio de Backups</h3>
      <code class="sm-cpath"><?php echo esc_html( SHELLMIND_BACKUP_DIR ); ?></code>
      <p>Protegido con .htaccess. Backup automático antes de cada publicación.</p>
    </div>

    <div class="sm-card sm-card--warn">
      <h3>Seguridad</h3>
      <ul class="sm-ul">
        <li>Solo accesible para <strong>Administradores</strong></li>
        <li>Acciones registradas en <code>shellmind-backups/history.log</code></li>
        <li>Acceso limitado a archivos dentro de la instalación WP</li>
        <li>Credenciales en wp-config.php se redactan automáticamente</li>
      </ul>
    </div>

  </div>
</div>
