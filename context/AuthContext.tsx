



import React, { createContext, useState, useContext, ReactNode } from 'react';
import type { User, TokenPayload } from '../types';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  token: string | null;
  paidExamIds: string[];
  examPrices: { [id: string]: { price: number; regularPrice?: number; } } | null;
  isSubscribed: boolean;
  isSyncing: boolean;
  loginWithToken: (token: string) => void;
  syncUserData: () => Promise<boolean>;
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
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const _updateStateAndStorage = (payload: TokenPayload, jwtToken?: string) => {
    if (payload.user && payload.paidExamIds) {
        setUser(payload.user);
        setPaidExamIds(payload.paidExamIds);
        localStorage.setItem('examUser', JSON.stringify(payload.user));
        localStorage.setItem('paidExamIds', JSON.stringify(payload.paidExamIds));

        if (jwtToken) {
            setToken(jwtToken);
            localStorage.setItem('authToken', jwtToken);
        }

        if (payload.examPrices) {
            setExamPrices(payload.examPrices);
            localStorage.setItem('examPrices', JSON.stringify(payload.examPrices));
        }
    } else {
        throw new Error("Invalid payload structure.");
    }
  };

  const syncUserData = async (): Promise<boolean> => {
    const currentToken = localStorage.getItem('authToken');
    if (!currentToken) {
        return false;
    }

    setIsSyncing(true);
    try {
        const response = await fetch('https://www.coding-online.net/wp-json/exam-app/v1/get-user-data', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        if (response.status === 403) {
            toast.error("Your session has expired. Please log in again.");
            logout();
            return false;
        }

        if (!response.ok) {
            throw new Error('Failed to sync user data.');
        }

        const payload: TokenPayload = await response.json();
        _updateStateAndStorage(payload);
        return true;

    } catch (error) {
        console.error('Sync Error:', error);
        toast.error("Could not sync your data. Please check your connection.");
        return false;
    } finally {
        setIsSyncing(false);
    }
  };

  const loginWithToken = (jwtToken: string) => {
    try {
        const parts = jwtToken.split('.');
        if (parts.length !== 3) throw new Error("Invalid JWT format.");
        
        const payloadBase64Url = parts[1];
        const payloadBase64 = payloadBase64Url.replace(/-/g, '+').replace(/_/g, '/');
        const decodedPayload = decodeURIComponent(atob(payloadBase64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        const payload: TokenPayload = JSON.parse(decodedPayload);
        _updateStateAndStorage(payload, jwtToken);

    } catch(e) {
        console.error("Failed to decode or parse token:", e);
        logout();
        throw new Error("Invalid authentication token.");
    }
  };

  const logout = () => {
    setUser(null);
    setPaidExamIds([]);
    setToken(null);
    setExamPrices(null);
    setIsSubscribed(false);
    localStorage.removeItem('examUser');
    localStorage.removeItem('paidExamIds');
    localStorage.removeItem('authToken');
    localStorage.removeItem('examPrices');
  };

  const useFreeAttempt = () => {
    console.log('User has started a free practice attempt.');
  };

  const updateUserName = (name: string) => {
    if (user) {
      const updatedUser = { ...user, name };
      setUser(updatedUser);
      localStorage.setItem('examUser', JSON.stringify(updatedUser));
    }
  };


  return (
    <AuthContext.Provider value={{ user, token, paidExamIds, examPrices, isSubscribed, isSyncing, loginWithToken, syncUserData, logout, useFreeAttempt, updateUserName }}>
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