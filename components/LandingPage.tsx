import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { BrainCircuit, BarChart, FileSignature, LogIn, UserPlus, Award, RefreshCw, Lightbulb, PlayCircle, ArrowRight } from 'lucide-react';
import Spinner from './Spinner';
import toast from 'react-hot-toast';
import { GoogleGenAI, Type } from "@google/genai";

const FeatureCard = ({ icon: Icon, title, children }: { icon: React.ElementType, title: string, children: React.ReactNode }) => (
    <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 border border-slate-100">
        <div className="flex items-center mb-3">
            <div className="bg-cyan-100 text-cyan-600 p-3 rounded-full mr-4">
                <Icon size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-800">{title}</h3>
        </div>
        <p className="text-slate-600">{children}</p>
    </div>
);

const AiQuizCard: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [questionData, setQuestionData] = useState<{ question: string; options: string[]; correctOptionIndex: number; explanation: string; } | null>(null);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const fetchQuestion = useCallback(async () => {
        setLoading(true);
        setSelectedOption(null);
        setError(null);
        setQuestionData(null);
        try {
            const schema = {
                type: Type.OBJECT,
                properties: {
                    question: { type: Type.STRING, description: "The question text." },
                    options: {
                        type: Type.ARRAY,
                        description: "An array of four potential answers.",
                        items: { type: Type.STRING }
                    },
                    correctOptionIndex: { type: Type.INTEGER, description: "The zero-based index of the correct option in the 'options' array." },
                    explanation: { type: Type.STRING, description: "A brief explanation of why the correct answer is right." }
                },
                required: ["question", "options", "correctOptionIndex", "explanation"]
            };

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: "Generate a single multiple-choice medical coding practice question. The topic can be ICD-10-CM, CPT, or HCPCS Level II. Provide the question, four options, the zero-based index of the correct answer, and a brief explanation for the correct answer.",
                config: {
                    responseMimeType: "application/json",
                    responseSchema: schema
                }
            });

            const text = response.text.trim();
            const data = JSON.parse(text);
            
            if(data.options.length !== 4) {
                throw new Error("AI returned incorrect number of options.");
            }

            setQuestionData(data);
        } catch (e) {
            setError("Could not load AI question. Please try again later.");
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchQuestion();
    }, [fetchQuestion]);

    const handleOptionSelect = (index: number) => {
        if(selectedOption === null) {
            setSelectedOption(index);
        }
    };

    return (
        <div className="bg-slate-800 text-white p-6 rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center">
                    <Lightbulb className="text-yellow-400 mr-3" size={24} />
                    <h3 className="text-xl font-bold">Question of the Day</h3>
                </div>
                 <button onClick={fetchQuestion} disabled={loading} className="p-2 rounded-full hover:bg-slate-700 disabled:opacity-50 disabled:cursor-wait">
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>
            {loading && <div className="flex justify-center items-center h-48"><Spinner /></div>}
            {error && <div className="text-center text-red-400 py-10">{error}</div>}
            {questionData && (
                <div>
                    <p className="font-semibold mb-4">{questionData.question}</p>
                    <div className="space-y-2">
                        {questionData.options.map((option, index) => {
                            const isSelected = selectedOption === index;
                            const isCorrect = questionData.correctOptionIndex === index;
                            let optionClass = "bg-slate-700 hover:bg-slate-600";
                            if (selectedOption !== null) {
                                if (isCorrect) optionClass = "bg-green-700/80";
                                else if (isSelected) optionClass = "bg-red-700/80";
                            }
                            return (
                                <button key={index} onClick={() => handleOptionSelect(index)} disabled={selectedOption !== null} className={`w-full text-left p-3 rounded transition-colors duration-300 ${optionClass}`}>
                                    {option}
                                </button>
                            );
                        })}
                    </div>
                    {selectedOption !== null && (
                        <div className="mt-4 p-3 bg-slate-900/50 rounded">
                            <h4 className="font-bold text-yellow-400">Explanation</h4>
                            <p className="text-sm text-slate-300">{questionData.explanation}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { activeOrg, isInitializing } = useAppContext();
    
    useEffect(() => {
        if (user) {
            navigate('/dashboard');
        }
    }, [user, navigate]);

    const loginUrl = `https://www.coding-online.net/exam-login/`;

    if (isInitializing || !activeOrg || user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Spinner />
                <p className="mt-4 text-slate-500">Preparing the exams...</p>
            </div>
        );
    }
    
    return (
        <div className="space-y-16 sm:space-y-24">
            {/* Hero Section */}
            <section className="text-center py-12 sm:py-20 bg-white rounded-xl shadow-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-50 to-blue-100 -z-10"></div>
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 mb-4">Master Your Medical Coding Exams</h1>
                <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto mb-8">
                    Our platform offers AI-powered practice tools and comprehensive exams to help you ace your certification.
                </p>
                <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                    <a
                        href="https://www.coding-online.net/wp-login.php?action=register"
                        className="flex items-center justify-center w-full sm:w-auto bg-cyan-600 text-white font-bold py-3 px-8 rounded-lg text-lg hover:bg-cyan-700 transition-transform transform hover:scale-105"
                        >
                        <UserPlus size={20} className="mr-2"/>
                        Get Started
                    </a>
                    <a
                        href={loginUrl}
                        className="flex items-center justify-center w-full sm:w-auto bg-slate-100 text-slate-700 font-bold py-3 px-8 rounded-lg text-lg hover:bg-slate-200 transition-transform transform hover:scale-105"
                    >
                         <LogIn size={20} className="mr-2"/>
                        Log In
                    </a>
                </div>
            </section>
            
            {/* AI Quiz Card */}
            <section>
                 <AiQuizCard />
            </section>
            
            {/* How It Works Section */}
            <section>
                <h2 className="text-3xl sm:text-4xl font-bold text-center text-slate-800 mb-12">Your Path to Certification</h2>
                <div className="grid md:grid-cols-3 gap-8 text-center">
                    <div className="flex flex-col items-center">
                        <div className="bg-slate-100 text-cyan-600 p-4 rounded-full mb-4 ring-8 ring-slate-50">
                            <UserPlus size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">1. Register & Log In</h3>
                        <p className="text-slate-600">Create an account on our main site and log in to sync your profile and purchases.</p>
                    </div>
                     <div className="flex flex-col items-center">
                        <div className="bg-slate-100 text-cyan-600 p-4 rounded-full mb-4 ring-8 ring-slate-50">
                            <BrainCircuit size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">2. Practice & Learn</h3>
                        <p className="text-slate-600">Take free practice tests and challenge yourself with our AI-powered questions.</p>
                    </div>
                     <div className="flex flex-col items-center">
                        <div className="bg-slate-100 text-cyan-600 p-4 rounded-full mb-4 ring-8 ring-slate-50">
                            <Award size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">3. Get Certified</h3>
                        <p className="text-slate-600">Pass the full certification exams to earn and download your official certificate.</p>
                    </div>
                </div>
            </section>
            
            {/* Features Section */}
            <section>
                <div className="grid md:grid-cols-3 gap-8">
                    <FeatureCard icon={BarChart} title="Realistic Exam Simulation">
                        Practice with exams that mirror the format, difficulty, and time constraints of the real certification tests.
                    </FeatureCard>
                    <FeatureCard icon={Lightbulb} title="AI-Powered Insights">
                        Receive personalized study recommendations based on your performance to target your weak areas effectively.
                    </FeatureCard>
                    <FeatureCard icon={FileSignature} title="Printable Certificates">
                        Earn and share verifiable certificates upon successful completion of our paid certification exams to showcase your skills.
                    </FeatureCard>
                </div>
            </section>
        </div>
    );
};

export default LandingPage;
