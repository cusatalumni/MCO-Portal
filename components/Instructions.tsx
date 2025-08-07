import React from 'react';
import { BookOpen, UserCheck, FileText, CheckCircle, Repeat, Award, LifeBuoy, Mail } from 'lucide-react';

const InstructionStep = ({ num, icon: Icon, title, children }: { num: string, icon: React.ElementType, title: string, children: React.ReactNode }) => (
    <div className="flex">
        <div className="flex flex-col items-center mr-6">
            <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-12 h-12 border-2 border-cyan-500 text-cyan-500 font-bold text-xl rounded-full">
                    {num}
                </div>
            </div>
            <div className="w-px h-full bg-slate-300"></div>
        </div>
        <div className="pb-10 w-full">
            <div className="flex items-center mb-3">
                 <Icon className="text-slate-700 mr-3" size={24} />
                 <h3 className="text-2xl font-bold text-slate-800">{title}</h3>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200 text-slate-600 space-y-3">
                {children}
            </div>
        </div>
    </div>
);

const Instructions: React.FC = () => {
    return (
        <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-extrabold text-slate-900 mb-4">User Guide</h1>
                <p className="text-lg text-slate-500 max-w-2xl mx-auto">
                    Welcome to the Medical Coding Online Examination platform! Here’s how to get started on your path to certification.
                </p>
            </div>

            <div className="relative">
                {/* The very first element, to anchor the timeline line */}
                <div className="flex">
                    <div className="flex flex-col items-center mr-6">
                         <div className="w-px h-6 bg-slate-300"></div>
                    </div>
                </div>

                <InstructionStep num="1" icon={UserCheck} title="Login & Sync Exams">
                    <p>
                        To begin, you must log in using your account from our main website, <a href="https://www.coding-online.net" target="_blank" rel="noopener noreferrer" className="text-cyan-600 font-semibold hover:underline">coding-online.net</a>. This ensures all your progress and purchases are linked.
                    </p>
                    <p>
                        If you've recently purchased a new exam, click the <strong>"Sync My Exams"</strong> button on your dashboard. This will securely update your account and add new exams to your list.
                    </p>
                </InstructionStep>

                <InstructionStep num="2" icon={BookOpen} title="Exam Types">
                    <p>
                        We offer two types of exams to build your skills:
                    </p>
                    <ul className="list-disc list-inside space-y-2 pl-2">
                        <li><strong>Practice Tests:</strong> Free, 10-question quizzes to give you a feel for different topics. Ideal for quick knowledge checks.</li>
                        <li><strong>Certification Exams:</strong> Full-length, 100-question paid exams that simulate the real thing. Passing these is required to earn your certificate.</li>
                    </ul>
                </InstructionStep>

                <InstructionStep num="3" icon={Repeat} title="Attempt Limits">
                     <p>
                        To encourage thoughtful practice, there are limits on exam attempts:
                    </p>
                     <ul className="list-disc list-inside space-y-2 pl-2">
                        <li><strong>Practice Tests:</strong> You get <strong>10 attempts</strong> in total across all practice tests.</li>
                        <li><strong>Certification Exams:</strong> Each purchased certification exam includes <strong>3 attempts</strong>.</li>
                    </ul>
                </InstructionStep>

                 <InstructionStep num="4" icon={CheckCircle} title="Taking a Test">
                    <p>
                       The test interface is timed. Navigate with "Next" and "Previous" buttons. Unanswered questions will be marked as incorrect upon submission.
                    </p>
                    <p>
                       If you try to submit with unanswered questions, a warning will appear. This is to prevent accidental submissions.
                    </p>
                </InstructionStep>

                <InstructionStep num="5" icon={Award} title="Results & Certificates">
                    <p>
                        After submitting, you’ll see your results immediately.
                    </p>
                     <ul className="list-disc list-inside space-y-2 pl-2">
                        <li><strong>Practice Tests:</strong> You can review every question to see your answer versus the correct one, helping you learn from mistakes.</li>
                        <li><strong>Certification Exams:</strong> If you pass, you can download your official certificate. To protect exam integrity, a detailed answer review is not provided for paid exams.</li>
                    </ul>
                </InstructionStep>

                 <InstructionStep num="6" icon={LifeBuoy} title="Getting Help">
                    <p>
                       If you encounter any issues or have questions about the platform, please don't hesitate to reach out to our support team.                     </p>
                    <div className="mt-4">
                        <a href="mailto:support@coding-online.net" className="inline-flex items-center gap-2 bg-cyan-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-cyan-700 transition">
                            <Mail size={16} /> Contact Support
                        </a>
                    </div>
                </InstructionStep>

                {/* The very last element, to end the timeline line */}
                 <div className="flex">
                    <div className="flex flex-col items-center mr-6">
                        <div className="w-px h-6 bg-slate-100 transform -translate-y-2"></div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Instructions;
