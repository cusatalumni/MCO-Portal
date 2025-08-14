import { GoogleGenAI, Type } from "@google/genai";
import type { Question, TestResult, CertificateData, Organization, UserAnswer, User, Exam, CertificateTemplate, ExamProductCategory } from '@/types';
import { logoBase64 } from '@/assets/logo';
import toast from 'react-hot-toast';
import { sampleQuestions } from '@/assets/questionData';

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


// --- LOCAL DATA STORE ---
// Static configuration is defined here for stability and speed.
const CERTIFICATE_TEMPLATES: CertificateTemplate[] = [
    { id: 'cert-mco-1', title: 'Medical Coding Proficiency', body: 'For successfully demonstrating proficiency in medical coding principles and practices with a final score of <strong>{finalScore}%</strong>. This achievement certifies the holder\'s competence in the standards required for this certification.', signature1Name: 'Dr. Amelia Reed', signature1Title: 'Program Director', signature2Name: 'B. Manoj', signature2Title: 'Chief Instructor' },
    { id: 'cert-mco-2', title: 'Advanced Specialty Coding', body: 'Awarded for exceptional performance and mastery in advanced specialty coding topics, achieving a score of <strong>{finalScore}%</strong>. This signifies a high level of expertise and dedication to the field.', signature1Name: 'Dr. Amelia Reed', signature1Title: 'Program Director', signature2Name: 'B. Manoj', signature2Title: 'Chief Instructor' }
];

const EXAM_PRODUCT_CATEGORIES: ExamProductCategory[] = [
    { id: 'prod-cpc', name: 'CPC', description: 'A test series designed to prepare you for the AAPC CPC (Certified Professional Coder) exam.', practiceExamId: 'exam-cpc-practice', certificationExamId: 'exam-cpc-cert' },
    { id: 'prod-cca', name: 'CCA', description: 'A test series for the AHIMA CCA (Certified Coding Associate) credential.', practiceExamId: 'exam-cca-practice', certificationExamId: 'exam-cca-cert' },
    { id: 'prod-billing', name: 'Medical Billing', description: 'A test series covering the essentials of medical billing and reimbursement.', practiceExamId: 'exam-billing-practice', certificationExamId: 'exam-billing-cert' }
];

const DEFAULT_QUESTION_URL = 'https://docs.google.com/spreadsheets/d/1vQZ7Jz2F_2l8t8_1qA8Pz4N7w_9j_9hL2K5e_8sF9cE/edit?usp=sharing';

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

export const googleSheetsService = {
    // --- CONFIGURATION (STATIC) ---
    getAppConfig: async (): Promise<Organization[]> => {
        return Promise.resolve(ORGANIZATIONS);
    },

    // --- DATA SYNC & LOCAL STORAGE ---
    syncResults: async (token: string, user: User): Promise<void> => {
        try {
            const remoteResults: TestResult[] = await apiFetch('/user-results', token);
            const resultsMap = remoteResults.reduce((acc, result) => {
                acc[result.testId] = result;
                return acc;
            }, {} as { [key: string]: TestResult });

            localStorage.setItem(`exam_results_${user.id}`, JSON.stringify(resultsMap));
        } catch (error: any) {
            console.error("Failed to sync remote results:", error);
            const errorMessage = error.message || "Could not connect to the server. Please check your network connection.";
            toast.error(errorMessage);
        }
    },

    getTestResultsForUser: async (user: User): Promise<TestResult[]> => {
        try {
            const storedResults = localStorage.getItem(`exam_results_${user.id}`);
            const results = storedResults ? JSON.parse(storedResults) : {};
            return Promise.resolve(Object.values(results));
        } catch (error) {
            console.error("Failed to parse results from localStorage", error);
            return Promise.resolve([]);
        }
    },

    getTestResult: async (user: User, testId: string): Promise<TestResult | undefined> => {
        const results = await googleSheetsService.getTestResultsForUser(user);
        return results.find(r => r.testId === testId);
    },

    // --- DIRECT API CALLS (NOT CACHED LOCALLY) ---
    getCertificateData: async (token: string, testId: string): Promise<CertificateData | null> => {
        return apiFetch(`/certificate-data/${testId}`, token);
    },
    
    // --- QUESTION LOADING (API OR LOCAL) ---
    getQuestions: async (exam: Exam): Promise<Question[]> => {
        // Fallback to local sample questions
        const shuffled = [...sampleQuestions].sort(() => 0.5 - Math.random());
        const selectedQuestions = shuffled.slice(0, exam.numberOfQuestions);
        const fetchedQuestions = selectedQuestions.map((q, index) => ({
            ...q,
            id: index + 1,
        }));

        if (!fetchedQuestions || fetchedQuestions.length === 0) {
            throw new Error(`No questions were loaded for this exam.`);
        }

        if (fetchedQuestions.length < exam.numberOfQuestions) {
             console.warn(`Warning: Not enough unique questions available for ${exam.name}. Requested ${exam.numberOfQuestions}, but only found ${fetchedQuestions.length}.`);
        }

        return Promise.resolve(fetchedQuestions);
    },
    
    // --- DUAL-MODE SUBMISSION ---
    submitTest: async (user: User, examId: string, answers: UserAnswer[], questions: Question[], token: string): Promise<TestResult> => {
        const questionPool = questions;
        const answerMap = new Map(answers.map(a => [a.questionId, a.answer]));
        let correctCount = 0;
        const review: TestResult['review'] = [];

        questionPool.forEach(question => {
            const userAnswerIndex = answerMap.get(question.id);
            const isAnswered = userAnswerIndex !== undefined;
            const isCorrect = isAnswered && (userAnswerIndex === question.correctAnswer -1);
            if (isCorrect) correctCount++;
            review.push({
                questionId: question.id,
                question: question.question,
                options: question.options,
                userAnswer: isAnswered ? userAnswerIndex : -1,
                correctAnswer: question.correctAnswer - 1,
            });
        });

        const totalQuestions = questionPool.length;
        const score = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;
        
        const newResult: TestResult = {
            testId: `test-${Date.now()}`,
            userId: user.id,
            examId,
            answers,
            score: parseFloat(score.toFixed(2)),
            correctCount,
            totalQuestions,
            timestamp: Date.now(),
            review,
        };

        // Step 1: Save locally immediately for a fast UI response.
        try {
            const key = `exam_results_${user.id}`;
            const storedResults = localStorage.getItem(key);
            const results = storedResults ? JSON.parse(storedResults) : {};
            results[newResult.testId] = newResult;
            localStorage.setItem(key, JSON.stringify(results));
        } catch (error) {
            console.error("Failed to save result to localStorage", error);
            toast.error("Could not save your test result locally.");
        }
        
        // Step 2: Asynchronously send the result to the WordPress backend.
        (async () => {
            try {
                await apiFetch('/submit-result', token, {
                    method: 'POST',
                    body: JSON.stringify(newResult)
                });
                console.log('Result successfully synced with the server.');
            } catch (error) {
                console.error("Failed to sync result with server:", error);
                toast.error("Syncing result with the server failed. It's saved locally.");
            }
        })();

        // Return the result immediately.
        return Promise.resolve(newResult);
    }
};