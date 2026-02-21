import { useState, useEffect } from "react";

/**
 * Minimal shape for investor search filtering.
 * Avoids coupling investor-domain hooks to admin services.
 */
export interface SearchableInvestor {
  email?: string;
  firstName?: string;
  lastName?: string;
  [key: string]: unknown;
}

/**
 * A hook for searching and filtering investors
 * @param investors The full list of investors
 * @param initialSearchTerm Optional initial search term
 * @returns Search state and filtered investors
 */
export const useInvestorSearch = <T extends SearchableInvestor>(
  investors: T[],
  initialSearchTerm: string = ""
) => {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [filteredInvestors, setFilteredInvestors] = useState<T[]>(investors);

  // Handle search
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredInvestors(investors);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = investors.filter(
        (investor) =>
          investor.email?.toLowerCase().includes(term) ||
          investor.firstName?.toLowerCase().includes(term) ||
          investor.lastName?.toLowerCase().includes(term)
      );
      setFilteredInvestors(filtered);
    }
  }, [searchTerm, investors]);

  return {
    searchTerm,
    setSearchTerm,
    filteredInvestors,
  };
};
