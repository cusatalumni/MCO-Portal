
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import { User, Mail, Edit, Save, X, RefreshCw, CreditCard, CheckCircle, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import Spinner from './Spinner';
import type { TestResult } from '../types';

const Profile: React.FC = () => {
    const { user, token, updateUserName, paidExamIds } = useAuth();
    const { activeOrg } = useAppContext();
    const [isEditingName, setIsEditingName] = useState(false);
    const [name, setName] = useState(user?.name || '');
    const [isSavingName, setIsSavingName] = useState(false);
    const [results, setResults] = useState<TestResult[]>([]);

    const loginUrl = 'https://www.coding-online.net/exam-login/';
    const appProfilePath = '/profile';
    const syncUrl = `${loginUrl}?redirect_to=${encodeURIComponent(appProfilePath)}`;
    const updateNameEndpoint = 'https://www.coding-online.net/wp-json/exam-app/v1/update-name';

    const getInitials = (nameStr: string) => {
        const parts = nameStr.split(' ');
        if (parts.length > 1) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return (parts[0][0] || '').toUpperCase();
    }

    const handleNameSave = async () => {
        if (!name.trim()) {
            toast.error("Name cannot be empty.");
            return;
        }
        if (!token) {
            toast.error("Authentication error. Please re-login.");
            return;
        }

        setIsSavingName(true);
        const toastId = toast.loading('Syncing name with your profile...');

        try {
            const response = await fetch(updateNameEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ fullName: name.trim() })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update name.');
            }

            updateUserName(name.trim());
            setIsEditingName(false);
            toast.success("Full name updated successfully.", { id: toastId });

        } catch (error: any) {
            console.error("Error updating name:", error);
            toast.error(error.message || "An error occurred.", { id: toastId });
        } finally {
            setIsSavingName(false);
        }
    };

    const purchasedExams = useMemo(() => {
        if (!activeOrg) return [];
        return activeOrg.exams
            .filter(e => !e.isPractice && paidExamIds.includes(e.id))
            .map(exam => {
                 const examResults = results.filter(r => r.examId === exam.id);
                 const hasPassed = examResults.some(r => r.score >= exam.passScore);
                 const latestResult = examResults.sort((a,b) => b.timestamp - a.timestamp)[0];
                 return { ...exam, hasPassed, latestResultId: latestResult?.testId };
            });
    }, [activeOrg, paidExamIds, results]);

    if (!user || !activeOrg) {
        return <div className="flex flex-col items-center justify-center h-64"><Spinner /><p className="mt-4">Loading user profile...</p></div>;
    }

    return (
        <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-8">My Profile</h1>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white p-6 rounded-xl shadow-md">
                        <div className="flex items-center gap-6">
                            <div className="flex-shrink-0 w-24 h-24 bg-cyan-100 text-cyan-600 rounded-full flex items-center justify-center">
                                <span className="text-4xl font-bold">{getInitials(user.name)}</span>
                            </div>
                            <div className="flex-grow">
                                {isEditingName ? (
                                    <div className="flex items-center gap-2 mb-2">
                                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="border border-slate-300 rounded-md px-3 py-2 text-lg w-full" placeholder="Enter your full name" disabled={isSavingName} />
                                        <button onClick={handleNameSave} className="p-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-slate-400" aria-label="Save name" disabled={isSavingName}>{isSavingName ? <Spinner /> : <Save size={20} />}</button>
                                        <button onClick={() => { setIsEditingName(false); setName(user.name); }} className="p-2 bg-slate-400 text-white rounded-md hover:bg-slate-500" aria-label="Cancel edit" disabled={isSavingName}><X size={20} /></button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 mb-2">
                                        <h2 className="text-3xl font-bold text-slate-800">{user.name}</h2>
                                        <button onClick={() => setIsEditingName(true)} className="p-1 text-slate-500 hover:text-slate-800" title="Edit your name for the certificate" aria-label="Edit name"><Edit size={18} /></button>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 text-slate-500">
                                    <Mail size={16} />
                                    <span>{user.email}</span>
                                </div>
                                <p className="text-xs text-yellow-800 bg-yellow-50 border border-yellow-200 rounded-md p-2 mt-3">
                                    Please ensure your full name is correct. This name will appear on your certificates.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-md">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center mb-4"><CreditCard className="mr-3 text-cyan-500" /> My Purchased Exams</h2>
                         <div className="space-y-3">
                            {purchasedExams.length > 0 ? purchasedExams.map(exam => (
                                <div key={exam.id} className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex justify-between items-center">
                                    <p className="font-semibold text-slate-700">{exam.name}</p>
                                    {exam.hasPassed ? (
                                        <Link to={`/certificate/${exam.latestResultId}`} className="flex items-center gap-1 text-sm font-semibold text-green-600 bg-green-100 px-3 py-1 rounded-full hover:bg-green-200">
                                            <FileText size={14} /> View Certificate
                                        </Link>
                                    ) : (
                                        <span className="flex items-center gap-1 text-sm font-semibold text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
                                            <CheckCircle size={14} /> Ready To Take
                                        </span>
                                    )}
                                </div>
                            )) : (
                                <p className="text-center py-6 text-slate-500">You have no purchased certification exams. Your completed orders on our main site will appear here after syncing.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="lg:col-span-1">
                     <div className="bg-white p-6 rounded-xl shadow-md">
                        <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center"><RefreshCw className="mr-2 text-cyan-500"/> Sync Account</h3>
                        <p className="text-sm text-slate-600 mb-4">
                            Click the button below to fetch your latest user details and purchased exams from our main site, <a href="https://www.coding-online.net" target="_blank" rel="noopener noreferrer" className="text-cyan-600 font-semibold">coding-online.net</a>.
                        </p>
                        <a href={syncUrl} className="w-full bg-cyan-600 text-white font-bold py-3 px-3 rounded-lg hover:bg-cyan-700 transition text-sm flex items-center justify-center gap-2">
                           Sync My Data
                        </a>
                     </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;