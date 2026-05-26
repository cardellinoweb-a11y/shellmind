<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class ShellMind_REST_API {

    public function __construct() {
        add_action( 'rest_api_init', [ $this, 'register_routes' ] );
    }

    public function register_routes() {
        $ns = 'shellmind/v1';

        register_rest_route( $ns, '/chat', [
            'methods'             => 'POST',
            'callback'            => [ $this, 'handle_chat' ],
            'permission_callback' => [ $this, 'only_admin' ],
        ] );

        // SSE streaming endpoint
        register_rest_route( $ns, '/chat-stream', [
            'methods'             => 'POST',
            'callback'            => [ $this, 'handle_chat_stream' ],
            'permission_callback' => [ $this, 'only_admin' ],
        ] );

        register_rest_route( $ns, '/apply-edit', [
            'methods'             => 'POST',
            'callback'            => [ $this, 'handle_apply_edit' ],
            'permission_callback' => [ $this, 'only_admin' ],
        ] );

        register_rest_route( $ns, '/diff', [
            'methods'             => 'POST',
            'callback'            => [ $this, 'handle_diff' ],
            'permission_callback' => [ $this, 'only_admin' ],
        ] );

        register_rest_route( $ns, '/backups', [
            'methods'             => 'GET',
            'callback'            => [ $this, 'get_backups' ],
            'permission_callback' => [ $this, 'only_admin' ],
        ] );

        register_rest_route( $ns, '/restore', [
            'methods'             => 'POST',
            'callback'            => [ $this, 'handle_restore' ],
            'permission_callback' => [ $this, 'only_admin' ],
        ] );

        register_rest_route( $ns, '/widget-chat', [
            'methods'             => 'POST',
            'callback'            => [ $this, 'handle_widget_chat' ],
            'permission_callback' => '__return_true',
        ] );

        register_rest_route( $ns, '/tokens', [
            'methods'             => 'GET',
            'callback'            => [ $this, 'get_tokens' ],
            'permission_callback' => [ $this, 'only_admin' ],
        ] );

        register_rest_route( $ns, '/tokens/reset', [
            'methods'             => 'POST',
            'callback'            => [ $this, 'reset_tokens' ],
            'permission_callback' => [ $this, 'only_admin' ],
        ] );

        register_rest_route( $ns, '/settings', [
            'methods'             => [ 'GET', 'POST' ],
            'callback'            => [ $this, 'handle_settings' ],
            'permission_callback' => [ $this, 'only_admin' ],
        ] );
    }

    public function only_admin() {
        return current_user_can( 'administrator' );
    }

    /* ------------------------------------------------------------------ */

    public function handle_chat( WP_REST_Request $req ) {
        $messages = $req->get_param( 'messages' );

        if ( ! is_array( $messages ) || empty( $messages ) ) {
            return new WP_Error( 'bad_request', 'messages[] required.', [ 'status' => 400 ] );
        }

        $claude   = new ShellMind_Claude_API();
        $response = $claude->chat( $messages );

        if ( isset( $response['error'] ) ) {
            return new WP_Error( 'claude_error', $response['error'], [ 'status' => 500 ] );
        }

        return rest_ensure_response( $response );
    }

    /**
     * SSE streaming endpoint.
     * Bypasses normal WP REST JSON response  outputs raw text/event-stream.
     */
    public function handle_chat_stream( WP_REST_Request $req ) {
        $messages = $req->get_param( 'messages' );

        if ( ! is_array( $messages ) || empty( $messages ) ) {
            // Can't use WP_Error here because headers may already be sent
            ShellMind_Claude_API::sse_headers();
            $claude = new ShellMind_Claude_API();
            $claude->sse_send( 'error', [ 'message' => 'messages[] required.' ] );
            exit;
        }

        // Set SSE headers  this kills all output buffers
        ShellMind_Claude_API::sse_headers();

        $claude = new ShellMind_Claude_API();
        $claude->stream_chat( $messages );

        exit; // Never return to WP REST  we own the response
    }

    /* ------------------------------------------------------------------ */

    public function handle_apply_edit( WP_REST_Request $req ) {
        $file        = $req->get_param( 'file' );
        $new_content = $req->get_param( 'new_content' );

        if ( ! $file || $new_content === null ) {
            return new WP_Error( 'bad_request', 'file and new_content required.', [ 'status' => 400 ] );
        }

        $overwrite = (bool) $req->get_param( 'overwrite' );

        $fe     = new ShellMind_File_Editor();
        $result = $fe->write_file( $file, $new_content, $overwrite );

        if ( ! $result['success'] ) {
            return new WP_Error( 'write_error', $result['error'], [ 'status' => 500 ] );
        }

        $this->audit( 'edit_file', [ 'file' => $file, 'backup' => $result['backup_path'] ] );

        $backup_name = $result['backup_path'] ? basename( $result['backup_path'] ) : '(none)';
        return rest_ensure_response( [
            'success'     => true,
            'backup_name' => $backup_name,
            'bytes'       => $result['bytes'],
        ] );
    }

    public function handle_diff( WP_REST_Request $req ) {
        $file        = $req->get_param( 'file' );
        $new_content = $req->get_param( 'new_content' );

        if ( ! $file || $new_content === null ) {
            return new WP_Error( 'bad_request', 'file and new_content required.', [ 'status' => 400 ] );
        }

        $fe   = new ShellMind_File_Editor();
        $diff = $fe->get_diff( $file, $new_content );
        return rest_ensure_response( $diff );
    }

    public function get_backups() {
        $bm = new ShellMind_Backup_Manager();
        return rest_ensure_response( $bm->list_backups() );
    }

    public function handle_restore( WP_REST_Request $req ) {
        $backup   = $req->get_param( 'backup_path' );
        $original = $req->get_param( 'original_path' );

        if ( ! $backup || ! $original ) {
            return new WP_Error( 'bad_request', 'backup_path and original_path required.', [ 'status' => 400 ] );
        }

        $bm     = new ShellMind_Backup_Manager();
        $result = $bm->restore_file( $backup, $original );

        if ( $result['success'] ) {
            $this->audit( 'restore_file', [ 'backup' => $backup, 'to' => $original ] );
        }

        return rest_ensure_response( $result );
    }

    public function handle_widget_chat( WP_REST_Request $req ) {
        $ip   = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $key  = 'sm_rl_' . md5( $ip );
        $hits = (int) get_transient( $key );
        if ( $hits >= 20 ) {
            return new WP_Error( 'rate_limit', 'Too many requests. Try again later.', [ 'status' => 429 ] );
        }
        set_transient( $key, $hits + 1, HOUR_IN_SECONDS );

        $messages = $req->get_param( 'messages' );
        if ( ! is_array( $messages ) || empty( $messages ) ) {
            return new WP_Error( 'bad_request', 'messages[] required.', [ 'status' => 400 ] );
        }

        $claude   = new ShellMind_Claude_API();
        $response = $claude->widget_chat( $messages );

        if ( isset( $response['error'] ) ) {
            return new WP_Error( 'claude_error', $response['error'], [ 'status' => 500 ] );
        }

        return rest_ensure_response( $response );
    }

    public function get_tokens() {
        $totals = ShellMind_Claude_API::get_totals();
        $cost   = ( $totals['input'] / 1e6 * 3 ) + ( $totals['output'] / 1e6 * 15 );
        return rest_ensure_response( array_merge( $totals, [
            'cost_usd' => round( $cost, 4 ),
        ] ) );
    }

    public function reset_tokens() {
        ShellMind_Claude_API::reset_totals();
        return rest_ensure_response( [ 'success' => true ] );
    }

    public function handle_settings( WP_REST_Request $req ) {
        if ( $req->get_method() === 'POST' ) {
            $key = $req->get_param( 'api_key' );
            if ( $key ) {
                update_option( 'shellmind_api_key', sanitize_text_field( $key ) );
            }
            $widget = $req->get_param( 'widget_enabled' );
            if ( $widget !== null ) {
                update_option( 'shellmind_widget_enabled', (bool) $widget );
            }
            return rest_ensure_response( [ 'success' => true ] );
        }

        $key = get_option( 'shellmind_api_key', '' );
        return rest_ensure_response( [
            'has_key'        => ! empty( $key ),
            'key_preview'    => ! empty( $key ) ? substr( $key, 0, 10 ) . '...' : '',
            'widget_enabled' => (bool) get_option( 'shellmind_widget_enabled', true ),
        ] );
    }

    /* ------------------------------------------------------------------ */

    private function audit( $action, $data ) {
        $log   = SHELLMIND_BACKUP_DIR . 'history.log';
        $user  = wp_get_current_user()->user_login;
        $entry = date( 'Y-m-d H:i:s' ) . " | {$user} | {$action} | " . wp_json_encode( $data ) . "\n";
        file_put_contents( $log, $entry, FILE_APPEND | LOCK_EX );
    }
}
