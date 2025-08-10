import React, { useState } from 'react';
import { Clipboard, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const phpCode = `<?php
/**
 * ===================================================================
 * V17: Robust Login Redirect & API Security
 * ===================================================================
 * This version includes two key improvements:
 * 1. Robust Redirects: The login URL filter is updated to construct
 *    redirect URLs more reliably, preventing issues with special
 *    characters in destination paths.
 * 2. API Security: The permission callback for the REST API endpoint now
 *    correctly verifies the JWT, improving security best practices.
 */

// --- CONFIGURATION ---
define('ANNAPOORNA_LOGIN_SLUG', 'exam-login');
define('ANNAPOORNA_EXAM_APP_URL', 'https://exams.coding-online.net/');
define('ANNAPOORNA_EXAM_APP_TEST_URL', 'https://mco-exam-jkfzdt3bj-manoj-balakrishnans-projects-aa177a85.vercel.app/');
// IMPORTANT: Define a secure, random key in wp-config.php
// define('ANNAPOORNA_JWT_SECRET', 'your-very-strong-secret-key-that-is-long-and-random');
// --- END CONFIGURATION ---

/**
 * Registers the 'Exam App Settings' page.
 */
function annapoorna_exam_add_admin_menu() {
    add_options_page('Exam App Settings', 'Exam App Settings', 'manage_options', 'exam-app-settings', 'annapoorna_exam_settings_page_html');
}
add_action('admin_menu', 'annapoorna_exam_add_admin_menu');

/**
 * Registers the setting for the admin page.
 */
function annapoorna_exam_register_settings() {
    register_setting('annapoorna_exam_app_settings_group', 'annapoorna_exam_app_mode');
}
add_action('admin_init', 'annapoorna_exam_register_settings');

/**
 * Renders the HTML for the 'Exam App Settings' page.
 */
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
 */
function annapoorna_get_exam_app_url($is_admin = false) {
    if ($is_admin) {
        $mode = get_option('annapoorna_exam_app_mode', 'test');
        return $mode === 'production' ? ANNAPOORNA_EXAM_APP_URL : ANNAPOORNA_EXAM_APP_TEST_URL;
    }
    return ANNAPOORNA_EXAM_APP_URL;
}

/**
 * Generates JWT payload, including dynamic prices.
 */
function annapoorna_exam_get_payload($user_id) {
    if (!$user = get_userdata($user_id)) return null;

    $is_admin = in_array('administrator', (array) $user->roles);
    $user_full_name = trim($user->first_name . ' ' . $user->last_name) ?: $user->display_name;
    
    $paid_exam_ids = [];
    $exam_prices = [];

    if (class_exists('WooCommerce')) {
        $exam_map = [
            'CPC-CERT-EXAM' => 'exam-cpc-cert', 'CCA-CERT-EXAM' => 'exam-cca-cert', 'CCS-CERT-EXAM' => 'exam-ccs-cert',
            'MEDICAL-BILLING-CERT' => 'exam-billing-cert', 'RISK-ADJUSTMENT-CERT' => 'exam-risk-cert',
            'ICD-10-CM-CERT' => 'exam-icd-cert', 'CPB-CERT-EXAM' => 'exam-cpb-cert', 'CRC-CERT-EXAM' => 'exam-crc-cert',
            'CPMA-CERT-EXAM' => 'exam-cpma-cert', 'COC-CERT-EXAM' => 'exam-coc-cert', 'CIC-CERT-EXAM' => 'exam-cic-cert',
            'MTA-CERT' => 'exam-mta-cert',
        ];

        // Fetch prices for all exams
        foreach ($exam_map as $sku => $exam_id) {
            $product_id = wc_get_product_id_by_sku($sku);
            if ($product_id && $product = wc_get_product($product_id)) {
                // get_price() correctly fetches the sale price if active
                $exam_prices[$exam_id] = (float) $product->get_price();
            }
        }
        
        // Check orders for purchased exams
        $orders = wc_get_orders(['customer_id' => $user->ID, 'status' => ['completed', 'processing'], 'limit' => -1]);
        foreach ($orders as $order) {
            foreach ($order->get_items() as $item) {
                if ($product = $item->get_product()) {
                    $sku = $product->get_sku();
                    if ($sku && isset($exam_map[$sku])) {
                        $paid_exam_ids[] = $exam_map[$sku];
                    }
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

/**
 * Helper functions for JWT encoding/decoding.
 */
function annapoorna_base64url_encode($data) { return rtrim(strtr(base64_encode($data), '+/', '-_'), '='); }
function annapoorna_base64url_decode($data) { return base64_decode(strtr($data, '-_', '+/')); }

/**
 * Generates a secure JWT.
 */
function annapoorna_generate_exam_jwt($user_id) {
    $secret_key = defined('ANNAPOORNA_JWT_SECRET') ? ANNAPOORNA_JWT_SECRET : '';
    if (empty($secret_key) || strpos($secret_key, 'your-very-strong-secret-key') !== false) return null;
    $payload = annapoorna_exam_get_payload($user_id);
    if (!$payload) return null;

    $header_b64 = annapoorna_base64url_encode(json_encode(['typ' => 'JWT', 'alg' => 'HS256']));
    $payload_b64 = annapoorna_base64url_encode(json_encode($payload));
    $signature = hash_hmac('sha256', "$header_b64.$payload_b64", $secret_key, true);
    $signature_b64 = annapoorna_base64url_encode($signature);

    return "$header_b64.$payload_b64.$signature_b64";
}

/**
 * Verifies a JWT and returns the payload on success.
 */
function annapoorna_verify_exam_jwt($token) {
    $secret_key = defined('ANNAPOORNA_JWT_SECRET') ? ANNAPOORNA_JWT_SECRET : '';
    if (empty($secret_key)) return null;

    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;

    list($header_b64, $payload_b64, $signature_b64) = $parts;
    $signature = annapoorna_base64url_decode($signature_b64);
    $expected_signature = hash_hmac('sha256', "$header_b64.$payload_b64", $secret_key, true);

    if (!hash_equals($expected_signature, $signature)) return null;

    $payload = json_decode(annapoorna_base64url_decode($payload_b64), true);
    if (isset($payload['exp']) && $payload['exp'] < time()) return null;

    return $payload;
}


/**
 * Redirects after WooCommerce purchase.
 */
function annapoorna_redirect_after_purchase($order_id) {
    if (!$order_id || !($order = wc_get_order($order_id)) || !($user_id = $order->get_customer_id())) return;
    if ($user_id > 0 && $order->has_status(['completed', 'processing'])) {
        if ($token = annapoorna_generate_exam_jwt($user_id)) {
            $user = get_userdata($user_id);
            $base_url = annapoorna_get_exam_app_url(in_array('administrator', (array) $user->roles));
            wp_redirect($base_url . '#/auth?token=' . $token . '&redirect_to=/dashboard');
            exit;
        }
    }
}
add_action('woocommerce_thankyou', 'annapoorna_redirect_after_purchase', 10, 1);

/**
 * Shortcode for the login form.
 */
function annapoorna_exam_login_shortcode() {
    if (!defined('ANNAPOORNA_JWT_SECRET') || strpos(ANNAPOORNA_JWT_SECRET, 'your-very-strong-secret-key') !== false) {
        return "<p class='exam-portal-error'>Configuration error: Please define a valid ANNAPOORNA_JWT_SECRET in wp-config.php.</p>";
    }
    
    $login_error = '';
    $redirect_to = isset($_GET['redirect_to']) ? esc_url_raw(urldecode($_GET['redirect_to'])) : '/dashboard';

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $user_id = 0;
        if (!empty($_POST['exam_login_nonce']) && wp_verify_nonce($_POST['exam_login_nonce'], 'exam_login_action')) {
            $user = wp_authenticate(sanitize_user($_POST['log']), $_POST['pwd']);
            if (is_wp_error($user)) {
                $login_error = 'Invalid username or password.';
            } else {
                wp_set_current_user($user->ID);
                wp_set_auth_cookie($user->ID);
                $user_id = $user->ID;
            }
        } elseif (!empty($_POST['admin_sync_nonce']) && wp_verify_nonce($_POST['admin_sync_nonce'], 'admin_sync_action')) {
            $user_id = get_current_user_id();
            if (!$user_id) $login_error = 'Error: User not authenticated.';
        }
        
        if ($user_id > 0) {
            if ($token = annapoorna_generate_exam_jwt($user_id)) {
                $is_admin = in_array('administrator', (array) get_userdata($user_id)->roles);
                $url = annapoorna_get_exam_app_url($is_admin) . '#/auth?token=' . $token . '&redirect_to=' . urlencode($redirect_to);
                wp_redirect($url);
                exit;
            } else { $login_error = 'Could not generate login token.'; }
        }
    }
    
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
                    <div class="form-row"><button type="submit">Sync & Go to Exam App</button></div>
                    <?php wp_nonce_field('admin_sync_action', 'admin_sync_nonce'); ?>
                </form>
                <div class="exam-portal-links"><a href="<?php echo esc_url(wp_logout_url(home_url(ANNAPOORNA_LOGIN_SLUG))); ?>">Log Out</a></div>
            </div>
            <?php
        } else {
            $token = annapoorna_generate_exam_jwt($user_id);
            $url = annapoorna_get_exam_app_url(false) . '#/auth?token=' . $token . '&redirect_to=' . urlencode($redirect_to);
            echo "<div class='exam-portal-container' style='text-align:center;'><p>Redirecting...</p><script>window.location.href='" . esc_url_raw($url) . "';</script></div>";
        }
    } else {
        ?>
        <div class="exam-portal-container"><h2>Exam Portal Login</h2>
            <?php if ($login_error) echo "<p class='exam-portal-error'>" . esc_html($login_error) . "</p>"; ?>
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
add_shortcode('exam_portal_login', 'annapoorna_exam_login_shortcode');

/**
 * Registers REST API endpoints for the exam app.
 */
function annapoorna_exam_register_rest_api() {
    register_rest_route('exam-app/v1', '/update-name', array(
        'methods' => 'POST',
        'callback' => 'annapoorna_exam_update_user_name_callback',
        'permission_callback' => 'annapoorna_exam_api_permission_check'
    ));
}
add_action('rest_api_init', 'annapoorna_exam_register_rest_api');

/**
 * Permission callback for REST API to verify JWT.
 */
function annapoorna_exam_api_permission_check($request) {
    $token = $request->get_header('Authorization');
    if (!$token || !preg_match('/Bearer\\s(\\S+)/', $token, $matches)) {
        return new WP_Error('jwt_missing', 'Authorization token not found.', array('status' => 401));
    }
    
    $payload = annapoorna_verify_exam_jwt($matches[1]);
    if (!$payload || !isset($payload['user']['id'])) {
        return new WP_Error('jwt_invalid', 'Invalid or expired token.', array('status' => 403));
    }
    
    // Pass the validated user ID to the main callback so we don't have to parse the token twice.
    $request->set_param('jwt_user_id', $payload['user']['id']);
    return true;
}

/**
 * Callback to handle updating a user's name from the app.
 */
function annapoorna_exam_update_user_name_callback($request) {
    // The user ID is now pre-validated and passed by the permission callback.
    $user_id = (int)$request->get_param('jwt_user_id');
    $body = $request->get_json_params();
    $full_name = isset($body['fullName']) ? sanitize_text_field($body['fullName']) : '';
    
    if (empty($full_name)) {
        return new WP_Error('name_empty', 'Full name cannot be empty.', array('status' => 400));
    }

    $name_parts = explode(' ', $full_name, 2);
    $first_name = $name_parts[0];
    $last_name = isset($name_parts[1]) ? $name_parts[1] : '';

    update_user_meta($user_id, 'first_name', $first_name);
    update_user_meta($user_id, 'last_name', $last_name);

    return new WP_REST_Response(array('success' => true, 'message' => 'Name updated successfully.'), 200);
}


// --- Registration & Redirect Helpers ---
function annapoorna_exam_add_custom_registration_fields() {
    ?><p><label for="first_name">First Name<br/><input type="text" name="first_name" id="first_name" required/></label></p><p><label for="last_name">Last Name<br/><input type="text" name="last_name" id="last_name" required/></label></p><?php
}
add_action('register_form', 'annapoorna_exam_add_custom_registration_fields');

function annapoorna_exam_validate_reg_fields($errors, $login, $email) {
    if (empty($_POST['first_name']) || empty($_POST['last_name'])) $errors->add('field_error', 'First and Last Name are required.');
    return $errors;
}
add_filter('registration_errors', 'annapoorna_exam_validate_reg_fields', 10, 3);

function annapoorna_exam_save_reg_fields($user_id) {
    if (!empty($_POST['first_name'])) update_user_meta($user_id, 'first_name', sanitize_text_field($_POST['first_name']));
    if (!empty($_POST['last_name'])) update_user_meta($user_id, 'last_name', sanitize_text_field($_POST['last_name']));
}
add_action('user_register', 'annapoorna_exam_save_reg_fields');

/**
 * REVISED: Filters the WordPress login URL to point to our custom page.
 */
function annapoorna_exam_login_url($login_url, $redirect) {
    $login_page_url = home_url('/' . ANNAPOORNA_LOGIN_SLUG . '/');
    if (!empty($redirect)) {
        // urlencode the redirect parameter to handle special characters safely.
        return add_query_arg('redirect_to', urlencode($redirect), $login_page_url);
    }
    return $login_page_url;
}
add_filter('login_url', 'annapoorna_exam_login_url', 10, 2);
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
                        For security, you <strong>must</strong> add a unique secret key to your <code>wp-config.php</code> file. This key is used to sign the login tokens. Use a password generator to create a long, random key.
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