<?php if ( ! defined( 'ABSPATH' ) ) exit; ?>
<div class="sm-app" id="sm-app">

  <!-- TOP BAR -->
  <div class="sm-topbar">
    <div class="sm-brand">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5" stroke="#00ff88" stroke-width="1.5"/>
        <polygon points="12 7 17 10 17 14 12 17 7 14 7 10" fill="#00ff88" opacity=".3"/>
      </svg>
      <span>Shell<b>Mind</b></span>
      <span class="sm-ver">v<?php echo SHELLMIND_VERSION; ?></span>
    </div>
    <div class="sm-tb-meta">
      <span class="sm-tpill sm-tpill--site"><?php echo esc_html( parse_url( get_site_url(), PHP_URL_HOST ) ); ?></span>
      <span class="sm-tpill">WP <?php echo get_bloginfo('version'); ?></span>
      <span class="sm-tpill">PHP <?php echo PHP_VERSION; ?></span>
    </div>
    <div class="sm-tb-right">
      <?php if ( empty( get_option('shellmind_api_key') ) ) : ?>
        <a href="<?php echo admin_url('admin.php?page=shellmind-settings'); ?>" class="sm-warn-link">⚠ Configurar API key</a>
      <?php else : ?>
        <span class="sm-online-dot"></span><span class="sm-online-lbl">Claude IA</span>
      <?php endif; ?>
      <!-- Preview toggle button -->
      <button class="sm-tb-btn" id="sm-pip-toggle" title="Preview en vivo">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><rect x="13" y="9" width="7" height="5" rx="1" fill="currentColor" stroke="none" opacity=".5"/></svg>
      </button>
      <button class="sm-tb-btn" id="sm-new-chat-btn" title="Nuevo chat">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>
    </div>
  </div>

  <!-- FULL WIDTH CHAT -->
  <div class="sm-chatzone">
    <div class="sm-feed" id="sm-feed">
      <div class="sm-welcome" id="sm-welcome">
        <div class="sm-welcome-hex">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
            <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5" stroke="#00ff88" stroke-width="1" fill="none"/>
            <polygon points="12 7 17 10 17 14 12 17 7 14 7 10" fill="#00ff88" opacity=".2"/>
          </svg>
        </div>
        <h2>Claude IA</h2>
        <p>Describí qué querés cambiar. Leo los archivos, te muestro el diff exacto y lo ves en tu sitio al publicar.</p>
        <div class="sm-chips">
          <button class="sm-chip" data-msg="¿Qué archivos tiene el tema activo?">📂 Ver archivos del tema</button>
          <button class="sm-chip" data-msg="Leé el functions.php del tema y explicame qué hace">📄 Revisar functions.php</button>
          <button class="sm-chip" data-msg="Buscá errores en los logs del servidor">🐛 Ver errores del servidor</button>
          <button class="sm-chip" data-msg="Cambiá el color primario del tema">🎨 Cambiar color primario</button>
        </div>
      </div>
    </div>

    <!-- Pending edit card -->
    <div class="sm-editcard" id="sm-editcard">
      <div class="sm-ec-header">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        <span class="sm-ec-file" id="sm-ec-file">—</span>
        <div class="sm-ec-tabs">
          <button class="sm-ectab sm-ectab--on" id="sm-ect-diff">Diff</button>
          <button class="sm-ectab" id="sm-ect-full">Completo</button>
        </div>
        <button class="sm-tb-btn sm-tb-btn--xs" id="sm-ec-close">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="sm-ec-desc" id="sm-ec-desc"></div>
      <div class="sm-ec-code" id="sm-ec-code"></div>
      <div class="sm-ec-actions">
        <span class="sm-ec-status" id="sm-ec-status">Revisá los cambios</span>
        <button class="sm-ec-btn sm-ec-btn--reject"    id="sm-ec-reject">✕ Rechazar</button>
        <button class="sm-ec-btn sm-ec-btn--overwrite" id="sm-ec-overwrite">⚠ Sobrescribir</button>
        <button class="sm-ec-btn sm-ec-btn--publish"   id="sm-ec-publish">▲ Publicar</button>
      </div>
    </div>

    <!-- Input -->
    <div class="sm-inputbar">
      <div class="sm-input-inner">
        <textarea id="sm-input" class="sm-input" placeholder="Decile a Claude qué cambiar…" rows="1"></textarea>
        <button class="sm-send-btn" id="sm-send-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    </div>

    <!-- Token bar -->
    <div class="sm-tokens">
      <span>Sesión: <b id="tk-si">0</b> in · <b id="tk-so">0</b> out</span>
      <span class="sm-tsep">·</span>
      <span>Total: <b id="tk-ti">—</b> in · <b id="tk-to">—</b> out</span>
      <span class="sm-tsep">·</span>
      <span>~$<b id="tk-cost">0.0000</b></span>
      <a href="https://console.anthropic.com/settings/billing" target="_blank" class="sm-tokens-link">+ Créditos ↗</a>
      <button class="sm-tokens-reset" id="tk-reset" title="Resetear">↺</button>
    </div>
  </div><!-- /.sm-chatzone -->

  <!-- FLOATING PiP PREVIEW -->
  <div class="sm-pip" id="sm-pip">
    <div class="sm-pip-bar" id="sm-pip-bar">
      <span class="sm-pip-title">
        <span class="sm-online-dot"></span>
        <?php echo esc_html( parse_url( get_site_url(), PHP_URL_HOST ) ); ?>
      </span>
      <div class="sm-pip-controls">
        <button class="sm-pip-btn" id="sm-pip-reload" title="Recargar">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>
        </button>
        <div class="sm-pip-devices">
          <button class="sm-pipd sm-pipd--on" data-w="100%" title="Desktop">D</button>
          <button class="sm-pipd" data-w="768px" title="Tablet">T</button>
          <button class="sm-pipd" data-w="390px" title="Mobile">M</button>
        </div>
        <button class="sm-pip-btn" id="sm-pip-expand" title="Expandir / Contraer">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
        </button>
        <button class="sm-pip-btn" id="sm-pip-close" title="Cerrar">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>
    <div class="sm-pip-frame">
      <iframe id="sm-iframe" src="<?php echo esc_url( get_site_url() ); ?>" title="Preview"></iframe>
      <div class="sm-pip-loader" id="sm-pip-loader">
        <div class="sm-spin"></div>
      </div>
      <div class="sm-pub-flash" id="sm-pub-flash">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
        Publicado
      </div>
    </div>
  </div><!-- /.sm-pip -->

</div><!-- /.sm-app -->
