

import { GoogleGenAI, Type } from "@google/genai";
import type { Question, TestResult, CertificateData, Organization, UserAnswer, User } from '../types';
import { logoBase64 } from '../assets/logo';
import toast from 'react-hot-toast';

const API_BASE_URL = 'https://www.coding-online.net/wp-json/exam-app/v1';

// Initialize the Google AI client lazily to prevent app crash on load
let ai: GoogleGenAI | null = null;
const getAiClient = (): GoogleGenAI => {
    if (!ai) {
        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            console.error("Gemini API key is not configured.");
            // This error will be caught by the calling function's try/catch block
            throw new Error("API key for AI question generation is missing.");
        }
        ai = new GoogleGenAI({ apiKey });
    }
    return ai;
};


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
        // 1. Try fetching from the question bank first
        try {
            const response = await fetch(`${API_BASE_URL}/questions/${examId}`);
            if (response.ok) {
                const bankQuestions = await response.json();
                if (Array.isArray(bankQuestions) && bankQuestions.length > 0) {
                    toast.success('Loaded questions from our data bank!');
                    return bankQuestions.slice(0, numberOfQuestions);
                }
            }
        } catch (error) {
            console.warn("Could not fetch from question bank, falling back to AI.", error);
        }
        
        // 2. Fallback to Gemini API if bank is empty or fails
        const toastId = toast.loading(`Generating ${numberOfQuestions} unique questions for your exam...`);
        try {
            const client = getAiClient();
            const prompt = `Generate ${numberOfQuestions} multiple-choice questions for a "${examName}". Each question should have 4 options. Return the data as a JSON array where each object has "id" (a unique number for this set of questions starting from 1), "question" (string), "options" (array of 4 strings), and "correctAnswer" (number, the 1-based index of the correct option).`;

            const responseSchema = {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.NUMBER },
                  question: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  correctAnswer: { type: Type.NUMBER }
                },
                required: ["id", "question", "options", "correctAnswer"]
              }
            };

            const response = await client.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: prompt,
              config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
              },
            });

            const questionsJson = response.text.trim();
            const questions = JSON.parse(questionsJson) as Question[];
            
            if (!Array.isArray(questions) || questions.length === 0) {
                 throw new Error("AI failed to generate questions in the expected format.");
            }
            
            // Fire-and-forget call to save the questions back to the data bank.
            apiService.saveAiQuestions(examId, questions, token).catch(err => {
                console.error("Could not update data bank with AI questions:", err);
                // We don't toast this error as it's a background task.
            });
            
            toast.success('Questions generated!', { id: toastId });
            return questions;

        } catch (error) {
            console.error("Failed to generate questions with Gemini API:", error);
            toast.error("Could not generate AI questions. Please try again later.", { id: toastId });
            return []; // Return empty array on failure
        }
    },

    saveAiQuestions: async (examId: string, questions: Question[], token: string): Promise<void> => {
        // New function to post questions to the backend.
        const response = await fetch(`${API_BASE_URL}/save-questions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ examId, questions })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to save AI questions to the data bank.');
        }
        console.log('AI questions sent to the data bank for storage.');
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