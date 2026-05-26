<?php if ( ! defined( 'ABSPATH' ) ) exit; ?>
<div class="sm-app sm-app--scroll">
  <div class="sm-topbar">
    <div class="sm-brand">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5" stroke="#00ff88" stroke-width="1.5"/></svg>
      <span>Shell<b>Mind</b></span>
      <span class="sm-ver">v<?php echo SHELLMIND_VERSION; ?></span>
    </div>
    <div style="flex:1"></div>
    <button class="sm-tb-btn" id="sm-refresh-backups" title="Actualizar">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>
    </button>
  </div>
  <div class="sm-bwrap">
    <div id="sm-bwrap-inner"></div>
  </div>
</div>
