
import React from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { AuthProvider, useAuth } from './context/AuthContext.tsx';

import Login from './components/Login.tsx';
import Dashboard from './components/Dashboard.tsx';
import Test from './components/Test.tsx';
import Results from './components/Results.tsx';
import Certificate from './components/Certificate.tsx';
import Header from './components/Header.tsx';
import Footer from './components/Footer.tsx';
import LandingPage from './components/LandingPage.tsx';
import Instructions from './components/Instructions.tsx';
import Integration from './components/Integration.tsx';
import Admin from './components/Admin.tsx';
import BookStore from './components/BookStore.tsx';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, adminOnly = false }) => {
  const { user } = useAuth();
  if (!user) {
    return <ReactRouterDOM.Navigate to="/" replace />;
  }
  if (adminOnly && !user.isAdmin) {
    return <ReactRouterDOM.Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

const AppContent: React.FC = () => {
    return (
        <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800">
            <Header />
            <div className="flex-grow w-full">
                <main className="container mx-auto px-4 py-8">
                    <ReactRouterDOM.Routes>
                        <ReactRouterDOM.Route path="/" element={<LandingPage />} />
                        <ReactRouterDOM.Route path="/auth" element={<Login />} />
                        <ReactRouterDOM.Route path="/instructions" element={<Instructions />} />
                        <ReactRouterDOM.Route path="/integration" element={<Integration />} />
                        <ReactRouterDOM.Route path="/bookstore" element={<BookStore />} />
                        
                        <ReactRouterDOM.Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                        <ReactRouterDOM.Route path="/test/:examId" element={<ProtectedRoute><Test /></ProtectedRoute>} />
                        <ReactRouterDOM.Route path="/results/:testId" element={<ProtectedRoute><Results /></ProtectedRoute>} />
                        <ReactRouterDOM.Route path="/certificate/sample" element={<ProtectedRoute><Certificate /></ProtectedRoute>} />
                        <ReactRouterDOM.Route path="/certificate/:testId" element={<ProtectedRoute><Certificate /></ProtectedRoute>} />
                        <ReactRouterDOM.Route path="/admin" element={<ProtectedRoute adminOnly={true}><Admin /></ProtectedRoute>} />
                    
                        <ReactRouterDOM.Route path="*" element={<ReactRouterDOM.Navigate to="/" replace />} />
                    </ReactRouterDOM.Routes>
                </main>
            </div>
            <Footer />
        </div>
    );
};


const App: React.FC = () => {
  return (
    <AuthProvider>
        <ReactRouterDOM.HashRouter>
            <AppContent />
            <Toaster position="top-right" reverseOrder={false} />
        </ReactRouterDOM.HashRouter>
    </AuthProvider>
  );
};

export default App;
