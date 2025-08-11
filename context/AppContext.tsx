import React, { createContext, useState, useContext, ReactNode, useEffect, useMemo } from 'react';
import { apiService } from '../services/googleSheetsService';
import type { Organization, RecommendedBook } from '../types';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';

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
  const [isInitializing, setIsInitializing] = useState(true);
  const { examPrices } = useAuth();

  useEffect(() => {
    const initializeApp = async () => {
        try {
            const initialOrgs = await apiService.getAppConfig();
            
            const pricedOrgs = examPrices 
                ? initialOrgs.map(org => ({
                    ...org,
                    exams: org.exams.map(exam => {
                        const syncedPriceData = exam.productSku ? examPrices[exam.productSku] : undefined;
                        if (syncedPriceData) {
                            return {
                                ...exam,
                                price: syncedPriceData.price,
                                regularPrice: syncedPriceData.regularPrice
                            };
                        }
                        return exam;
                    })
                }))
                : initialOrgs;

            setOrganizations(pricedOrgs);
            if (pricedOrgs.length > 0) {
                setActiveOrg(pricedOrgs[0]);
            }
        } catch (error) {
            console.error("Failed to initialize app config:", error);
            toast.error("Could not load application configuration.");
        } finally {
            setIsInitializing(false);
        }
    };

    initializeApp();
  }, [examPrices]);

  const suggestedBooks = useMemo(() => {
    if (!activeOrg) return [];
    const books = activeOrg.exams
        .map(exam => exam.recommendedBook)
        .filter((book): book is RecommendedBook => book !== undefined && book !== null);
    return Array.from(new Map(books.map(book => [book.id, book])).values());
  }, [activeOrg]);

  const setActiveOrgById = (orgId: string) => {
    const org = organizations.find(o => o.id === orgId);
    if (org) setActiveOrg(org);
  };

  const updateActiveOrg = (updatedOrg: Organization) => {
    setOrganizations(prevOrgs => 
        prevOrgs.map(org => org.id === updatedOrg.id ? updatedOrg : org)
    );
    setActiveOrg(updatedOrg);
  };

  return (
    <AppContext.Provider value={{ organizations, activeOrg, isLoading: isInitializing, isInitializing, setActiveOrgById, updateActiveOrg, suggestedBooks }}>
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