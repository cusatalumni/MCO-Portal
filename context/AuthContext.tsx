
import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import type { User, TokenPayload } from '../types';
import { googleSheetsService } from '../services/googleSheetsService';

interface AuthContextType {
  user: User | null;
  token: string | null;
  paidExamIds: string[];
  examPrices: { [id: string]: { price: number; regularPrice?: number; } } | null;
  isSubscribed: boolean;
  loginWithToken: (token: string) => void;
  logout: () => void;
  useFreeAttempt: () => void;
  updateUserName: (name: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
        const storedUser = localStorage.getItem('examUser');
        return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
        console.error("Failed to parse user from localStorage", error);
        return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('authToken');
  });
  const [paidExamIds, setPaidExamIds] = useState<string[]>(() => {
      try {
        const storedIds = localStorage.getItem('paidExamIds');
        return storedIds ? JSON.parse(storedIds) : [];
      } catch (error) {
          console.error("Failed to parse paidExamIds from localStorage", error);
          return [];
      }
  });
  const [examPrices, setExamPrices] = useState<{ [id: string]: { price: number; regularPrice?: number; } } | null>(() => {
    try {
        const storedPrices = localStorage.getItem('examPrices');
        return storedPrices ? JSON.parse(storedPrices) : null;
    } catch (error) {
        console.error("Failed to parse examPrices from localStorage", error);
        return null;
    }
  });
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);

  const logout = useCallback(() => {
    setUser(null);
    setPaidExamIds([]);
    setToken(null);
    setExamPrices(null);
    setIsSubscribed(false);
    localStorage.removeItem('examUser');
    localStorage.removeItem('paidExamIds');
    localStorage.removeItem('authToken');
    localStorage.removeItem('examPrices');
    localStorage.removeItem('activeOrg');
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('exam_timer_') || key.startsWith('exam_results_')) {
            localStorage.removeItem(key);
        }
    });
  }, []);

  useEffect(() => {
    const checkTokenExpiration = () => {
        const storedToken = localStorage.getItem('authToken');
        if (storedToken) {
            try {
                const payloadBase64Url = storedToken.split('.')[1];
                if (!payloadBase64Url) {
                    logout();
                    return;
                }
                const payloadBase64 = payloadBase64Url.replace(/-/g, '+').replace(/_/g, '/');
                const decodedPayload = decodeURIComponent(atob(payloadBase64).split('').map(function(c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));
                const payload = JSON.parse(decodedPayload);
                
                if (payload.exp && payload.exp * 1000 < Date.now()) {
                    toast.error("Your session has expired. Please log in again.");
                    logout();
                }
            } catch (e) {
                console.error("Failed to parse token for expiration check, logging out.", e);
                logout();
            }
        }
    };
    
    checkTokenExpiration();
    const intervalId = setInterval(checkTokenExpiration, 5 * 60 * 1000); // Check every 5 minutes

    return () => {
        clearInterval(intervalId);
    };
  }, [logout]);


  const loginWithToken = useCallback(async (jwtToken: string) => {
    try {
        const parts = jwtToken.split('.');
        if (parts.length !== 3) throw new Error("Invalid JWT format.");
        
        const payloadBase64Url = parts[1];
        const payloadBase64 = payloadBase64Url.replace(/-/g, '+').replace(/_/g, '/');
        const decodedPayload = decodeURIComponent(atob(payloadBase64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        const payload: TokenPayload = JSON.parse(decodedPayload);
        
        if (payload.user && payload.paidExamIds) {
            setUser(payload.user);
            setPaidExamIds(payload.paidExamIds);
            setToken(jwtToken);
            localStorage.setItem('examUser', JSON.stringify(payload.user));
            localStorage.setItem('paidExamIds', JSON.stringify(payload.paidExamIds));
            localStorage.setItem('authToken', jwtToken);

            if (payload.examPrices) {
                setExamPrices(payload.examPrices);
                localStorage.setItem('examPrices', JSON.stringify(payload.examPrices));
            }
            
            // Sync results from backend to local storage
            await googleSheetsService.syncResults(jwtToken, payload.user);

        } else {
            throw new Error("Invalid token payload structure.");
        }
    } catch(e) {
        console.error("Failed to decode or parse token:", e);
        logout();
        throw new Error("Invalid authentication token.");
    }
  }, [logout]);

  const useFreeAttempt = useCallback(() => {
    console.log('User has started a free practice attempt.');
  }, []);

  const updateUserName = useCallback((name: string) => {
    if (user) {
      const updatedUser = { ...user, name };
      setUser(updatedUser);
      localStorage.setItem('examUser', JSON.stringify(updatedUser));
    }
  }, [user]);


  return (
    <AuthContext.Provider value={{ user, token, paidExamIds, examPrices, isSubscribed, loginWithToken, logout, useFreeAttempt, updateUserName }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
