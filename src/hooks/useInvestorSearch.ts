
import { useState, useEffect } from 'react';
import { Investor } from "@/types/investorTypes";

/**
 * A hook for searching and filtering investors
 * @param investors The full list of investors
 * @param initialSearchTerm Optional initial search term
 * @returns Search state and filtered investors
 */
export const useInvestorSearch = (investors: Investor[], initialSearchTerm: string = '') => {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [filteredInvestors, setFilteredInvestors] = useState<Investor[]>(investors);
  
  // Handle search
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredInvestors(investors);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = investors.filter(investor => 
        investor.email?.toLowerCase().includes(term) || 
        investor.first_name?.toLowerCase().includes(term) ||
        investor.last_name?.toLowerCase().includes(term)
      );
      setFilteredInvestors(filtered);
    }
  }, [searchTerm, investors]);
  
  return {
    searchTerm,
    setSearchTerm,
    filteredInvestors
  };
};
