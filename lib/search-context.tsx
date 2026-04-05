"use client";

import { createContext, useContext, useState } from "react";

interface SearchContextValue {
  isSearching: boolean;
  query: string;
  setIsSearching: (v: boolean) => void;
  setQuery: (v: string) => void;
}

const SearchContext = createContext<SearchContextValue>({
  isSearching: false,
  query: "",
  setIsSearching: () => {},
  setQuery: () => {},
});

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [isSearching, setIsSearching] = useState(false);
  const [query, setQuery] = useState("");

  return (
    <SearchContext.Provider value={{ isSearching, query, setIsSearching, setQuery }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  return useContext(SearchContext);
}
