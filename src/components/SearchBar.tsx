// SearchBar.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import _ from "lodash";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  suggestions?: string[];
  maxSuggestions?: number;
}

export const FuzzySearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onSearch,
  suggestions = [],
  maxSuggestions = 5,
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const getFuzzySuggestions = (input: string) => {
    if (!input) return [];

    return suggestions
      .filter((suggestion) => {
        const normalizedSuggestion = suggestion.toLowerCase();
        const normalizedInput = input.toLowerCase();

        // Check for consecutive character matches
        let suggestionIndex = 0;
        for (const char of normalizedInput) {
          suggestionIndex = normalizedSuggestion.indexOf(char, suggestionIndex);
          if (suggestionIndex === -1) return false;
          suggestionIndex += 1;
        }
        return true;
      })
      .slice(0, maxSuggestions);
  };

  useEffect(() => {
    const debouncedFilter = _.debounce(() => {
      const filtered = getFuzzySuggestions(value);
      setFilteredSuggestions(filtered);
      setSelectedIndex(-1);
      setShowSuggestions(filtered.length > 0);
    }, 150);

    debouncedFilter();
    return () => debouncedFilter.cancel();
  }, [value, suggestions, maxSuggestions]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (selectedIndex >= 0 && selectedIndex < filteredSuggestions.length) {
        onChange(filteredSuggestions[selectedIndex]);
      }
      setShowSuggestions(false);
      onSearch();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > -1 ? prev - 1 : prev));
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const highlightMatch = (suggestion: string) => {
    const normalizedSuggestion = suggestion.toLowerCase();
    const normalizedInput = value.toLowerCase();
    const indices: number[] = [];

    let suggestionIndex = 0;
    for (const char of normalizedInput) {
      suggestionIndex = normalizedSuggestion.indexOf(char, suggestionIndex);
      if (suggestionIndex !== -1) {
        indices.push(suggestionIndex);
        suggestionIndex += 1;
      }
    }

    return suggestion.split("").map((char, i) =>
      indices.includes(i) ? (
        <span key={i} className="text-red-500 font-medium">
          {char}
        </span>
      ) : (
        <span key={i}>{char}</span>
      )
    );
  };

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => value && setShowSuggestions(true)}
        placeholder="Search assets..."
        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-red-500"
      />
      <button
        onClick={() => {
          onSearch();
          setShowSuggestions(false);
        }}
        className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-red-500"
      >
        <Search className="w-5 h-5" />
      </button>

      {showSuggestions && filteredSuggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-auto"
        >
          {filteredSuggestions.map((suggestion, index) => (
            <div
              key={suggestion}
              className={`px-4 py-2 cursor-pointer ${
                index === selectedIndex
                  ? "bg-red-50 text-red-900"
                  : "hover:bg-gray-50"
              }`}
              onClick={() => {
                onChange(suggestion);
                setShowSuggestions(false);
                onSearch();
              }}
            >
              {highlightMatch(suggestion)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// For backward compatibility
const SearchBar: React.FC<SearchBarProps> = (props) => {
  return <FuzzySearchBar {...props} />;
};

export default SearchBar;
