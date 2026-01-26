import React from "react";
import { Input } from "@/components/ui";
import { Search, X } from "lucide-react";
import { useIsMobile } from "@/hooks";

interface SearchBarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ searchTerm, setSearchTerm }) => {
  const isMobile = useIsMobile();

  const clearSearch = () => {
    setSearchTerm("");
  };

  return (
    <div className={`relative ${isMobile ? "w-full" : "flex-grow"}`}>
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder={isMobile ? "Search investors..." : "Search by name or email..."}
        className="pl-8 pr-8"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      {searchTerm && (
        <button
          onClick={clearSearch}
          className="absolute right-2.5 top-2.5"
          aria-label="Clear search"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
    </div>
  );
};

export default SearchBar;
