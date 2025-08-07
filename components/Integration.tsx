import React from 'react';

const phpCode = `<?php
/**
 * ===================================================================
 * V14.0: Integrated Exam Portal Functions (Admin Settings Page)
 * ===================================================================
 * This version adds a dedicated 'Exam App Settings' page in the WordPress admin
 * for managing the test/production mode, resolving the 'not authorized' error.
 * The custom login form for admins is now simplified.
 */

// --- CONFIGURATION ---
// Set the URL slug for your custom login page here.
define('ANNAPOORNA_LOGIN_SLUG', 'exam-login');
define('ANNAPOORNA_EXAM_APP_URL', 'https://exams.coding-online.net/'); // Production URL for your exam app
define('ANNAPOORNA_EXAM_APP_TEST_URL', 'https://mco-exam-jkfzdt3bj-manoj-balakrishnans-projects-aa177a85.vercel.app/'); // Test URL for admins
// IMPORTANT: Define a secure, random key in wp-config.php
// define('ANNAPOORNA_JWT_SECRET', 'your-very-strong-secret-key-that-is-long-and-random');
// --- END CONFIGURATION ---

/**
 * Registers the 'Exam App Settings' page under the main Settings menu.
 */
function annapoorna_exam_add_admin_menu() {
    add_options_page(
        'Exam App Settings',          // Page Title
        'Exam App Settings',          // Menu Title
        'manage_options',             // Capability
        'exam-app-settings',          // Menu Slug
        'annapoorna_exam_settings_page_html' // Callback function to render the page
    );
}
add_action('admin_menu', 'annapoorna_exam_add_admin_menu');

/**
 * Registers the setting that will be saved on our new page.
 */
function annapoorna_exam_register_settings() {
    register_setting('annapoorna_exam_app_settings_group', 'annapoorna_exam_app_mode');
}
add_action('admin_init', 'annapoorna_exam_register_settings');

/**
 * Renders the HTML for the 'Exam App Settings' page.
 */
function annapoorna_exam_settings_page_html() {
    if (!current_user_can('manage_options')) {
        return;
    }
    ?>
    <div class="wrap">
        <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
        <p>This setting controls which version of the exam application is used for admin redirects. Non-admins will always be sent to the production URL.</p>
        <form action="options.php" method="post">
            <?php
            settings_fields('annapoorna_exam_app_settings_group');
            do_settings_sections('exam-app-settings');
            ?>
            <table class="form-table">
                <tr valign="top">
                    <th scope="row">Application Mode for Admins</th>
                    <td>
                        <fieldset>
                            <label>
                                <input type="radio" name="annapoorna_exam_app_mode" value="production" <?php checked(get_option('annapoorna_exam_app_mode'), 'production'); ?> />
                                <span>Production (<?php echo esc_html(ANNAPOORNA_EXAM_APP_URL); ?>)</span>
                            </label>
                            <br />
                            <label>
                                <input type="radio" name="annapoorna_exam_app_mode" value="test" <?php checked(get_option('annapoorna_exam_app_mode', 'test'), 'test'); ?> />
                                <span>Test (<?php echo esc_html(ANNAPOORNA_EXAM_APP_TEST_URL); ?>)</span>
                            </label>
                        </fieldset>
                    </td>
                </tr>
            </table>
            <?php submit_button('Save Settings'); ?>
        </form>
    </div>
    <?php
}

/**
 * REVISED: Returns the appropriate exam app URL based on user role and saved admin setting.
 *
 * @param bool $is_admin Whether the user is an admin.
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
 * Generates the JWT payload with user details and purchased exam IDs.
 */
function annapoorna_exam_get_payload($user_id) {
    if (!is_numeric($user_id) || $user_id <= 0) return null;
    $user = get_userdata($user_id);
    if (!$user) return null;

    $is_admin = in_array('administrator', (array) $user->roles);
    $user_full_name = get_user_meta($user_id, '_exam_portal_full_name', true) ?: trim($user->first_name . ' ' . $user->last_name) ?: $user->display_name;
    
    $paid_exam_ids = [];
    if (class_exists('WooCommerce')) {
        $exam_map = [
            'cpc-certification-exam' => 'exam-cpc-cert', 'cca-certification-exam' => 'exam-cca-cert', 'ccs-certification-exam' => 'exam-ccs-cert',
            'medical-billing-certification' => 'exam-billing-cert', 'risk-adjustment-coding-certification' => 'exam-risk-cert',
            'icd-10-cm-certification-exam' => 'exam-icd-cert', 'cpb-certification-exam' => 'exam-cpb-cert', 'crc-certification-exam' => 'exam-crc-cert',
            'cpma-certification-exam' => 'exam-cpma-cert', 'coc-certification-exam' => 'exam-coc-cert', 'cic-certification-exam' => 'exam-cic-cert',
            'medical-terminology-anatomy-certification' => 'exam-mta-cert',
        ];
        $orders = wc_get_orders(['customer_id' => $user->ID, 'status' => 'completed', 'limit' => -1]);
        if ($orders) {
            foreach ($orders as $order) {
                foreach ($order->get_items() as $item) {
                    if ($product = $item->get_product()) {
                        $slug_or_sku = $product->get_sku() ?: $product->get_slug();
                        if (isset($exam_map[$slug_or_sku])) {
                            $paid_exam_ids[] = $exam_map[$slug_or_sku];
                        }
                    }
                }
            }
        }
        $paid_exam_ids = array_unique($paid_exam_ids);
    }
    
    return [
        'iss' => get_site_url(), 'iat' => time(), 'exp' => time() + (60 * 60 * 2),
        'user' => ['id' => (string)$user->ID, 'name' => $user_full_name, 'email' => $user->user_email, 'isAdmin' => $is_admin], 
        'paidExamIds' => $paid_exam_ids
    ];
}

/**
 * Encodes data with base64url format.
 */
function annapoorna_base64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

/**
 * Generates a secure JWT for the exam portal.
 */
function annapoorna_generate_exam_jwt($user_id) {
    $secret_key = defined('ANNAPOORNA_JWT_SECRET') ? ANNAPOORNA_JWT_SECRET : '';
    if (empty($secret_key) || $secret_key === 'your-very-strong-secret-key') return null;
    
    $payload = annapoorna_exam_get_payload($user_id);
    if (!$payload) return null;

    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    $payload_json = json_encode($payload);
    if ($header === false || $payload_json === false) return null;

    $base64UrlHeader = annapoorna_base64url_encode($header);
    $base64UrlPayload = annapoorna_base64url_encode($payload_json);
    $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, $secret_key, true);
    $base64UrlSignature = annapoorna_base64url_encode($signature);

    return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
}

/**
 * Redirects the user to the exam portal after a successful WooCommerce purchase.
 */
function annapoorna_redirect_after_purchase($order_id) {
    if (!$order_id) return;
    $order = wc_get_order($order_id);
    if (!$order) return;
    $user_id = $order->get_customer_id();

    if ($user_id > 0 && $order->has_status(['completed', 'processing'])) {
        $token = annapoorna_generate_exam_jwt($user_id);
        if ($token) {
            $user = get_userdata($user_id);
            $is_admin = $user && in_array('administrator', (array) $user->roles);
            $base_url = annapoorna_get_exam_app_url($is_admin);
            $redirect_url = $base_url . '#/auth?token=' . $token . '&redirect_to=/dashboard';
            wp_redirect($redirect_url);
            exit;
        }
    }
}
add_action('woocommerce_thankyou', 'annapoorna_redirect_after_purchase', 10, 1);

/**
 * REVISED: Shortcode for the custom exam portal login form.
 * Admin view is simplified; URL choice is now managed in WP Admin -> Settings.
 */
function annapoorna_exam_login_shortcode() {
    $login_error = '';
    $redirect_to = isset($_GET['redirect_to']) ? esc_url_raw(urldecode($_GET['redirect_to'])) : '/dashboard';

    if (!defined('ANNAPOORNA_JWT_SECRET') || empty(ANNAPOORNA_JWT_SECRET) || ANNAPOORNA_JWT_SECRET === 'your-very-strong-secret-key') {
        return "<p class='exam-portal-error'>Configuration error: Please define a valid ANNAPOORNA_JWT_SECRET in wp-config.php.</p>";
    }
    
    // --- POST Request Handling ---
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $user_id = 0;
        // Case 1: Handle login form submission
        if (!empty($_POST['exam_login_nonce']) && wp_verify_nonce($_POST['exam_login_nonce'], 'exam_login_action')) {
            $user = wp_authenticate(sanitize_user($_POST['log']), $_POST['pwd']);
            if (is_wp_error($user)) {
                $login_error = 'Invalid username or password.';
            } else {
                if (!empty($_POST['full_name'])) {
                    update_user_meta($user->ID, '_exam_portal_full_name', sanitize_text_field($_POST['full_name']));
                }
                wp_set_current_user($user->ID);
                wp_set_auth_cookie($user->ID);
                $user_id = $user->ID;
            }
        } 
        // Case 2: Handle admin "sync & go" form submission
        elseif (!empty($_POST['admin_sync_nonce']) && wp_verify_nonce($_POST['admin_sync_nonce'], 'admin_sync_action')) {
            $user_id = get_current_user_id();
            if (!$user_id) $login_error = 'Error: User not authenticated.';
        }
        
        // If we have a valid user, generate token and redirect
        if ($user_id > 0) {
            $token = annapoorna_generate_exam_jwt($user_id);
            if ($token) {
                $is_admin = in_array('administrator', (array) get_userdata($user_id)->roles);
                $final_redirect_url = annapoorna_get_exam_app_url($is_admin) . '#/auth?token=' . $token . '&redirect_to=' . urlencode($redirect_to);
                wp_redirect($final_redirect_url);
                exit;
            } else {
                $login_error = 'Could not generate login token.';
            }
        }
    }
    
    // --- Render Page Content ---
    ob_start();
    ?>
    <style>.exam-portal-container{font-family:sans-serif;max-width:400px;margin:5% auto;padding:40px;background:#fff;border-radius:12px;box-shadow:0 10px 25px -5px rgba(0,0,0,.1)}.exam-portal-container h2{text-align:center;font-size:24px;margin-bottom:30px}.exam-portal-container .form-row{margin-bottom:20px}.exam-portal-container label{display:block;margin-bottom:8px;font-weight:600}.exam-portal-container input{width:100%;padding:12px;border:1px solid #ccc;border-radius:8px;box-sizing:border-box}.exam-portal-container button{width:100%;padding:14px;background-color:#0891b2;color:#fff;border:none;border-radius:8px;font-size:16px;cursor:pointer}.exam-portal-container button:hover{background-color:#067a8e}.exam-portal-links{margin-top:20px;text-align:center}.exam-portal-error{color:red;text-align:center;margin-bottom:20px}</style>
    <?php
    if (is_user_logged_in()) {
        $user_id = get_current_user_id();
        $user = get_userdata($user_id);
        $is_admin = $user && in_array('administrator', (array) $user->roles);
        
        if ($is_admin) {
            // REVISED: Simplified form for logged-in admins
            ?>
            <div class="exam-portal-container" id="exam-sync-form-container">
                <h2>Exam Portal Access</h2>
                <p>You are logged in as an administrator. Click to sync your account and go to the app.</p>
                <form name="syncform" id="syncform" action="<?php echo esc_url(add_query_arg('redirect_to', urlencode($redirect_to), '')); ?>" method="post">
                    <div class="form-row"><button type="submit">Sync & Go to Exam App</button></div>
                    <?php wp_nonce_field('admin_sync_action', 'admin_sync_nonce'); ?>
                </form>
                <div class="exam-portal-links"><a href="<?php echo esc_url(wp_logout_url(home_url(ANNAPOORNA_LOGIN_SLUG))); ?>">Log Out</a></div>
            </div>
            <?php
        } else {
            // Non-admin: automatic redirect
            $token = annapoorna_generate_exam_jwt($user_id);
            if ($token) {
                $proceed_url = annapoorna_get_exam_app_url(false) . '#/auth?token=' . $token . '&redirect_to=' . urlencode($redirect_to);
                echo "<div class='exam-portal-container' style='text-align:center;'><p>You are already logged in. Redirecting...</p><script>window.location.href = '" . esc_url_raw($proceed_url) . "';</script></div>";
            } else {
                echo "<div class='exam-portal-container' style='text-align:center;'><p class='exam-portal-error'>Error: Could not generate login token.</p></div>";
            }
        }
    } else {
        // Not logged in: show login form
        ?>
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


// --- REGISTRATION & REDIRECT HELPERS ---

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
    if (!empty($_POST['first_name']) && !empty($_POST['last_name'])) {
        update_user_meta($user_id, '_exam_portal_full_name', sanitize_text_field($_POST['first_name']) . ' ' . sanitize_text_field($_POST['last_name']));
    }
}
add_action('user_register', 'annapoorna_exam_save_reg_fields');

function annapoorna_exam_login_url($login_url, $redirect) {
    return home_url(add_query_arg('redirect_to', $redirect, ANNAPOORNA_LOGIN_SLUG));
}
add_filter('login_url', 'annapoorna_exam_login_url', 10, 2);
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
