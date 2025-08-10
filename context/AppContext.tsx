
import React, { createContext, useState, useContext, ReactNode, useEffect, useMemo } from 'react';
import { googleSheetsService } from '../services/googleSheetsService';
import type { Organization, RecommendedBook } from '../types';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

interface AppContextType {
  organizations: Organization[];
  activeOrg: Organization | null;
  isLoading: boolean;
  isInitializing: boolean;
  setActiveOrgById: (orgId: string) => void;
  updateActiveOrg: (updatedOrg: Organization) => void;
  suggestedBooks: RecommendedBook[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrg, setActiveOrg] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  const { examPrices } = useAuth();

  useEffect(() => {
    const initializeApp = () => {
        const initialOrgs = googleSheetsService.getOrganizations();
        
        const pricedOrgs = examPrices 
            ? initialOrgs.map(org => ({
                ...org,
                exams: org.exams.map(exam => ({
                    ...exam,
                    price: examPrices[exam.id] !== undefined ? examPrices[exam.id] : exam.price
                }))
            }))
            : initialOrgs;

        setOrganizations(pricedOrgs);
        if (pricedOrgs.length > 0) {
            const currentActive = pricedOrgs.find(o => o.id === activeOrg?.id) || pricedOrgs[0];
            setActiveOrg(currentActive);
        }
        setIsInitializing(false);
        setIsLoading(false);
    };

    initializeApp();
  }, [examPrices, activeOrg]);

  const suggestedBooks = useMemo(() => {
    if (!activeOrg) return [];

    const books = activeOrg.exams
        .map(exam => exam.recommendedBook)
        .filter((book): book is RecommendedBook => book !== undefined);

    const uniqueBooks = Array.from(new Map(books.map(book => [book.title, book])).values());
    
    return uniqueBooks;
  }, [activeOrg]);

  const setActiveOrgById = (orgId: string) => {
    const org = organizations.find(o => o.id === orgId);
    if (org) {
        setActiveOrg(org);
    }
  };

  const updateActiveOrg = (updatedOrg: Organization) => {
    setOrganizations(prevOrgs => 
        prevOrgs.map(org => org.id === updatedOrg.id ? updatedOrg : org)
    );
    setActiveOrg(updatedOrg);
  };

  return (
    <AppContext.Provider value={{ organizations, activeOrg, isLoading, isInitializing, setActiveOrgById, updateActiveOrg, suggestedBooks }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
