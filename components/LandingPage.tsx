import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { BrainCircuit, BarChart, FileSignature } from 'lucide-react';
import Spinner from './Spinner';

const FeatureCard = ({ icon: Icon, title, children }: { icon: React.ElementType, title: string, children: React.ReactNode }) => (
    <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center mb-3">
            <Icon className="text-cyan-500 mr-4" size={32} />
            <h3 className="text-xl font-bold text-slate-800">{title}</h3>
        </div>
        <p className="text-slate-600">{children}</p>
    </div>
);

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

    if (isInitializing || !activeOrg || user) { // Also show spinner while redirecting
        return (
            <div className="flex flex-col items-center justify-center h-screen">
                <Spinner />
                <p className="mt-4 text-slate-500">Preparing the exams...</p>
            </div>
        );
    }
    
    return (
        <div className="space-y-16 sm:space-y-24">
            {/* Hero Section */}
            <section className="text-center py-12 sm:py-20 bg-white rounded-xl shadow-lg">
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 mb-4">Master Your Medical Coding Exams</h1>
                <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto mb-8">
                    Our platform offers comprehensive practice exams to help you ace your certification. Log in to access your purchased tests.
                </p>
                {user ? (
                    <Link
                        to="/dashboard"
                        className="bg-cyan-600 text-white font-bold py-3 px-6 sm:py-4 sm:px-8 rounded-lg text-lg hover:bg-cyan-700 transition-transform transform hover:scale-105 inline-block"
                    >
                        Go to User Dashboard 
                    </Link>
                ) : (
                    <div className="flex flex-col items-center">
                        <a
                            href="https://www.coding-online.net/wp-login.php?action=register"
                            className="bg-cyan-600 text-white font-bold py-3 px-6 sm:py-4 sm:px-8 rounded-lg text-lg hover:bg-cyan-700 transition-transform transform hover:scale-105 inline-block"
                        >
                            Get Started Now
                        </a>
                        <p className="text-slate-500 mt-4">
                            Already have an account?{' '}
                            <a href={loginUrl} className="font-semibold text-cyan-600 hover:underline">
                                Log In
                            </a>
                        </p>
                    </div>
                )}
            </section>
            
            {/* Features Section */}
            <section>
                <h2 className="text-3xl sm:text-4xl font-bold text-center text-slate-800 mb-4">Why Choose Us?</h2>
                <p className="text-md sm:text-lg text-center text-slate-500 max-w-2xl mx-auto mb-12">We provide the tools and insights you need to walk into your exam with confidence.</p>
                <div className="grid md:grid-cols-3 gap-8">
                    <FeatureCard icon={BarChart} title="Realistic Exam Simulation">
                        Practice with exams that mirror the format, difficulty, and time constraints of the real certification tests.
                    </FeatureCard>
                    <FeatureCard icon={BrainCircuit} title="AI-Powered Feedback">
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
