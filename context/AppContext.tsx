import React, { createContext, useState, useContext, ReactNode, useEffect, useMemo } from 'react';
import { apiService } from '../services/googleSheetsService';
import type { Organization, RecommendedBook, Exam } from '../types';
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
  const [suggestedBooks, setSuggestedBooks] = useState<RecommendedBook[]>([]);
  const { examPrices } = useAuth();

  useEffect(() => {
    const initializeApp = async () => {
        try {
            const initialOrgsFromApi = await apiService.getAppConfig();

            const priceOrgs = (orgs: any[]): Organization[] => {
                return orgs.map(org => {
                    const pricedExams = org.exams.map((exam: any): Exam => {
                        if (examPrices) {
                            const syncedPriceData = exam.productSku ? examPrices[exam.productSku] : undefined;
                            if (syncedPriceData) {
                                return {
                                    ...exam,
                                    price: syncedPriceData.price,
                                    regularPrice: syncedPriceData.regularPrice
                                };
                            }
                        }
                        return exam;
                    });
                    return { ...org, exams: pricedExams };
                });
            };
            
            const finalOrgs = priceOrgs(initialOrgsFromApi);
            setOrganizations(finalOrgs);

            if (finalOrgs.length > 0) {
                const currentOrg = finalOrgs[0];
                setActiveOrg(currentOrg);
                if (currentOrg.suggestedBooks) {
                    setSuggestedBooks(currentOrg.suggestedBooks);
                }
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


  const setActiveOrgById = (orgId: string) => {
    const org = organizations.find(o => o.id === orgId);
    if (org) {
        setActiveOrg(org);
        if (org.suggestedBooks) {
            setSuggestedBooks(org.suggestedBooks);
        }
    }
  };

  const updateActiveOrg = (updatedOrg: Organization) => {
    setOrganizations(prevOrgs => 
        prevOrgs.map(org => org.id === updatedOrg.id ? updatedOrg : org)
    );
    setActiveOrg(updatedOrg);
    if (updatedOrg.suggestedBooks) {
        setSuggestedBooks(updatedOrg.suggestedBooks);
    }
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