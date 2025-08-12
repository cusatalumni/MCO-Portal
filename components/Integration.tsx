
import React from 'react';
import toast from 'react-hot-toast';

const Integration: React.FC = () => {

    const phpCode = `
<?php
/**
 * Plugin Name: Medical Coding Online Exam App Integration
 * Description: Integrates the React-based examination app with WordPress, handling user authentication (SSO), WooCommerce purchases, and results synchronization.
 * Version: 3.8
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

add_action('rest_api_init', function () {
    // This filter is the standard WordPress way to allow custom headers like 'Authorization'.
    add_filter('rest_allowed_cors_headers', function ($allowed_headers) {
        $allowed_headers[] = 'Authorization';
        $allowed_headers[] = 'Content-Type';
        return $allowed_headers;
    });

    // We still need to handle pre-flight 'OPTIONS' requests and set the origin header.
    // This hook runs before WordPress serves the REST request.
    add_filter('rest_pre_serve_request', function ($value) {
        // Set the origin header. '*' is permissive; for production, a specific domain is better.
        header('Access-Control-Allow-Origin: *');

        if ('OPTIONS' === $_SERVER['REQUEST_METHOD']) {
            // For pre-flight, we confirm the allowed methods and headers and then exit.
            header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
            header('Access-Control-Allow-Headers: Authorization, Content-Type, X-WP-Nonce');
            exit(0);
        }

        return $value;
    });
}, 15);


add_action('init', 'annapoorna_exam_app_init');
function annapoorna_exam_app_init() {
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
        ['id' => 'book-cpc-guide', 'title' => 'Official CPC® Certification Study Guide (AAPC)', 'description' => 'AAPC\'s official CPC exam study guide — anatomy, medical terminology, ICD-10-CM, CPT, HCPCS, practice questions and exam tips.', 'imageUrl' => 'https://www.coding-online.net/wp-content/uploads/2024/04/cpc-study-guide.jpg', 'affiliateLinks' => ['com' => 'https://www.amazon.com/dp/1635278910?tag=mykada-20', 'in' => 'https://www.amazon.in/dp/1635278910?tag=httpcodingonl-21', 'ae' => 'https://www.amazon.ae/dp/1285427998?tag=medical0f1-21']],
        ['id' => 'book-icd10-cm', 'title' => "Buck's ICD-10-CM for Physicians 2026", 'description' => 'Physician-focused ICD-10-CM code manual (full-color, guidelines and examples).', 'imageUrl' => 'https://www.coding-online.net/wp-content/uploads/2024/04/icd-10-cm-physicians.jpg', 'affiliateLinks' => ['com' => 'https://www.amazon.com/dp/0443380783?tag=mykada-20', 'in' => 'https://www.amazon.in/dp/0443380783?tag=httpcodingonl-21', 'ae' => 'https://www.amazon.ae/dp/0443380783?tag=medical0f1-21']],
        ['id' => 'book-cpt-pro', 'title' => 'AMA CPT® Professional 2026', 'description' => 'Official Current Procedural Terminology (CPT) codebook from the American Medical Association.', 'imageUrl' => 'https://www.coding-online.net/wp-content/uploads/2024/04/cpt-professional.jpg', 'affiliateLinks' => ['com' => 'https://www.amazon.com/dp/1640163354?tag=mykada-20', 'in' => 'https://www.amazon.in/dp/1640163354?tag=httpcodingonl-21', 'ae' => 'https://www.amazon.ae/dp/1640163354?tag=medical0f1-21']],
        ['id' => 'book-hcpcs-level2', 'title' => 'HCPCS Level II Professional 2026', 'description' => 'Comprehensive guide for HCPCS Level II codes used for supplies, equipment, and drugs.', 'imageUrl' => 'https://www.coding-online.net/wp-content/uploads/2024/04/hcpcs-level-2.jpg', 'affiliateLinks' => ['com' => 'https://www.amazon.com/dp/1622029947?tag=mykada-20', 'in' => 'https://www.amazon.in/dp/1622029947?tag=httpcodingonl-21', 'ae' => 'https://www.amazon.ae/dp/1622029947?tag=medical0f1-21']],
        ['id' => 'book-medical-billing', 'title' => 'Medical Billing & Coding For Dummies', 'description' => 'An easy-to-understand guide covering the basics of medical billing and coding.', 'imageUrl' => 'https://www.coding-online.net/wp-content/uploads/2024/04/coding-for-dummies.jpg', 'affiliateLinks' => ['com' => 'https://www.amazon.com/dp/1119750393?tag=mykada-20', 'in' => 'https://www.amazon.in/dp/1119750393?tag=httpcodingonl-21', 'ae' => 'https://www.amazon.ae/dp/1119750393?tag=medical0f1-21']]
    ];
    
    $CERTIFICATE_TEMPLATES = [
        ['id' => 'cert-mco-1', 'title' => 'Medical Coding Proficiency', 'body' => 'For successfully demonstrating proficiency in medical coding principles and practices with a final score of <strong>{finalScore}%</strong>. This achievement certifies the holder\'s competence in the standards required for this certification.', 'signature1Name' => 'Dr. Amelia Reed', 'signature1Title' => 'Program Director', 'signature2Name' => 'B. Manoj', 'signature2Title' => 'Chief Instructor'],
        ['id' => 'cert-mco-2', 'title' => 'Advanced Specialty Coding', 'body' => 'Awarded for exceptional performance and mastery in advanced specialty coding topics, achieving a score of <strong>{finalScore}%</strong>. This signifies a high level of expertise and dedication to the field.', 'signature1Name' => 'Dr. Amelia Reed', 'signature1Title' => 'Program Director', 'signature2Name' => 'B. Manoj', 'signature2Title' => 'Chief Instructor']
    ];
    
    $EXAM_PRODUCT_CATEGORIES = [
        ['id' => 'prod-cpc', 'name' => 'CPC', 'description' => 'A test series designed to prepare you for the AAPC CPC (Certified Professional Coder) exam.', 'practiceExamId' => 'exam-cpc-practice', 'certificationExamId' => 'exam-cpc-cert'],
        ['id' => 'prod-cca', 'name' => 'CCA', 'description' => 'A test series for the AHIMA CCA (Certified Coding Associate) credential.', 'practiceExamId' => 'exam-cca-practice', 'certificationExamId' => 'exam-cca-cert'],
        ['id' => 'prod-billing', 'name' => 'Medical Billing', 'description' => 'A test series covering the essentials of medical billing and reimbursement.', 'practiceExamId' => 'exam-billing-practice', 'certificationExamId' => 'exam-billing-cert']
    ];

    $ALL_EXAMS = [
        // Practice Exams
        ['id' => 'exam-cpc-practice', 'name' => 'CPC Practice Test', 'description' => 'A short practice test to prepare for the CPC certification.', 'price' => 0, 'productSku' => 'exam-cpc-practice', 'numberOfQuestions' => 10, 'passScore' => 70, 'certificateTemplateId' => 'cert-mco-1', 'isPractice' => true, 'durationMinutes' => 25, 'questionSourceUrl' => 'https://docs.google.com/spreadsheets/d/1-2abcdefghijklmnopqrstuvwxyz/edit?usp=sharing'],
        ['id' => 'exam-cca-practice', 'name' => 'CCA Practice Test', 'description' => 'A short practice test for the Certified Coding Associate exam.', 'price' => 0, 'productSku' => 'exam-cca-practice', 'numberOfQuestions' => 10, 'passScore' => 70, 'certificateTemplateId' => 'cert-mco-1', 'isPractice' => true, 'durationMinutes' => 25],
        ['id' => 'exam-billing-practice', 'name' => 'Medical Billing Practice Test', 'description' => 'A short practice test for medical billing concepts.', 'price' => 0, 'productSku' => 'exam-billing-practice', 'numberOfQuestions' => 10, 'passScore' => 70, 'certificateTemplateId' => 'cert-mco-2', 'isPractice' => true, 'durationMinutes' => 20],
        ['id' => 'exam-ccs-practice', 'name' => 'CCS Practice Test', 'description' => 'Practice for the Certified Coding Specialist exam.', 'price' => 0, 'productSku' => 'exam-ccs-practice', 'numberOfQuestions' => 10, 'passScore' => 70, 'certificateTemplateId' => 'cert-mco-1', 'isPractice' => true, 'durationMinutes' => 25],
        ['id' => 'exam-risk-practice', 'name' => 'Risk Adjustment Practice Test', 'description' => 'Practice for the Risk Adjustment (CRC) exam.', 'price' => 0, 'productSku' => 'exam-risk-practice', 'numberOfQuestions' => 10, 'passScore' => 70, 'certificateTemplateId' => 'cert-mco-1', 'isPractice' => true, 'durationMinutes' => 25],
        ['id' => 'exam-icd-practice', 'name' => 'ICD-10-CM Practice Test', 'description' => 'Practice for the ICD-10-CM proficiency exam.', 'price' => 0, 'productSku' => 'exam-icd-practice', 'numberOfQuestions' => 10, 'passScore' => 75, 'certificateTemplateId' => 'cert-mco-1', 'isPractice' => true, 'durationMinutes' => 20],
        ['id' => 'exam-cpb-practice', 'name' => 'CPB Practice Test', 'description' => 'Practice for the Certified Professional Biller exam.', 'price' => 0, 'productSku' => 'exam-cpb-practice', 'numberOfQuestions' => 10, 'passScore' => 70, 'certificateTemplateId' => 'cert-mco-2', 'isPractice' => true, 'durationMinutes' => 25],
        ['id' => 'exam-crc-practice', 'name' => 'CRC Practice Test', 'description' => 'Practice for the Certified Risk Adjustment Coder exam.', 'price' => 0, 'productSku' => 'exam-crc-practice', 'numberOfQuestions' => 10, 'passScore' => 70, 'certificateTemplateId' => 'cert-mco-1', 'isPractice' => true, 'durationMinutes' => 25],
        ['id' => 'exam-cpma-practice', 'name' => 'CPMA Practice Test', 'description' => 'Practice for the Certified Professional Medical Auditor exam.', 'price' => 0, 'productSku' => 'exam-cpma-practice', 'numberOfQuestions' => 10, 'passScore' => 70, 'certificateTemplateId' => 'cert-mco-1', 'isPractice' => true, 'durationMinutes' => 25],
        ['id' => 'exam-coc-practice', 'name' => 'COC Practice Test', 'description' => 'Practice for the Certified Outpatient Coder exam.', 'price' => 0, 'productSku' => 'exam-coc-practice', 'numberOfQuestions' => 10, 'passScore' => 70, 'certificateTemplateId' => 'cert-mco-1', 'isPractice' => true, 'durationMinutes' => 25],
        ['id' => 'exam-cic-practice', 'name' => 'CIC Practice Test', 'description' => 'Practice for the Certified Inpatient Coder exam.', 'price' => 0, 'productSku' => 'exam-cic-practice', 'numberOfQuestions' => 10, 'passScore' => 70, 'certificateTemplateId' => 'cert-mco-1', 'isPractice' => true, 'durationMinutes' => 25],
        ['id' => 'exam-mta-practice', 'name' => 'Medical Terminology & Anatomy Practice', 'description' => 'Practice for the Medical Terminology and Anatomy exam.', 'price' => 0, 'productSku' => 'exam-mta-practice', 'numberOfQuestions' => 10, 'passScore' => 80, 'certificateTemplateId' => 'cert-mco-1', 'isPractice' => true, 'durationMinutes' => 20],

        // Certification Exams
        ['id' => 'exam-cpc-cert', 'name' => 'CPC Certification Exam', 'description' => 'Full certification exam for Certified Professional Coder.', 'price' => 150, 'regularPrice' => 150, 'productSku' => 'exam-cpc-cert', 'productSlug' => 'exam-cpc-cert', 'numberOfQuestions' => 100, 'passScore' => 70, 'certificateTemplateId' => 'cert-mco-1', 'isPractice' => false, 'durationMinutes' => 240, 'questionSourceUrl' => ''],
        ['id' => 'exam-cca-cert', 'name' => 'CCA Certification Exam', 'description' => 'Full certification exam for Certified Coding Associate.', 'price' => 120, 'regularPrice' => 120, 'productSku' => 'exam-cca-cert', 'productSlug' => 'exam-cca-cert', 'numberOfQuestions' => 100, 'passScore' => 70, 'certificateTemplateId' => 'cert-mco-1', 'isPractice' => false, 'durationMinutes' => 180, 'questionSourceUrl' => ''],
        ['id' => 'exam-ccs-cert', 'name' => 'CCS Certification Exam', 'description' => 'Full certification exam for Certified Coding Specialist.', 'price' => 160, 'regularPrice' => 160, 'productSku' => 'exam-ccs-cert', 'productSlug' => 'exam-ccs-cert', 'numberOfQuestions' => 100, 'passScore' => 70, 'certificateTemplateId' => 'cert-mco-1', 'isPractice' => false, 'durationMinutes' => 240, 'questionSourceUrl' => ''],
        ['id' => 'exam-billing-cert', 'name' => 'Medical Billing Certification Exam', 'description' => 'Comprehensive exam covering medical billing and reimbursement.', 'price' => 100, 'regularPrice' => 100, 'productSku' => 'exam-billing-cert', 'productSlug' => 'exam-billing-cert', 'numberOfQuestions' => 100, 'passScore' => 75, 'certificateTemplateId' => 'cert-mco-2', 'isPractice' => false, 'durationMinutes' => 150, 'questionSourceUrl' => ''],
        ['id' => 'exam-risk-cert', 'name' => 'Risk Adjustment (CRC) Certification Exam', 'description' => 'Exam for Certified Risk Adjustment Coder.', 'price' => 150, 'regularPrice' => 150, 'productSku' => 'exam-risk-cert', 'productSlug' => 'exam-risk-cert', 'numberOfQuestions' => 100, 'passScore' => 70, 'certificateTemplateId' => 'cert-mco-1', 'isPractice' => false, 'durationMinutes' => 240, 'questionSourceUrl' => ''],
        ['id' => 'exam-icd-cert', 'name' => 'ICD-10-CM Certification Exam', 'description' => 'Proficiency exam for ICD-10-CM coding.', 'price' => 90, 'regularPrice' => 90, 'productSku' => 'exam-icd-cert', 'productSlug' => 'exam-icd-cert', 'numberOfQuestions' => 100, 'passScore' => 75, 'certificateTemplateId' => 'cert-mco-1', 'isPractice' => false, 'durationMinutes' => 120, 'questionSourceUrl' => ''],
        ['id' => 'exam-cpb-cert', 'name' => 'CPB Certification Exam', 'description' => 'Full certification exam for Certified Professional Biller.', 'price' => 150, 'regularPrice' => 150, 'productSku' => 'exam-cpb-cert', 'productSlug' => 'exam-cpb-cert', 'numberOfQuestions' => 100, 'passScore' => 70, 'certificateTemplateId' => 'cert-mco-2', 'isPractice' => false, 'durationMinutes' => 240, 'questionSourceUrl' => ''],
        ['id' => 'exam-crc-cert', 'name' => 'CRC Certification Exam', 'description' => 'Full certification exam for Certified Risk Adjustment Coder.', 'price' => 150, 'regularPrice' => 150, 'productSku' => 'exam-crc-cert', 'productSlug' => 'exam-crc-cert', 'numberOfQuestions' => 100, 'passScore' => 70, 'certificateTemplateId' => 'cert-mco-1', 'isPractice' => false, 'durationMinutes' => 240, 'questionSourceUrl' => ''],
        ['id' => 'exam-cpma-cert', 'name' => 'CPMA Certification Exam', 'description' => 'Full certification exam for Certified Professional Medical Auditor.', 'price' => 150, 'regularPrice' => 150, 'productSku' => 'exam-cpma-cert', 'productSlug' => 'exam-cpma-cert', 'numberOfQuestions' => 100, 'passScore' => 70, 'certificateTemplateId' => 'cert-mco-1', 'isPractice' => false, 'durationMinutes' => 240, 'questionSourceUrl' => ''],
        ['id' => 'exam-coc-cert', 'name' => 'COC Certification Exam', 'description' => 'Full certification exam for Certified Outpatient Coder.', 'price' => 150, 'regularPrice' => 150, 'productSku' => 'exam-coc-cert', 'productSlug' => 'exam-coc-cert', 'numberOfQuestions' => 100, 'passScore' => 70, 'certificateTemplateId' => 'cert-mco-1', 'isPractice' => false, 'durationMinutes' => 240, 'questionSourceUrl' => ''],
        ['id' => 'exam-cic-cert', 'name' => 'CIC Certification Exam', 'description' => 'Full certification exam for Certified Inpatient Coder.', 'price' => 150, 'regularPrice' => 150, 'productSku' => 'exam-cic-cert', 'productSlug' => 'exam-cic-cert', 'numberOfQuestions' => 100, 'passScore' => 70, 'certificateTemplateId' => 'cert-mco-1', 'isPractice' => false, 'durationMinutes' => 240, 'questionSourceUrl' => ''],
        ['id' => 'exam-mta-cert', 'name' => 'Medical Terminology & Anatomy Exam', 'description' => 'Proficiency exam for Medical Terminology and Anatomy.', 'price' => 75, 'regularPrice' => 75, 'productSku' => 'exam-mta-cert', 'productSlug' => 'exam-mta-cert', 'numberOfQuestions' => 100, 'passScore' => 80, 'certificateTemplateId' => 'cert-mco-1', 'isPractice' => false, 'durationMinutes' => 60, 'questionSourceUrl' => '']
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
        $all_exam_skus_raw = annapoorna_get_all_app_data()[0]['exams'];
        $all_exam_skus = array_column(array_filter($all_exam_skus_raw, function($e) { return !$e['isPractice'] && isset($e['productSku']); }), 'productSku');
        
        $exam_prices = get_transient('annapoorna_exam_prices');
        if (false === $exam_prices) {
            annapoorna_debug_log('Exam prices cache miss. Fetching from DB.');
            $exam_prices = new stdClass();
            foreach ($all_exam_skus as $sku) {
                if (($product_id = wc_get_product_id_by_sku($sku)) && ($product = wc_get_product($product_id))) {
                    $price = (float) $product->get_price();
                    $regular_price = (float) $product->get_regular_price();
                    if ($regular_price > $price) {
                        $exam_prices->{$sku} = ['price' => $price, 'regularPrice' => $regular_price];
                    } else {
                        $exam_prices->{$sku} = ['price' => $price, 'regularPrice' => $price];
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

function annapoorna_base64url_encode($data) { return rtrim(strtr(base64_encode($data), '+/', '-_'), '='); }
function annapoorna_base64url_decode($data) { return base64_decode(strtr($data, '-_', '+/')); }
function annapoorna_generate_exam_jwt($user_id) { $secret_key = defined('ANNAPOORNA_JWT_SECRET') ? ANNAPOORNA_JWT_SECRET : ''; if (empty($secret_key) || strlen($secret_key) < 32 || strpos($secret_key, 'your-very-strong-secret-key') !== false) { annapoorna_debug_log('JWT Secret is not configured or is too weak.'); return null; } if (!$payload = annapoorna_exam_get_payload($user_id)) return null; $header_b64 = annapoorna_base64url_encode(json_encode(['typ' => 'JWT', 'alg' => 'HS256'])); $payload_b64 = annapoorna_base64url_encode(json_encode($payload)); $signature = hash_hmac('sha256', "$header_b64.$payload_b64", $secret_key, true); $signature_b64 = annapoorna_base64url_encode($signature); return "$header_b64.$payload_b64.$signature_b64"; }
function annapoorna_verify_exam_jwt($token) { $secret_key = defined('ANNAPOORNA_JWT_SECRET') ? ANNAPOORNA_JWT_SECRET : ''; if (empty($secret_key) || strlen($secret_key) < 32) return null; $parts = explode('.', $token); if (count($parts) !== 3) return null; list($header_b64, $payload_b64, $signature_b64) = $parts; $signature = annapoorna_base64url_decode($signature_b64); $expected_signature = hash_hmac('sha256', "$header_b64.$payload_b64", $secret_key, true); if (!hash_equals($expected_signature, $signature)) return null; $payload = json_decode(annapoorna_base64url_decode($payload_b64), true); return (isset($payload['exp']) && $payload['exp'] < time()) ? null : $payload; }
function annapoorna_redirect_after_purchase($order_id) { if (!$order_id || !($order = wc_get_order($order_id)) || !($user_id = $order->get_customer_id())) return; if ($user_id > 0 && $order->has_status(['completed', 'processing', 'on-hold'])) { if (function_exists('WC') && WC()->cart) WC()->cart->empty_cart(); if ($token = annapoorna_generate_exam_jwt($user_id)) { wp_redirect(annapoorna_get_exam_app_url(user_can($user_id, 'administrator')) . '#/auth?token=' . $token . '&redirect_to=/dashboard'); exit; } } }

function annapoorna_exam_register_rest_api() {
    register_rest_route('exam-app/v1', '/app-config', ['methods' => 'GET', 'callback' => 'annapoorna_get_app_config_callback', 'permission_callback' => '__return_true']);
    register_rest_route('exam-app/v1', '/user-results', ['methods' => 'GET', 'callback' => 'annapoorna_get_user_results_callback', 'permission_callback' => 'annapoorna_exam_api_permission_check']);
    register_rest_route('exam-app/v1', '/result/(?P<test_id>[\\w-]+)', ['methods' => 'GET', 'callback' => 'annapoorna_get_single_result_callback', 'permission_callback' => 'annapoorna_exam_api_permission_check']);
    register_rest_route('exam-app/v1', '/certificate-data/(?P<test_id>[\\w-]+)', ['methods' => 'GET', 'callback' => 'annapoorna_get_certificate_data_callback', 'permission_callback' => 'annapoorna_exam_api_permission_check']);
    register_rest_route('exam-app/v1', '/update-name', ['methods' => 'POST', 'callback' => 'annapoorna_exam_update_user_name_callback', 'permission_callback' => 'annapoorna_exam_api_permission_check']);
    register_rest_route('exam-app/v1', '/submit-result', ['methods' => 'POST', 'callback' => 'annapoorna_exam_submit_result_callback', 'permission_callback' => 'annapoorna_exam_api_permission_check']);
    register_rest_route('exam-app/v1', '/questions-from-sheet', ['methods' => 'POST', 'callback' => 'annapoorna_get_questions_from_sheet_callback', 'permission_callback' => 'annapoorna_exam_api_permission_check']);
}

function annapoorna_exam_api_permission_check($request) {
    $token = $request->get_header('Authorization');
    if (!$token || !preg_match('/Bearer\\s(\\S+)/', $token, $matches)) return new WP_Error('jwt_missing', 'Authorization token not found.', ['status' => 401]);
    $payload = annapoorna_verify_exam_jwt($matches[1]);
    if (!$payload || !isset($payload['user']['id'])) return new WP_Error('jwt_invalid', 'Invalid or expired token.', ['status' => 403]);
    $request->set_param('jwt_user_id', $payload['user']['id']);
    return true;
}

function annapoorna_get_app_config_callback() { return new WP_REST_Response(annapoorna_get_all_app_data(), 200); }

function annapoorna_get_questions_from_sheet_callback($request) {
    $params = $request->get_json_params();
    $sheet_url = isset($params['sheetUrl']) ? esc_url_raw($params['sheetUrl']) : '';
    $count = isset($params['count']) ? intval($params['count']) : 100;

    if (empty($sheet_url) || !filter_var($sheet_url, FILTER_VALIDATE_URL)) {
        return new WP_Error('invalid_url', 'Invalid or missing Google Sheet URL.', ['status' => 400]);
    }

    $csv_url = str_replace('/edit?usp=sharing', '/export?format=csv', $sheet_url);
    $csv_url = str_replace('/edit#gid=', '/export?format=csv&gid=', $csv_url);
    
    $response = wp_remote_get($csv_url, ['timeout' => 20]);

    if (is_wp_error($response)) {
        annapoorna_debug_log('Failed to fetch sheet: ' . $response->get_error_message());
        return new WP_Error('fetch_failed', 'Could not retrieve questions from the source.', ['status' => 500]);
    }
    
    $response_code = wp_remote_retrieve_response_code($response);
    if ($response_code !== 200) {
        annapoorna_debug_log('Google Sheet returned non-200 status: ' . $response_code);
        return new WP_Error('fetch_failed', 'Could not access the question source. Please check the URL and permissions.', ['status' => 502]);
    }

    $body = wp_remote_retrieve_body($response);
    $lines = explode("\n", trim($body));
    array_walk($lines, function(&$line) { $line = trim($line); });
    
    $header = str_getcsv(array_shift($lines));
    
    $questions = [];
    foreach ($lines as $line) {
        if (empty(trim($line))) continue;
        $row = str_getcsv($line);
        if(count($row) < 3) continue;

        $options = [];
        for ($i = 1; $i < count($row) - 1; $i++) {
            if (!empty(trim($row[$i]))) {
                $options[] = trim($row[$i]);
            }
        }
        
        $correct_answer_text = trim(end($row));
        $correct_answer_index = array_search($correct_answer_text, $options);
        
        if(count($options) < 2 || $correct_answer_index === false) continue;
        
        $questions[] = [
            'id' => count($questions) + 1,
            'question' => trim($row[0]),
            'options' => $options,
            'correctAnswer' => $correct_answer_index + 1
        ];
    }
    
    if (empty($questions)) {
        return new WP_Error('parse_failed', 'No valid questions could be parsed from the source.', ['status' => 500]);
    }

    shuffle($questions);
    $selected_questions = array_slice($questions, 0, $count);
    
    $final_questions = [];
    foreach($selected_questions as $index => $q) {
        $q['id'] = $index + 1;
        $final_questions[] = $q;
    }

    return new WP_REST_Response($final_questions, 200);
}

function annapoorna_get_user_results_callback($request) {
    $user_id = (int)$request->get_param('jwt_user_id');
    if ($user_id <= 0) {
        return new WP_Error('invalid_user', 'Invalid user ID.', ['status' => 403]);
    }
    $results = get_user_meta($user_id, 'annapoorna_exam_results', true);
    if (empty($results) || !is_array($results)) {
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
    if (!is_array($all_results)) $all_results = [];
    $all_results[$result_data['testId']] = $result_data;
    
    update_user_meta($user_id, 'annapoorna_exam_results', $all_results);
    
    return new WP_REST_Response($result_data, 200);
}

function annapoorna_exam_login_shortcode() {
    if (!defined('ANNAPOORNA_JWT_SECRET') || strlen(ANNAPOORNA_JWT_SECRET) < 32 || strpos(ANNAPOORNA_JWT_SECRET, 'your-very-strong-secret-key') !== false) {
        return "<p class='exam-portal-error'>Configuration error: A strong, unique ANNAPOORNA_JWT_SECRET must be defined in wp-config.php.</p>";
    }

    $login_error_message = '';
    $user_id = 0;

    if ('POST' === $_SERVER['REQUEST_METHOD'] && !empty($_POST['exam_login_nonce']) && wp_verify_nonce($_POST['exam_login_nonce'], 'exam_login_action')) {
        $credentials = [
            'user_login'    => isset($_POST['log']) ? sanitize_text_field($_POST['log']) : '',
            'user_password' => isset($_POST['pwd']) ? $_POST['pwd'] : '',
            'remember'      => true
        ];
        $user = wp_signon($credentials, false);

        if (is_wp_error($user)) {
            $login_error_message = 'Invalid username or password.';
        } else {
            $user_id = $user->ID;
        }
    }
    
    if (is_user_logged_in() && $user_id === 0) {
        $user_id = get_current_user_id();
    }

    if ($user_id > 0) {
        $token = annapoorna_generate_exam_jwt($user_id);
        if ($token) {
            $redirect_to = isset($_REQUEST['redirect_to']) ? esc_url_raw(urldecode($_REQUEST['redirect_to'])) : '/dashboard';
            $is_admin = user_can($user_id, 'administrator');
            $app_url = annapoorna_get_exam_app_url($is_admin);
            $final_url = $app_url . '#/auth?token=' . $token . '&redirect_to=' . urlencode($redirect_to);
            
            echo "<div class='exam-portal-container' style='text-align:center;'><p>Login successful. Redirecting...</p><script>window.location.href='" . esc_url_raw($final_url) . "';</script><noscript><meta http-equiv='refresh' content='0;url=" . esc_url_raw($final_url) . "'></noscript></div>";
            return;
        } else {
            $login_error_message = 'Could not create a secure session. Please contact support and mention the JWT configuration issue.';
        }
    }
    
    ob_start();
    ?>
    <style>.exam-portal-container{font-family:sans-serif;max-width:400px;margin:5% auto;padding:40px;background:#fff;border-radius:12px;box-shadow:0 10px 25px -5px rgba(0,0,0,.1)}.exam-portal-container h2{text-align:center;font-size:24px;margin-bottom:30px}.exam-portal-container .form-row{margin-bottom:20px}.exam-portal-container label{display:block;margin-bottom:8px;font-weight:600}.exam-portal-container input{width:100%;padding:12px;border:1px solid #ccc;border-radius:8px;box-sizing:border-box}.exam-portal-container button{width:100%;padding:14px;background-color:#0891b2;color:#fff;border:none;border-radius:8px;font-size:16px;cursor:pointer}.exam-portal-container button:hover{background-color:#067a8e}.exam-portal-links{margin-top:20px;text-align:center}.exam-portal-error{color:red;text-align:center;margin-bottom:20px}</style>
    <div class="exam-portal-container">
        <h2>Exam Portal Login</h2>
        <?php if ($login_error_message) echo "<p class='exam-portal-error'>" . esc_html($login_error_message) . "</p>"; ?>
        <form name="loginform" action="<?php echo esc_url(get_permalink()); ?>" method="post">
            <div class="form-row">
                <label for="log">Username or Email</label>
                <input type="text" name="log" id="log" required>
            </div>
            <div class="form-row">
                <label for="pwd">Password</label>
                <input type="password" name="pwd" id="pwd" required>
            </div>
            <div class="form-row">
                <button type="submit">Log In</button>
            </div>
            <?php wp_nonce_field('exam_login_action', 'exam_login_nonce'); ?>
            <?php if (isset($_REQUEST['redirect_to'])): ?>
                <input type="hidden" name="redirect_to" value="<?php echo esc_attr(urlencode($_REQUEST['redirect_to'])); ?>" />
            <?php endif; ?>
        </form>
        <div class="exam-portal-links">
            <a href="<?php echo esc_url(wp_registration_url()); ?>">Register</a> | <a href="<?php echo esc_url(wp_lostpassword_url()); ?>">Lost Password?</a>
        </div>
    </div>
    <?php
    return ob_get_clean();
}

function annapoorna_exam_add_custom_registration_fields() { ?><p><label for="first_name">First Name<br/><input type="text" name="first_name" id="first_name" required/></label></p><p><label for="last_name">Last Name<br/><input type="text" name="last_name" id="last_name" required/></label></p><?php }
function annapoorna_exam_validate_reg_fields($errors, $login, $email) { if (empty($_POST['first_name']) || empty($_POST['last_name'])) $errors->add('field_error', 'First and Last Name are required.'); return $errors; }
function annapoorna_exam_save_reg_fields($user_id) { if (!empty($_POST['first_name'])) update_user_meta($user_id, 'first_name', sanitize_text_field($_POST['first_name'])); if (!empty($_POST['last_name'])) update_user_meta($user_id, 'last_name', sanitize_text_field($_POST['last_name'])); }
function annapoorna_exam_login_url($login_url, $redirect) {
    if (strpos($_SERVER['REQUEST_URI'], 'wp-admin') !== false) {
        return $login_url;
    }
    $login_page_url = home_url('/' . ANNAPOORNA_LOGIN_SLUG . '/');
    return !empty($redirect) ? add_query_arg('redirect_to', urlencode($redirect), $login_page_url) : $login_page_url;
}

?>`;

    return (
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-lg">
            <h1 className="text-3xl font-bold text-slate-800 mb-4">WordPress Integration Guide</h1>
            <div className="prose max-w-none text-slate-600">
                <p>This plugin enables Single Sign-On (SSO) from your WordPress site to the React exam app. It creates a custom login page, handles redirects, and securely transfers user data via a JWT token.</p>
                
                <h2 className="text-2xl font-semibold text-slate-700 mt-6 mb-2">Setup Instructions</h2>
                <ol>
                    <li><strong>Define Secret Key:</strong> Open your <code>wp-config.php</code> file and add the following line. <strong>This is a critical security step.</strong> Replace the placeholder with a key generated from a secure password generator (at least 32 characters).
                        <pre className="bg-slate-200 p-2 rounded text-sm"><code>define('ANNAPOORNA_JWT_SECRET', 'your-very-strong-secret-key-that-is-long-and-random');</code></pre>
                    </li>
                    <li><strong>Plugin Installation:</strong> Copy the full PHP code below into a new file named <code>mco-exam-integration.php</code> inside your <code>/wp-content/plugins/</code> directory.</li>
                    <li><strong>Activate Plugin:</strong> Go to your WordPress admin dashboard, navigate to "Plugins", find "Medical Coding Online Exam App Integration", and click "Activate".</li>
                    <li><strong>Create Login Page:</strong> Create a new page in WordPress (e.g., titled "Exam Login"). In the content editor, add the following shortcode:
                        <pre className="bg-slate-200 p-2 rounded text-sm"><code>[exam_portal_login]</code></pre>
                        The slug for this page should match the one defined in the plugin (default: <code>exam-login</code>).
                    </li>
                    <li><strong>Admin Settings:</strong> As an admin, you can switch between the production and test versions of the exam app from 'Settings' &gt; 'Exam App Settings' in your WP dashboard. This redirect only affects logged-in admins.</li>
                </ol>

                <h2 className="text-2xl font-semibold text-slate-700 mt-6 mb-2">Plugin Code</h2>
                <p>Copy the code below into <code>mco-exam-integration.php</code>.</p>
                <pre className="bg-slate-800 text-white p-4 rounded-lg overflow-x-auto relative">
                    <button 
                        onClick={() => {
                            navigator.clipboard.writeText(phpCode);
                            toast.success('Code copied to clipboard!');
                        }}
                        className="absolute top-2 right-2 bg-slate-600 hover:bg-slate-500 text-white text-xs font-bold py-1 px-2 rounded"
                    >
                        Copy Code
                    </button>
                    <code>{phpCode}</code>
                </pre>
            </div>
        </div>
    );
};

export default Integration;