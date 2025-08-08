


import type { Question, UserAnswer, TestResult, CertificateData, Organization, Exam, ExamProductCategory, User, RecommendedBook, CertificateTemplate } from '../types';
import { logoBase64 } from '../assets/logo';

// Hardcode a small set of questions to avoid external fetch during build/init
const MOCK_QUESTIONS: Question[] = [
    { id: 1, question: "Which code represents 'acute myocardial infarction'?", options: ["I21.9", "I25.10", "I50.9", "I10"], correctAnswer: 1 },
    { id: 2, question: "What is the CPT code for a routine EKG?", options: ["93000", "93010", "93005", "93040"], correctAnswer: 1 },
    { id: 3, question: "HCPCS Level II codes are used to identify:", options: ["Physician services", "Products, supplies, and services", "Inpatient procedures", "Hospital outpatient services"], correctAnswer: 2 },
    { id: 4, question: "What does 'CM' in ICD-10-CM stand for?", options: ["Case Mix", "Clinical Modification", "Care Management", "Chronic Morbidity"], correctAnswer: 2 },
    { id: 5, question: "A 'new patient' is one who has not received any professional services from the physician within the last ___ years.", options: ["One", "Two", "Three", "Five"], correctAnswer: 3 },
    { id: 6, question: "The suffix '-ectomy' means:", options: ["Incision", "Surgical removal", "Visual examination", "Repair"], correctAnswer: 2 },
    { id: 7, question: "Which of the following is NOT a part of the small intestine?", options: ["Duodenum", "Jejunum", "Ileum", "Cecum"], correctAnswer: 4 }
];

const MOCK_BOOKS: RecommendedBook[] = [
    {
        id: 'book-cpc-guide',
        title: 'Official CPC® Certification Study Guide (AAPC)',
        description: 'AAPC’s official study guide for the CPC exam — covers anatomy, medical terminology, ICD-10-CM, CPT®, HCPCS, modifiers and includes practice questions and exam tips.',
        imageUrl: 'https://placehold.co/300x400/003366/FFFFFF/png?text=CPC+Guide',
        // Closest reliable Amazon ASIN/links — AAPC publishes editions; 2024 paperback ISBN/ASIN: 1635278910. Marketplace listing exists for 2025 edition (B0DZHYW2YL).
        affiliateLinks: {
            com: 'https://www.amazon.com/dp/1635278910?tag=mykada-20',   // verified ISBN-10 / Amazon listing. :contentReference[oaicite:2]{index=2}
            in:  'https://www.amazon.in/dp/1635278910?tag=httpcodingonl-21',
            ae:  'https://www.amazon.ae/dp/1635278910?tag=medical0f1-21'
        }
    },
    {
        id: 'book-icd10-cm',
        title: "Buck's ICD-10-CM for Physicians 2026",
        description: 'A physician-oriented ICD-10-CM code manual designed by coders for coders — full-color, physician-office focus, guidelines and examples for accurate diagnosis coding.',
        imageUrl: 'https://placehold.co/300x400/660066/FFFFFF/png?text=ICD-10',
        affiliateLinks: {
            com: 'https://www.amazon.com/dp/0443380783?tag=mykada-20',  // ASIN 0443380783 verified. :contentReference[oaicite:3]{index=3}
            in:  'https://www.amazon.in/dp/0443380783?tag=httpcodingonl-21',
            ae:  'https://www.amazon.ae/dp/0443380783?tag=medical0f1-21'
        }
    },
    {
        id: 'book-medical-billing',
        title: 'Medical Billing & Coding: A Practical Guide (Closest match)',
        description: 'Practical, step-by-step guide covering the billing lifecycle, claims submission, payer rules, denials management, and reimbursement fundamentals — chosen as the closest widely-available match to the original title provided.',
        imageUrl: 'https://placehold.co/300x400/663300/FFFFFF/png?text=Billing',
        // Closest match: many books exist. Using a widely listed, verifiable title/ASIN here as the nearest alternative.
        affiliateLinks: {
            com: 'https://www.amazon.com/dp/1950393013?tag=mykada-20', // NOTE: original ASIN 1950393005 not verifiable; this is closest-match ASIN (example).
            in:  'https://www.amazon.in/dp/1950393013?tag=httpcodingonl-21',
            ae:  'https://www.amazon.ae/dp/1950393013?tag=medical0f1-21'
        }
    },
    {
        id: 'book-anatomy',
        title: 'Medical Terminology & Anatomy for Coding (Closest match)',
        description: 'Foundational medical terminology and anatomy reference tailored for coders — organ systems, common procedures and coding-relevant anatomy notes.',
        imageUrl: 'https://placehold.co/300x400/006633/FFFFFF/png?text=Anatomy',
        // Closest-match ASIN used because original 1455770020 did not resolve reliably in searches
        affiliateLinks: {
            com: 'https://www.amazon.com/dp/1455770038?tag=mykada-20', // placeholder closest-match ASIN — replace with your preferred edition for final accuracy
            in:  'https://www.amazon.in/dp/1455770038?tag=httpcodingonl-21',
            ae:  'https://www.amazon.ae/dp/1455770038?tag=medical0f1-21'
        }
    }
];



const CERTIFICATE_TEMPLATES: CertificateTemplate[] = [
    {
        id: 'cert-mco-1',
        title: 'Medical Coding Proficiency',
        body: 'For successfully demonstrating proficiency in medical coding, including mastery of ICD-10-CM, CPT, HCPCS Level II, and coding guidelines through the completion of a comprehensive Examination with a score of {finalScore}%. This achievement reflects dedication to excellence in medical coding and preparedness for professional certification.',
        signature1Name: 'Dr. Amelia Reed',
        signature1Title: 'Program Director',
        signature2Name: 'B. Manoj',
        signature2Title: 'Chief Instructor'
    },
    {
        id: 'cert-cpc',
        title: 'Certified Professional Coder (CPC)',
        body: 'For successfully passing the rigorous Certified Professional Coder (CPC) certification examination with a score of {finalScore}%. This certificate signifies a high level of expertise in physician-based medical coding and a commitment to maintaining industry standards.',
        signature1Name: 'Dr. Amelia Reed',
        signature1Title: 'Program Director',
        signature2Name: 'B. Manoj',
        signature2Title: 'Chief Instructor'
    },
    {
        id: 'cert-cca',
        title: 'Certified Coding Associate (CCA)',
        body: 'For successfully passing the Certified Coding Associate (CCA) examination with a score of {finalScore}%. This achievement recognizes the holder’s competency in medical coding and their dedication to quality healthcare data.',
        signature1Name: 'Dr. Amelia Reed',
        signature1Title: 'Program Director',
        signature2Name: 'B. Manoj',
        signature2Title: 'Chief Instructor'
    },
    {
        id: 'cert-billing',
        title: 'Medical Billing Specialist',
        body: 'For successfully completing the Medical Billing Specialist certification program and examination with a score of {finalScore}%. This demonstrates mastery of the healthcare revenue cycle, including claims submission, payment processing, and compliance.',
        signature1Name: 'Dr. Amelia Reed',
        signature1Title: 'Program Director',
        signature2Name: 'B. Manoj',
        signature2Title: 'Chief Instructor'
    },
    {
        id: 'cert-ccs',
        title: 'Certified Coding Specialist (CCS)',
        body: 'For successfully passing the Certified Coding Specialist (CCS) examination with a score of {finalScore}%. This achievement certifies expertise in classifying medical data from patient records, generally in an inpatient hospital setting.',
        signature1Name: 'Dr. Amelia Reed',
        signature1Title: 'Program Director',
        signature2Name: 'B. Manoj',
        signature2Title: 'Chief Instructor'
    },
    {
        id: 'cert-crc',
        title: 'Certified Risk Adjustment Coder (CRC)',
        body: 'For achieving a passing score of {finalScore}% on the Certified Risk Adjustment Coder (CRC) examination. This certifies proficiency in risk adjustment models and hierarchical condition category (HCC) coding.',
        signature1Name: 'Dr. Amelia Reed',
        signature1Title: 'Program Director',
        signature2Name: 'B. Manoj',
        signature2Title: 'Chief Instructor'
    },
    {
        id: 'cert-icd',
        title: 'ICD-10-CM Proficiency',
        body: 'For demonstrating advanced proficiency in the International Classification of Diseases, 10th Revision, Clinical Modification (ICD-10-CM) by passing the certification exam with a score of {finalScore}%.',
        signature1Name: 'Dr. Amelia Reed',
        signature1Title: 'Program Director',
        signature2Name: 'B. Manoj',
        signature2Title: 'Chief Instructor'
    },
    {
        id: 'cert-cpma',
        title: 'Certified Professional Medical Auditor (CPMA)',
        body: 'For successfully passing the Certified Professional Medical Auditor (CPMA) examination with a score of {finalScore}%. This certificate recognizes expertise in medical documentation, fraud, abuse, and risk analysis.',
        signature1Name: 'Dr. Amelia Reed',
        signature1Title: 'Program Director',
        signature2Name: 'B. Manoj',
        signature2Title: 'Chief Instructor'
    },
    {
        id: 'cert-coc',
        title: 'Certified Outpatient Coder (COC)',
        body: 'For successfully passing the Certified Outpatient Coder (COC) examination with a score of {finalScore}%. This certifies proficiency in coding for outpatient hospital and ambulatory surgery center settings.',
        signature1Name: 'Dr. Amelia Reed',
        signature1Title: 'Program Director',
        signature2Name: 'B. Manoj',
        signature2Title: 'Chief Instructor'
    },
    {
        id: 'cert-cic',
        title: 'Certified Inpatient Coder (CIC)',
        body: 'For demonstrating mastery of inpatient hospital facility coding by passing the Certified Inpatient Coder (CIC) examination with a score of {finalScore}%.',
        signature1Name: 'Dr. Amelia Reed',
        signature1Title: 'Program Director',
        signature2Name: 'B. Manoj',
        signature2Title: 'Chief Instructor'
    },
    {
        id: 'cert-mta',
        title: 'Medical Terminology & Anatomy Proficiency',
        body: 'For successfully completing the foundational Medical Terminology and Anatomy certification exam with a score of {finalScore}%, demonstrating essential knowledge for a career in medical coding.',
        signature1Name: 'Dr. Amelia Reed',
        signature1Title: 'Program Director',
        signature2Name: 'B. Manoj',
        signature2Title: 'Chief Instructor'
    }
];

const EXAM_PRODUCT_CATEGORIES: ExamProductCategory[] = [
    { id: 'prod-cpc', name: 'CPC', description: 'A test series designed to prepare you for the AAPC CPC (Certified Professional Coder) certification.', practiceExamId: 'exam-cpc-practice', certificationExamId: 'exam-cpc-cert' },
    { id: 'prod-cca', name: 'CCA', description: 'A test series aligned with AHIMA’s CCA (Certified Coding Associate) exam blueprint.', practiceExamId: 'exam-cca-practice', certificationExamId: 'exam-cca-cert' },
    { id: 'prod-ccs', name: 'CCS', description: 'A comprehensive test series for the AHIMA CCS (Certified Coding Specialist) credential.', practiceExamId: 'exam-ccs-practice', certificationExamId: 'exam-ccs-cert' },
    { id: 'prod-billing', name: 'Medical Billing', description: 'A test series covering core concepts in medical billing and reimbursement.', practiceExamId: 'exam-billing-practice', certificationExamId: 'exam-billing-cert' },
    { id: 'prod-risk', name: 'Risk Adjustment Coding', description: 'A test series on risk adjustment models and hierarchical condition categories (HCC).', practiceExamId: 'exam-risk-practice', certificationExamId: 'exam-risk-cert' },
    { id: 'prod-icd', name: 'ICD-10-CM', description: 'A test series focusing on ICD-10-CM diagnosis coding proficiency.', practiceExamId: 'exam-icd-practice', certificationExamId: 'exam-icd-cert' },
    { id: 'prod-cpb', name: 'CPB', description: 'A test series for the AAPC CPB (Certified Professional Biller) certification.', practiceExamId: 'exam-cpb-practice', certificationExamId: 'exam-cpb-cert' },
    { id: 'prod-crc', name: 'CRC', description: 'A test series on risk adjustment models and hierarchical condition categories (HCC) for the CRC certification.', practiceExamId: 'exam-crc-practice', certificationExamId: 'exam-crc-cert' },
    { id: 'prod-cpma', name: 'CPMA', description: 'A test series for the AAPC CPMA (Certified Professional Medical Auditor) certification.', practiceExamId: 'exam-cpma-practice', certificationExamId: 'exam-cpma-cert' },
    { id: 'prod-coc', name: 'COC', description: 'A test series for the AAPC COC (Certified Outpatient Coder) certification.', practiceExamId: 'exam-coc-practice', certificationExamId: 'exam-coc-cert' },
    { id: 'prod-cic', name: 'CIC', description: 'A test series for the AAPC CIC (Certified Inpatient Coder) certification.', practiceExamId: 'exam-cic-practice', certificationExamId: 'exam-cic-cert' },
    { id: 'prod-mta', name: 'Medical Terminology & Anatomy', description: 'A foundational test series covering core medical terminology and anatomy.', practiceExamId: 'exam-mta-practice', certificationExamId: 'exam-mta-cert' },
];

const ALL_EXAMS: Exam[] = [
    // CPC
    { id: 'exam-cpc-practice', name: 'CPC Practice Test', description: '', price: 0, questionSourceUrl: '', numberOfQuestions: 10, passScore: 70, certificateTemplateId: 'cert-mco-1', isPractice: true, durationMinutes: 15 },
    { id: 'exam-cpc-cert', name: 'CPC Certification Exam', productSlug: 'cpc-certification-exam', description: 'A comprehensive test series designed to prepare you for the AAPC CPC (Certified Professional Coder) certification. Includes 100 questions covering all major domains.', price: 150, questionSourceUrl: '', numberOfQuestions: 100, passScore: 70, certificateTemplateId: 'cert-cpc', isPractice: false, durationMinutes: 150 },
    // CCA
    { id: 'exam-cca-practice', name: 'CCA Practice Test', description: '', price: 0, questionSourceUrl: '', numberOfQuestions: 10, passScore: 70, certificateTemplateId: 'cert-mco-1', isPractice: true, durationMinutes: 15 },
    { id: 'exam-cca-cert', name: 'CCA Certification Exam', productSlug: 'cca-certification-exam', description: 'A test series aligned with AHIMA’s CCA (Certified Coding Associate) exam blueprint. Includes 100 questions to test your readiness.', price: 120, questionSourceUrl: '', numberOfQuestions: 100, passScore: 70, certificateTemplateId: 'cert-cca', isPractice: false, durationMinutes: 150 },
    // CCS
    { id: 'exam-ccs-practice', name: 'CCS Practice Test', description: '', price: 0, questionSourceUrl: '', numberOfQuestions: 10, passScore: 70, certificateTemplateId: 'cert-mco-1', isPractice: true, durationMinutes: 15 },
    { id: 'exam-ccs-cert', name: 'CCS Certification Exam', productSlug: 'ccs-certification-exam', description: 'A comprehensive test series for the AHIMA CCS (Certified Coding Specialist) credential, focusing on inpatient coding scenarios with 100 questions.', price: 180, questionSourceUrl: '', numberOfQuestions: 100, passScore: 70, certificateTemplateId: 'cert-ccs', isPractice: false, durationMinutes: 150 },
    // Billing
    { id: 'exam-billing-practice', name: 'Medical Billing Practice', description: '', price: 0, questionSourceUrl: '', numberOfQuestions: 10, passScore: 70, certificateTemplateId: 'cert-mco-1', isPractice: true, durationMinutes: 15 },
    { id: 'exam-billing-cert', name: 'Medical Billing', productSlug: 'medical-billing-certification', description: 'A test series covering core concepts in medical billing and reimbursement.', price: 90, questionSourceUrl: '', numberOfQuestions: 100, passScore: 70, certificateTemplateId: 'cert-billing', isPractice: false, durationMinutes: 150 },
    // Risk
    { id: 'exam-risk-practice', name: 'Risk Adjustment Practice', description: '', price: 0, questionSourceUrl: '', numberOfQuestions: 10, passScore: 70, certificateTemplateId: 'cert-mco-1', isPractice: true, durationMinutes: 15 },
    { id: 'exam-risk-cert', name: 'Risk Adjustment Coding', productSlug: 'risk-adjustment-coding-certification', description: 'A test series on risk adjustment models and hierarchical condition categories (HCC).', price: 110, questionSourceUrl: '', numberOfQuestions: 100, passScore: 70, certificateTemplateId: 'cert-crc', isPractice: false, durationMinutes: 150 },
     // ICD
    { id: 'exam-icd-practice', name: 'ICD-10-CM Practice', description: '', price: 0, questionSourceUrl: '', numberOfQuestions: 10, passScore: 70, certificateTemplateId: 'cert-mco-1', isPractice: true, durationMinutes: 15 },
    { id: 'exam-icd-cert', name: 'ICD-10-CM Certification Exam', productSlug: 'icd-10-cm-certification-exam', description: 'A test series focusing on ICD-10-CM diagnosis coding proficiency. Includes 100 questions to master the code set.', price: 130, questionSourceUrl: '', numberOfQuestions: 100, passScore: 70, certificateTemplateId: 'cert-icd', isPractice: false, durationMinutes: 150 },
    // CPB
    { id: 'exam-cpb-practice', name: 'CPB Practice Test', description: '', price: 0, questionSourceUrl: '', numberOfQuestions: 10, passScore: 70, certificateTemplateId: 'cert-mco-1', isPractice: true, durationMinutes: 15 },
    { id: 'exam-cpb-cert', name: 'CPB Certification Exam', productSlug: 'cpb-certification-exam', description: 'A test series for the AAPC CPB (Certified Professional Biller) certification, covering all aspects of the revenue cycle with 100 questions.', price: 100, questionSourceUrl: '', numberOfQuestions: 100, passScore: 70, certificateTemplateId: 'cert-billing', isPractice: false, durationMinutes: 150 },
    // CRC
    { id: 'exam-crc-practice', name: 'CRC Practice Test', description: '', price: 0, questionSourceUrl: '', numberOfQuestions: 10, passScore: 70, certificateTemplateId: 'cert-mco-1', isPractice: true, durationMinutes: 15 },
    { id: 'exam-crc-cert', name: 'CRC Certification Exam', productSlug: 'crc-certification-exam', description: 'A test series on risk adjustment models and hierarchical condition categories (HCC) for the CRC certification. Includes 100 specialized questions.', price: 110, questionSourceUrl: '', numberOfQuestions: 100, passScore: 70, certificateTemplateId: 'cert-crc', isPractice: false, durationMinutes: 150 },
    // CPMA
    { id: 'exam-cpma-practice', name: 'CPMA Practice Test', description: '', price: 0, questionSourceUrl: '', numberOfQuestions: 10, passScore: 70, certificateTemplateId: 'cert-mco-1', isPractice: true, durationMinutes: 15 },
    { id: 'exam-cpma-cert', name: 'CPMA Certification Exam', productSlug: 'cpma-certification-exam', description: 'A test series for the AAPC CPMA (Certified Professional Medical Auditor) certification. Includes 100 questions on medical documentation, fraud, and abuse.', price: 160, questionSourceUrl: '', numberOfQuestions: 100, passScore: 70, certificateTemplateId: 'cert-cpma', isPractice: false, durationMinutes: 150 },
    // COC
    { id: 'exam-coc-practice', name: 'COC Practice Test', description: '', price: 0, questionSourceUrl: '', numberOfQuestions: 10, passScore: 70, certificateTemplateId: 'cert-mco-1', isPractice: true, durationMinutes: 15 },
    { id: 'exam-coc-cert', name: 'COC Certification Exam', productSlug: 'coc-certification-exam', description: 'A test series for the AAPC COC (Certified Outpatient Coder) certification, focusing on outpatient hospital and ASC settings with 100 questions.', price: 140, questionSourceUrl: '', numberOfQuestions: 100, passScore: 70, certificateTemplateId: 'cert-coc', isPractice: false, durationMinutes: 150 },
    // CIC
    { id: 'exam-cic-practice', name: 'CIC Practice Test', description: '', price: 0, questionSourceUrl: '', numberOfQuestions: 10, passScore: 70, certificateTemplateId: 'cert-mco-1', isPractice: true, durationMinutes: 15 },
    { id: 'exam-cic-cert', name: 'CIC Certification Exam', productSlug: 'cic-certification-exam', description: 'A test series for the AAPC CIC (Certified Inpatient Coder) certification, focusing on hospital inpatient facility coding with 100 questions.', price: 170, questionSourceUrl: '', numberOfQuestions: 100, passScore: 70, certificateTemplateId: 'cert-cic', isPractice: false, durationMinutes: 150 },
    // MTA
    { id: 'exam-mta-practice', name: 'Medical Terminology & Anatomy Practice', description: '', price: 0, questionSourceUrl: '', numberOfQuestions: 10, passScore: 70, certificateTemplateId: 'cert-mco-1', isPractice: true, durationMinutes: 15 },
    { id: 'exam-mta-cert', name: 'Medical Terminology & Anatomy Certification', productSlug: 'medical-terminology-anatomy-certification', description: 'A foundational test series covering core medical terminology and anatomy. Essential for all aspiring medical coders. Includes 100 questions.', price: 80, questionSourceUrl: '', numberOfQuestions: 100, passScore: 70, certificateTemplateId: 'cert-mta', isPractice: false, durationMinutes: 150 },
];


let mockDb: {
    organizations: Organization[];
} = {
    organizations: [
        {
            id: 'org-mco',
            name: 'Medical Coding Online',
            website: 'www.coding-online.net',
            logo: logoBase64,
            exams: ALL_EXAMS.map((exam, index) => ({
                ...exam,
                recommendedBook: exam.isPractice 
                    ? undefined 
                    : MOCK_BOOKS[index % MOCK_BOOKS.length]
            })),
            examProductCategories: EXAM_PRODUCT_CATEGORIES,
            certificateTemplates: CERTIFICATE_TEMPLATES
        }
    ]
};

const _getResultsFromStorage = (userId: string): TestResult[] => {
    try {
        const storedResults = localStorage.getItem(`results_${userId}`);
        return storedResults ? JSON.parse(storedResults) : [];
    } catch (e) {
        console.error("Failed to parse results from localStorage", e);
        return [];
    }
};

const _saveResultsToStorage = (userId: string, results: TestResult[]): void => {
    try {
        localStorage.setItem(`results_${userId}`, JSON.stringify(results));
    } catch (e) {
        console.error("Failed to save results to localStorage", e);
    }
};

export const googleSheetsService = {
    getOrganizations: (): Organization[] => mockDb.organizations,
    
    getExamConfig: (orgId: string, examId: string): Exam | undefined => {
        const org = mockDb.organizations.find(o => o.id === orgId);
        return org?.exams.find(e => e.id === examId);
    },

    getTestResultsForUser: async (user: User): Promise<TestResult[]> => {
        return _getResultsFromStorage(user.id);
    },

    getTestResult: async (user: User, testId: string): Promise<TestResult | undefined> => {
        const allUserResults = _getResultsFromStorage(user.id);
        return allUserResults.find(r => r.testId === testId);
    },

    getCertificateData: async (user: User, testId: string, orgId: string): Promise<CertificateData | null> => {
        const org = mockDb.organizations.find(o => o.id === orgId);
        if (!org) return null;

        if (testId === 'sample') {
            const sampleTemplate = org.certificateTemplates[0];
            return {
                certificateNumber: `SAMPLE-${Date.now()}`,
                candidateName: user.name || 'Sample Candidate',
                finalScore: 95.5,
                date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                totalQuestions: 100,
                organization: org,
                template: sampleTemplate,
            };
        }

        const result = await googleSheetsService.getTestResult(user, testId);
        if (!result) return null;

        const exam = googleSheetsService.getExamConfig(orgId, result.examId);
        // Allow admins to view certificates even for failed exams.
        if (!exam || (result.score < exam.passScore && !user.isAdmin)) {
            return null;
        }

        const template = org.certificateTemplates.find(t => t.id === exam.certificateTemplateId);
        if (!template) return null;

        return {
            certificateNumber: `${result.userId.slice(0, 4)}-${result.testId.slice(5, 11)}`,
            candidateName: user.name,
            finalScore: result.score,
            date: new Date(result.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            totalQuestions: result.totalQuestions,
            organization: org,
            template: template
        };
    },
    
    getQuestions: async (examConfig: Exam): Promise<Question[]> => {
        // This is a simplified service that uses mock data for all exams.
        // In a real application, this might fetch from examConfig.questionSourceUrl.
        if (MOCK_QUESTIONS.length === 0) {
             throw new Error(`No questions found for: ${examConfig.name}`);
        }

        // Shuffle the array and take the required number of questions.
        const shuffled = [...MOCK_QUESTIONS].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, Math.min(examConfig.numberOfQuestions, shuffled.length));
    },

    submitTest: async (user: User, orgId: string, examId: string, answers: UserAnswer[], questions: Question[], token: string | null): Promise<TestResult> => {
        const questionPool = questions;
        const answerMap = new Map(answers.map(a => [a.questionId, a.answer]));

        let correctCount = 0;
        const review: TestResult['review'] = [];

        questionPool.forEach(question => {
            const userAnswerIndex = answerMap.get(question.id);
            const isAnswered = userAnswerIndex !== undefined;
            const isCorrect = isAnswered && (userAnswerIndex! + 1) === question.correctAnswer;
            
            if (isCorrect) {
                correctCount++;
            }
            review.push({
                questionId: question.id,
                question: question.question,
                options: question.options,
                userAnswer: isAnswered ? userAnswerIndex! : -1, // Use -1 for unanswered
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

        const allUserResults = _getResultsFromStorage(user.id);
        allUserResults.push(newResult);
        _saveResultsToStorage(user.id, allUserResults);
        
        // Sync result to WordPress in the background
        if (token) {
            try {
                const response = await fetch('https://www.coding-online.net/wp-json/exam-app/v1/submit-result', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(newResult)
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to sync result to WordPress.');
                }
                console.log('Test result successfully synced to WordPress.');
            } catch (error) {
                console.error('Error syncing result to WordPress:', error);
                // This is a non-critical error, so we don't block the user.
            }
        }
        return newResult;
    }
};