
import { GoogleGenAI, Type } from "@google/genai";
import type { Question, TestResult, CertificateData, Organization, UserAnswer, User } from '../types';
import { logoBase64 } from '../assets/logo';
import toast from 'react-hot-toast';

const API_BASE_URL = 'https://www.coding-online.net/wp-json/exam-app/v1';

// Initialize the Google AI client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });


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
    
    getQuestions: async (examId: string, examName: string, numberOfQuestions: number, token: string): Promise<Question[]> => {
        const toastId = toast.loading(`Loading questions for "${examName}"...`);
        const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/10QGeiupsw6KtW9613v1yj03SYtzf3rDCEu-hbgQUwgs/gviz/tq?tqx=out:csv';

        try {
            const response = await fetch(GOOGLE_SHEET_URL);
            if (!response.ok) {
                throw new Error(`Failed to fetch from Google Sheets: ${response.statusText}`);
            }
            const csvText = await response.text();
            const rows = csvText.split('\n').filter(row => row.trim() !== '');
            
            if (rows.length < 2) {
                throw new Error("Google Sheet is empty or in an invalid format.");
            }

            const allQuestions: Question[] = rows.slice(1).map((row, index) => {
                let cleanRow = row.trim();
                if (cleanRow.startsWith('"')) cleanRow = cleanRow.substring(1);
                if (cleanRow.endsWith('"')) cleanRow = cleanRow.slice(0, -1);
                
                const columns = cleanRow.split('","').map(col => col.replace(/""/g, '"'));

                if (columns.length < 3) {
                    console.warn(`Skipping malformed row ${index + 2}:`, row);
                    return null;
                }
                
                const [questionText, optionsStr, correctAnswerText] = columns;

                const options = optionsStr.split('|').map(o => o.trim());
                const correctAnswerIndex = options.findIndex(opt => opt.trim() === correctAnswerText.trim());

                if (correctAnswerIndex === -1) {
                    console.warn(`Could not find correct answer for row ${index + 2}:`, { question: questionText, options, correctAnswer: correctAnswerText });
                    return null;
                }

                return {
                    id: index + 1,
                    question: questionText,
                    options: options,
                    correctAnswer: correctAnswerIndex + 1, // 1-based index
                };
            }).filter((q): q is Question => q !== null);
            
            if (allQuestions.length === 0) {
                throw new Error("No valid questions could be parsed from the Google Sheet.");
            }

            const shuffled = allQuestions.sort(() => 0.5 - Math.random());
            const selectedQuestions = shuffled.slice(0, numberOfQuestions);

            toast.success('Questions loaded!', { id: toastId });
            return selectedQuestions;

        } catch (error: any) {
            console.error("Failed to load or parse questions from Google Sheet:", error);
            toast.error(error.message || "Could not load exam questions.", { id: toastId });
            return [];
        }
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