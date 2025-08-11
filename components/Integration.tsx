
import React from 'react';
import toast from 'react-hot-toast';

const Integration: React.FC = () => {

    const phpCode = `
<?php
/**
 * Plugin Name: Medical Coding Online Exam App Integration
 * Description: Integrates the React-based examination app with WordPress, handling user authentication (SSO), WooCommerce purchases, and results synchronization.
 * Version: 3.0
 * Author: Annapoorna Infotech
 */

// --- CONFIGURATION ---
define('ANNAPOORNA_LOGIN_SLUG', 'exam-login');
define('ANNAPOORNA_EXAM_APP_URL', 'https://exams.coding-online.net/');
define('ANNAPOORNA_EXAM_APP_TEST_URL', 'https://mco-exam-jkfzdt3bj-manoj-balakrishnans-projects-aa177a85.vercel.app/');

// IMPORTANT: Define a secure, random key in wp-config.php. It must be at least 32 characters.
// define('ANNAPOORNA_JWT_SECRET', 'your-very-strong-secret-key-that-is-long-and-random');
// define('ANNAPOORNA_DEBUG', true); // Add for debug logging
// --- END CONFIGURATION ---

$annapoorna_login_error = '';

add_action('init', 'annapoorna_exam_app_init');
function annapoorna_exam_app_init() {
    annapoorna_handle_login_form_post();
    
    add_action('admin_notices', 'annapoorna_check_dependencies');
    add_action('admin_menu', 'annapoorna_exam_add_admin_menu');
    add_action('admin_init', 'annapoorna_exam_register_settings');
    add_action('woocommerce_thankyou', 'annapoorna_redirect_after_purchase', 10, 1);
    add_action('rest_api_init', 'annapoorna_exam_register_rest_api');
    add_action('register_form', 'annapoorna_exam_add_custom_registration_fields');
    add_action('user_register', 'annapoorna_exam_save_reg_fields');
    
    add_filter('registration_errors', 'annapoorna_exam_validate_reg_fields', 10, 3);
    add_filter('login_url', 'annapoorna_exam_login_url', 10, 2);
    add_filter('rest_pre_serve_request', 'annapoorna_rest_send_cors_headers', 10, 4);

    
    add_shortcode('exam_portal_login', 'annapoorna_exam_login_shortcode');
}

function annapoorna_handle_login_form_post() {
    global $annapoorna_login_error;
    if ('POST' !== $_SERVER['REQUEST_METHOD'] || strpos($_SERVER['REQUEST_URI'], '/' . ANNAPOORNA_LOGIN_SLUG . '/') === false) return;
    $user_id = 0;
    if (!empty($_POST['exam_login_nonce']) && wp_verify_nonce($_POST['exam_login_nonce'], 'exam_login_action')) {
        $user = wp_signon(['user_login' => sanitize_text_field($_POST['log']), 'user_password' => $_POST['pwd'], 'remember' => true], false);
        if (is_wp_error($user)) $annapoorna_login_error = 'Invalid username or password.'; else $user_id = $user->ID;
    } elseif (!empty($_POST['annapoorna_admin_sync_nonce']) && wp_verify_nonce($_POST['annapoorna_admin_sync_nonce'], 'annapoorna_admin_sync_action')) {
        if (!$user_id = get_current_user_id()) $annapoorna_login_error = 'Error: User not authenticated for admin sync.';
    }
    if ($user_id > 0) {
        if ($token = annapoorna_generate_exam_jwt($user_id)) {
            $redirect_to = isset($_REQUEST['redirect_to']) ? esc_url_raw(urldecode($_REQUEST['redirect_to'])) : '/dashboard';
            $url = annapoorna_get_exam_app_url(user_can($user_id, 'administrator')) . '#/auth?token=' . $token . '&redirect_to=' . urlencode($redirect_to);
            wp_redirect($url); exit;
        } else { $annapoorna_login_error = 'Could not generate login token.'; }
    }
}

function annapoorna_debug_log($message) { if (defined('ANNAPOORNA_DEBUG') && ANNAPOORNA_DEBUG) error_log('Exam App Debug: ' . print_r($message, true)); }
function annapoorna_check_dependencies() { if (!class_exists('WooCommerce')) echo '<div class="notice notice-error"><p><strong>Exam App Integration:</strong> WooCommerce is not active. Exam purchasing and pricing features will not work.</p></div>'; }
function annapoorna_exam_add_admin_menu() { add_options_page('Exam App Settings', 'Exam App Settings', 'manage_options', 'exam-app-settings', 'annapoorna_exam_settings_page_html'); }
function annapoorna_exam_register_settings() { register_setting('annapoorna_exam_app_settings_group', 'annapoorna_exam_app_mode'); }
function annapoorna_exam_settings_page_html() { if (!current_user_can('manage_options')) return; ?>
    <div class="wrap"><h1><?php echo esc_html(get_admin_page_title()); ?></h1><p>This setting controls which version of the exam application is used for admin redirects.</p><form action="options.php" method="post"><?php settings_fields('annapoorna_exam_app_settings_group'); ?><table class="form-table"><tr><th scope="row">Application Mode for Admins</th><td><fieldset><label><input type="radio" name="annapoorna_exam_app_mode" value="production" <?php checked(get_option('annapoorna_exam_app_mode'), 'production'); ?> /> Production</label><br/><label><input type="radio" name="annapoorna_exam_app_mode" value="test" <?php checked(get_option('annapoorna_exam_app_mode', 'test'), 'test'); ?> /> Test</label></fieldset></td></tr></table><?php submit_button('Save Settings'); ?></form></div><?php }
function annapoorna_get_exam_app_url($is_admin = false) { if ($is_admin) return get_option('annapoorna_exam_app_mode', 'test') === 'production' ? ANNAPOORNA_EXAM_APP_URL : ANNAPOORNA_EXAM_APP_TEST_URL; return ANNAPOORNA_EXAM_APP_URL; }

// --- DATA SOURCE ---
function annapoorna_get_all_app_data() {
    $MOCK_BOOKS = [
        ['id' => 'book-cpc-guide', 'title' => 'Official CPC® Certification Study Guide (AAPC)', 'description' => 'AAPC’s official CPC exam study guide — anatomy, medical terminology, ICD-10-CM, CPT, HCPCS, practice questions and exam tips.', 'imageUrl' => 'https://exams.coding-online.net/wp-content/uploads/2024/04/cpc-study-guide.jpg', 'affiliateLinks' => ['com' => 'https://www.amazon.com/dp/1635278910?tag=mykada-20', 'in' => 'https://www.amazon.in/dp/1635278910?tag=httpcodingonl-21', 'ae' => 'https://www.amazon.ae/dp/1285427998?tag=medical0f1-21']],
        ['id' => 'book-icd10-cm', 'title' => "Buck's ICD-10-CM for Physicians 2026", 'description' => 'Physician-focused ICD-10-CM code manual (full-color, guidelines and examples).', 'imageUrl' => 'https://exams.coding-online.net/wp-content/uploads/2024/04/icd-10-cm-physicians.jpg', 'affiliateLinks' => ['com' => 'https://www.amazon.com/dp/0443380783?tag=mykada-20', 'in' => 'https://www.amazon.com/dp/0443380783?tag=httpcodingonl-21', 'ae' => 'https://www.amazon.ae/dp/0443380783?tag=medical0f1-21']],
        ['id' => 'book-cpt-pro', 'title' => 'AMA CPT® Professional 2026', 'description' => 'Official Current Procedural Terminology (CPT) codebook from the American Medical Association.', 'imageUrl' => 'https://exams.coding-online.net/wp-content/uploads/2024/04/cpt-professional.jpg', 'affiliateLinks' => ['com' => 'https://www.amazon.com/dp/1640163354?tag=mykada-20', 'in' => 'https://www.amazon.in/dp/1640163354?tag=httpcodingonl-21', 'ae' => 'https://www.amazon.ae/dp/1640163354?tag=medical0f1-21']],
        ['id' => 'book-hcpcs-level2', 'title' => 'HCPCS Level II Professional 2026', 'description' => 'Comprehensive guide for HCPCS Level II codes used for supplies, equipment, and drugs.', 'imageUrl' => 'https://exams.coding-online.net/wp-content/uploads/2024/04/hcpcs-level-2.jpg', 'affiliateLinks' => ['com' => 'https://www.amazon.com/dp/1622029947?tag=mykada-20', 'in' => 'https://www.amazon.in/dp/1622029947?tag=httpcodingonl-21', 'ae' => 'https://www.amazon.ae/dp/1622029947?tag=medical0f1-21']],
        ['id' => 'book-medical-billing', 'title' => 'Medical Billing & Coding For Dummies', 'description' => 'An easy-to-understand guide covering the basics of medical billing and coding.', 'imageUrl' => 'https://exams.coding-online.net/wp-content/uploads/2024/04/coding-for-dummies.jpg', 'affiliateLinks' => ['com' => 'https://www.amazon.com/dp/1119750393?tag=mykada-20', 'in' => 'https://www.amazon.in/dp/1119750393?tag=httpcodingonl-21', 'ae' => 'https://www.amazon.ae/dp/1119750393?tag=medical0f1-21']]
    ];
    
    $CERTIFICATE_TEMPLATES = [
        ['id' => 'cert-mco-1', 'title' => 'Medical Coding Proficiency', 'body' => 'For successfully demonstrating proficiency in medical coding principles and practices with a final score of <strong>{finalScore}%</strong>. This achievement certifies the holder\\'s competence in the standards required for this certification.', 'signature1Name' => 'Dr. Amelia Reed', 'signature1Title' => 'Program Director', 'signature2Name' => 'B. Manoj', 'signature2Title' => 'Chief Instructor'],
        ['id' => 'cert-mco-2', 'title' => 'Advanced Specialty Coding', 'body' => 'Awarded for exceptional performance and mastery in advanced specialty coding topics, achieving a score of <strong>{finalScore}%</strong>. This signifies a high level of expertise and dedication to the field.', 'signature1Name' => 'Dr. Amelia Reed', 'signature1Title' => 'Program Director', 'signature2Name' => 'B. Manoj', 'signature2Title' => 'Chief Instructor']
    ];
    
    $EXAM_PRODUCT_CATEGORIES = [
        ['id' => 'prod-cpc', 'name' => 'CPC', 'description' => 'A test series designed to prepare you for the AAPC CPC (Certified Professional Coder) exam.', 'practiceExamId' => 'exam-cpc-practice', 'certificationExamId' => 'CPC-CERT-EXAM'],
        ['id' => 'prod-cca', 'name' => 'CCA', 'description' => 'A test series for the AHIMA CCA (Certified Coding Associate) credential.', 'practiceExamId' => 'exam-cca-practice', 'certificationExamId' => 'CCA-CERT-EXAM'],
        ['id' => 'prod-billing', 'name' => 'Medical Billing', 'description' => 'A test series covering the essentials of medical billing and reimbursement.', 'practiceExamId' => 'exam-billing-practice', 'certificationExamId' => 'MEDICAL-BILLING-CERT']
    ];

    $ALL_EXAMS = [
        // Practice Exams
        ['id' => 'exam-cpc-practice', 'name' => 'CPC Practice Test', 'description' => 'A short practice test to prepare for the CPC certification.', 'price' => 0, 'questionSourceUrl' => '', 'numberOfQuestions' => 20, 'passScore' => 70, 'certificateTemplateId' => 'cert-mco-1', 'isPractice' => true, 'durationMinutes' => 25],
        ['id' => 'exam-cca-practice', 'name' => 'CCA Practice Test', 'description' => 'A short practice test for the Certified Coding Associate exam.', 'price' => 0, 'questionSourceUrl' => '', 'numberOfQuestions' => 20, 'passScore' => 70, 'certificateTemplateId' => 'cert-mco-1', 'isPractice' => true, 'durationMinutes' => 25],
        ['id' => 'exam-billing-practice', 'name' => 'Medical Billing Practice Test', 'description' => 'A short practice test for medical billing concepts.', 'price' => 0, 'questionSourceUrl' => '', 'numberOfQuestions' => 15, 'passScore' => 70, 'certificateTemplateId' => 'cert-mco-2', 'isPractice' => true, 'durationMinutes' => 20],
        
        // Certification Exams
        ['id' => 'CPC-CERT-EXAM', 'name' => 'CPC Certification Exam', 'description' => 'Full certification exam for Certified Professional Coder.', 'price' => 150, 'regularPrice' => 175, 'productSku' => 'CPC-CERT-EXAM', 'productSlug' => 'cpc-certification-exam', 'numberOfQuestions' => 100, 'passScore' => 70, 'certificateTemplateId' => 'cert-mco-1', 'isPractice' => false, 'durationMinutes' => 240],
        ['id' => 'CCA-CERT-EXAM', 'name' => 'CCA Certification Exam', 'description' => 'Full certification exam for Certified Coding Associate.', 'price' => 120, 'regularPrice' => 140, 'productSku' => 'CCA-CERT-EXAM', 'productSlug' => 'cca-certification-exam', 'numberOfQuestions' => 100, 'passScore' => 70, 'certificateTemplateId' => 'cert-mco-1', 'isPractice' => false, 'durationMinutes' => 180],
        ['id' => 'CCS-CERT-EXAM', 'name' => 'CCS Certification Exam', 'description' => 'Full certification exam for Certified Coding Specialist.', 'price' => 160, 'regularPrice' => 180, 'productSku' => 'CCS-CERT-EXAM', 'productSlug' => 'ccs-certification-exam', 'numberOfQuestions' => 120, 'passScore' => 70, 'certificateTemplateId' => 'cert-mco-1', 'isPractice' => false, 'durationMinutes' => 240],
        ['id' => 'MEDICAL-BILLING-CERT', 'name' => 'Medical Billing Certification Exam', 'description' => 'Comprehensive exam covering medical billing and reimbursement.', 'price' => 100, 'regularPrice' => 125, 'productSku' => 'MEDICAL-BILLING-CERT', 'productSlug' => 'medical-billing-cert-exam', 'numberOfQuestions' => 80, 'passScore' => 75, 'certificateTemplateId' => 'cert-mco-2', 'isPractice' => false, 'durationMinutes' => 150],
        ['id' => 'RISK-ADJUSTMENT-CERT', 'name' => 'Risk Adjustment (CRC) Certification Exam', 'description' => 'Exam for Certified Risk Adjustment Coder.', 'price' => 150, 'regularPrice' => 150, 'productSku' => 'RISK-ADJUSTMENT-CERT', 'productSlug' => 'risk-adjustment-cert-exam', 'numberOfQuestions' => 100, 'passScore' => 70, 'certificateTemplateId' => 'cert-mco-1', 'isPractice' => false, 'durationMinutes' => 240],
        ['id' => 'ICD-10-CM-CERT', 'name' => 'ICD-10-CM Certification Exam', 'description' => 'Proficiency exam for ICD-10-CM coding.', 'price' => 90, 'regularPrice' => 110, 'productSku' => 'ICD-10-CM-CERT', 'productSlug' => 'icd-10-cm-cert-exam', 'numberOfQuestions' => 75, 'passScore' => 75, 'certificateTemplateId' => 'cert-mco-1', 'isPractice' => false, 'durationMinutes' => 120],
        ['id' => 'CPB-CERT-EXAM', 'name' => 'CPB Certification Exam', 'description' => 'Full certification exam for Certified Professional Biller.', 'price' => 150, 'regularPrice' => 175, 'productSku' => 'CPB-CERT-EXAM', 'productSlug' => 'cpb-certification-exam', 'numberOfQuestions' => 135, 'passScore' => 70, 'certificateTemplateId' => 'cert-mco-2', 'isPractice' => false, 'durationMinutes' => 240],
        ['id' => 'CRC-CERT-EXAM', 'name' => 'CRC Certification Exam', 'description' => 'Full certification exam for Certified Risk Adjustment Coder.', 'price' => 150, 'regularPrice' => 175, 'productSku' => 'CRC-CERT-EXAM', 'productSlug' => 'crc-certification-exam', 'numberOfQuestions' => 100, 'passScore' => 70, 'certificateTemplateId' => 'cert-mco-1', 'isPractice' => false, 'durationMinutes' => 240],
        ['id' => 'CPMA-CERT-EXAM', 'name' => 'CPMA Certification Exam', 'description' => 'Full certification exam for Certified Professional Medical Auditor.', 'price' => 150, 'regularPrice' => 175, 'productSku' => 'CPMA-CERT-EXAM', 'productSlug' => 'cpma-certification-exam', 'numberOfQuestions' => 100, 'passScore' => 70, 'certificateTemplateId' => 'cert-mco-1', 'isPractice' => false, 'durationMinutes' => 240],
        ['id' => 'COC-CERT-EXAM', 'name' => 'COC Certification Exam', 'description' => 'Full certification exam for Certified Outpatient Coder.', 'price' => 150, 'regularPrice' => 175, 'productSku' => 'COC-CERT-EXAM', 'productSlug' => 'coc-certification-exam', 'numberOfQuestions' => 100, 'passScore' => 70, 'certificateTemplateId' => 'cert-mco-1', 'isPractice' => false, 'durationMinutes' => 240],
        ['id' => 'CIC-CERT-EXAM', 'name' => 'CIC Certification Exam', 'description' => 'Full certification exam for Certified Inpatient Coder.', 'price' => 150, 'regularPrice' => 175, 'productSku' => 'CIC-CERT-EXAM', 'productSlug' => 'cic-certification-exam', 'numberOfQuestions' => 40, 'passScore' => 70, 'certificateTemplateId' => 'cert-mco-1', 'isPractice' => false, 'durationMinutes' => 240],
        ['id' => 'MTA-CERT', 'name' => 'Medical Terminology & Anatomy Exam', 'description' => 'Proficiency exam for Medical Terminology and Anatomy.', 'price' => 75, 'regularPrice' => 90, 'productSku' => 'MTA-CERT', 'productSlug' => 'mta-cert-exam', 'numberOfQuestions' => 50, 'passScore' => 80, 'certificateTemplateId' => 'cert-mco-1', 'isPractice' => false, 'durationMinutes' => 60]
    ];
    
    // Assign recommended books to exams
    $exams_with_books = array_map(function($exam) use ($MOCK_BOOKS) {
        if ($exam['isPractice']) {
            $exam['recommendedBook'] = null;
        } else {
            if (strpos($exam['name'], 'CPC') !== false) $exam['recommendedBook'] = $MOCK_BOOKS[0];
            elseif (strpos($exam['name'], 'ICD-10-CM') !== false) $exam['recommendedBook'] = $MOCK_BOOKS[1];
            elseif (strpos($exam['name'], 'CPT') !== false) $exam['recommendedBook'] = $MOCK_BOOKS[2];
            elseif (strpos($exam['name'], 'Billing') !== false) $exam['recommendedBook'] = $MOCK_BOOKS[4];
            else $exam['recommendedBook'] = $MOCK_BOOKS[array_rand($MOCK_BOOKS)];
        }
        return $exam;
    }, $ALL_EXAMS);

    return [
        [
            'id' => 'org-mco', 'name' => 'Medical Coding Online', 'website' => 'www.coding-online.net',
            'logo' => '',
            'exams' => $exams_with_books,
            'examProductCategories' => $EXAM_PRODUCT_CATEGORIES,
            'certificateTemplates' => $CERTIFICATE_TEMPLATES
        ]
    ];
}

function annapoorna_exam_get_payload($user_id) {
    if (!$user = get_userdata($user_id)) return null;
    $user_full_name = trim($user->first_name . ' ' . $user->last_name) ?: $user->display_name;
    $paid_exam_ids = []; $exam_prices = new stdClass();
    
    if (class_exists('WooCommerce')) {
        $all_exam_skus = array_column(array_filter(annapoorna_get_all_app_data()[0]['exams'], function($e) { return !$e['isPractice'] && isset($e['productSku']); }), 'productSku');
        
        $exam_prices = get_transient('annapoorna_exam_prices');
        if (false === $exam_prices) {
            annapoorna_debug_log('Exam prices cache miss. Fetching from DB.');
            $exam_prices = new stdClass();
            foreach ($all_exam_skus as $sku) {
                if (($product_id = wc_get_product_id_by_sku($sku)) && ($product = wc_get_product($product_id))) {
                    $price = (float) $product->get_price(); $regular_price = (float) $product->get_regular_price();
                    if ($price > 0) {
                        $exam_prices->{$sku} = ['price' => $price, 'regularPrice' => $regular_price > $price ? $regular_price : $price];
                    }
                }
            }
            set_transient('annapoorna_exam_prices', $exam_prices, 12 * HOUR_IN_SECONDS);
        }

        $customer_orders = wc_get_orders(['customer' => $user_id, 'status' => ['wc-completed', 'wc-processing'], 'limit' => -1]);
        $purchased_skus = [];
        if ($customer_orders) {
            foreach ($customer_orders as $order) {
                foreach ($order->get_items() as $item) {
                    $product = $item->get_product();
                    if ($product && $product->get_sku()) $purchased_skus[] = $product->get_sku();
                }
            }
        }
        $paid_exam_ids = array_values(array_intersect($all_exam_skus, array_unique($purchased_skus)));
    }
    
    return ['iss' => get_site_url(), 'iat' => time(), 'exp' => time() + (60 * 60 * 2), 'user' => ['id' => (string)$user->ID, 'name' => $user_full_name, 'email' => $user->user_email, 'isAdmin' => user_can($user, 'administrator')], 'paidExamIds' => array_unique($paid_exam_ids), 'examPrices' => $exam_prices];
}

// JWT Generation and Verification
function annapoorna_base64url_encode($data) { return rtrim(strtr(base64_encode($data), '+/', '-_'), '='); }
function annapoorna_base64url_decode($data) { return base64_decode(strtr($data, '-_', '+/')); }
function annapoorna_generate_exam_jwt($user_id) { $secret_key = defined('ANNAPOORNA_JWT_SECRET') ? ANNAPOORNA_JWT_SECRET : ''; if (empty($secret_key) || strlen($secret_key) < 32 || strpos($secret_key, 'your-very-strong-secret-key') !== false) { annapoorna_debug_log('JWT Secret is not configured or is too weak.'); return null; } if (!$payload = annapoorna_exam_get_payload($user_id)) return null; $header_b64 = annapoorna_base64url_encode(json_encode(['typ' => 'JWT', 'alg' => 'HS256'])); $payload_b64 = annapoorna_base64url_encode(json_encode($payload)); $signature = hash_hmac('sha256', "$header_b64.$payload_b64", $secret_key, true); $signature_b64 = annapoorna_base64url_encode($signature); return "$header_b64.$payload_b64.$signature_b64"; }
function annapoorna_verify_exam_jwt($token) { $secret_key = defined('ANNAPOORNA_JWT_SECRET') ? ANNAPOORNA_JWT_SECRET : ''; if (empty($secret_key) || strlen($secret_key) < 32) return null; $parts = explode('.', $token); if (count($parts) !== 3) return null; list($header_b64, $payload_b64, $signature_b64) = $parts; $signature = annapoorna_base64url_decode($signature_b64); $expected_signature = hash_hmac('sha256', "$header_b64.$payload_b64", $secret_key, true); if (!hash_equals($expected_signature, $signature)) return null; $payload = json_decode(annapoorna_base64url_decode($payload_b64), true); return (isset($payload['exp']) && $payload['exp'] < time()) ? null : $payload; }

function annapoorna_redirect_after_purchase($order_id) { if (!$order_id || !($order = wc_get_order($order_id)) || !($user_id = $order->get_customer_id())) return; if ($user_id > 0 && $order->has_status(['completed', 'processing', 'on-hold'])) { if (function_exists('WC') && WC()->cart) WC()->cart->empty_cart(); if ($token = annapoorna_generate_exam_jwt($user_id)) { wp_redirect(annapoorna_get_exam_app_url(user_can($user_id, 'administrator')) . '#/auth?token=' . $token . '&redirect_to=/dashboard'); exit; } } }

// REST API
function annapoorna_exam_register_rest_api() {
    register_rest_route('exam-app/v1', '/app-config', ['methods' => 'GET', 'callback' => 'annapoorna_get_app_config_callback', 'permission_callback' => '__return_true']);
    register_rest_route('exam-app/v1', '/user-results', ['methods' => 'GET', 'callback' => 'annapoorna_get_user_results_callback', 'permission_callback' => 'annapoorna_exam_api_permission_check']);
    register_rest_route('exam-app/v1', '/result/(?P<test_id>[\\w-]+)', ['methods' => 'GET', 'callback' => 'annapoorna_get_single_result_callback', 'permission_callback' => 'annapoorna_exam_api_permission_check']);
    register_rest_route('exam-app/v1', '/certificate-data/(?P<test_id>[\\w-]+)', ['methods' => 'GET', 'callback' => 'annapoorna_get_certificate_data_callback', 'permission_callback' => 'annapoorna_exam_api_permission_check']);
    register_rest_route('exam-app/v1', '/update-name', ['methods' => 'POST', 'callback' => 'annapoorna_exam_update_user_name_callback', 'permission_callback' => 'annapoorna_exam_api_permission_check']);
    register_rest_route('exam-app/v1', '/submit-result', ['methods' => 'POST', 'callback' => 'annapoorna_exam_submit_result_callback', 'permission_callback' => 'annapoorna_exam_api_permission_check']);
}

function annapoorna_exam_api_permission_check($request) {
    $token = $request->get_header('Authorization');
    if (!$token || !preg_match('/Bearer\\s(\\S+)/', $token, $matches)) return new WP_Error('jwt_missing', 'Authorization token not found.', ['status' => 401]);
    $payload = annapoorna_verify_exam_jwt($matches[1]);
    if (!$payload || !isset($payload['user']['id'])) return new WP_Error('jwt_invalid', 'Invalid or expired token.', ['status' => 403]);
    $request->set_param('jwt_user_id', $payload['user']['id']);
    return true;
}

function annapoorna_rest_send_cors_headers($served, $result, $request, $server) {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Authorization, Content-Type');
    
    if ('OPTIONS' === $request->get_method()) {
        status_header(200);
        exit();
    }
    
    return $served;
}

function annapoorna_get_app_config_callback() { return new WP_REST_Response(annapoorna_get_all_app_data(), 200); }

function annapoorna_get_user_results_callback($request) {
    $user_id = (int)$request->get_param('jwt_user_id');
    $results = get_user_meta($user_id, 'annapoorna_exam_results', true);
    if (!is_array($results)) {
        $results = [];
    }
    return new WP_REST_Response(array_values($results), 200);
}

function annapoorna_get_single_result_callback($request) {
    $user_id = (int)$request->get_param('jwt_user_id');
    $test_id = sanitize_key($request['test_id']);
    $all_results = get_user_meta($user_id, 'annapoorna_exam_results', true);
    if (is_array($all_results) && isset($all_results[$test_id])) {
        return new WP_REST_Response($all_results[$test_id], 200);
    }
    return new WP_Error('not_found', 'Result not found.', ['status' => 404]);
}

function annapoorna_get_certificate_data_callback($request) {
    $user_id = (int)$request->get_param('jwt_user_id');
    $test_id = $request['test_id'];
    $user = get_userdata($user_id);
    $all_data = annapoorna_get_all_app_data();
    $org = $all_data[0];

    if ($test_id === 'sample') {
        $template = $org['certificateTemplates'][0];
        $candidate_name = trim($user->first_name . ' ' . $user->last_name) ?: $user->display_name;
        $data = [
            'certificateNumber' => "SAMPLE-" . time(), 'candidateName' => $candidate_name, 'finalScore' => 95.5,
            'date' => date('F j, Y'), 'totalQuestions' => 100, 'organization' => $org, 'template' => $template
        ];
        return new WP_REST_Response($data, 200);
    }
    
    $all_results = get_user_meta($user_id, 'annapoorna_exam_results', true);
    if (!is_array($all_results) || !isset($all_results[sanitize_key($test_id)])) {
        return new WP_Error('not_found', 'Result not found.', ['status' => 404]);
    }
    $result = $all_results[sanitize_key($test_id)];
    
    $exam = null;
    foreach ($org['exams'] as $e) { if ($e['id'] === $result['examId']) { $exam = $e; break; } }
    if (!$exam || ($result['score'] < $exam['passScore'] && !user_can($user, 'administrator'))) {
        return new WP_Error('not_earned', 'Certificate not earned for this test.', ['status' => 403]);
    }

    $template = null;
    foreach ($org['certificateTemplates'] as $t) { if ($t['id'] === $exam['certificateTemplateId']) { $template = $t; break; } }
    if (!$template) return new WP_Error('not_found', 'Certificate template not found.', ['status' => 404]);

    $candidate_name = trim($user->first_name . ' ' . $user->last_name) ?: $user->display_name;
    $data = [
        'certificateNumber' => substr($user_id, 0, 4) . '-' . substr(md5($test_id), 0, 6),
        'candidateName' => $candidate_name, 'finalScore' => $result['score'],
        'date' => date('F j, Y', $result['timestamp'] / 1000), 'totalQuestions' => $result['totalQuestions'],
        'organization' => $org, 'template' => $template
    ];
    return new WP_REST_Response($data, 200);
}

function annapoorna_exam_update_user_name_callback($request) {
    $user_id = (int)$request->get_param('jwt_user_id');
    $full_name = isset($request->get_json_params()['fullName']) ? sanitize_text_field($request->get_json_params()['fullName']) : '';
    if (empty($full_name)) return new WP_Error('name_empty', 'Full name cannot be empty.', ['status' => 400]);
    $name_parts = explode(' ', $full_name, 2);
    update_user_meta($user_id, 'first_name', $name_parts[0]);
    update_user_meta($user_id, 'last_name', isset($name_parts[1]) ? $name_parts[1] : '');
    return new WP_REST_Response(['success' => true, 'message' => 'Name updated successfully.'], 200);
}
function annapoorna_exam_submit_result_callback($request) {
    $user_id = (int)$request->get_param('jwt_user_id');
    $result_data = $request->get_json_params();
    foreach (['testId', 'examId', 'score', 'correctCount', 'totalQuestions', 'timestamp'] as $key) {
        if (!isset($result_data[$key])) return new WP_Error('invalid_data', "Missing required key: {$key}", ['status' => 400]);
    }
    $result_data['userId'] = (string)$user_id;

    $all_results = get_user_meta($user_id, 'annapoorna_exam_results', true);
    if (!is_array($all_results)) {
        $all_results = [];
    }
    $all_results[$result_data['testId']] = $result_data;
    
    update_user_meta($user_id, 'annapoorna_exam_results', $all_results);
    
    return new WP_REST_Response($result_data, 200);
}

// Shortcode and Registration
function annapoorna_exam_login_shortcode() { global $annapoorna_login_error; if (!defined('ANNAPOORNA_JWT_SECRET') || strlen(ANNAPOORNA_JWT_SECRET) < 32 || strpos(ANNAPOORNA_JWT_SECRET, 'your-very-strong-secret-key') !== false) return "<p class='exam-portal-error'>Configuration error: A strong, unique ANNAPOORNA_JWT_SECRET must be defined in wp-config.php.</p>"; $redirect_to = isset($_REQUEST['redirect_to']) ? esc_url_raw(urldecode($_REQUEST['redirect_to'])) : '/dashboard'; ob_start(); ?> <style>.exam-portal-container{font-family:sans-serif;max-width:400px;margin:5% auto;padding:40px;background:#fff;border-radius:12px;box-shadow:0 10px 25px -5px rgba(0,0,0,.1)}.exam-portal-container h2{text-align:center;font-size:24px;margin-bottom:30px}.exam-portal-container .form-row{margin-bottom:20px}.exam-portal-container label{display:block;margin-bottom:8px;font-weight:600}.exam-portal-container input{width:100%;padding:12px;border:1px solid #ccc;border-radius:8px;box-sizing:border-box}.exam-portal-container button{width:100%;padding:14px;background-color:#0891b2;color:#fff;border:none;border-radius:8px;font-size:16px;cursor:pointer}.exam-portal-container button:hover{background-color:#067a8e}.exam-portal-links{margin-top:20px;text-align:center}.exam-portal-error{color:red;text-align:center;margin-bottom:20px}</style> <?php if (is_user_logged_in()) { if (current_user_can('administrator')) { ?> <div class="exam-portal-container"><h2>Exam Portal Access</h2><p>You are logged in as an administrator. Click to sync and go.</p><form name="syncform" action="<?php echo esc_url(add_query_arg('redirect_to', urlencode($redirect_to), '')); ?>" method="post"><div class="form-row"><button type="submit" title="This securely syncs your latest purchases and profile info.">Access Exam App</button></div><?php wp_nonce_field('annapoorna_admin_sync_action', 'annapoorna_admin_sync_nonce'); ?></form><div class="exam-portal-links"><a href="<?php echo esc_url(wp_logout_url(home_url(ANNAPOORNA_LOGIN_SLUG))); ?>">Log Out</a></div></div> <?php } else { $url = annapoorna_get_exam_app_url(false) . '#/auth?token=' . annapoorna_generate_exam_jwt(get_current_user_id()) . '&redirect_to=' . urlencode($redirect_to); echo "<div class='exam-portal-container' style='text-align:center;'><p>Redirecting...</p><script>window.location.href='" . esc_url_raw($url) . "';</script><noscript><meta http-equiv='refresh' content='0;url=" . esc_url_raw($url) . "'></noscript></div>"; } } else { ?> <div class="exam-portal-container"><h2>Exam Portal Login</h2> <?php if ($annapoorna_login_error) echo "<p class='exam-portal-error'>" . esc_html($annapoorna_login_error) . "</p>"; ?> <form name="loginform" action="<?php echo esc_url(add_query_arg('redirect_to', urlencode($redirect_to), '')); ?>" method="post"><div class="form-row"><label for="log">Username or Email</label><input type="text" name="log" id="log" required></div><div class="form-row"><label for="pwd">Password</label><input type="password" name="pwd" id="pwd" required></div><div class="form-row"><button type="submit">Log In</button></div><?php wp_nonce_field('exam_login_action', 'exam_login_nonce'); ?></form><div class="exam-portal-links"><a href="<?php echo esc_url(wp_registration_url()); ?>">Register</a> | <a href="<?php echo esc_url(wp_lostpassword_url()); ?>">Lost Password?</a></div></div> <?php } return ob_get_clean(); }
function annapoorna_exam_add_custom_registration_fields() { ?><p><label for="first_name">First Name<br/><input type="text" name="first_name" id="first_name" required/></label></p><p><label for="last_name">Last Name<br/><input type="text" name="last_name" id="last_name" required/></label></p><?php }
function annapoorna_exam_validate_reg_fields($errors, $login, $email) { if (empty($_POST['first_name']) || empty($_POST['last_name'])) $errors->add('field_error', 'First and Last Name are required.'); return $errors; }
function annapoorna_exam_save_reg_fields($user_id) { if (!empty($_POST['first_name'])) update_user_meta($user_id, 'first_name', sanitize_text_field($_POST['first_name'])); if (!empty($_POST['last_name'])) update_user_meta($user_id, 'last_name', sanitize_text_field($_POST['last_name'])); }
function annapoorna_exam_login_url($login_url, $redirect) { $login_page_url = home_url('/' . ANNAPOORNA_LOGIN_SLUG . '/'); return !empty($redirect) ? add_query_arg('redirect_to', urlencode($redirect), $login_page_url) : $login_page_url; }

?>
`;

    const handleCopy = () => {
        navigator.clipboard.writeText(phpCode.trim());
        toast.success('Code copied to clipboard!');
    };

    return (
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-lg">
            <h1 className="text-3xl font-bold text-slate-800 mb-4">WordPress Integration Guide</h1>
            <div className="prose max-w-none text-slate-600">
                <p>
                    This application is designed to work with a WordPress site using WooCommerce. The following PHP code provides the necessary backend functionality for Single Sign-On (SSO), data synchronization, and API endpoints.
                </p>

                <h2 className="text-2xl font-semibold text-slate-700 mt-6 mb-2">Setup Instructions</h2>
                <ol className="list-decimal pl-5 space-y-2">
                    <li>
                        <strong>Create a Plugin:</strong> Copy the code below into a new PHP file (e.g., <code>mco-exam-integration.php</code>) in your <code>/wp-content/plugins/</code> directory.
                    </li>
                    <li>
                        <strong>Activate the Plugin:</strong> Go to your WordPress admin dashboard, navigate to "Plugins", and activate the "Medical Coding Online Exam App Integration" plugin.
                    </li>
                    <li>
                        <strong>Configure the Secret Key:</strong> Add a secure, random JWT secret key to your <code>wp-config.php</code> file. This is crucial for security.
                        <pre className="bg-slate-100 p-2 rounded text-sm"><code>define('ANNAPOORNA_JWT_SECRET', 'your-very-strong-secret-key-that-is-long-and-random');</code></pre>
                    </li>
                    <li>
                        <strong>Create a Login Page:</strong> Create a new page in WordPress with the slug <code>exam-login</code> and add the shortcode <code>[exam_portal_login]</code> to its content. This will be your new login portal.
                    </li>
                    <li>
                        <strong>Verify Setup:</strong> Log out and visit your new login page. Attempt to log in. You should be redirected to this exam application.
                    </li>
                </ol>

                <h2 className="text-2xl font-semibold text-slate-700 mt-6 mb-2">Integration Code</h2>
                <p>
                    Click the button to copy the entire PHP code snippet required for the plugin.
                </p>
                <div className="relative">
                    <button 
                        onClick={handleCopy}
                        className="absolute top-2 right-2 bg-slate-600 text-white text-xs font-bold py-1 px-3 rounded-md hover:bg-slate-700 transition"
                    >
                        Copy Code
                    </button>
                    <pre className="bg-slate-800 text-white p-4 rounded-lg overflow-x-auto text-sm">
                        <code>
                            {phpCode.trim()}
                        </code>
                    </pre>
                </div>
            </div>
        </div>
    );
};

export default Integration;