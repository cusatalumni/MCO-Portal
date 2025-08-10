import React, { useState } from 'react';
import { Clipboard, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const phpCode = `<?php
/**
 * ===================================================================
 * V22: Shortcode and Login Form Fix
 * ===================================================================
 * This version refactors the login form handling to resolve issues
 * where the shortcode would appear to not work.
 * 1.  Core Fix: Moves form submission logic (login/sync) from the
 *     shortcode handler to the 'init' hook. This prevents "headers
 *     already sent" errors and allows redirects to function correctly.
 * 2.  Improved Auth: Replaces wp_authenticate with wp_signon for a
 *     more reliable login process that correctly sets all auth cookies.
 * 3.  Robustness: Correctly handles email-based logins by using
 *     sanitize_text_field instead of sanitize_user, which could
 *     strip the '@' symbol.
 * 4.  Structure: All actions and filters are now registered within
 *     a single function hooked to 'init' for better loading practice.
 */


// --- CONFIGURATION ---
define('ANNAPOORNA_LOGIN_SLUG', 'exam-login');
define('ANNAPOORNA_EXAM_APP_URL', 'https://exams.coding-online.net/');
define('ANNAPOORNA_EXAM_APP_TEST_URL', 'https://mco-exam-jkfzdt3bj-manoj-balakrishnans-projects-aa177a85.vercel.app/');
// IMPORTANT: Define a secure, random key in wp-config.php
// define('ANNAPOORNA_JWT_SECRET', 'your-very-strong-secret-key-that-is-long-and-random');
// define('ANNAPOORNA_DEBUG', true); // Add for debug logging
// --- END CONFIGURATION ---

// Global variable to hold login error message between POST handling and shortcode rendering
$annapoorna_login_error = '';


/**
 * Main setup function to initialize all hooks and handle POST requests.
 */
function annapoorna_exam_app_init() {
    // --- Handle POST submissions early ---
    annapoorna_handle_login_form_post();
    
    // --- Register all hooks and shortcodes ---
    add_action('admin_notices', 'annapoorna_check_dependencies');
    add_action('admin_menu', 'annapoorna_exam_add_admin_menu');
    add_action('admin_init', 'annapoorna_exam_register_settings');
    add_action('woocommerce_thankyou', 'annapoorna_redirect_after_purchase', 10, 1);
    add_action('rest_api_init', 'annapoorna_exam_register_rest_api');
    add_action('register_form', 'annapoorna_exam_add_custom_registration_fields');
    add_action('user_register', 'annapoorna_exam_save_reg_fields');
    
    add_filter('registration_errors', 'annapoorna_exam_validate_reg_fields', 10, 3);
    add_filter('login_url', 'annapoorna_exam_login_url', 10, 2);
    
    add_shortcode('exam_portal_login', 'annapoorna_exam_login_shortcode');
}
add_action('init', 'annapoorna_exam_app_init');


/**
 * Handles the POST submission from the custom login form.
 * This function is called from the 'init' action hook to run before headers are sent.
 */
function annapoorna_handle_login_form_post() {
    global $annapoorna_login_error;

    if ('POST' !== $_SERVER['REQUEST_METHOD'] || strpos($_SERVER['REQUEST_URI'], '/' . ANNAPOORNA_LOGIN_SLUG . '/') === false) {
        return;
    }
    
    $user_id = 0;
    if (!empty($_POST['exam_login_nonce']) && wp_verify_nonce($_POST['exam_login_nonce'], 'exam_login_action')) {
        $creds = [
            'user_login'    => sanitize_text_field($_POST['log']),
            'user_password' => $_POST['pwd'],
            'remember'      => true
        ];
        $user = wp_signon($creds, false);

        if (is_wp_error($user)) {
            $annapoorna_login_error = 'Invalid username or password.';
        } else {
            $user_id = $user->ID;
        }
    } elseif (!empty($_POST['annapoorna_admin_sync_nonce']) && wp_verify_nonce($_POST['annapoorna_admin_sync_nonce'], 'annapoorna_admin_sync_action')) {
        $user_id = get_current_user_id();
        if (!$user_id) $annapoorna_login_error = 'Error: User not authenticated for admin sync.';
    }
    
    if ($user_id > 0) {
        if ($token = annapoorna_generate_exam_jwt($user_id)) {
            $redirect_to = isset($_REQUEST['redirect_to']) ? esc_url_raw(urldecode($_REQUEST['redirect_to'])) : '/dashboard';
            $is_admin = in_array('administrator', (array) get_userdata($user_id)->roles);
            $url = annapoorna_get_exam_app_url($is_admin) . '#/auth?token=' . $token . '&redirect_to=' . urlencode($redirect_to);
            wp_redirect($url);
            exit;
        } else { 
            $annapoorna_login_error = 'Could not generate login token.'; 
        }
    }
}


/**
 * Debug logging function. Only logs when ANNAPOORNA_DEBUG is true.
 * @param mixed $message The message or object to log.
 */
function annapoorna_debug_log($message) {
    if (defined('ANNAPOORNA_DEBUG') && ANNAPOORNA_DEBUG) {
        error_log('Exam App Debug: ' . print_r($message, true));
    }
}

/**
 * Displays an admin notice if WooCommerce is not active.
 */
function annapoorna_check_dependencies() {
    if (!class_exists('WooCommerce')) {
        echo '<div class="notice notice-error"><p><strong>Exam App Integration:</strong> WooCommerce is not active. Exam purchasing and pricing features will not work.</p></div>';
    }
}

/** Registers the 'Exam App Settings' page in the admin menu. */
function annapoorna_exam_add_admin_menu() {
    add_options_page('Exam App Settings', 'Exam App Settings', 'manage_options', 'exam-app-settings', 'annapoorna_exam_settings_page_html');
}

/** Registers the settings for the admin page. */
function annapoorna_exam_register_settings() {
    register_setting('annapoorna_exam_app_settings_group', 'annapoorna_exam_app_mode');
}

/** Renders the HTML for the 'Exam App Settings' page. */
function annapoorna_exam_settings_page_html() {
    if (!current_user_can('manage_options')) return;
    ?>
    <div class="wrap">
        <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
        <p>This setting controls which version of the exam application is used for admin redirects.</p>
        <form action="options.php" method="post">
            <?php settings_fields('annapoorna_exam_app_settings_group'); ?>
            <table class="form-table">
                <tr><th scope="row">Application Mode for Admins</th>
                    <td><fieldset>
                        <label><input type="radio" name="annapoorna_exam_app_mode" value="production" <?php checked(get_option('annapoorna_exam_app_mode'), 'production'); ?> /> Production</label><br/>
                        <label><input type="radio" name="annapoorna_exam_app_mode" value="test" <?php checked(get_option('annapoorna_exam_app_mode', 'test'), 'test'); ?> /> Test</label>
                    </fieldset></td>
                </tr>
            </table>
            <?php submit_button('Save Settings'); ?>
        </form>
    </div>
    <?php
}

/**
 * Returns the appropriate exam app URL based on user role and saved admin setting.
 * @param  bool $is_admin Whether the current user is an administrator.
 * @return string The exam app URL.
 */
function annapoorna_get_exam_app_url($is_admin = false) {
    if ($is_admin) {
        $mode = get_option('annapoorna_exam_app_mode', 'test');
        return $mode === 'production' ? ANNAPOORNA_EXAM_APP_URL : ANNAPOORNA_EXAM_APP_TEST_URL;
    }
    return ANNAPOORNA_EXAM_APP_URL;
}

/**
 * Generates JWT payload, including dynamic prices from WooCommerce.
 * @param  int $user_id The user's ID.
 * @return array|null The payload data or null on failure.
 */
function annapoorna_exam_get_payload($user_id) {
    if (!$user = get_userdata($user_id)) return null;

    $is_admin = in_array('administrator', (array) $user->roles);
    $user_full_name = trim($user->first_name . ' ' . $user->last_name) ?: $user->display_name;
    
    $paid_exam_ids = [];
    $exam_prices = new stdClass();

    if (class_exists('WooCommerce')) {
        $exam_map = [
            'CPC-CERT-EXAM' => 'exam-cpc-cert', 'CCA-CERT-EXAM' => 'exam-cca-cert', 'CCS-CERT-EXAM' => 'exam-ccs-cert',
            'MEDICAL-BILLING-CERT' => 'exam-billing-cert', 'RISK-ADJUSTMENT-CERT' => 'exam-risk-cert',
            'ICD-10-CM-CERT' => 'exam-icd-cert', 'CPB-CERT-EXAM' => 'exam-cpb-cert', 'CRC-CERT-EXAM' => 'exam-crc-cert',
            'CPMA-CERT-EXAM' => 'exam-cpma-cert', 'COC-CERT-EXAM' => 'exam-coc-cert', 'CIC-CERT-EXAM' => 'exam-cic-cert',
            'MTA-CERT' => 'exam-mta-cert',
        ];
        
        $exam_prices = get_transient('annapoorna_exam_prices');
        if (false === $exam_prices) {
            annapoorna_debug_log('Exam prices not cached. Fetching from DB.');
            $exam_prices = new stdClass();
            foreach ($exam_map as $sku => $exam_id) {
                if (($product_id = wc_get_product_id_by_sku($sku)) && ($product = wc_get_product($product_id))) {
                    $exam_prices->{$exam_id} = (float) $product->get_price();
                }
            }
            set_transient('annapoorna_exam_prices', $exam_prices, 12 * HOUR_IN_SECONDS);
        }
        
        $orders = wc_get_orders(['customer_id' => $user->ID, 'status' => ['completed', 'processing', 'on-hold'], 'limit' => -1]);
        foreach ($orders as $order) {
            foreach ($order->get_items() as $item) {
                $product = $item->get_product();
                if ($product && ($sku = $product->get_sku()) && isset($exam_map[$sku])) {
                    $paid_exam_ids[] = $exam_map[$sku];
                }
            }
        }
        $paid_exam_ids = array_unique($paid_exam_ids);
    }
    
    return [
        'iss' => get_site_url(), 'iat' => time(), 'exp' => time() + (60 * 60 * 2),
        'user' => ['id' => (string)$user->ID, 'name' => $user_full_name, 'email' => $user->user_email, 'isAdmin' => $is_admin], 
        'paidExamIds' => $paid_exam_ids,
        'examPrices' => $exam_prices,
    ];
}

function annapoorna_base64url_encode($data) { return rtrim(strtr(base64_encode($data), '+/', '-_'), '='); }
function annapoorna_base64url_decode($data) { return base64_decode(strtr($data, '-_', '+/')); }

/**
 * Generates a secure JWT.
 * @param  int $user_id The user ID to generate a token for.
 * @return string|null The JWT or null on failure.
 */
function annapoorna_generate_exam_jwt($user_id) {
    $secret_key = defined('ANNAPOORNA_JWT_SECRET') ? ANNAPOORNA_JWT_SECRET : '';
    if (empty($secret_key) || strlen($secret_key) < 32 || strpos($secret_key, 'your-very-strong-secret-key') !== false) {
        annapoorna_debug_log('JWT Secret is not configured or is too weak.');
        return null;
    }
    if (!$payload = annapoorna_exam_get_payload($user_id)) return null;

    $header_b64 = annapoorna_base64url_encode(json_encode(['typ' => 'JWT', 'alg' => 'HS256']));
    $payload_b64 = annapoorna_base64url_encode(json_encode($payload));
    $signature = hash_hmac('sha256', "$header_b64.$payload_b64", $secret_key, true);
    $signature_b64 = annapoorna_base64url_encode($signature);

    return "$header_b64.$payload_b64.$signature_b64";
}

/**
 * Verifies a JWT and returns the payload on success.
 * @param  string $token The JWT to verify.
 * @return array|null The decoded payload or null on failure.
 */
function annapoorna_verify_exam_jwt($token) {
    $secret_key = defined('ANNAPOORNA_JWT_SECRET') ? ANNAPOORNA_JWT_SECRET : '';
    if (empty($secret_key) || strlen($secret_key) < 32) {
        annapoorna_debug_log('JWT Secret is not configured or is too weak for verification.');
        return null;
    }
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;

    list($header_b64, $payload_b64, $signature_b64) = $parts;
    $signature = annapoorna_base64url_decode($signature_b64);
    $expected_signature = hash_hmac('sha256', "$header_b64.$payload_b64", $secret_key, true);

    if (!hash_equals($expected_signature, $signature)) return null;

    $payload = json_decode(annapoorna_base64url_decode($payload_b64), true);
    return (isset($payload['exp']) && $payload['exp'] < time()) ? null : $payload;
}

/**
 * Redirects after WooCommerce purchase and clears the cart.
 * @param int $order_id The ID of the completed order.
 */
function annapoorna_redirect_after_purchase($order_id) {
    if (!$order_id || !($order = wc_get_order($order_id)) || !($user_id = $order->get_customer_id())) return;

    if ($user_id > 0 && $order->has_status(['completed', 'processing', 'on-hold'])) {
        if (function_exists('WC') && WC()->cart) WC()->cart->empty_cart();
        if ($token = annapoorna_generate_exam_jwt($user_id)) {
            $user = get_userdata($user_id);
            $base_url = annapoorna_get_exam_app_url(in_array('administrator', (array) $user->roles));
            wp_redirect($base_url . '#/auth?token=' . $token . '&redirect_to=/dashboard');
            exit;
        }
    }
}

/**
 * Shortcode handler for the custom login form.
 * @return string HTML for the login form.
 */
function annapoorna_exam_login_shortcode() {
    global $annapoorna_login_error;
    
    if (!defined('ANNAPOORNA_JWT_SECRET') || strlen(ANNAPOORNA_JWT_SECRET) < 32 || strpos(ANNAPOORNA_JWT_SECRET, 'your-very-strong-secret-key') !== false) {
        return "<p class='exam-portal-error'>Configuration error: A strong, unique ANNAPOORNA_JWT_SECRET (at least 32 characters) must be defined in wp-config.php.</p>";
    }
    
    $redirect_to = isset($_REQUEST['redirect_to']) ? esc_url_raw(urldecode($_REQUEST['redirect_to'])) : '/dashboard';

    ob_start();
    ?>
    <style>.exam-portal-container{font-family:sans-serif;max-width:400px;margin:5% auto;padding:40px;background:#fff;border-radius:12px;box-shadow:0 10px 25px -5px rgba(0,0,0,.1)}.exam-portal-container h2{text-align:center;font-size:24px;margin-bottom:30px}.exam-portal-container .form-row{margin-bottom:20px}.exam-portal-container label{display:block;margin-bottom:8px;font-weight:600}.exam-portal-container input{width:100%;padding:12px;border:1px solid #ccc;border-radius:8px;box-sizing:border-box}.exam-portal-container button{width:100%;padding:14px;background-color:#0891b2;color:#fff;border:none;border-radius:8px;font-size:16px;cursor:pointer}.exam-portal-container button:hover{background-color:#067a8e}.exam-portal-links{margin-top:20px;text-align:center}.exam-portal-error{color:red;text-align:center;margin-bottom:20px}</style>
    <?php
    if (is_user_logged_in()) {
        $user_id = get_current_user_id();
        $user = get_userdata($user_id);
        if ($user && in_array('administrator', (array) $user->roles)) {
            ?>
            <div class="exam-portal-container"><h2>Exam Portal Access</h2><p>You are logged in as an administrator. Click to sync and go.</p>
                <form name="syncform" action="<?php echo esc_url(add_query_arg('redirect_to', urlencode($redirect_to), '')); ?>" method="post">
                    <div class="form-row"><button type="submit" title="This securely syncs your latest purchases and profile info.">Access Exam App</button></div>
                    <?php wp_nonce_field('annapoorna_admin_sync_action', 'annapoorna_admin_sync_nonce'); ?>
                </form>
                <div class="exam-portal-links"><a href="<?php echo esc_url(wp_logout_url(home_url(ANNAPOORNA_LOGIN_SLUG))); ?>">Log Out</a></div>
            </div>
            <?php
        } else {
            $token = annapoorna_generate_exam_jwt($user_id);
            $url = annapoorna_get_exam_app_url(false) . '#/auth?token=' . $token . '&redirect_to=' . urlencode($redirect_to);
            echo "<div class='exam-portal-container' style='text-align:center;'>
                      <p>Redirecting...</p>
                      <script>window.location.href='" . esc_url_raw($url) . "';</script>
                      <noscript><meta http-equiv='refresh' content='0;url=" . esc_url_raw($url) . "'></noscript>
                  </div>";
        }
    } else {
        ?>
        <div class="exam-portal-container"><h2>Exam Portal Login</h2>
            <?php if ($annapoorna_login_error) echo "<p class='exam-portal-error'>" . esc_html($annapoorna_login_error) . "</p>"; ?>
            <form name="loginform" action="<?php echo esc_url(add_query_arg('redirect_to', urlencode($redirect_to), '')); ?>" method="post">
                <div class="form-row"><label for="log">Username or Email</label><input type="text" name="log" id="log" required></div>
                <div class="form-row"><label for="pwd">Password</label><input type="password" name="pwd" id="pwd" required></div>
                <div class="form-row"><button type="submit">Log In</button></div>
                <?php wp_nonce_field('exam_login_action', 'exam_login_nonce'); ?>
            </form>
            <div class="exam-portal-links"><a href="<?php echo esc_url(wp_registration_url()); ?>">Register</a> | <a href="<?php echo esc_url(wp_lostpassword_url()); ?>">Lost Password?</a></div>
        </div>
        <?php
    }
    return ob_get_clean();
}

/** Registers REST API endpoints for the exam app. */
function annapoorna_exam_register_rest_api() {
    register_rest_route('exam-app/v1', '/update-name', [ 'methods' => 'POST', 'callback' => 'annapoorna_exam_update_user_name_callback', 'permission_callback' => 'annapoorna_exam_api_permission_check' ]);
    register_rest_route('exam-app/v1', '/submit-result', [ 'methods' => 'POST', 'callback' => 'annapoorna_exam_submit_result_callback', 'permission_callback' => 'annapoorna_exam_api_permission_check' ]);
}

/** Permission callback for REST API to verify JWT. */
function annapoorna_exam_api_permission_check($request) {
    $token = $request->get_header('Authorization');
    if (!$token || !preg_match('/Bearer\\s(\\S+)/', $token, $matches)) {
        return new WP_Error('jwt_missing', 'Authorization token not found.', ['status' => 401]);
    }
    
    $payload = annapoorna_verify_exam_jwt($matches[1]);
    if (!$payload || !isset($payload['user']['id'])) {
        return new WP_Error('jwt_invalid', 'Invalid or expired token.', ['status' => 403]);
    }
    
    $request->set_param('jwt_user_id', $payload['user']['id']);
    return true;
}

/** Callback to handle updating a user's name from the app. */
function annapoorna_exam_update_user_name_callback($request) {
    $user_id = (int)$request->get_param('jwt_user_id');
    $full_name = isset($request->get_json_params()['fullName']) ? sanitize_text_field($request->get_json_params()['fullName']) : '';
    
    if (empty($full_name)) return new WP_Error('name_empty', 'Full name cannot be empty.', ['status' => 400]);

    $name_parts = explode(' ', $full_name, 2);
    update_user_meta($user_id, 'first_name', $name_parts[0]);
    update_user_meta($user_id, 'last_name', isset($name_parts[1]) ? $name_parts[1] : '');

    return new WP_REST_Response(['success' => true, 'message' => 'Name updated successfully.'], 200);
}

/** Callback to handle saving a test result from the app. */
function annapoorna_exam_submit_result_callback($request) {
    $user_id = (int)$request->get_param('jwt_user_id');
    $result_data = $request->get_json_params();

    foreach (['testId', 'examId', 'score', 'correctCount', 'totalQuestions', 'timestamp'] as $key) {
        if (!isset($result_data[$key])) {
            annapoorna_debug_log("Submit result failed: Missing key '{$key}'.");
            return new WP_Error('invalid_data', "Missing required key: {$key}", ['status' => 400]);
        }
    }
    
    update_user_meta($user_id, 'exam_result_' . sanitize_key($result_data['testId']), $result_data);
    if (($index = get_user_meta($user_id, 'all_exam_results_index', true)) && !in_array($result_data['testId'], $index)) {
        $index[] = $result_data['testId'];
        update_user_meta($user_id, 'all_exam_results_index', $index);
    } elseif (!$index) {
        update_user_meta($user_id, 'all_exam_results_index', [$result_data['testId']]);
    }
    return new WP_REST_Response(['success' => true, 'message' => 'Result saved successfully.'], 200);
}

/** Adds custom fields to the WP registration form. */
function annapoorna_exam_add_custom_registration_fields() {
    ?><p><label for="first_name">First Name<br/><input type="text" name="first_name" id="first_name" required/></label></p><p><label for="last_name">Last Name<br/><input type="text" name="last_name" id="last_name" required/></label></p><?php
}

/** Validates the custom registration fields. */
function annapoorna_exam_validate_reg_fields($errors, $login, $email) {
    if (empty($_POST['first_name']) || empty($_POST['last_name'])) $errors->add('field_error', 'First and Last Name are required.');
    return $errors;
}

/** Saves the custom registration fields. */
function annapoorna_exam_save_reg_fields($user_id) {
    if (!empty($_POST['first_name'])) update_user_meta($user_id, 'first_name', sanitize_text_field($_POST['first_name']));
    if (!empty($_POST['last_name'])) update_user_meta($user_id, 'last_name', sanitize_text_field($_POST['last_name']));
}

/** Filters the WordPress login URL to point to our custom login page. */
function annapoorna_exam_login_url($login_url, $redirect) {
    $login_page_url = home_url('/' . ANNAPOORNA_LOGIN_SLUG . '/');
    return !empty($redirect) ? add_query_arg('redirect_to', urlencode($redirect), $login_page_url) : $login_page_url;
}
?>`;

const Integration: React.FC = () => {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(phpCode).then(() => {
            setIsCopied(true);
            toast.success('Code copied to clipboard!');
            setTimeout(() => {
                setIsCopied(false);
            }, 2000); // Reset button text after 2 seconds
        }, (err) => {
            toast.error('Failed to copy code.');
            console.error('Could not copy text: ', err);
        });
    };

    return (
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-lg">
            <h1 className="text-3xl font-bold text-slate-800 mb-4">WordPress Integration Guide</h1>
            <p className="text-slate-600 mb-6">
                To enable a custom login page, Single Sign-On (SSO), and sync results back to WordPress, add the following PHP code to your theme's <code>functions.php</code> file or use a code snippets plugin.
            </p>

            <div className="space-y-6">
                 <div>
                    <h2 className="text-2xl font-semibold text-slate-700 mb-2">Step 1: Define Your Secret Key</h2>
                    <p className="text-slate-600 mb-2">
                        For security, you <strong>must</strong> add a unique secret key (at least 32 random characters) to your <code>wp-config.php</code> file. This key is used to sign the login tokens. Use a password generator to create a strong key.
                    </p>
                    <pre className="bg-slate-800 text-white p-4 rounded-lg overflow-x-auto">
                        <code>define('ANNAPOORNA_JWT_SECRET', 'your-super-secret-key-that-is-long-and-random');</code>
                    </pre>
                </div>

                <div>
                    <h2 className="text-2xl font-semibold text-slate-700 mb-2">Step 2: Add Full Code to WordPress</h2>
                    <p className="text-slate-600 mb-2">
                        Copy the entire code block below. This single snippet handles login, SSO, dynamic pricing, and saving user profile changes.
                    </p>
                    <div className="relative group">
                        <button
                            onClick={handleCopy}
                            className="absolute top-2 right-2 bg-slate-600 hover:bg-slate-500 text-white font-semibold py-1 px-2 rounded-md text-xs flex items-center gap-1 transition-all opacity-0 group-hover:opacity-100"
                            aria-label="Copy PHP code to clipboard"
                        >
                            {isCopied ? (
                                <>
                                    <Check size={14} /> Copied!
                                </>
                            ) : (
                                <>
                                    <Clipboard size={14} /> Copy Code
                                </>
                            )}
                        </button>
                        <pre className="bg-slate-800 text-white p-4 rounded-lg overflow-x-auto text-sm">
                            <code>{phpCode}</code>
                        </pre>
                    </div>
                </div>
                
                <div>
                    <h2 className="text-2xl font-semibold text-slate-700 mb-2">Step 3: Create Login Page & Use Shortcode</h2>
                     <p className="text-slate-600 mb-2">
                       In your WordPress admin, create a new page (e.g., named "Exam Login" with the slug <code>/exam-login/</code>). In the content editor for that page, add the following shortcode:
                    </p>
                    <pre className="bg-slate-800 text-white p-4 rounded-lg overflow-x-auto">
                        <code>[exam_portal_login]</code>
                    </pre>
                     <p className="text-slate-600 mt-2">
                        This will display the custom login form. The app is already configured to use this URL for all login buttons.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Integration;