<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class ShellMind_File_Editor {

    private function allowed_roots() {
        return [ realpath( ABSPATH ), realpath( WP_CONTENT_DIR ) ];
    }

    private function resolve( $path ) {
        if ( ! path_is_absolute( $path ) ) {
            $path = ABSPATH . ltrim( $path, '/' );
        }
        return $path;
    }

    private function is_allowed( $path ) {
        // Try to resolve; file may not exist yet (new file)
        $real = realpath( $path );
        if ( ! $real ) {
            $real = realpath( dirname( $path ) );
            if ( $real ) $real .= DIRECTORY_SEPARATOR . basename( $path );
        }
        if ( ! $real ) return false;

        foreach ( $this->allowed_roots() as $root ) {
            if ( $root && strpos( $real, $root ) === 0 ) return true;
        }
        return false;
    }

    /* ------------------------------------------------------------------ */

    public function read_file_safe( $path ) {
        $path = $this->resolve( $path );

        if ( ! $this->is_allowed( $path ) )
            return "ERROR: Access denied. Path must be inside the WordPress installation.";

        if ( ! file_exists( $path ) )
            return "ERROR: File not found — {$path}";

        if ( ! is_readable( $path ) )
            return "ERROR: File not readable (check permissions) — {$path}";

        $size = filesize( $path );
        if ( $size > 512 * 1024 )
            return "ERROR: File too large ({$size} bytes, limit 512 KB).";

        $content = file_get_contents( $path );

        if ( basename( $path ) === 'wp-config.php' ) {
            $content = $this->redact_wp_config( $content );
        }

        $lines = substr_count( $content, "\n" ) + 1;
        return "FILE: {$path}\nSIZE: {$size} bytes | LINES: {$lines}\n\n{$content}";
    }

    public function list_directory_safe( $path ) {
        $path = $this->resolve( $path );

        if ( ! $this->is_allowed( $path ) )
            return "ERROR: Access denied.";

        if ( ! is_dir( $path ) )
            return "ERROR: Not a directory — {$path}";

        $items  = scandir( $path );
        $output = "DIRECTORY: {$path}\n\n";

        foreach ( $items as $item ) {
            if ( $item === '.' || $item === '..' ) continue;
            $full  = $path . DIRECTORY_SEPARATOR . $item;
            $type  = is_dir( $full ) ? 'DIR ' : 'FILE';
            $extra = is_file( $full ) ? '  (' . number_format( filesize( $full ) ) . ' B)' : '';
            $output .= "{$type}  {$item}{$extra}\n";
        }

        return $output;
    }

    public function write_file( $path, $new_content, $overwrite = false ) {
        $path = $this->resolve( $path );

        if ( ! $this->is_allowed( $path ) )
            return [ 'success' => false, 'error' => 'Access denied.' ];

        // Backup existing file (skip if overwrite mode)
        $backup_path = null;
        if ( file_exists( $path ) && ! $overwrite ) {
            $bm          = new ShellMind_Backup_Manager();
            $backup_path = $bm->backup_file( $path );
        }

        $written = file_put_contents( $path, $new_content );
        if ( $written === false ) {
            return [ 'success' => false, 'error' => 'Write failed — check file permissions.' ];
        }

        return [
            'success'     => true,
            'bytes'       => $written,
            'backup_path' => $backup_path,
        ];
    }

    /**
     * Returns a structured unified diff between file on disk and $new_content.
     * Context lines: 3 before/after each hunk.
     */
    public function get_diff( $path, $new_content ) {
        $path = $this->resolve( $path );

        if ( ! file_exists( $path ) ) {
            return [ 'type' => 'new_file', 'lines' => explode( "\n", $new_content ) ];
        }

        $old_lines = explode( "\n", file_get_contents( $path ) );
        $new_lines = explode( "\n", $new_content );

        // LCS-based diff
        $diff = $this->compute_diff( $old_lines, $new_lines );

        return [ 'type' => 'diff', 'hunks' => $this->build_hunks( $diff, 3 ) ];
    }

    /* ------------------------------------------------------------------ */
    /*  Diff helpers                                                        */
    /* ------------------------------------------------------------------ */

    private function compute_diff( $old, $new ) {
        $m   = count( $old );
        $n   = count( $new );
        $lcs = [];

        // Build LCS table (memory-efficient for large files via Hunt–Szymanski shortcut)
        // Simple DP — fine for files up to a few thousand lines
        $dp = array_fill( 0, $m + 1, array_fill( 0, $n + 1, 0 ) );
        for ( $i = $m - 1; $i >= 0; $i-- ) {
            for ( $j = $n - 1; $j >= 0; $j-- ) {
                if ( $old[ $i ] === $new[ $j ] ) {
                    $dp[ $i ][ $j ] = 1 + $dp[ $i + 1 ][ $j + 1 ];
                } else {
                    $dp[ $i ][ $j ] = max( $dp[ $i + 1 ][ $j ], $dp[ $i ][ $j + 1 ] );
                }
            }
        }

        // Backtrack
        $result = [];
        $i = 0; $j = 0;
        while ( $i < $m && $j < $n ) {
            if ( $old[ $i ] === $new[ $j ] ) {
                $result[] = [ 'type' => 'same', 'old_no' => $i + 1, 'new_no' => $j + 1, 'content' => $old[ $i ] ];
                $i++; $j++;
            } elseif ( $dp[ $i + 1 ][ $j ] >= $dp[ $i ][ $j + 1 ] ) {
                $result[] = [ 'type' => 'remove', 'old_no' => $i + 1, 'content' => $old[ $i ] ];
                $i++;
            } else {
                $result[] = [ 'type' => 'add', 'new_no' => $j + 1, 'content' => $new[ $j ] ];
                $j++;
            }
        }
        while ( $i < $m ) {
            $result[] = [ 'type' => 'remove', 'old_no' => $i + 1, 'content' => $old[ $i ] ];
            $i++;
        }
        while ( $j < $n ) {
            $result[] = [ 'type' => 'add', 'new_no' => $j + 1, 'content' => $new[ $j ] ];
            $j++;
        }

        return $result;
    }

    private function build_hunks( $diff, $context = 3 ) {
        // Find changed line indices
        $changed = [];
        foreach ( $diff as $idx => $line ) {
            if ( $line['type'] !== 'same' ) $changed[] = $idx;
        }

        if ( empty( $changed ) ) return [];

        // Group into ranges with context
        $ranges = [];
        $start  = max( 0, $changed[0] - $context );
        $end    = min( count( $diff ) - 1, $changed[0] + $context );

        foreach ( $changed as $i ) {
            if ( $i - $context > $end + 1 ) {
                $ranges[] = [ $start, $end ];
                $start = max( 0, $i - $context );
            }
            $end = min( count( $diff ) - 1, $i + $context );
        }
        $ranges[] = [ $start, $end ];

        $hunks = [];
        foreach ( $ranges as [ $s, $e ] ) {
            $hunks[] = array_slice( $diff, $s, $e - $s + 1 );
        }

        return $hunks;
    }

    private function redact_wp_config( $content ) {
        $patterns = [
            "/(define\s*\(\s*'DB_PASSWORD'\s*,\s*')[^']*(')/i",
            "/(define\s*\(\s*'AUTH_KEY'\s*,\s*')[^']*(')/i",
            "/(define\s*\(\s*'SECURE_AUTH_KEY'\s*,\s*')[^']*(')/i",
            "/(define\s*\(\s*'LOGGED_IN_KEY'\s*,\s*')[^']*(')/i",
            "/(define\s*\(\s*'NONCE_KEY'\s*,\s*')[^']*(')/i",
            "/(define\s*\(\s*'AUTH_SALT'\s*,\s*')[^']*(')/i",
            "/(define\s*\(\s*'SECURE_AUTH_SALT'\s*,\s*')[^']*(')/i",
            "/(define\s*\(\s*'LOGGED_IN_SALT'\s*,\s*')[^']*(')/i",
            "/(define\s*\(\s*'NONCE_SALT'\s*,\s*')[^']*(')/i",
        ];
        foreach ( $patterns as $p ) {
            $content = preg_replace( $p, '$1[REDACTED]$2', $content );
        }
        return $content;
    }
}
