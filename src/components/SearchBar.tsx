// SearchBar.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search } from "lucide-react";
import _ from "lodash";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  suggestions?: string[];
  maxSuggestions?: number;
  placeholder?: string;
}

export const FuzzySearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onSearch,
  suggestions = [],
  maxSuggestions = 5,
  placeholder = "Search...",
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const getFuzzySuggestions = useCallback(
    (input: string) => {
      if (!input) return [];

      return suggestions
        .filter((suggestion) => {
          const normalizedSuggestion = suggestion.toLowerCase();
          const normalizedInput = input.toLowerCase();

          // Check for consecutive character matches
          let suggestionIndex = 0;
          for (const char of normalizedInput) {
            suggestionIndex = normalizedSuggestion.indexOf(
              char,
              suggestionIndex
            );
            if (suggestionIndex === -1) return false;
            suggestionIndex += 1;
          }
          return true;
        })
        .slice(0, maxSuggestions);
    },
    [suggestions, maxSuggestions]
  );

  useEffect(() => {
    const debouncedFilter = _.debounce(() => {
      const filtered = getFuzzySuggestions(value);
      setFilteredSuggestions(filtered);
      setSelectedIndex(-1);
      setShowSuggestions(filtered.length > 0);
    }, 150);

    debouncedFilter();
    return () => debouncedFilter.cancel();
  }, [value, getFuzzySuggestions]);

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
        <span key={i} className="text-destructive-500 font-medium">
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
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--foreground-muted))] focus:outline-none focus:border-[hsl(var(--info))] focus:ring-1 focus:ring-[hsl(var(--info))]"
      />
      <button
        onClick={() => {
          onSearch();
          setShowSuggestions(false);
        }}
        className="absolute left-2 top-1/2 transform -translate-y-1/2 text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--info))]"
      >
        <Search className="w-5 h-5" />
      </button>

      {showSuggestions && filteredSuggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-10 w-full mt-1 bg-[hsl(var(--background))] rounded-lg shadow-lg border border-[hsl(var(--border))] max-h-60 overflow-auto"
        >
          {filteredSuggestions.map((suggestion, index) => (
            <div
              key={suggestion}
              className={`px-4 py-2 cursor-pointer ${
                index === selectedIndex
                  ? "bg-[hsl(var(--info))] text-[hsl(var(--info-foreground))]"
                  : "hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))]"
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
