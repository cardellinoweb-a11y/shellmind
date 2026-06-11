<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class ShellMind_Claude_API {

    private $api_key;
    private $model        = 'claude-sonnet-4-6';
    private $api_url      = 'https://api.anthropic.com/v1/messages';
    private $max_tokens   = 8192;

    private $tools = [
        [
            'name'        => 'read_file',
            'description' => 'Read the contents of a file on the server. Always read a file before proposing edits to it.',
            'input_schema' => [
                'type'       => 'object',
                'properties' => [
                    'path' => [ 'type' => 'string', 'description' => 'Absolute or ABSPATH-relative path to the file.' ],
                ],
                'required' => [ 'path' ],
            ],
        ],
        [
            'name'        => 'list_directory',
            'description' => 'List files in a directory on the server.',
            'input_schema' => [
                'type'       => 'object',
                'properties' => [
                    'path' => [ 'type' => 'string', 'description' => 'Path to the directory.' ],
                ],
                'required' => [ 'path' ],
            ],
        ],
        [
            'name'        => 'propose_file_edit',
            'description' => 'Propose a file edit. The user sees a full diff and must click Apply before anything changes.',
            'input_schema' => [
                'type'       => 'object',
                'properties' => [
                    'file'        => [ 'type' => 'string', 'description' => 'Absolute path to the file to edit.' ],
                    'new_content' => [ 'type' => 'string', 'description' => 'Complete new file content (full file, not a patch).' ],
                    'description' => [ 'type' => 'string', 'description' => 'Plain-language description of what changed and why.' ],
                ],
                'required' => [ 'file', 'new_content', 'description' ],
            ],
        ],
        [
            'name'        => 'generate_image',
            'description' => 'Generate an image using Replicate (Flux model). Use when the user asks to create, generate or design an image. Returns a URL of the generated image.',
            'input_schema' => [
                'type'       => 'object',
                'properties' => [
                    'prompt'      => [ 'type' => 'string', 'description' => 'Detailed English prompt describing the image to generate.' ],
                    'description' => [ 'type' => 'string', 'description' => 'Short description for the user explaining what is being generated.' ],
                ],
                'required' => [ 'prompt' ],
            ],
        ],
        [
            'name' => 'list_pages',
            'description' => 'List WordPress pages/posts with their IDs, titles and URLs. Use this to find the post_id of a page before reading or editing its Elementor content.',
            'input_schema' => [
                'type' => 'object',
                'properties' => [
                    'post_type' => [ 'type' => 'string', 'description' => 'Post type to list: page, post, or any. Default: page.' ],
                ],
                'required' => [],
            ],
        ],
        [
            'name' => 'read_elementor_page',
            'description' => 'Read the Elementor JSON data for a WordPress page/post by post_id. Returns the full widget tree so you can find elements, icons, text and settings. Always call list_pages first if you do not know the post_id.',
            'input_schema' => [
                'type' => 'object',
                'properties' => [
                    'post_id' => [ 'type' => 'integer', 'description' => 'The WordPress post ID of the page to read.' ],
                ],
                'required' => [ 'post_id' ],
            ],
        ],
        [
            'name' => 'propose_elementor_edit',
            'description' => 'Propose an edit to Elementor page data. The user sees a summary and must click Apply before anything changes. The new_data must be the COMPLETE modified Elementor JSON array for the post.',
            'input_schema' => [
                'type' => 'object',
                'properties' => [
                    'post_id'     => [ 'type' => 'integer', 'description' => 'The WordPress post ID to edit.' ],
                    'new_data'    => [ 'type' => 'string',  'description' => 'Complete new Elementor JSON data (full array, not a patch).' ],
                    'description' => [ 'type' => 'string',  'description' => 'Plain-language description of what changed and why.' ],
                ],
                'required' => [ 'post_id', 'new_data', 'description' ],
            ],
        ],
    ];

    public function __construct() {
        $this->api_key = get_option( 'shellmind_api_key', '' );
    }

    /* ==============================================================
       STANDARD CHAT  (blocking, used as fallback)
    ============================================================== */

    public function chat( array $messages ) {
        if ( empty( $this->api_key ) ) {
            return [ 'error' => 'API key not set. Go to ShellMind -> Settings.' ];
        }
        $response = $this->call_api( $messages );
        if ( isset( $response['error'] ) ) return $response;
        return $this->process_response( $response, $messages );
    }

    /* ==============================================================
       STREAMING CHAT  (SSE via curl WRITEFUNCTION)
    ============================================================== */

    /**
     * Streams the Claude response directly to the browser via SSE.
     *
     * Each SSE event has a "type" field:
     *   delta       text chunk  { text: "..." }
     *   tool_start  tool begins { id, name, input_so_far: "" }
     *   tool_done   tool result ready, handled server-side (transparent)
     *   edit        pending edit proposal { file, description, new_content }
     *   done        stream finished { usage: {...} }
     *   error       { message: "..." }
     *
     * The method runs the full tool-use loop internally:
     *   stream text  receive tool_use  execute tool  feed result  stream again
     */
    public function stream_chat( array $messages ) {
        if ( empty( $this->api_key ) ) {
            $this->sse_send( 'error', [ 'message' => 'API key not set.' ] );
            return;
        }

        $loop_messages = $messages;
        $max_loops     = 8;   // guard against infinite tool loops
        $total_usage   = [ 'input_tokens' => 0, 'output_tokens' => 0 ];

        for ( $loop = 0; $loop < $max_loops; $loop++ ) {

            // Accumulate the full response while streaming text to browser
            $result = $this->curl_stream( $loop_messages, $total_usage );

            if ( isset( $result['error'] ) ) {
                $this->sse_send( 'error', [ 'message' => $result['error'] ] );
                return;
            }

            $stop    = $result['stop_reason'];
            $content = $result['content'];   // assembled content blocks

            //  end_turn or max_tokens: we are done 
            if ( $stop === 'end_turn' || $stop === 'max_tokens' ) {
                if ( $stop === 'max_tokens' ) {
                    $this->sse_send( 'delta', [ 'text' => "\n\n *Respuesta cortada. Pedime que contine.*" ] );
                }
                break;
            }

            //  tool_use 
            if ( $stop === 'tool_use' ) {
                $tool_results  = [];
                $pending_edit  = null;

                foreach ( $content as $block ) {
                    if ( $block['type'] !== 'tool_use' ) continue;

                    $id    = $block['id'];
                    $name  = $block['name'];
                    $input = $block['input'];

                    switch ( $name ) {

                        case 'read_file':
                            $this->sse_send( 'tool_start', [ 'name' => 'read_file', 'path' => $input['path'] ] );
                            $fe = new ShellMind_File_Editor();
                            $tool_results[] = [
                                'type'        => 'tool_result',
                                'tool_use_id' => $id,
                                'content'     => $fe->read_file_safe( $input['path'] ),
                            ];
                            break;

                        case 'list_directory':
                            $this->sse_send( 'tool_start', [ 'name' => 'list_directory', 'path' => $input['path'] ] );
                            $fe = new ShellMind_File_Editor();
                            $tool_results[] = [
                                'type'        => 'tool_result',
                                'tool_use_id' => $id,
                                'content'     => $fe->list_directory_safe( $input['path'] ),
                            ];
                            break;

                        case 'generate_image':
                            // Start Replicate job without blocking  return job_url immediately
                            $job = $this->start_replicate_job( $input );
                            $this->sse_send( 'image_pending', $job );
                            $tool_results[] = [
                                'type'        => 'tool_result',
                                'tool_use_id' => $id,
                                'content'     => isset($job['job_url'])
                                    ? 'Image generation started. Job: ' . $job['job_url']
                                    : 'Error starting image job: ' . ($job['error'] ?? 'unknown'),
                            ];
                            break;
                        case 'list_pages':
                            $post_type = $input['post_type'] ?? 'page';
                            if ( $post_type === 'any' ) $post_type = '';
                            $query_args = [
                                'post_type'      => $post_type ?: [ 'page', 'post' ],
                                'post_status'    => 'publish',
                                'posts_per_page' => 50,
                                'orderby'        => 'title',
                                'order'          => 'ASC',
                            ];
                            $posts = get_posts( $query_args );
                            $result_list = [];
                            foreach ( $posts as $p ) {
                                $result_list[] = [
                                    'post_id' => $p->ID,
                                    'title'   => $p->post_title,
                                    'url'     => get_permalink( $p->ID ),
                                    'type'    => $p->post_type,
                                ];
                            }
                            $tool_result = wp_json_encode( $result_list, JSON_UNESCAPED_UNICODE );
                            break;

                        case 'read_elementor_page':
                            $post_id = intval( $input['post_id'] ?? 0 );
                            if ( ! $post_id ) {
                                $tool_result = 'Error: post_id is required.';
                                break;
                            }
                            $raw = get_post_meta( $post_id, '_elementor_data', true );
                            if ( empty( $raw ) ) {
                                $tool_result = 'No Elementor data found for post_id ' . $post_id . '. The page may not use Elementor.';
                            } else {
                                $tool_result = $raw;
                            }
                            break;

                        case 'propose_elementor_edit':
                            $pending_edit = [
                                'type'        => 'elementor',
                                'post_id'     => intval( $input['post_id'] ?? 0 ),
                                'new_data'    => $input['new_data'] ?? '',
                                'description' => $input['description'] ?? '',
                            ];
                            $tool_results[] = [
                                'type'       => 'tool_result',
                                'tool_use_id'=> $id,
                                'content'    => 'Elementor edit proposed. Waiting for user confirmation.',
                            ];
                            break;

                        case 'propose_file_edit':
                            $pending_edit = [
                                'file'        => $input['file'],
                                'new_content' => $input['new_content'],
                                'description' => $input['description'],
                            ];
                            $tool_results[] = [
                                'type'        => 'tool_result',
                                'tool_use_id' => $id,
                                'content'     => 'Edit proposed. Waiting for user confirmation.',
                            ];
                            break;
                    }
                }

                // If there is a pending edit, surface it and stop the loop
                if ( $pending_edit ) {
                    $this->sse_send( 'edit', $pending_edit );
                    break;
                }

                // Otherwise feed tool results back and continue the loop
                $loop_messages = array_merge( $loop_messages, [
                    [ 'role' => 'assistant', 'content' => $content ],
                    [ 'role' => 'user',      'content' => $tool_results ],
                ] );

                continue;   // next iteration
            }

            // Unknown stop reason  bail out
            break;
        }

        // Track usage and signal done
        $this->track_usage( $total_usage );
        $this->sse_send( 'done', [ 'usage' => $total_usage ] );
    }

    /* ==============================================================
       CURL STREAMING CORE
       Calls Anthropic with stream:true, forwards text deltas via SSE,
       and assembles the full response for tool-use processing.
    ============================================================== */

    private function curl_stream( array $messages, array &$total_usage ) {
        @set_time_limit( 0 );

        $payload = json_encode( [
            'model'      => $this->model,
            'max_tokens' => $this->max_tokens,
            'system'     => $this->build_system_prompt(),
            'tools'      => $this->tools,
            'messages'   => $this->trim_messages( $messages ),
            'stream'     => true,
        ] );

        // Accumulated state while streaming
        $state = [
            'content_blocks' => [],   // assembled content array
            'current_block'  => null, // block being built
            'current_index'  => -1,
            'stop_reason'    => null,
            'usage'          => [],
            'error'          => null,
            'buffer'         => '',   // partial SSE line buffer
        ];

        $self = $this;  // for use inside closure

        $ch = curl_init();
        curl_setopt_array( $ch, [
            CURLOPT_URL            => $this->api_url,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $payload,
            CURLOPT_RETURNTRANSFER => false,
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'x-api-key: ' . $this->api_key,
                'anthropic-version: 2023-06-01',
            ],
            CURLOPT_TIMEOUT        => 120,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_WRITEFUNCTION  => function( $ch, $chunk ) use ( &$state, $self ) {
                // Feed chunk into line buffer
                $state['buffer'] .= $chunk;

                // Process complete SSE lines
                while ( ( $pos = strpos( $state['buffer'], "\n" ) ) !== false ) {
                    $line          = substr( $state['buffer'], 0, $pos );
                    $state['buffer'] = substr( $state['buffer'], $pos + 1 );
                    $line          = rtrim( $line, "\r" );

                    if ( strpos( $line, 'data: ' ) === 0 ) {
                        $json_str = substr( $line, 6 );
                        if ( $json_str === '[DONE]' ) continue;

                        $ev = json_decode( $json_str, true );
                        if ( ! $ev ) continue;

                        $self->handle_sse_event( $ev, $state );
                    }
                }

                return strlen( $chunk );
            },
        ] );

        curl_exec( $ch );
        $curl_error = curl_error( $ch );
        curl_close( $ch );

        if ( $curl_error ) {
            return [ 'error' => 'curl: ' . $curl_error ];
        }

        if ( $state['error'] ) {
            return [ 'error' => $state['error'] ];
        }

        // Merge usage
        $total_usage['input_tokens']  += $state['usage']['input_tokens']  ?? 0;
        $total_usage['output_tokens'] += $state['usage']['output_tokens'] ?? 0;

        return [
            'stop_reason' => $state['stop_reason'] ?? 'end_turn',
            'content'     => $state['content_blocks'],
        ];
    }

    /* ==============================================================
       SSE EVENT HANDLER  (called from curl WRITEFUNCTION closure)
    ============================================================== */

    public function handle_sse_event( array $ev, array &$state ) {
        $type = $ev['type'] ?? '';

        switch ( $type ) {

            case 'content_block_start':
                $idx   = $ev['index'];
                $block = $ev['content_block'];
                $state['current_index']                = $idx;
                $state['content_blocks'][ $idx ]       = $block;
                $state['current_block']                = &$state['content_blocks'][ $idx ];

                // For tool_use, pre-set input_json accumulator
                if ( $block['type'] === 'tool_use' ) {
                    $state['content_blocks'][ $idx ]['input_json'] = '';
                }
                break;

            case 'content_block_delta':
                $idx   = $ev['index'];
                $delta = $ev['delta'];

                if ( ! isset( $state['content_blocks'][ $idx ] ) ) break;

                $block_type = $state['content_blocks'][ $idx ]['type'] ?? '';

                if ( $delta['type'] === 'text_delta' && $block_type === 'text' ) {
                    $text = $delta['text'];
                    $state['content_blocks'][ $idx ]['text'] = ( $state['content_blocks'][ $idx ]['text'] ?? '' ) . $text;
                    // Forward text to browser immediately
                    $this->sse_send( 'delta', [ 'text' => $text ] );
                }

                if ( $delta['type'] === 'input_json_delta' && $block_type === 'tool_use' ) {
                    $state['content_blocks'][ $idx ]['input_json'] .= $delta['partial_json'];
                }
                break;

            case 'content_block_stop':
                $idx = $ev['index'];
                if ( isset( $state['content_blocks'][ $idx ] ) &&
                     $state['content_blocks'][ $idx ]['type'] === 'tool_use' ) {
                    // Parse accumulated JSON into the input field
                    $json = $state['content_blocks'][ $idx ]['input_json'] ?? '{}';
                    $state['content_blocks'][ $idx ]['input'] = json_decode( $json, true ) ?? [];
                    unset( $state['content_blocks'][ $idx ]['input_json'] );
                }
                break;

            case 'message_delta':
                $state['stop_reason'] = $ev['delta']['stop_reason'] ?? $state['stop_reason'];
                if ( isset( $ev['usage'] ) ) {
                    $state['usage'] = array_merge( $state['usage'], $ev['usage'] );
                }
                break;

            case 'message_start':
                if ( isset( $ev['message']['usage'] ) ) {
                    $state['usage'] = $ev['message']['usage'];
                }
                break;

            case 'error':
                $state['error'] = $ev['error']['message'] ?? 'Unknown streaming error.';
                break;
        }
    }

    /* ==============================================================
       SSE HELPERS
    ============================================================== */

    /**
     * Send a single SSE event and flush immediately.
     */
    public function sse_send( string $event_type, array $data ) {
        echo 'event: ' . $event_type . "\n";
        echo 'data: '  . json_encode( $data, JSON_UNESCAPED_UNICODE ) . "\n\n";

        if ( function_exists( 'fastcgi_finish_request' ) ) {
            // Not useful here, skip
        }
        if ( ob_get_level() > 0 ) {
            ob_flush();
        }
        flush();
    }

    /**
     * Set SSE response headers and kill all output buffers.
     * Call this BEFORE any output.
     */
    public static function sse_headers() {
        // Kill every output buffer WordPress or PHP started
        while ( ob_get_level() > 0 ) {
            ob_end_clean();
        }

        @ini_set( 'output_buffering',       'off' );
        @ini_set( 'zlib.output_compression', false );
        @ini_set( 'implicit_flush',          true  );

        header( 'Content-Type: text/event-stream; charset=UTF-8' );
        header( 'Cache-Control: no-cache, no-store' );
        header( 'X-Accel-Buffering: no' );   // disables nginx/LiteSpeed buffer
        header( 'Connection: keep-alive' );
        header_remove( 'Content-Encoding' );
    }

    /* ==============================================================
       STANDARD (BLOCKING) API CALL   kept as fallback
    ============================================================== */

    private function call_api( array $messages ) {
        @set_time_limit( 180 );
        $body = wp_remote_post( $this->api_url, [
            'timeout'   => 120,
            'sslverify' => false,
            'headers'   => [
                'Content-Type'      => 'application/json',
                'x-api-key'         => $this->api_key,
                'anthropic-version' => '2023-06-01',
            ],
            'body' => wp_json_encode( [
                'model'      => $this->model,
                'max_tokens' => $this->max_tokens,
                'system'     => $this->build_system_prompt(),
                'tools'      => $this->tools,
                'messages'   => $this->trim_messages( $messages ),
            ] ),
        ] );

        if ( is_wp_error( $body ) ) {
            return [ 'error' => $body->get_error_message() ];
        }

        $decoded = json_decode( wp_remote_retrieve_body( $body ), true );
        if ( ! empty( $decoded['error'] ) ) {
            return [ 'error' => $decoded['error']['message'] ?? 'Unknown Claude API error.' ];
        }

        return $decoded;
    }

    private function process_response( array $response, array $messages ) {
        $stop    = $response['stop_reason'] ?? 'end_turn';
        $content = $response['content']     ?? [];
        $usage   = $response['usage']       ?? [];

        $this->track_usage( $usage );

        if ( $stop === 'end_turn' ) {
            $text = '';
            foreach ( $content as $block ) {
                if ( $block['type'] === 'text' ) $text .= $block['text'];
            }
            return [ 'type' => 'message', 'text' => $text, 'usage' => $usage ];
        }

        if ( $stop === 'max_tokens' ) {
            $text = '';
            foreach ( $content as $block ) {
                if ( $block['type'] === 'text' ) $text .= $block['text'];
            }
            $text .= "\n\n *Respuesta cortada. Pedime que contine.*";
            return [ 'type' => 'message', 'text' => $text, 'usage' => $usage ];
        }

        if ( $stop === 'tool_use' ) {
            $tool_results  = [];
            $pending_edit  = null;
            $assistant_text = '';

            foreach ( $content as $block ) {
                if ( $block['type'] === 'text' ) {
                    $assistant_text .= $block['text'];
                }
                if ( $block['type'] === 'tool_use' ) {
                    $id    = $block['id'];
                    $name  = $block['name'];
                    $input = $block['input'];

                    switch ( $name ) {
                        case 'read_file':
                            $fe = new ShellMind_File_Editor();
                            $tool_results[] = [
                                'type'        => 'tool_result',
                                'tool_use_id' => $id,
                                'content'     => $fe->read_file_safe( $input['path'] ),
                            ];
                            break;

                        case 'list_directory':
                            $fe = new ShellMind_File_Editor();
                            $tool_results[] = [
                                'type'        => 'tool_result',
                                'tool_use_id' => $id,
                                'content'     => $fe->list_directory_safe( $input['path'] ),
                            ];
                            break;

                        case 'propose_file_edit':
                            $pending_edit = [
                                'file'        => $input['file'],
                                'new_content' => $input['new_content'],
                                'description' => $input['description'],
                            ];
                            $tool_results[] = [
                                'type'        => 'tool_result',
                                'tool_use_id' => $id,
                                'content'     => 'Edit proposed. Waiting for user confirmation.',
                            ];
                            break;
                    }
                }
            }

            if ( $pending_edit ) {
                return [
                    'type'  => 'pending_edit',
                    'text'  => $assistant_text,
                    'edit'  => $pending_edit,
                    'usage' => $usage,
                ];
            }

            $new_messages = array_merge( $messages, [
                [ 'role' => 'assistant', 'content' => $content ],
                [ 'role' => 'user',      'content' => $tool_results ],
            ] );

            $next = $this->call_api( $new_messages );
            if ( isset( $next['error'] ) ) return $next;
            return $this->process_response( $next, $new_messages );
        }

        return [ 'type' => 'message', 'text' => 'Unexpected stop reason: ' . $stop ];
    }

    /* ==============================================================
       SYSTEM PROMPT
    ============================================================== */

    private function build_system_prompt() {
        $root    = ABSPATH;
        $phpv    = PHP_VERSION;
        $wpv     = get_bloginfo( 'version' );
        $theme   = get_template();
        $url     = get_site_url();
        $plugins = implode( ', ', array_map(
            fn( $p ) => explode( '/', $p )[0],
            array_slice( get_option( 'active_plugins', [] ), 0, 15 )
        ) );

        $project_context = '';
        $claude_md = SHELLMIND_PATH . 'CLAUDE.md';
        if ( is_readable( $claude_md ) ) {
            $md = trim( (string) file_get_contents( $claude_md ) );
            if ( '' !== $md ) {
                $project_context = "\n\n## PROJECT CONTEXT (CLAUDE.md)\n" . $md;
            }
        }

        $prompt = <<<PROMPT
You are ShellMind, an expert WordPress server assistant embedded inside the WordPress admin.

## SERVER CONTEXT
- WordPress Root : {$root}
- WordPress      : {$wpv}
- PHP            : {$phpv}
- Site URL       : {$url}
- Active theme   : {$theme}
- Active plugins : {$plugins}

## YOUR TOOLS
1. read_file       read any file within the WP install before touching it
2. list_directory  explore the directory structure
3. list_pages - list WordPress pages with their post_ids
4. read_elementor_page(post_id) - read Elementor widget JSON for a page
5. propose_elementor_edit(post_id, new_data, description) - propose Elementor DB edit (user must confirm)
6. propose_file_edit  send a COMPLETE new file to the user as a diff for review; user must click "Apply" to commit

## RULES
- For CSS/style changes: read ONLY the specific CSS file (max 1 read_file), then propose_file_edit immediately. Do NOT read templates or PHP files for style-only changes.
- For PHP/template changes: you may read the file first, then propose_file_edit.
- MINIMIZE tool calls: max 2 reads before propose_file_edit. Do not explore directories unless the file path is completely unknown.
- Explain your reasoning in plain language before proposing an edit.
- Never produce partial files  new_content must be the complete file.
- Highlight any security issues, deprecated code, or performance problems you spot.
- When reading wp-config.php, summarize credentials; never echo passwords or secret keys verbatim.
- Only access paths inside {$root} or wp-content.
- Be direct and concise  this is a developer tool.
PROMPT;

        return $prompt . $project_context;
    }

    /* ==============================================================
       TOKEN TRACKING
    ============================================================== */

    private function track_usage( array $usage ) {
        if ( empty( $usage ) ) return;
        $totals = get_option( 'shellmind_token_totals', [
            'input'  => 0,
            'output' => 0,
            'calls'  => 0,
        ] );
        $totals['input']  += $usage['input_tokens']  ?? 0;
        $totals['output'] += $usage['output_tokens'] ?? 0;
        $totals['calls']  += 1;
        update_option( 'shellmind_token_totals', $totals );
    }

    public static function get_totals() {
        return get_option( 'shellmind_token_totals', [ 'input' => 0, 'output' => 0, 'calls' => 0 ] );
    }

    public static function reset_totals() {
        update_option( 'shellmind_token_totals', [ 'input' => 0, 'output' => 0, 'calls' => 0 ] );
    }

    /* ==============================================================
       WIDGET CHAT (frontend  no tools, no file access)
    ============================================================== */

    public function widget_chat( array $messages ) {
        if ( empty( $this->api_key ) ) {
            return [ 'error' => 'API key not configured.' ];
        }

        $site_url  = get_site_url();
        $site_name = get_bloginfo( 'name' );
        $site_desc = get_bloginfo( 'description' );

        $system = "You are the AI assistant for {$site_name} ({$site_url}).
Site description: {$site_desc}

Answer visitor questions about the site, its services, and how to contact the team.
Be friendly, concise, and helpful. Respond in the same language the visitor uses.
Do NOT discuss internal server details, files, or WordPress administration.";

        @set_time_limit( 120 );
        $body = wp_remote_post( $this->api_url, [
            'timeout'   => 30,
            'headers'   => [
                'Content-Type'      => 'application/json',
                'x-api-key'         => $this->api_key,
                'anthropic-version' => '2023-06-01',
            ],
            'body' => wp_json_encode( [
                'model'      => $this->model,
                'max_tokens' => 512,
                'system'     => $system,
                'messages'   => array_slice( $messages, -10 ),
            ] ),
        ] );

        if ( is_wp_error( $body ) ) return [ 'error' => $body->get_error_message() ];

        $decoded = json_decode( wp_remote_retrieve_body( $body ), true );
        if ( ! empty( $decoded['error'] ) ) return [ 'error' => $decoded['error']['message'] ];

        $text = '';
        foreach ( $decoded['content'] ?? [] as $block ) {
            if ( $block['type'] === 'text' ) $text .= $block['text'];
        }

        $this->track_usage( $decoded['usage'] ?? [] );

        return [ 'type' => 'message', 'text' => $text, 'usage' => $decoded['usage'] ?? [] ];
    }

    /* ==============================================================
       TRIM MESSAGES  (keep last 10 full, strip tool_result content from older)
    ============================================================== */

    private function trim_messages( array $messages ) {
        $total          = count( $messages );
        $keep_full_from = max( 0, $total - 10 );   // fixed: was $total-1

        foreach ( $messages as $i => &$msg ) {
            if ( $i >= $keep_full_from ) continue;

            if ( is_array( $msg['content'] ) ) {
                foreach ( $msg['content'] as &$block ) {
                    if ( isset( $block['type'] ) && $block['type'] === 'tool_result' ) {
                        $block['content'] = '[file content omitted  ask me to re-read if needed]';
                    }
                }
                unset( $block );
            }
        }
        unset( $msg );

        return $messages;
    }


    /* Non-blocking Replicate job start  returns job_url for frontend polling */
    public function start_replicate_job( array $input ) : array {
        $api_key = get_option( 'shellmind_replicate_key', '' );
        if ( empty( $api_key ) ) {
            return [ 'error' => 'Replicate API key not set. Go to ShellMind -> Settings.' ];
        }

        $prompt = $input['prompt'] ?? '';
        if ( empty( $prompt ) ) return [ 'error' => 'Empty prompt.' ];

        $model = 'black-forest-labs/flux-schnell';
        $url   = 'https://api.replicate.com/v1/models/' . $model . '/predictions';

        $body = json_encode([
            'input' => [
                'prompt'              => $prompt,
                'num_outputs'         => 1,
                'aspect_ratio'        => '16:9',
                'output_format'       => 'webp',
                'output_quality'      => 80,
                'num_inference_steps' => 4,
            ]
        ]);

        $ch = curl_init( $url );
        curl_setopt_array( $ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $body,
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_HTTPHEADER     => [
                'Authorization: Token ' . $api_key,
                'Content-Type: application/json',
            ],
        ] );

        $raw  = curl_exec( $ch );
        $err  = curl_error( $ch );
        curl_close( $ch );

        if ( $err ) return [ 'error' => $err ];

        $data = json_decode( $raw, true );
        if ( ! $data ) return [ 'error' => 'Invalid JSON from Replicate.' ];

        // If already succeeded (fast models)
        if ( isset( $data['output'] ) && $data['status'] === 'succeeded' ) {
            $img_url = is_array( $data['output'] ) ? $data['output'][0] : $data['output'];
            return [
                'url'         => $img_url,
                'prompt'      => $prompt,
                'description' => $input['description'] ?? 'Imagen generada',
                'status'      => 'succeeded',
            ];
        }

        // Return job_url for frontend to poll
        return [
            'job_url'     => $data['urls']['get'] ?? '',
            'status'      => $data['status'] ?? 'starting',
            'prompt'      => $prompt,
            'description' => $input['description'] ?? 'Imagen generada',
        ];
    }


    /* Poll a Replicate job by URL */
    public function poll_replicate_job( string $job_url ) : array {
        $api_key = get_option( 'shellmind_replicate_key', '' );
        if ( empty( $api_key ) ) return [ 'error' => 'No API key.' ];

        $ch = curl_init( $job_url );
        curl_setopt_array( $ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 10,
            CURLOPT_HTTPHEADER     => [ 'Authorization: Token ' . $api_key ],
        ] );
        $raw = curl_exec( $ch );
        curl_close( $ch );

        $data = json_decode( $raw, true );
        if ( ! $data ) return [ 'status' => 'error', 'error' => 'Invalid response.' ];

        if ( $data['status'] === 'succeeded' && isset( $data['output'] ) ) {
            $img_url = is_array( $data['output'] ) ? $data['output'][0] : $data['output'];
            return [ 'status' => 'succeeded', 'url' => $img_url ];
        }

        if ( $data['status'] === 'failed' ) {
            return [ 'status' => 'failed', 'error' => $data['error'] ?? 'Job failed.' ];
        }

        return [ 'status' => $data['status'] ?? 'processing' ];
    }

    /* ==============================================================
       REPLICATE API  Image generation via Flux model
    ============================================================== */
    public function call_replicate_public( array $input ) : array { return $this->call_replicate($input); }
    private function call_replicate( array $input ) : array {
        $api_key = get_option( 'shellmind_replicate_key', '' );
        if ( empty( $api_key ) ) {
            return [ 'error' => 'Replicate API key not set. Go to ShellMind -> Settings.' ];
        }

        $prompt = $input['prompt'] ?? '';
        if ( empty( $prompt ) ) return [ 'error' => 'Empty prompt.' ];

        // Use Flux Schnell (fastest, cheapest ~$0.003/img)
        $model = 'black-forest-labs/flux-schnell';
        $url   = 'https://api.replicate.com/v1/models/' . $model . '/predictions';

        $body = json_encode([
            'input' => [
                'prompt'          => $prompt,
                'num_outputs'     => 1,
                'aspect_ratio'    => '16:9',
                'output_format'   => 'webp',
                'output_quality'  => 80,
                'num_inference_steps' => 4,
            ]
        ]);

        $ch = curl_init( $url );
        curl_setopt_array( $ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $body,
            CURLOPT_TIMEOUT        => 60,
            CURLOPT_HTTPHEADER     => [
                'Authorization: Token ' . $api_key,
                'Content-Type: application/json',
                'Prefer: wait=30',
            ],
        ] );

        $raw = curl_exec( $ch );
        $err = curl_error( $ch );
        curl_close( $ch );

        if ( $err ) return [ 'error' => $err ];

        $data = json_decode( $raw, true );
        if ( ! $data ) return [ 'error' => 'Invalid JSON from Replicate.' ];

        // If status is processing, poll for result
        if ( isset( $data['urls']['get'] ) && ( $data['status'] === 'processing' || $data['status'] === 'starting' ) ) {
            $poll_url = $data['urls']['get'];
            for ( $i = 0; $i < 30; $i++ ) {
                sleep( 2 );
                $ch2 = curl_init( $poll_url );
                curl_setopt_array( $ch2, [
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_TIMEOUT        => 10,
                    CURLOPT_HTTPHEADER     => [ 'Authorization: Token ' . $api_key ],
                ] );
                $raw2 = curl_exec( $ch2 );
                curl_close( $ch2 );
                $data = json_decode( $raw2, true );
                if ( $data && $data['status'] === 'succeeded' ) break;
                if ( $data && $data['status'] === 'failed' ) {
                    return [ 'error' => $data['error'] ?? 'Replicate job failed.' ];
                }
            }
        }

        if ( isset( $data['output'] ) ) {
            $img_url = is_array( $data['output'] ) ? $data['output'][0] : $data['output'];
            return [
                'url'         => $img_url,
                'prompt'      => $prompt,
                'description' => $input['description'] ?? 'Imagen generada',
            ];
        }

        return [ 'error' => 'No output from Replicate. Response: ' . substr($raw, 0, 200) ];
    }


/* ============================================================
   DESIGN OPS  (frontend  no tools, no stream  fast JSON)
   Returns a JSON list of deterministic edit operations that
   widget.js applies locally as an instant preview.
   ============================================================ */
public function design_ops( array $messages, string $page_context = '' ) {
if ( empty( $this->api_key ) ) return [ 'error' => 'No API key configured.' ];

$system = "You are a web design assistant for a WordPress + Elementor site. "
. "The user describes a visual change in natural language. "
. "You MUST respond with ONLY a valid JSON object, no prose, no markdown, no code fences. "
. "Schema: {\"ops\":[{\"op\":\"style\",\"selector\":\"CSS selector\",\"prop\":\"css-property\",\"value\":\"css-value\"},{\"op\":\"text\",\"selector\":\"CSS selector\",\"value\":\"new text\"}],\"explain\":\"short summary in the user's language\"}. "
. "Only use op types 'style' and 'text'. Use precise, real CSS selectors based on the page context. "
. "Keep selectors conservative (classes/tags visible on the page). If unsure, prefer the most likely visible element. "
. "Never include explanations outside the JSON.";

if ( $page_context ) {
$system .= "\n\nPAGE CONTEXT (visible structure):\n" . substr( $page_context, 0, 4000 );
}

$body = wp_remote_post( $this->api_url, [
'timeout' => 30,
'headers' => [
'Content-Type'      => 'application/json',
'x-api-key'         => $this->api_key,
'anthropic-version' => '2023-06-01',
],
'body' => wp_json_encode( [
'model'      => $this->model,
'max_tokens' => 400,
'system'     => $system,
'messages'   => array_slice( $messages, -6 ),
] ),
] );

if ( is_wp_error( $body ) ) return [ 'error' => $body->get_error_message() ];
$decoded = json_decode( wp_remote_retrieve_body( $body ), true );
if ( ! empty( $decoded['error'] ) ) return [ 'error' => $decoded['error']['message'] ];

$text = '';
foreach ( $decoded['content'] ?? [] as $block ) {
if ( ( $block['type'] ?? '' ) === 'text' ) $text .= $block['text'];
}
$this->track_usage( $decoded['usage'] ?? [] );

// Strip any accidental code fences and isolate the JSON object.
$text = trim( $text );
$text = preg_replace( '/^```(?:json)?|```$/m', '', $text );
$start = strpos( $text, '{' );
$end   = strrpos( $text, '}' );
if ( $start !== false && $end !== false ) {
$text = substr( $text, $start, $end - $start + 1 );
}
$ops = json_decode( $text, true );
if ( ! is_array( $ops ) || ! isset( $ops['ops'] ) ) {
return [ 'error' => 'Invalid ops JSON', 'raw' => substr( $text, 0, 300 ) ];
}
return [ 'type' => 'ops', 'ops' => $ops['ops'], 'explain' => $ops['explain'] ?? '' ];
}
}
