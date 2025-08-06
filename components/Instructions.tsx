
import React from 'react';
import { BookOpen, UserCheck, FileText, CheckCircle, Repeat, Award } from 'lucide-react';

const InstructionItem = ({ icon: Icon, title, children }: { icon: React.ElementType, title: string, children: React.ReactNode }) => (
    <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-cyan-500">
        <div className="flex items-center mb-3">
            <Icon className="text-cyan-600 mr-4" size={28} />
            <h3 className="text-xl font-bold text-slate-800">{title}</h3>
        </div>
        <div className="text-slate-600 space-y-2">
            {children}
        </div>
    </div>
);

const Instructions: React.FC = () => {
    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-extrabold text-center text-slate-900 mb-4">User Instructions</h1>
            <p className="text-lg text-center text-slate-500 max-w-2xl mx-auto mb-12">
                Welcome to the Annapoorna Examination App! Here’s how to get the most out of our platform.
            </p>

            <div className="space-y-8">
                <InstructionItem icon={UserCheck} title="Logging In & Syncing Exams">
                    <p>
                        To begin, you must log in using your account from our main website, <a href="https://www.coding-online.net" target="_blank" rel="noopener noreferrer" className="text-cyan-600 font-semibold hover:underline">coding-online.net</a>.
                    </p>
                    <p>
                        If you've recently purchased a new certification exam, click the <strong>"Sync My Exams"</strong> button on your dashboard. This will securely update your account and add the new exams to your list.
                    </p>
                </InstructionItem>

                <InstructionItem icon={BookOpen} title="Practice Tests vs. Certification Exams">
                    <p>
                        We offer two types of exams to help you prepare:
                    </p>
                    <ul className="list-disc list-inside space-y-1 pl-2">
                        <li><strong>Practice Tests:</strong> These are free, 10-question quizzes designed to give you a feel for the exam topics.</li>
                        <li><strong>Certification Exams:</strong> These are the full, 100-question paid exams. Passing these is required to earn your certificate.</li>
                    </ul>
                </InstructionItem>

                <InstructionItem icon={Repeat} title="Attempt Limits">
                     <p>
                        To ensure a fair and valuable experience, there are limits on exam attempts:
                    </p>
                    <ul className="list-disc list-inside space-y-1 pl-2">
                        <li><strong>Free Practice Tests:</strong> You have a total of <strong>10 attempts</strong> across all available practice tests. Use them wisely to explore different topics!
                        </li>
                        <li><strong>Certification Exams:</strong> Each purchased certification exam comes with <strong>3 attempts</strong>. You must pass within these three tries.
                        </li>
                    </ul>
                </InstructionItem>

                 <InstructionItem icon={CheckCircle} title="Taking a Test">
                    <p>
                       During the test, you can navigate with "Next" and "Previous" buttons. If you try to skip a question, a warning will appear.
                    </p>
                    <p>
                        If you submit an exam with unanswered questions, you will be warned. If you proceed, they will be marked as incorrect. This ensures you don't submit an incomplete test by accident.
                    </p>
                </InstructionItem>

                <InstructionItem icon={Award} title="Results & Certificates">
                    <p>
                        After submitting an exam, you'll be taken to the results page.
                    </p>
                    <ul className="list-disc list-inside space-y-1 pl-2">
                        <li><strong>Practice Tests:</strong> You can review every question to see your answer and the correct one.</li>
                        <li><strong>Certification Exams:</strong> If you pass, a button will appear to download your official, verifiable certificate. To protect exam integrity, a detailed answer review is not provided for paid exams.</li>
                    </ul>
                </InstructionItem>
            </div>
        </div>
    );
};

export default Instructions;