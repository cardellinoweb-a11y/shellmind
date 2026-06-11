<?php
/**
 * Plugin Name: ShellMind
 * Plugin URI:  https://shellmind.io
 * Description: AI-powered server terminal for WordPress. Chat with Claude to read, edit, and manage your server files — with confirmation before every change.
 * Version:     0.6.0
 * Author:      ShellMind
 * License:     GPL v2 or later
 * Text Domain: shellmind
 */

if ( ! defined( 'ABSPATH' ) ) exit;

define( 'SHELLMIND_VERSION', '0.6.0' );
define( 'SHELLMIND_PATH',       plugin_dir_path( __FILE__ ) );
define( 'SHELLMIND_URL',        plugin_dir_url( __FILE__ ) );
define( 'SHELLMIND_BACKUP_DIR', WP_CONTENT_DIR . '/shellmind-backups/' );

require_once SHELLMIND_PATH . 'includes/class-claude-api.php';
require_once SHELLMIND_PATH . 'includes/class-file-editor.php';
require_once SHELLMIND_PATH . 'includes/class-backup-manager.php';
require_once SHELLMIND_PATH . 'api/class-rest-api.php';
require_once SHELLMIND_PATH . 'admin/class-admin.php';

add_action( 'plugins_loaded', function () {
    new ShellMind_Admin();
    new ShellMind_REST_API();
} );

register_activation_hook( __FILE__, function () {
    $dirs = [
        SHELLMIND_BACKUP_DIR,
        SHELLMIND_BACKUP_DIR . 'files/',
        SHELLMIND_BACKUP_DIR . 'snapshots/',
    ];
    foreach ( $dirs as $dir ) {
        if ( ! file_exists( $dir ) ) {
            wp_mkdir_p( $dir );
        }
    }
    $htaccess = SHELLMIND_BACKUP_DIR . '.htaccess';
    if ( ! file_exists( $htaccess ) ) {
        file_put_contents( $htaccess, 'Deny from all' );
    }
} );

// Allow the site to load in iframe for admin preview
// (removes X-Frame-Options for logged-in admins only)
add_action( 'send_headers', function () {
    if ( ! is_admin() && is_user_logged_in() && current_user_can( 'administrator' ) ) {
        header_remove( 'X-Frame-Options' );
        header( 'X-Frame-Options: SAMEORIGIN' );
    }
} );
