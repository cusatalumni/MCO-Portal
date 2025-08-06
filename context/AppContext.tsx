
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { googleSheetsService } from '../services/googleSheetsService';
import type { Organization } from '../types';
import toast from 'react-hot-toast';

interface AppContextType {
  organizations: Organization[];
  activeOrg: Organization | null;
  isLoading: boolean;
  isInitializing: boolean;
  setActiveOrgById: (orgId: string) => void;
  updateActiveOrg: (updatedOrg: Organization) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrg, setActiveOrg] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await googleSheetsService.initializeAndCategorizeExams();
        toast.success("Exams loaded successfully!", { duration: 2000 });
      } catch (error) {
        console.error("Failed to initialize exams:", error);
        toast.error("Failed to load exams.");
      }

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
    <AppContext.Provider value={{ organizations, activeOrg, isLoading, isInitializing, setActiveOrgById, updateActiveOrg }}>
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