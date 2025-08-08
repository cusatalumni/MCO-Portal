
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { AuthProvider, useAuth } from './context/AuthContext';

import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Test from './components/Test';
import Results from './components/Results';
import Certificate from './components/Certificate';
import Header from './components/Header';
import Footer from './components/Footer';
import LandingPage from './components/LandingPage';
import Instructions from './components/Instructions';
import Integration from './components/Integration';
import Admin from './components/Admin';
import BookStore from './components/BookStore';


interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, adminOnly = false }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/" replace />;
  }
  if (adminOnly && !user.isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

const AppContent: React.FC = () => {
    return (
        <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800">
            <Header />
            <div className="flex-grow w-full">
                <main className="container mx-auto px-4 py-8">
                    <Routes>
                        <Route path="/" element={<LandingPage />} />
                        <Route path="/auth" element={<Login />} />
                        <Route path="/instructions" element={<Instructions />} />
                        <Route path="/integration" element={<Integration />} />
                        <Route path="/bookstore" element={<BookStore />} />
                        
                        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                        <Route path="/test/:examId" element={<ProtectedRoute><Test /></ProtectedRoute>} />
                        <Route path="/results/:testId" element={<ProtectedRoute><Results /></ProtectedRoute>} />
                        <Route path="/certificate/sample" element={<ProtectedRoute><Certificate /></ProtectedRoute>} />
                        <Route path="/certificate/:testId" element={<ProtectedRoute><Certificate /></ProtectedRoute>} />
                        <Route path="/admin" element={<ProtectedRoute adminOnly={true}><Admin /></ProtectedRoute>} />
                    
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </main>
            </div>
            <Footer />
        </div>
    );
};


const App: React.FC = () => {
  return (
    <AuthProvider>
        <HashRouter>
            <AppContent />
            <Toaster position="top-right" reverseOrder={false} />
        </HashRouter>
    </AuthProvider>
  );
};

export default App;