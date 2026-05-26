<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class ShellMind_Backup_Manager {

    private $root;

    public function __construct() {
        $this->root = SHELLMIND_BACKUP_DIR;
        $this->init_dirs();
    }

    private function init_dirs() {
        $dirs = [ $this->root, $this->root . 'files/', $this->root . 'snapshots/' ];
        foreach ( $dirs as $d ) {
            if ( ! file_exists( $d ) ) wp_mkdir_p( $d );
        }
        $ht = $this->root . '.htaccess';
        if ( ! file_exists( $ht ) ) file_put_contents( $ht, 'Deny from all' );
    }

    /* ------------------------------------------------------------------ */

    public function backup_file( $path ) {
        if ( ! file_exists( $path ) ) return null;

        $name    = basename( $path );
        $ts      = date( 'Y-m-d_H-i-s' );
        $dest    = $this->root . 'files/' . $name . '_' . $ts . '.bak';

        if ( ! copy( $path, $dest ) ) return null;

        $this->log( 'file_backup', [
            'original' => $path,
            'backup'   => $dest,
        ] );

        return $dest;
    }

    public function restore_file( $backup_path, $original_path ) {
        if ( ! file_exists( $backup_path ) )
            return [ 'success' => false, 'error' => 'Backup not found.' ];

        // Back up current state before restoring
        if ( file_exists( $original_path ) ) {
            $this->backup_file( $original_path );
        }

        if ( copy( $backup_path, $original_path ) ) {
            $this->log( 'file_restore', [
                'backup'   => $backup_path,
                'restored' => $original_path,
            ] );
            return [ 'success' => true ];
        }

        return [ 'success' => false, 'error' => 'Copy failed — check permissions.' ];
    }

    public function list_backups() {
        $dir  = $this->root . 'files/';
        $list = [];

        if ( ! is_dir( $dir ) ) return $list;

        $items = scandir( $dir, SCANDIR_SORT_DESCENDING );
        foreach ( $items as $item ) {
            if ( $item === '.' || $item === '..' ) continue;
            $full   = $dir . $item;
            $list[] = [
                'filename' => $item,
                'path'     => $full,
                'size'     => filesize( $full ),
                'created'  => filemtime( $full ),
                'original' => $this->guess_original_path( $item ),
            ];
        }

        return $list;
    }

    private function guess_original_path( $backup_filename ) {
        // Strip trailing _YYYY-MM-DD_HH-II-SS.bak
        return preg_replace( '/_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.bak$/', '', $backup_filename );
    }

    private function log( $action, $data ) {
        $log   = $this->root . 'history.log';
        $user  = is_user_logged_in() ? wp_get_current_user()->user_login : 'system';
        $entry = date( 'Y-m-d H:i:s' ) . " | {$user} | {$action} | " . wp_json_encode( $data ) . "\n";
        file_put_contents( $log, $entry, FILE_APPEND | LOCK_EX );
    }
}
