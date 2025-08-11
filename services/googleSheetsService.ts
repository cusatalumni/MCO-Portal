import type { Question, TestResult, CertificateData, Organization, UserAnswer, User } from '../types';
import { logoBase64 } from '../assets/logo';

const API_BASE_URL = 'https://www.coding-online.net/wp-json/exam-app/v1';

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


export const apiService = {
    getAppConfig: async (): Promise<Organization[]> => {
        const response = await fetch(`${API_BASE_URL}/app-config`);
        if (!response.ok) {
            throw new Error('Failed to fetch app configuration.');
        }
        const data = await response.json();
        // The logo is a local asset, so we inject it here.
        return data.map((org: Organization) => ({ ...org, logo: logoBase64 }));
    },

    getTestResultsForUser: async (token: string): Promise<TestResult[]> => {
        const response = await fetch(`${API_BASE_URL}/user-results`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch user results.');
        return response.json();
    },

    getTestResult: async (token: string, testId: string): Promise<TestResult | undefined> => {
        const response = await fetch(`${API_BASE_URL}/result/${testId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch test result.');
        return response.json();
    },

    getCertificateData: async (token: string, testId: string): Promise<CertificateData | null> => {
         const response = await fetch(`${API_BASE_URL}/certificate-data/${testId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) return null;
        const data = await response.json();
        if (data && data.organization) {
            data.organization.logo = logoBase64;
        }
        return data;
    },
    
    getQuestions: async (numberOfQuestions: number): Promise<Question[]> => {
        if (MOCK_QUESTIONS.length === 0) {
             throw new Error(`No mock questions found.`);
        }
        const shuffled = [...MOCK_QUESTIONS].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, Math.min(numberOfQuestions, shuffled.length));
    },

    submitTest: async (user: User, examId: string, answers: UserAnswer[], questions: Question[], token: string): Promise<TestResult> => {
        const questionPool = questions;
        const answerMap = new Map(answers.map(a => [a.questionId, a.answer]));

        let correctCount = 0;
        const review: TestResult['review'] = [];

        questionPool.forEach(question => {
            const userAnswerIndex = answerMap.get(question.id);
            const isAnswered = userAnswerIndex !== undefined;
            const isCorrect = isAnswered && (userAnswerIndex! + 1) === question.correctAnswer;
            
            if (isCorrect) correctCount++;
            
            review.push({
                questionId: question.id,
                question: question.question,
                options: question.options,
                userAnswer: isAnswered ? userAnswerIndex! : -1,
                correctAnswer: question.correctAnswer - 1,
            });
        });

        const totalQuestions = questionPool.length;
        const score = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;
        
        const newResult: Omit<TestResult, 'userId'> = {
            testId: `test-${Date.now()}`,
            examId,
            answers,
            score: parseFloat(score.toFixed(2)),
            correctCount,
            totalQuestions,
            timestamp: Date.now(),
            review,
        };

        const response = await fetch(`${API_BASE_URL}/submit-result`, {
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
        
        const returnedResult = await response.json();
        console.log('Test result successfully synced to WordPress.');
        return returnedResult as TestResult;
    }
};
