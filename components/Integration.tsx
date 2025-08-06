import React from 'react';

const phpCode = `<?php
/**
 * ===================================================================
 * V13.3: Integrated Exam Portal Functions (Configurable & Stable)
 * ===================================================================
 * This version makes the login page slug configurable, supports role-based redirects,
 * includes enhanced JWT payload, secure configuration, robust WooCommerce integration,
 * and adds an option for admins to switch between production and test exam app URLs.
 * Includes debug logging and JWT display for verification.
 */

// --- CONFIGURATION ---
// Set the URL slug for your custom login page here.
// Make sure you have a WordPress page with this exact slug.
define('ANNAPOORNA_LOGIN_SLUG', 'exam-login');
define('ANNAPOORNA_EXAM_APP_URL', 'https://exams.coding-online.net/'); // Base URL for your exam app (non-admins)
define('ANNAPOORNA_EXAM_APP_TEST_URL', 'https://mco-exam-jkfzdt3bj-manoj-balakrishnans-projects-aa177a85.vercel.app/'); // Test URL for admins
// IMPORTANT: Define a secure, random key in wp-config.php, e.g.:
// define('ANNAPOORNA_JWT_SECRET', 'X7b9kPqW3mZ8vT2rY6nF4tL0jH5cD1aE9gU2iR8');
// --- END CONFIGURATION ---

/**
 * Returns the appropriate exam app URL based on user role or admin selection.
 * Admins default to the test URL unless specified otherwise.
 *
 * @param bool $is_admin Whether the user is an admin.
 * @param string|null $selected_url Optional URL selected by admin ('test' or 'production').
 * @return string The exam app URL.
 */
function annapoorna_get_exam_app_url($is_admin = false, $selected_url = null) {
    if ($is_admin && $selected_url === 'production') {
        return ANNAPOORNA_EXAM_APP_URL;
    }
    return $is_admin ? ANNAPOORNA_EXAM_APP_TEST_URL : ANNAPOORNA_EXAM_APP_URL;
}

/**
 * Generates the JWT payload with user details and purchased exam IDs.
 *
 * @param int $user_id The user ID.
 * @return array|null The payload or null if user is invalid.
 */
function annapoorna_exam_get_payload($user_id) {
    if (!is_numeric($user_id) || $user_id <= 0) {
        error_log('ANNAPOORNA: Payload generation failed - invalid user ID: ' . $user_id);
        return null;
    }

    $user = get_userdata($user_id);
    if (!$user) {
        error_log('ANNAPOORNA: Payload generation failed - user not found for ID: ' . $user_id);
        return null;
    }

    $is_admin = in_array('administrator', (array) $user->roles);

    $user_full_name = get_user_meta($user_id, '_exam_portal_full_name', true);
    if (empty($user_full_name)) { $user_full_name = trim($user->first_name . ' ' . $user->last_name); }
    if (empty($user_full_name)) { $user_full_name = $user->display_name; }
    
    // Get purchased exam IDs from WooCommerce completed orders
    $paid_exam_ids = [];
    if (class_exists('WooCommerce')) {
        $exam_map = [
            'cpc-certification-exam' => 'exam-cpc-cert',
            'cca-certification-exam' => 'exam-cca-cert',
            'ccs-certification-exam' => 'exam-ccs-cert',
            'medical-billing-certification' => 'exam-billing-cert',
            'risk-adjustment-coding-certification' => 'exam-risk-cert',
            'icd-10-cm-certification-exam' => 'exam-icd-cert',
            'cpb-certification-exam' => 'exam-cpb-cert',
            'crc-certification-exam' => 'exam-crc-cert',
            'cpma-certification-exam' => 'exam-cpma-cert',
            'coc-certification-exam' => 'exam-coc-cert',
            'cic-certification-exam' => 'exam-cic-cert',
            'medical-terminology-anatomy-certification' => 'exam-mta-cert',
        ];
        try {
            $orders = wc_get_orders(['customer_id' => $user->ID, 'status' => 'completed', 'limit' => -1]);
            if ($orders) {
                foreach ($orders as $order) {
                    foreach ($order->get_items() as $item) {
                        if ($product = $item->get_product()) {
                            if ($sku = $product->get_sku()) {
                                if (isset($exam_map[$sku])) {
                                    $paid_exam_ids[] = $exam_map[$sku];
                                } else {
                                    $paid_exam_ids[] = $sku; // Fallback to raw SKU for compatibility
                                }
                            } elseif ($slug = $product->get_slug()) {
                                if (isset($exam_map[$slug])) {
                                    $paid_exam_ids[] = $exam_map[$slug];
                                }
                            }
                        }
                    }
                }
            }
        } catch (Exception $e) {
            error_log('ANNAPOORNA: WooCommerce order fetch failed - ' . $e->getMessage());
        }
        $paid_exam_ids = array_unique($paid_exam_ids);
    }
    
    $payload = [
        'iss' => get_site_url(),
        'iat' => time(),
        'exp' => time() + (60 * 60 * 2), // Token valid for 2 hours
        'user' => [
            'id' => (string)$user->ID, 
            'name' => $user_full_name, 
            'email' => $user->user_email,
            'isAdmin' => $is_admin
        ], 
        'paidExamIds' => $paid_exam_ids
    ];

    error_log('ANNAPOORNA: Payload generated for user ID ' . $user_id . ': ' . json_encode($payload));
    return $payload;
}

/**
 * Encodes data with base64url format.
 *
 * @param string $data The data to encode.
 * @return string The base64url-encoded string.
 */
function annapoorna_base64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

/**
 * Generates a secure JWT for the exam portal.
 * This is a manual implementation of JWT, dependency-free.
 *
 * @param int $user_id The user ID.
 * @return string|null The JWT or null if generation fails.
 */
function annapoorna_generate_exam_jwt($user_id) {
    $secret_key = defined('ANNAPOORNA_JWT_SECRET') ? ANNAPOORNA_JWT_SECRET : '';
    if (empty($secret_key) || $secret_key === 'your-very-strong-secret-key') {
        error_log('ANNAPOORNA: JWT generation failed - secret key is missing or invalid in wp-config.php');
        return null;
    }
    
    // Log secret key presence (obfuscated for security)
    error_log('ANNAPOORNA: JWT secret key defined, length: ' . strlen($secret_key));

    $payload = annapoorna_exam_get_payload($user_id);
    if (!$payload) {
        error_log('ANNAPOORNA: JWT generation failed - payload generation failed for user ID: ' . $user_id);
        return null;
    }

    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    $payload_json = json_encode($payload);

    if ($header === false || $payload_json === false) {
        error_log('ANNAPOORNA: JWT generation failed - JSON encoding error for user ID: ' . $user_id);
        return null;
    }

    $base64UrlHeader = annapoorna_base64url_encode($header);
    $base64UrlPayload = annapoorna_base64url_encode($payload_json);

    $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, $secret_key, true);
    $base64UrlSignature = annapoorna_base64url_encode($signature);

    $jwt = $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
    error_log('ANNAPOORNA: JWT generated for user ID ' . $user_id . ': ' . $jwt);
    return $jwt;
}

/**
 * Redirects the user to the exam portal after a successful WooCommerce purchase.
 * Admins are redirected to ANNAPOORNA_EXAM_APP_TEST_URL, non-admins to ANNAPOORNA_EXAM_APP_URL.
 *
 * @param int $order_id The ID of the WooCommerce order.
 */
function annapoorna_redirect_after_purchase($order_id) {
    if (!$order_id) {
        error_log('ANNAPOORNA: Purchase redirect failed - invalid order ID');
        return;
    }
    
    $order = wc_get_order($order_id);
    if (!$order) {
        error_log('ANNAPOORNA: Purchase redirect failed - invalid order');
        return;
    }

    $user_id = $order->get_customer_id();

    if ($user_id > 0 && $order->has_status(['completed', 'processing'])) {
        $token = annapoorna_generate_exam_jwt($user_id);
        if ($token) {
            $user = get_userdata($user_id);
            $is_admin = $user && in_array('administrator', (array) $user->roles);
            $base_url = annapoorna_get_exam_app_url($is_admin);
            $redirect_url = $base_url . '#/auth?token=' . $token . '&redirect_to=/dashboard';
            error_log('ANNAPOORNA: Purchase redirect for user ID ' . $user_id . ' to ' . $redirect_url);
            wp_redirect($redirect_url);
            exit;
        } else {
            error_log('ANNAPOORNA: Purchase redirect failed - JWT generation failed for user ' . $user_id);
        }
    }
}
add_action('woocommerce_thankyou', 'annapoorna_redirect_after_purchase', 10, 1);

/**
 * Shortcode for the custom exam portal login form.
 * Redirects authenticated users to the appropriate exam app URL (test for admins, production for non-admins).
 * Admins see a form to choose between production and test URLs, with JWT debug info.
 *
 * @return string The login form HTML, admin switch form, or redirect script.
 */
function annapoorna_exam_login_shortcode() {
    $login_error = '';
    $debug_info = ''; // For displaying JWT to admins
    $redirect_to = isset($_GET['redirect_to']) ? esc_url_raw(urldecode($_GET['redirect_to'])) : '/dashboard';

    // Check for JWT secret presence
    $jwt_secret_missing = !defined('ANNAPOORNA_JWT_SECRET') || empty(ANNAPOORNA_JWT_SECRET) || ANNAPOORNA_JWT_SECRET === 'your-very-strong-secret-key';
    if ($jwt_secret_missing) {
        $login_error = 'Configuration error: Please define a valid ANNAPOORNA_JWT_SECRET in wp-config.php.';
    }

    // Handle login form submission
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && !empty($_POST['exam_login_nonce']) && wp_verify_nonce($_POST['exam_login_nonce'], 'exam_login_action')) {
        $user = wp_authenticate(sanitize_user($_POST['log']), $_POST['pwd']);
        if (is_wp_error($user)) {
            $login_error = 'Invalid username or password.';
        } else {
            if (!empty($_POST['full_name'])) {
                update_user_meta($user->ID, '_exam_portal_full_name', sanitize_text_field($_POST['full_name']));
            }
            wp_set_current_user($user->ID);
            wp_set_auth_cookie($user->ID);
            $token = annapoorna_generate_exam_jwt($user->ID);
            if ($token) {
                $is_admin = in_array('administrator', (array) $user->roles);
                $selected_url = $is_admin && !empty($_POST['exam_app_url']) && in_array($_POST['exam_app_url'], ['test', 'production']) ? sanitize_text_field($_POST['exam_app_url']) : null;
                $final_redirect_url = annapoorna_get_exam_app_url($is_admin, $selected_url) . '#/auth?token=' . $token . '&redirect_to=' . urlencode($redirect_to);
                error_log('ANNAPOORNA: Login redirect for user ID ' . $user->ID . ' to ' . $final_redirect_url);
                wp_redirect($final_redirect_url);
                exit;
            } else {
                $login_error = 'Could not generate login token. Please check debug log and contact support.';
                $debug_info = 'Debug: Check wp-content/debug.log for JWT generation errors.';
            }
        }
    }

    // Handle admin URL switch form submission
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && !empty($_POST['admin_switch_nonce']) && wp_verify_nonce($_POST['admin_switch_nonce'], 'admin_switch_action')) {
        $user_id = get_current_user_id();
        if (!$user_id) {
            $login_error = 'Error: User not authenticated. Please log in again.';
        } else {
            $token = annapoorna_generate_exam_jwt($user_id);
            if ($token) {
                $is_admin = in_array('administrator', (array) get_userdata($user_id)->roles);
                $selected_url = !empty($_POST['exam_app_url']) && in_array($_POST['exam_app_url'], ['test', 'production']) ? sanitize_text_field($_POST['exam_app_url']) : null;
                $final_redirect_url = annapoorna_get_exam_app_url($is_admin, $selected_url) . '#/auth?token=' . $token . '&redirect_to=' . urlencode($redirect_to);
                $debug_info = 'JWT: ' . $token; // Display JWT for debugging
                error_log('ANNAPOORNA: Admin switch redirect for user ID ' . $user_id . ' to ' . $final_redirect_url);
                wp_redirect($final_redirect_url);
                exit;
            } else {
                $login_error = 'Could not generate login token. Please check debug log and contact support.';
                $debug_info = 'Debug: Check wp-content/debug.log for JWT generation errors.';
            }
        }
    }
    
    ob_start();
    if (is_user_logged_in()) {
        $user_id = get_current_user_id();
        $user = get_userdata($user_id);
        $is_admin = $user && in_array('administrator', (array) $user->roles);
        
        if ($is_admin) {
            // Show form for admins to choose between production and test URLs
            ?>
            <style>
                .exam-portal-container {
                    font-family: sans-serif;
                    max-width: 400px;
                    margin: 5% auto;
                    padding: 40px;
                    background: #fff;
                    border-radius: 12px;
                    box-shadow: 0 10px 25px -5px rgba(0,0,0,.1);
                }
                .exam-portal-container h2 {
                    text-align: center;
                    font-size: 24px;
                    margin-bottom: 30px;
                }
                .exam-portal-container .form-row {
                    margin-bottom: 20px;
                }
                .exam-portal-container label {
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 600;
                }
                .exam-portal-container input[type="radio"] {
                    margin-right: 10px;
                }
                .exam-portal-container button {
                    width: 100%;
                    padding: 14px;
                    background-color: #0891b2;
                    color: #fff;
                    border: none;
                    border-radius: 8px;
                    font-size: 16px;
                    cursor: pointer;
                }
                .exam-portal-container button:hover {
                    background-color: #067a8e;
                }
                .exam-portal-links {
                    margin-top: 20px;
                    text-align: center;
                }
                .exam-portal-error {
                    color: red;
                    text-align: center;
                    margin-bottom: 20px;
                }
                .exam-portal-debug {
                    color: #555;
                    text-align: center;
                    margin-bottom: 20px;
                    font-size: 12px;
                    word-wrap: break-word;
                }
            </style>
            <div class="exam-portal-container" id="exam-switch-form-container">
                <h2>Exam Portal Access</h2>
                <?php if ($login_error) echo "<p class='exam-portal-error'>" . esc_html($login_error) . "</p>"; ?>
                <?php if ($debug_info) echo "<p class='exam-portal-debug'>" . esc_html($debug_info) . "</p>"; ?>
                <p>You are logged in as an administrator. Choose an exam app to access:</p>
                <form name="switchform" id="switchform" action="<?php echo esc_url(add_query_arg('redirect_to', urlencode($redirect_to), '')); ?>" method="post">
                    <div class="form-row">
                        <label><input type="radio" name="exam_app_url" value="test" checked> Test App (<?php echo esc_html(ANNAPOORNA_EXAM_APP_TEST_URL); ?>)</label>
                    </div>
                    <div class="form-row">
                        <label><input type="radio" name="exam_app_url" value="production"> Production App (<?php echo esc_html(ANNAPOORNA_EXAM_APP_URL); ?>)</label>
                    </div>
                    <div class="form-row">
                        <button type="submit">Go to Exam App</button>
                    </div>
                    <?php wp_nonce_field('admin_switch_action', 'admin_switch_nonce'); ?>
                </form>
                <div class="exam-portal-links">
                    <a href="<?php echo esc_url(wp_logout_url(home_url(ANNAPOORNA_LOGIN_SLUG))); ?>">Log Out</a>
                </div>
            </div>
            <?php
        } else {
            // Non-admin: automatic redirect
            $token = annapoorna_generate_exam_jwt($user_id);
            if ($token) {
                $proceed_url = annapoorna_get_exam_app_url(false) . '#/auth?token=' . $token . '&redirect_to=' . urlencode($redirect_to);
                echo "<div class='exam-portal-container' style='text-align:center;'><p>You are already logged in. Redirecting...</p><script>window.location.href = '" . esc_url_raw($proceed_url) . "';</script></div>";
            } else {
                echo "<div class='exam-portal-container' style='text-align:center;'><p class='exam-portal-error'>Error: Could not generate login token. Please check debug log and contact support.</p></div>";
            }
        }
    } else {
        // Not logged in: show login form
        ?>
        <style>
            .exam-portal-container {
                font-family: sans-serif;
                max-width: 400px;
                margin: 5% auto;
                padding: 40px;
                background: #fff;
                border-radius: 12px;
                box-shadow: 0 10px 25px -5px rgba(0,0,0,.1);
            }
            .exam-portal-container h2 {
                text-align: center;
                font-size: 24px;
                margin-bottom: 30px;
            }
            .exam-portal-container .form-row {
                margin-bottom: 20px;
            }
            .exam-portal-container label {
                display: block;
                margin-bottom: 8px;
                font-weight: 600;
            }
            .exam-portal-container input {
                width: 100%;
                padding: 12px;
                border: 1px solid #ccc;
                border-radius: 8px;
                box-sizing: border-box;
            }
            .exam-portal-container button {
                width: 100%;
                padding: 14px;
                background-color: #0891b2;
                color: #fff;
                border: none;
                border-radius: 8px;
                font-size: 16px;
                cursor: pointer;
            }
            .exam-portal-container button:hover {
                background-color: #067a8e;
            }
            .exam-portal-links {
                margin-top: 20px;
                text-align: center;
            }
            .exam-portal-error {
                color: red;
                text-align: center;
                margin-bottom: 20px;
            }
        </style>
        <div class="exam-portal-container" id="exam-login-form-container">
            <h2>Exam Portal Login</h2>
            <?php if ($login_error) echo "<p class='exam-portal-error'>" . esc_html($login_error) . "</p>"; ?>
            <form name="loginform" id="loginform" action="<?php echo esc_url(add_query_arg('redirect_to', urlencode($redirect_to), '')); ?>" method="post">
                <div class="form-row"><label for="full_name">Full Name (for Certificate)</label><input type="text" name="full_name" id="full_name" required></div>
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
 * Adds custom fields to the WordPress registration form.
 */
function annapoorna_exam_add_custom_registration_fields() {
    ?>
    <p><label for="first_name">First Name<br/><input type="text" name="first_name" id="first_name" required/></label></p>
    <p><label for="last_name">Last Name<br/><input type="text" name="last_name" id="last_name" required/></label></p>
    <p><label for="password">Password<br/><input type="password" name="password" id="password" required/></label></p>
    <?php
}
add_action('register_form', 'annapoorna_exam_add_custom_registration_fields');

/**
 * Validates custom registration fields.
 *
 * @param WP_Error $errors The error object.
 * @param string $login The username.
 * @param string $email The email address.
 * @return WP_Error The modified error object.
 */
function annapoorna_exam_validate_reg_fields($errors, $login, $email) {
    if (empty($_POST['first_name']) || empty($_POST['last_name']) || empty($_POST['password'])) {
        $errors->add('field_error', 'All fields, including password, are required.');
    }
    return $errors;
}
add_filter('registration_errors', 'annapoorna_exam_validate_reg_fields', 10, 3);

/**
 * Saves custom registration fields and sets user password.
 *
 * @param int $user_id The user ID.
 */
function annapoorna_exam_save_reg_fields($user_id) {
    if (!empty($_POST['first_name'])) {
        update_user_meta($user_id, 'first_name', sanitize_text_field($_POST['first_name']));
    }
    if (!empty($_POST['last_name'])) {
        update_user_meta($user_id, 'last_name', sanitize_text_field($_POST['last_name']));
    }
    if (!empty($_POST['first_name']) && !empty($_POST['last_name'])) {
        update_user_meta($user_id, '_exam_portal_full_name', sanitize_text_field($_POST['first_name']) . ' ' . sanitize_text_field($_POST['last_name']));
    }
    if (!empty($_POST['password'])) {
        wp_set_password($_POST['password'], $user_id);
    }
}
add_action('user_register', 'annapoorna_exam_save_reg_fields');

/**
 * Auto-logs in the user after registration and sets a transient for redirect.
 *
 * @param int $user_id The user ID.
 */
function annapoorna_exam_autologin_after_register($user_id) {
    wp_set_auth_cookie($user_id);
    set_transient('annapoorna_redirect_after_register_' . $user_id, true, 60);
    wp_redirect(home_url());
    exit;
}
add_action('user_register', 'annapoorna_exam_autologin_after_register');

/**
 * Redirects users to the exam portal after registration.
 * Admins are redirected to ANNAPOORNA_EXAM_APP_TEST_URL, non-admins to ANNAPOORNA_EXAM_APP_URL.
 */
function annapoorna_exam_check_redirect_on_load() {
    if (is_user_logged_in()) {
        $user_id = get_current_user_id();
        if (get_transient('annapoorna_redirect_after_register_' . $user_id)) {
            delete_transient('annapoorna_redirect_after_register_' . $user_id);
            $token = annapoorna_generate_exam_jwt($user_id);
            if ($token) {
                $user = get_userdata($user_id);
                $is_admin = $user && in_array('administrator', (array) $user->roles);
                $final_redirect_url = annapoorna_get_exam_app_url($is_admin) . '#/auth?token=' . $token . '&redirect_to=/dashboard';
                error_log('ANNAPOORNA: Registration redirect for user ID ' . $user_id . ' to ' . $final_redirect_url);
                wp_redirect($final_redirect_url);
                exit;
            } else {
                error_log('ANNAPOORNA: Registration redirect failed - JWT generation failed for user ' . $user_id);
            }
        }
    }
}
add_action('template_redirect', 'annapoorna_exam_check_redirect_on_load');

/**
 * Customizes the login URL to use the exam portal login page.
 *
 * @param string $login_url The default login URL.
 * @param string $redirect The redirect URL.
 * @return string The customized login URL.
 */
function annapoorna_exam_login_url($login_url, $redirect) {
    return home_url(add_query_arg('redirect_to', $redirect, ANNAPOORNA_LOGIN_SLUG));
}
add_filter('login_url', 'annapoorna_exam_login_url', 10, 2);

/**
 * Redirects users to the exam portal login page after logout.
 *
 * @return string The logout redirect URL.
 */
function annapoorna_exam_logout_redirect() {
    return home_url(ANNAPOORNA_LOGIN_SLUG);
}
add_filter('logout_redirect', 'annapoorna_exam_logout_redirect', 10, 3);
?>`;

const Integration = () => {
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
                        Copy the entire code block below. This single snippet handles login, SSO, and saving results.
                    </p>
                    <pre className="bg-slate-800 text-white p-4 rounded-lg overflow-x-auto text-sm">
                        <code>{phpCode}</code>
                    </pre>
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