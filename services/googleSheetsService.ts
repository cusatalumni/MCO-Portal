import type { Question, TestResult, CertificateData, Organization, UserAnswer, User, Exam, CertificateTemplate, ExamProductCategory } from '../types';
import { logoBase64 } from '../assets/logo';
import toast from 'react-hot-toast';
import { sampleQuestions } from '../assets/questionData';

// --- API Client for WordPress Backend ---
const WP_API_BASE = 'https://www.coding-online.net/wp-json/exam-app/v1';

const apiFetch = async (endpoint: string, token: string, options: RequestInit = {}) => {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
    const response = await fetch(`${WP_API_BASE}${endpoint}`, { ...options, headers });
    
    if (!response.ok) {
        let errorMessage = `API Error: Status ${response.status}`;
        try {
            const errorData = await response.json();
            if (errorData && errorData.message) {
                errorMessage = errorData.message;
            }
        } catch (e) {
            errorMessage = `Server returned a non-JSON error (status ${response.status}). Check server logs.`;
        }
        
        if (response.status === 403) {
            errorMessage += " This is often caused by an invalid or expired token, or a misconfigured JWT Secret Key in your WordPress settings.";
        }
        throw new Error(errorMessage);
    }
    
    if (response.status === 204) return null; // Handle No Content responses
    return response.json();
};


// --- LOCAL DATA STORE & CONFIG ---
const CERTIFICATE_TEMPLATES: CertificateTemplate[] = [
    { id: 'cert-mco-1', title: 'Medical Coding Proficiency', body: 'For successfully demonstrating proficiency in medical coding principles and practices with a final score of <strong>{finalScore}%</strong>. This achievement certifies the holder\'s competence in the standards required for this certification.', signature1Name: 'Dr. Amelia Reed', signature1Title: 'Program Director', signature2Name: 'B. Manoj', signature2Title: 'Chief Instructor' },
    { id: 'cert-mco-2', title: 'Advanced Specialty Coding', body: 'Awarded for exceptional performance and mastery in advanced specialty coding topics, achieving a score of <strong>{finalScore}%</strong>. This signifies a high level of expertise and dedication to the field.', signature1Name: 'Dr. Amelia Reed', signature1Title: 'Program Director', signature2Name: 'B. Manoj', signature2Title: 'Chief Instructor' }
];

const EXAM_PRODUCT_CATEGORIES: ExamProductCategory[] = [
    { id: 'prod-cpc', name: 'CPC', description: 'A test series designed to prepare you for the AAPC CPC (Certified Professional Coder) exam.', practiceExamId: 'exam-cpc-practice', certificationExamId: 'exam-cpc-cert' },
    { id: 'prod-cca', name: 'CCA', description: 'A test series for the AHIMA CCA (Certified Coding Associate) credential.', practiceExamId: 'exam-cca-practice', certificationExamId: 'exam-cca-cert' },
    { id: 'prod-billing', name: 'Medical Billing', description: 'A test series covering the essentials of medical billing and reimbursement.', practiceExamId: 'exam-billing-practice', certificationExamId: 'exam-billing-cert' }
];

const DEFAULT_QUESTION_URL = 'https://docs.google.com/spreadsheets/d/10QGeiupsw6KtW9613v1yj03SYtzf3rDCEu-hbgQUwgs/edit?usp=sharing';

const ALL_EXAMS: Exam[] = [
    // Practice Exams
    { id: 'exam-cpc-practice', name: 'CPC Practice Test', description: 'A short practice test to prepare for the CPC certification.', price: 0, productSku: 'exam-cpc-practice', numberOfQuestions: 10, passScore: 70, certificateTemplateId: 'cert-mco-1', isPractice: true, durationMinutes: 25, questionSourceUrl: DEFAULT_QUESTION_URL },
    { id: 'exam-cca-practice', name: 'CCA Practice Test', description: 'A short practice test for the Certified Coding Associate exam.', price: 0, productSku: 'exam-cca-practice', numberOfQuestions: 10, passScore: 70, certificateTemplateId: 'cert-mco-1', isPractice: true, durationMinutes: 25, questionSourceUrl: DEFAULT_QUESTION_URL },
    { id: 'exam-billing-practice', name: 'Medical Billing Practice Test', description: 'A short practice test for medical billing concepts.', price: 0, productSku: 'exam-billing-practice', numberOfQuestions: 10, passScore: 70, certificateTemplateId: 'cert-mco-2', isPractice: true, durationMinutes: 20, questionSourceUrl: DEFAULT_QUESTION_URL },
    { id: 'exam-ccs-practice', name: 'CCS Practice Test', description: 'Practice for the Certified Coding Specialist exam.', price: 0, productSku: 'exam-ccs-practice', numberOfQuestions: 10, passScore: 70, certificateTemplateId: 'cert-mco-1', isPractice: true, durationMinutes: 25, questionSourceUrl: DEFAULT_QUESTION_URL },
    { id: 'exam-risk-practice', name: 'Risk Adjustment Practice Test', description: 'Practice for the Risk Adjustment (CRC) exam.', price: 0, productSku: 'exam-risk-practice', numberOfQuestions: 10, passScore: 70, certificateTemplateId: 'cert-mco-1', isPractice: true, durationMinutes: 25, questionSourceUrl: DEFAULT_QUESTION_URL },
    { id: 'exam-icd-practice', name: 'ICD-10-CM Practice Test', description: 'Practice for the ICD-10-CM proficiency exam.', price: 0, productSku: 'exam-icd-practice', numberOfQuestions: 10, passScore: 75, certificateTemplateId: 'cert-mco-1', isPractice: true, durationMinutes: 20, questionSourceUrl: DEFAULT_QUESTION_URL },
    // Certification Exams
    { id: 'exam-cpc-cert', name: 'CPC Certification Exam', description: 'Full certification exam for Certified Professional Coder.', price: 150, regularPrice: 150, productSku: 'exam-cpc-cert', productSlug: 'exam-cpc-cert', numberOfQuestions: 100, passScore: 70, certificateTemplateId: 'cert-mco-1', isPractice: false, durationMinutes: 240, questionSourceUrl: DEFAULT_QUESTION_URL, recommendedBookId: 'book-cpc-guide' },
    { id: 'exam-cca-cert', name: 'CCA Certification Exam', description: 'Full certification exam for Certified Coding Associate.', price: 120, regularPrice: 120, productSku: 'exam-cca-cert', productSlug: 'exam-cca-cert', numberOfQuestions: 100, passScore: 70, certificateTemplateId: 'cert-mco-1', isPractice: false, durationMinutes: 180, questionSourceUrl: DEFAULT_QUESTION_URL, recommendedBookId: 'book-step-by-step' },
    { id: 'exam-ccs-cert', name: 'CCS Certification Exam', description: 'Full certification exam for Certified Coding Specialist.', price: 160, regularPrice: 160, productSku: 'exam-ccs-cert', productSlug: 'exam-ccs-cert', numberOfQuestions: 100, passScore: 70, certificateTemplateId: 'cert-mco-1', isPractice: false, durationMinutes: 240, questionSourceUrl: DEFAULT_QUESTION_URL, recommendedBookId: 'book-icd10-cm' },
    { id: 'exam-billing-cert', name: 'Medical Billing Certification Exam', description: 'Comprehensive exam covering medical billing and reimbursement.', price: 100, regularPrice: 100, productSku: 'exam-billing-cert', productSlug: 'exam-billing-cert', numberOfQuestions: 100, passScore: 75, certificateTemplateId: 'cert-mco-2', isPractice: false, durationMinutes: 150, questionSourceUrl: DEFAULT_QUESTION_URL, recommendedBookId: 'book-medical-billing' },
    { id: 'exam-risk-cert', name: 'Risk Adjustment (CRC) Certification Exam', description: 'Exam for Certified Risk Adjustment Coder.', price: 150, regularPrice: 150, productSku: 'exam-risk-cert', productSlug: 'exam-risk-cert', numberOfQuestions: 100, passScore: 70, certificateTemplateId: 'cert-mco-1', isPractice: false, durationMinutes: 240, questionSourceUrl: DEFAULT_QUESTION_URL, recommendedBookId: 'book-cpc-guide' },
    { id: 'exam-icd-cert', name: 'ICD-10-CM Certification Exam', description: 'Proficiency exam for ICD-10-CM coding.', price: 90, regularPrice: 90, productSku: 'exam-icd-cert', productSlug: 'exam-icd-cert', numberOfQuestions: 100, passScore: 75, certificateTemplateId: 'cert-mco-1', isPractice: false, durationMinutes: 120, questionSourceUrl: DEFAULT_QUESTION_URL, recommendedBookId: 'book-icd10-cm' }
];

const ORGANIZATIONS: Organization[] = [
    {
        id: 'org-mco', name: 'Medical Coding Online', website: 'www.coding-online.net',
        logo: logoBase64,
        exams: ALL_EXAMS,
        examProductCategories: EXAM_PRODUCT_CATEGORIES,
        certificateTemplates: CERTIFICATE_TEMPLATES,
    }
];

// --- DUAL-MODE SERVICE IMPLEMENTATION ---
const getLocalResults = (user: User): { [testId: string]: TestResult } => {
    try {
        const stored = localStorage.getItem(`exam_results_${user.id}`);
        return stored ? JSON.parse(stored) : {};
    } catch (e) { return {}; }
};

const saveLocalResults = (user: User, results: { [testId: string]: TestResult }) => {
    localStorage.setItem(`exam_results_${user.id}`, JSON.stringify(results));
};

const getAppConfig = async (): Promise<Organization[]> => {
    return Promise.resolve(ORGANIZATIONS);
};

const syncResults = async (token: string, user: User) => {
    try {
        const remoteResultsArray: TestResult[] = await apiFetch('/user-results', token);
        const remoteResults = remoteResultsArray.reduce((acc, result) => {
            acc[result.testId] = result;
            return acc;
        }, {} as { [testId: string]: TestResult });
        saveLocalResults(user, remoteResults);
    } catch (error: any) {
        toast.error(error.message || "Could not sync your latest results from the server.");
        console.error("Sync failed:", error);
    }
};

const getQuestions = async (exam: Exam, token: string): Promise<Question[]> => {
    const toastId = toast.loading('Loading questions for exam...');
    try {
        if (exam.questionSourceUrl) {
            try {
                const response = await fetch(`${WP_API_BASE}/questions-from-sheet`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ sheetUrl: exam.questionSourceUrl, count: exam.numberOfQuestions })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || `API Error: Status ${response.status}`);
                }
                const questions = await response.json();
                if (!Array.isArray(questions) || questions.length === 0) {
                    throw new Error("API returned no valid questions.");
                }
                toast.dismiss(toastId);
                return questions;
            } catch (apiError: any) {
                console.error("API question fetch failed, using fallback:", apiError.message);
                toast.error("Primary question source failed. Using backup questions.", { id: toastId, duration: 4000 });
                return [...sampleQuestions].sort(() => 0.5 - Math.random()).slice(0, exam.numberOfQuestions);
            }
        }
        toast.dismiss(toastId);
        return [...sampleQuestions].sort(() => 0.5 - Math.random()).slice(0, exam.numberOfQuestions);
    } catch(e) {
        toast.dismiss(toastId);
        throw e;
    }
};

const getTestResultsForUser = async (user: User): Promise<TestResult[]> => {
    const resultsObj = getLocalResults(user);
    return Object.values(resultsObj).sort((a, b) => b.timestamp - a.timestamp);
};

const getTestResult = async (user: User, testId: string): Promise<TestResult | null> => {
    const results = getLocalResults(user);
    return results[testId] || null;
};

const submitTest = async (user: User, examId: string, answers: UserAnswer[], questions: Question[], token: string): Promise<TestResult> => {
    const correctAnswers = new Map(questions.map(q => [q.id, q.correctAnswer - 1]));
    let correctCount = 0;
    
    const review = questions.map(q => {
        const userAnswer = answers.find(a => a.questionId === q.id)?.answer ?? -1;
        const isCorrect = userAnswer === correctAnswers.get(q.id);
        if (isCorrect) correctCount++;
        return { questionId: q.id, question: q.question, options: q.options, userAnswer, correctAnswer: correctAnswers.get(q.id) as number };
    });

    const score = parseFloat(((correctCount / questions.length) * 100).toFixed(1));
    const result: TestResult = {
        testId: `test_${Date.now()}`, userId: user.id, examId, answers, score, correctCount,
        totalQuestions: questions.length, timestamp: Date.now(), review
    };

    const localResults = getLocalResults(user);
    localResults[result.testId] = result;
    saveLocalResults(user, localResults);

    apiFetch('/submit-result', token, { method: 'POST', body: JSON.stringify(result) })
      .catch(err => toast.error("Result saved locally but failed to sync to server."));

    return result;
};

const getCertificateData = async (token: string, testId: string): Promise<CertificateData> => {
    return apiFetch(`/certificate-data/${testId}`, token);
};

export const googleSheetsService = {
    getAppConfig,
    getQuestions,
    getTestResultsForUser,
    getTestResult,
    submitTest,
    getCertificateData,
    syncResults
};
