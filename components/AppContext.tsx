
import React, { createContext, useState, useContext, ReactNode, useEffect, useMemo } from 'react';
import { googleSheetsService } from '../services/googleSheetsService';
import type { Organization, RecommendedBook } from '../types';
import toast from 'react-hot-toast';

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

  useEffect(() => {
    const initializeApp = async () => {
      // The complex exam initialization has been removed to simplify the app's startup.
      const allOrgs = googleSheetsService.getOrganizations();
      setOrganizations(allOrgs);
      if (allOrgs.length > 0) {
          setActiveOrg(allOrgs[0]);
      }
      setIsInitializing(false);
      setIsLoading(false);
    };

    initializeApp();
  }, []);

  const suggestedBooks = useMemo(() => {
    if (!activeOrg) return [];

    const books = activeOrg.exams
        .map(exam => exam.recommendedBook)
        .filter((book): book is RecommendedBook => book !== undefined);

    // Filter for unique books by title to avoid duplicates in the sidebar
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