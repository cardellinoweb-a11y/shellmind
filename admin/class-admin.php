<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class ShellMind_Admin {

    public function __construct() {
        add_action( 'admin_menu',             [ $this, 'register_menu' ] );
        add_action( 'admin_enqueue_scripts',  [ $this, 'enqueue_admin_assets' ] );
        add_action( 'wp_enqueue_scripts',     [ $this, 'enqueue_widget' ] );
    }

    public function register_menu() {
        add_menu_page( 'ShellMind', 'ShellMind', 'administrator', 'shellmind', [ $this, 'page_chat' ], 'dashicons-editor-code', 2 );
        add_submenu_page( 'shellmind', 'Terminal',  'Terminal',  'administrator', 'shellmind',          [ $this, 'page_chat' ] );
        add_submenu_page( 'shellmind', 'Backups',   'Backups',   'administrator', 'shellmind-backups',  [ $this, 'page_backups' ] );
        add_submenu_page( 'shellmind', 'Settings',  'Settings',  'administrator', 'shellmind-settings', [ $this, 'page_settings' ] );
    }

    public function enqueue_admin_assets( $hook ) {
        if ( strpos( $hook, 'shellmind' ) === false ) return;

        wp_enqueue_style( 'shellmind-css', SHELLMIND_URL . 'assets/css/chat.css', [], SHELLMIND_VERSION );
        wp_enqueue_script( 'shellmind-js',  SHELLMIND_URL . 'assets/js/chat.js',  [], SHELLMIND_VERSION, true );

        wp_localize_script( 'shellmind-js', 'SM', [
            'rest'    => get_rest_url( null, 'shellmind/v1/' ),
            'nonce'   => wp_create_nonce( 'wp_rest' ),
            'wpRoot'  => ABSPATH,
            'siteUrl' => get_site_url(),
            'page'    => isset( $_GET['page'] ) ? sanitize_key( $_GET['page'] ) : 'shellmind',
        ] );
    }

    public function enqueue_widget() {
        // Only show if API key is configured and widget is enabled
        if ( empty( get_option( 'shellmind_api_key' ) ) ) return;
        if ( ! get_option( 'shellmind_widget_enabled', true ) ) return;

        wp_enqueue_style(  'shellmind-widget-css', SHELLMIND_URL . 'assets/css/widget.css', [], SHELLMIND_VERSION );
        wp_enqueue_script( 'shellmind-widget-js',  SHELLMIND_URL . 'assets/js/widget.js',  [], SHELLMIND_VERSION, true );

        $is_admin = is_user_logged_in() && current_user_can( 'administrator' );

        wp_localize_script( 'shellmind-widget-js', 'SMWidget', [
            'restUrl'  => get_rest_url( null, 'shellmind/v1/' ),
            'siteName' => get_bloginfo( 'name' ),
            'siteUrl'  => get_site_url(),
            'isAdmin'  => $is_admin,
            'nonce'    => $is_admin ? wp_create_nonce( 'wp_rest' ) : '',
            'wpRoot'   => $is_admin ? ABSPATH : '',
        ] );
    }

    public function page_chat()     { include SHELLMIND_PATH . 'admin/views/page-chat.php'; }
    public function page_backups()  { include SHELLMIND_PATH . 'admin/views/page-backups.php'; }
    public function page_settings() { include SHELLMIND_PATH . 'admin/views/page-settings.php'; }
}
