
import { GoogleGenAI, Type } from "@google/genai";
import type { Question, TestResult, CertificateData, Organization, UserAnswer, User, Exam } from '../types';
import { logoBase64 } from '../assets/logo';
import toast from 'react-hot-toast';

const API_BASE_URL = 'https://www.coding-online.net/wp-json/exam-app/v1';

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
        if (!response.ok) {
            let errorMsg = 'Could not load your exam history.';
            if (response.status === 403) {
                errorMsg = 'Your session may have expired. Please use the "Sync My Exams" button.';
            } else if (response.status >= 500) {
                errorMsg = 'A server error occurred while fetching your history. Please try again later.';
            }
            throw new Error(errorMsg);
        }
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
    
    getQuestions: async (exam: Exam, token: string): Promise<Question[]> => {
        // If a sheet URL is provided, fetch from the WordPress proxy
        if (exam.questionSourceUrl) {
            const toastId = toast.loading(`Loading questions for "${exam.name}"...`);
            try {
                const response = await fetch(`${API_BASE_URL}/questions-from-sheet`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ 
                        sheetUrl: exam.questionSourceUrl, 
                        count: exam.numberOfQuestions 
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to fetch questions from source.');
                }
                
                const questions: Question[] = await response.json();
                if (questions.length === 0) {
                     throw new Error('Source file contains no valid questions.');
                }
                toast.success('Questions loaded!', { id: toastId });
                return questions;

            } catch (error: any) {
                console.error("Failed to get questions from sheet URL:", error);
                const errorMessage = error.message || "Could not load exam questions.";
                toast.error(errorMessage, { id: toastId });
                throw error;
            }
        } 
        // Otherwise, generate questions using the Gemini API
        else {
            const toastId = toast.loading(`Generating questions for "${exam.name}"...`);
            try {
                if (!process.env.API_KEY) {
                    throw new Error("Configuration Error: GEMINI_API_KEY not found. Please set it in your .env file.");
                }
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

                const schema = {
                    type: Type.OBJECT,
                    properties: {
                        questions: {
                            type: Type.ARRAY,
                            description: `A list of ${exam.numberOfQuestions} questions.`,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    question: {
                                        type: Type.STRING,
                                        description: "The text of the question."
                                    },
                                    options: {
                                        type: Type.ARRAY,
                                        description: "An array of 4 possible answer strings.",
                                        items: { type: Type.STRING }
                                    },
                                    correctAnswer: {
                                        type: Type.STRING,
                                        description: "The exact string of the correct answer from the 'options' array."
                                    }
                                },
                                required: ["question", "options", "correctAnswer"]
                            }
                        }
                    },
                    required: ["questions"]
                };

                const prompt = `Generate ${exam.numberOfQuestions} multiple-choice questions for a "${exam.name}" exam.
                This exam is described as: "${exam.description}".
                For each question, provide exactly 4 unique answer options and specify which one is correct.
                The topic is medical coding and billing. The questions should be suitable for a certification exam.
                Format the output as JSON that adheres to the provided schema.`;

                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: schema,
                        temperature: 0.7
                    },
                });

                let jsonText = response.text.trim();
                if (jsonText.startsWith('```json')) {
                    jsonText = jsonText.substring(7);
                }
                if (jsonText.endsWith('```')) {
                    jsonText = jsonText.substring(0, jsonText.length - 3);
                }
                
                const jsonResponse = JSON.parse(jsonText);

                if (!jsonResponse.questions || jsonResponse.questions.length === 0) {
                    throw new Error("AI failed to generate valid questions.");
                }

                const generatedQuestions: { question: string; options: string[]; correctAnswer: string }[] = jsonResponse.questions;

                const allQuestions: Question[] = generatedQuestions.map((q, index) => {
                    const safeOptions = Array.isArray(q.options) ? q.options : [];
                    while (safeOptions.length < 4) safeOptions.push("N/A");

                    let correctAnswerIndex = safeOptions.findIndex(opt => opt === q.correctAnswer);
                    
                    if (correctAnswerIndex === -1) {
                        console.warn('Could not find correct answer in options for generated question. Defaulting to first option.', q);
                        correctAnswerIndex = 0;
                    }

                    return {
                        id: index + 1,
                        question: q.question,
                        options: safeOptions.slice(0, 4),
                        correctAnswer: correctAnswerIndex + 1, // 1-based index
                    };
                });

                if (allQuestions.length === 0) {
                    throw new Error("No valid questions could be processed from the AI response.");
                }

                toast.success('Questions generated!', { id: toastId });
                return allQuestions.slice(0, exam.numberOfQuestions);

            } catch (error: any) {
                console.error("Failed to generate questions using Gemini API:", error);
                const errorMessage = error.message || "Could not generate exam questions.";
                toast.error(errorMessage, { id: toastId });
                throw error;
            }
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